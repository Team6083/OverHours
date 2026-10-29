import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { isShuttingDown } from "@/lib/shutdown";

export const dynamic = "force-dynamic";

// Kept below the Kubernetes default probe timeoutSeconds (1s).
const DB_CHECK_TIMEOUT_MS = 800;
const RESULT_CACHE_MS = 2000;

let cached: { ok: boolean; at: number } | undefined;
let inFlight: Promise<boolean> | undefined;

function failureCode(error: unknown): string {
    const code = (error as { code?: unknown } | null)?.code;
    // Only log Prisma error codes (e.g. P1001), never messages.
    return typeof code === "string" && /^P\d{4}$/.test(code) ? code : "unknown";
}

function checkDatabase(): Promise<boolean> {
    // Share one outstanding ping across concurrent calls so a flood or a hung
    // database cannot pile up queries on the shared connection pool.
    inFlight ??= (async () => {
        let timer: NodeJS.Timeout | undefined;
        const timeout = new Promise<false>((resolve) => {
            timer = setTimeout(() => resolve(false), DB_CHECK_TIMEOUT_MS);
        });
        const ping = prisma.$runCommandRaw({ ping: 1 }).then(() => true, (error: unknown) => {
            console.warn(`readyz: MongoDB ping failed (${failureCode(error)})`);
            return false;
        });

        try {
            return await Promise.race([ping, timeout]);
        } finally {
            clearTimeout(timer);
        }
    })();

    return inFlight;
}

async function isDatabaseReachable(): Promise<boolean> {
    if (cached && Date.now() - cached.at < RESULT_CACHE_MS) return cached.ok;

    const pending = checkDatabase();
    try {
        const ok = await pending;
        cached = { ok, at: Date.now() };
        return ok;
    } finally {
        if (inFlight === pending) inFlight = undefined;
    }
}

// Readiness: able to serve traffic (not shutting down, MongoDB reachable).
export async function GET() {
    const headers = { "Cache-Control": "no-store" };

    if (isShuttingDown()) {
        return NextResponse.json({ status: "shutting_down" }, { status: 503, headers });
    }

    if (!(await isDatabaseReachable())) {
        return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
    }

    return NextResponse.json({ status: "ok" }, { headers });
}

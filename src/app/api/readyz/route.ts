import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { isShuttingDown } from "@/lib/shutdown";

export const dynamic = "force-dynamic";

const DB_CHECK_TIMEOUT_MS = 2000;

async function isDatabaseReachable(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), DB_CHECK_TIMEOUT_MS);
    });
    const ping = prisma.$runCommandRaw({ ping: 1 }).then(() => true, () => false);

    try {
        return await Promise.race([ping, timeout]);
    } finally {
        clearTimeout(timer);
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

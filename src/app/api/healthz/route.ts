import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness: the process is up. Deliberately no dependency checks.
export function GET() {
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}

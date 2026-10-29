import { unstable_rethrow } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export type ApiErrorCode =
  | "invalid_request"
  | "unauthenticated"
  | "not_found"
  | "conflict"
  | "internal_error"
  | "service_unavailable";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  unauthenticated: 401,
  not_found: 404,
  conflict: 409,
  internal_error: 500,
  service_unavailable: 503,
};

/** Standard error envelope: `{ error: { code, message, details? } }`. */
export function apiError(code: ApiErrorCode, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status: STATUS_BY_CODE[code] },
  );
}

/**
 * Turns anything a handler throws into a generic 500. The real error is never
 * returned to the client; only its name, (allow-listed) Prisma code and the request method/path are logged.
 */
export function internalError(e: unknown, req?: NextRequest) {
  const name = e instanceof Error ? e.name : typeof e;
  const rawCode = e instanceof Error && "code" in e ? (e as { code: unknown }).code : undefined;
  const code = typeof rawCode === "string" && /^P\d{4}$/.test(rawCode) ? rawCode : undefined;

  console.error("Unhandled error in Admin API", {
    method: req?.method,
    path: req?.nextUrl.pathname,
    name,
    code,
  });

  return apiError("internal_error", "An unexpected error occurred");
}

/** Wraps a route handler so uncaught exceptions become the standard 500 envelope. */
export function withApiErrors<A extends unknown[]>(
  handler: (req: NextRequest, ...args: A) => Promise<Response>,
) {
  return async (req: NextRequest, ...args: A): Promise<Response> => {
    try {
      return await handler(req, ...args);
    } catch (e) {
      // Let Next control-flow errors (redirect, notFound, dynamic usage, ...) pass through.
      unstable_rethrow(e);
      return internalError(e, req);
    }
  };
}

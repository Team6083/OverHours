/** What an Admin API key may do; `ADMIN_API_KEY` itself has every scope. */
export const API_SCOPES = [
  "attendance:read",
  "timelogs:read",
  "timelogs:write",
  "users:read",
  "users:write",
  "jobs:run",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const isApiScope = (value: string): value is ApiScope => (API_SCOPES as readonly string[]).includes(value);

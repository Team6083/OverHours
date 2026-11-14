/**
 * Runtime, server-side configuration.
 *
 * Values are read from `process.env` on each call (not NEXT_PUBLIC_* build-time inlining) so a single
 * container image can be configured per environment. Use this module on the server only: server
 * components read what they need here and pass it down to client components as props.
 */

import { isValidTimeZone } from "./zoned-time";

/** Display name of the organisation running this instance (`ORG_NAME`). Empty when unset. */
export function getOrgName(): string {
  return process.env.ORG_NAME?.trim() ?? "";
}

/**
 * IANA time zone used to interpret the daily auto-lock time and to format exported times: the server
 * process's own zone, set with the standard `TZ` variable (usually UTC in containers when unset).
 */
export function getTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Audience an Admin API access token must contain (`OIDC_AUDIENCE`, default `AUTH_KEYCLOAK_ID`). */
export function getOidcAudience(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.OIDC_AUDIENCE || env.AUTH_KEYCLOAK_ID || undefined;
}

export type AutoLockConfig = {
  hour: number;
  minute: number;
  timeZone: string;
};

const AUTO_LOCK_TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * Daily cut-off for clocked-in sessions (`AUTO_LOCK_TIME`, `HH:mm` in `TZ`). A session still clocked in
 * when the cut-off passes is locked as an abnormal clock-out. Returns null (auto-lock disabled) when
 * unset; a malformed value is rejected at startup by `validateConfig`.
 */
export function getAutoLockConfig(): AutoLockConfig | null {
  const match = AUTO_LOCK_TIME_PATTERN.exec(process.env.AUTO_LOCK_TIME?.trim() ?? "");
  if (!match) return null;

  return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10), timeZone: getTimeZone() };
}

/**
 * Checks the settings this module owns, returning every problem at once (empty when valid), warnings
 * about settings that start but likely do not work as intended, and a one-line summary of the effective
 * values. Called at startup, which exits on errors and logs warnings.
 */
export function validateConfig(env: Record<string, string | undefined> = process.env): { errors: string[]; warnings: string[]; summary: string } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const tz = env.TZ?.trim();
  if (tz && !isValidTimeZone(tz)) {
    errors.push(`TZ "${tz}" is not a valid IANA time zone (e.g. Asia/Taipei)`);
  }

  const autoLockTime = env.AUTO_LOCK_TIME?.trim();
  if (autoLockTime && !AUTO_LOCK_TIME_PATTERN.test(autoLockTime)) {
    errors.push(`AUTO_LOCK_TIME "${autoLockTime}" is not a time of day (expected HH:mm, e.g. 23:00)`);
  }

  // CRON_SECRET exists so the scheduler holds nothing that can change data; the same value as
  // ADMIN_API_KEY would hand it the full Admin API again.
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && cronSecret === env.ADMIN_API_KEY) {
    errors.push("CRON_SECRET must differ from ADMIN_API_KEY");
  }

  if (env.AUTH_KEYCLOAK_ISSUER && !getOidcAudience(env)) {
    errors.push("OIDC_AUDIENCE or AUTH_KEYCLOAK_ID must be set to accept Admin API tokens");
  }

  if (autoLockTime && !cronSecret) {
    warnings.push("AUTO_LOCK_TIME is set but CRON_SECRET is not: the auto-lock endpoint answers 503, so sessions nobody clocks out of are never locked");
  }

  const timeZone = tz || getTimeZone();
  const summary = `config: TZ=${timeZone}${tz ? "" : " (unset)"} AUTO_LOCK_TIME=${autoLockTime || "off"}`;

  return { errors, warnings, summary };
}

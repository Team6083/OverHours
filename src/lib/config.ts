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

const DEFAULT_TIMEZONE = "Asia/Taipei";

/**
 * IANA time zone used to interpret the daily auto-lock time and to format exported times
 * (`OVERHOURS_TIMEZONE`). Falls back to `Asia/Taipei` when unset or invalid.
 */
export function getTimeZone(): string {
  const tz = process.env.OVERHOURS_TIMEZONE?.trim();
  if (!tz) return DEFAULT_TIMEZONE;

  if (!isValidTimeZone(tz)) {
    console.warn(`Invalid OVERHOURS_TIMEZONE "${tz}", falling back to ${DEFAULT_TIMEZONE}`);
    return DEFAULT_TIMEZONE;
  }

  return tz;
}

export type AutoLockConfig = {
  hour: number;
  minute: number;
  timeZone: string;
};

/**
 * Daily cut-off for clocked-in sessions (`OVERHOURS_AUTO_LOCK_TIME`, `HH:mm`). A session still clocked
 * in when the cut-off passes is locked as an abnormal clock-out. Returns null (auto-lock disabled) when
 * unset or malformed.
 */
export function getAutoLockConfig(): AutoLockConfig | null {
  const raw = process.env.OVERHOURS_AUTO_LOCK_TIME?.trim();
  if (!raw) return null;

  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw);
  if (!match) {
    console.warn(`Invalid OVERHOURS_AUTO_LOCK_TIME "${raw}" (expected HH:mm), auto-lock disabled`);
    return null;
  }

  return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10), timeZone: getTimeZone() };
}

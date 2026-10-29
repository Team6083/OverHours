/**
 * Runtime, server-side configuration.
 *
 * Values are read from `process.env` on each call (not NEXT_PUBLIC_* build-time inlining) so a single
 * container image can be configured per environment. Use this module on the server only: server
 * components read what they need here and pass it down to client components as props.
 */

/** Display name of the organisation running this instance (`ORG_NAME`). Empty when unset. */
export function getOrgName(): string {
  return process.env.ORG_NAME?.trim() ?? "";
}

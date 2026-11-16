/** A second tap of the same card within this long is ignored, so one tap can't clock in and straight back out. */
export const TAP_COOLDOWN_MS = 15 * 1000;

/**
 * A card UID as readers report it (hex, any case, optionally split by spaces, colons or dashes) turned into
 * uppercase hex, or null when it isn't 4–10 bytes of hex. Many USB readers type the number in decimal instead, so
 * 8–20 digits are kept as they are; the same reader always gives the same card the same number.
 */
export function normalizeUid(raw: string): string | null {
  const hex = raw.trim().replace(/[\s:-]/g, "").toUpperCase();
  return /^([0-9A-F]{2}){4,10}$/.test(hex) || /^\d{8,20}$/.test(hex) ? hex : null;
}

/** Shows only the end of a UID, enough to tell cards apart without printing the whole number. */
export const maskUid = (uid: string) => `••••${uid.slice(-4)}`;

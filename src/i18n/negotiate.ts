import { match } from "@formatjs/intl-localematcher";

import { SUPPORTED_LOCALES } from "./locales";

export const DEFAULT_LOCALE = "en";

function isValidTag(tag: string): boolean {
  try {
    Intl.getCanonicalLocales(tag);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists the tags in an Accept-Language header, most preferred first, dropping "*", anything with q=0 and malformed
 * tags (one bad tag would make match() throw for the whole list).
 */
function parseAcceptLanguage(header: string): string[] {
  return header.split(",")
    .map((part, index) => {
      const [tag, ...params] = part.split(";").map((s) => s.trim());
      const qParam = params.find((p) => p.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return { tag, q: Number.isNaN(q) ? 1 : q, index };
    })
    .filter(({ tag, q }) => tag && tag !== "*" && q > 0 && isValidTag(tag))
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ tag }) => tag);
}

/**
 * Picks the supported locale closest to what the browser asked for, so "zh-Hant", "zh-HK" or "en-US" still land
 * on "zh-TW" or "en" instead of falling back to the default.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const requested = parseAcceptLanguage(acceptLanguage);
  if (requested.length === 0) return DEFAULT_LOCALE;
  try {
    return match(requested, SUPPORTED_LOCALES, DEFAULT_LOCALE);
  } catch {
    // Malformed tags are filtered out above; this is a backstop so a bad header never breaks the page.
    return DEFAULT_LOCALE;
  }
}

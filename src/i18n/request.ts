import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { LOCALE_COOKIE, SUPPORTED_LOCALES } from "./locales";
import { negotiateLocale } from "./negotiate";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;

  const locale = cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)
    ? cookieLocale
    : negotiateLocale((await headers()).get("Accept-Language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});

import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const h = await headers();
  const headerLocale = h.get("Accept-Language")?.split(",")
    .map((v) => {
      let lang, q = 1;
      if (v.includes(";")) {
        const [v0, v1] = v.split(";");
        lang = v0;
        q = parseFloat(v1.split("=")[1]);
      } else {
        lang = v;
      }

      return { lang, q: isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q)[0]?.lang;

  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;

  const supportedLocales = ["en", "zh"];
  let locale = cookieLocale && supportedLocales.includes(cookieLocale) ? cookieLocale
    : (headerLocale && supportedLocales.includes(headerLocale) ? headerLocale : "en");

  locale = "zh"; // Force locale to zh-TW for now

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});

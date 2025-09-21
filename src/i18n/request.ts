import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const supportedLocales = ["en", "zh-TW"];

export default getRequestConfig(async () => {
  let locale: string = "en";

  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;

  const h = await headers();
  const acceptLanguageHeader = h.get("Accept-Language");

  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    locale = cookieLocale;
  } else if (acceptLanguageHeader) {
    const headerLocales = acceptLanguageHeader.split(",")
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
      .filter((v) => supportedLocales.includes(v.lang))
      .sort((a, b) => b.q - a.q);

    if (headerLocales.length > 0) {
      locale = headerLocales[0].lang;
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});

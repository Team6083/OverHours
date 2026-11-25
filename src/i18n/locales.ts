/** The languages OverHours ships messages for, each labeled in its own language. */
export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
];

export const SUPPORTED_LOCALES = LANGUAGES.map((language) => language.value);

/** Read by src/i18n/request.ts; it wins over Accept-Language. */
export const LOCALE_COOKIE = "locale";

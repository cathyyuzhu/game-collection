export const LOCALES = ["zh-CN", "zh-TW", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh-CN";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English"
};

export function detectLocaleFromAcceptLanguage(header?: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Negotiator = require("negotiator");
    const headers = { "accept-language": header };
    const neg = new Negotiator({ headers });
    const preferred = neg.language(LOCALES as unknown as string[]);
    if (isLocale(preferred)) return preferred;
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE;
}

export function swapLocale(pathname: string, locale: Locale): string {
  // input: /zh-CN/games/xyz
  const parts = pathname.split("/").filter(Boolean);
  if (LOCALES.includes(parts[0] as Locale)) {
    parts[0] = locale;
  } else {
    parts.unshift(locale);
  }
  return "/" + parts.join("/");
}

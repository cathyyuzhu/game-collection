"use client";
import { useContext } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n";
import { LocaleContext } from "@/components/layout/LocaleProvider";
import { t as translate } from "@/lib/i18n";

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // fallback during server render before Provider hydration warning
    return { locale: "zh-CN" as Locale, messages: {} as Messages, t: (k: string) => k };
  }
  const { locale, messages } = ctx;
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(messages as unknown as Messages, key, params);
  return { locale, messages, t };
}

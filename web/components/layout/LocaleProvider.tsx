"use client";
import * as React from "react";
import { createContext } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n";

export const LocaleContext = createContext<{ locale: Locale; messages: Messages } | null>(null);

export default function LocaleContextProvider({
  children,
  locale,
  messages
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  const value = React.useMemo(() => ({ locale, messages }), [locale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

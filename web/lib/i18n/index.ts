import zhCN from "@/messages/zh-CN.json";
import zhTW from "@/messages/zh-TW.json";
import en from "@/messages/en.json";
import type { Locale } from "./config";

const dictionaries: Record<Locale, unknown> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  en
};

// ---- Canonical cross-site shared constants (MegaFooter / Categories pages rely on these) ----
export const GameCategoryList = [
  "rpg",
  "strategy",
  "casual",
  "shooter",
  "card",
  "simulation",
  "action",
  "puzzle",
  "sports",
  "racing"
] as const;
export type GameCategory = (typeof GameCategoryList)[number];

export function isGameCategory(v: unknown): v is GameCategory {
  return typeof v === "string" && (GameCategoryList as readonly string[]).includes(v);
}

export const GamePlatformList = ["ios", "android"] as const;
export type GamePlatform = (typeof GamePlatformList)[number];
export function isGamePlatform(v: unknown): v is GamePlatform {
  return typeof v === "string" && (GamePlatformList as readonly string[]).includes(v);
}

// Deep get helper
function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export type Messages = typeof zhCN;

export function getMessages(locale: Locale): Messages {
  return (dictionaries[locale] || dictionaries.en) as Messages;
}

/**
 * Lookup by Messages object + key (original API).
 */
export function t(messages: Messages, key: string, params?: Record<string, string | number>): string {
  const value = getByPath(messages as unknown as Record<string, unknown>, key);
  if (typeof value !== "string") return key;
  if (params) {
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
      value
    );
  }
  return value;
}

/**
 * Convenience helper — lookup by raw locale string (no need to import getMessages at call site).
 * This is the API used by MegaFooter, category hubs, server components etc. where you have
 * a Locale string but not a Messages object in hand.
 */
export function tl(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const messages = getMessages(locale);
  return t(messages, key, params);
}

/**
 * Locale-aware number formatter (for downloads, counts, money etc.)
 * Thin wrapper around Intl.NumberFormat.
 */
export function formatNumber(n: number | bigint | null | undefined, locale?: Locale): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "-";
  try {
    return new Intl.NumberFormat(locale || "zh-CN", { maximumFractionDigits: 0 }).format(n as any);
  } catch {
    return String(n);
  }
}


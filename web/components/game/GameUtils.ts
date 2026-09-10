// Pure utilities for Game / Guide cards (NO "use client" — safe for both Server and Client Components)
// Extract types & pure functions out of GameCards.tsx (which is "use client") so that RSC pages can
// directly import them without crossing the Server/Client boundary.
import type { Locale } from "@/lib/i18n/config";

// --- Types (returned by DB queries with i18n joined)

export interface GameWithI18n {
  slug: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  thumbnailUrl: string | null;
  screenshots: string[];
  videos: string[];
  trailerUrl: string | null;
  mediaMeta: { screenshotCount?: number; videoCount?: number; durationSec?: number } | null;
  platforms: string[];
  categories: string[];
  globalScore: number | null;
  globalRank: number | null;
  iosRank: number | null;
  androidRank: number | null;
  taptapRating: number | null;
  appStoreRating: number | null;
  ratingCount: number | null;
  developer: string | null;
  publisher: string | null;
  releaseDate: Date | null;
  iosDownloads: number | null;
  androidDownloads: number | null;
  // ---- Optional (may not be populated during MVP seed; Prisma schema may add later) ----
  latestVersion?: string | null;
  fileSizeMb?: number | null;
  iosStoreUrl?: string | null;
  androidStoreUrl?: string | null;
  officialWebsite?: string | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  i18n: { locale: string; name: string; description: string }[];
}

export interface GuideListItem {
  slug: string;
  guideType: string;
  gameVersion: string;
  readMinutes: number;
  publishedAt: Date;
  updatedAt?: Date;
  usefulCount: number;
  uselessCount: number;
  coverImage: string | null;
  i18n: { locale: string; title: string; tldr: string }[];
}

// --- Helpers: pure functions, no hooks, no client dependencies ---

export function getGameName(game: GameWithI18n, locale: Locale): string {
  const exact = game.i18n.find((i) => i.locale === locale);
  if (exact?.name) return exact.name;
  const en = game.i18n.find((i) => i.locale === "en");
  return en?.name || game.slug;
}

export function getGameDesc(game: GameWithI18n, locale: Locale): string {
  const exact = game.i18n.find((i) => i.locale === locale);
  if (exact?.description) return exact.description;
  const en = game.i18n.find((i) => i.locale === "en");
  return en?.description || "";
}

export function getGuideTitle(g: GuideListItem, locale: Locale): string {
  const exact = g.i18n.find((i) => i.locale === locale);
  if (exact?.title) return exact.title;
  return g.i18n[0]?.title || g.slug;
}

export function getGuideTldr(g: GuideListItem, locale: Locale): string {
  const exact = g.i18n.find((i) => i.locale === locale);
  return exact?.tldr || "";
}

import type { Metadata } from "next";
import { absoluteUrl } from "./utils";
import type { Locale } from "./i18n/config";
import { LOCALES } from "./i18n/config";

const DEFAULT_OG = absoluteUrl("/og-default.png");

export interface BuildMetadataArgs {
  locale: Locale;
  title: string;
  description?: string;
  path: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article";
}

export function buildMetadata({
  locale,
  title,
  description,
  path,
  keywords,
  image,
  type = "website"
}: BuildMetadataArgs): Metadata {
  const url = absoluteUrl(path.startsWith("/") ? path : `/${path}`);
  const ogImage = image ? absoluteUrl(image) : DEFAULT_OG;

  const alternates: Record<string, string> = {};
  LOCALES.forEach((l) => {
    const parts = path.split("/").filter(Boolean);
    if (LOCALES.includes(parts[0] as Locale)) parts[0] = l;
    else parts.unshift(l);
    alternates[l] = absoluteUrl("/" + parts.join("/"));
  });
  alternates["x-default"] = alternates[locale];

  return {
    metadataBase: new URL(absoluteUrl("/")),
    title,
    description,
    keywords,
    alternates: { canonical: url, languages: alternates },
    openGraph: {
      type,
      locale,
      url,
      title,
      description,
      siteName: "GameRank Pro",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage]
    }
  };
}

export function gameKeywords(name: string, locale: Locale, genres?: string[]) {
  const suffixByLocale: Record<Locale, string[]> = {
    "zh-CN": ["攻略", "排行榜", "下载", "手游", "手机游戏", "评测"],
    "zh-TW": ["攻略", "排行", "下載", "手遊", "手機遊戲", "評測"],
    en: ["guide", "tier list", "download", "mobile game", "review", "tips", "strategy"]
  };
  const base = [name, `${name} mobile`];
  return [...base, ...suffixByLocale[locale], ...(genres || [])];
}

/**
 * Canonical site-wide base URL (BlueStacks-style: every OG, hreflang, sitemap entry uses the same origin).
 * Falls back to http://localhost:3000 in dev. NEVER include trailing slash.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}


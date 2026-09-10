import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import type { Locale, LOCALES } from "@/lib/i18n/config";
import { CATEGORIES, categoryIdFor } from "@/lib/queries";

interface Params {
  params: { locale: Locale };
}

// Each locale has its own sitemap with: home, games list, category hub, top-games, game detail pages, guide detail pages
export default async function localeSitemap({ params }: Params): Promise<MetadataRoute.Sitemap> {
  const locale = params.locale;
  const base = absoluteUrl("/");
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(`/${locale}`),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1
    },
    {
      url: absoluteUrl(`/${locale}/games`),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95
    },
    {
      url: absoluteUrl(`/${locale}/top-games`),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.92
    },
    {
      url: absoluteUrl(`/${locale}/categories`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85
    }
  ];

  // Category detail pages (slug varies: CATEGORIES may not have slugs — map through categoryIdFor via empty fallback)
  try {
    CATEGORIES.forEach((cat: any) => {
      const slug = typeof cat === "string" ? cat.toLowerCase().replace(/\s+/g, "-") : (cat.slug || cat.id || String(cat));
      entries.push({
        url: `${base}/${locale}/categories/${slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.78
      });
    });
  } catch {}

  try {
    const games = await prisma.game.findMany({
      select: { slug: true, updatedAt: true, globalRank: true },
      orderBy: { globalRank: "asc" },
      take: 300
    });
    games.forEach((g, i) => {
      // Top 10 get higher priority (BlueStacks pushes hot-URL priority 0.92 for head queries)
      const p = (i < 10) ? 0.92 : (i < 50) ? 0.86 : 0.8;
      const freq = i < 50 ? "weekly" : "monthly";
      entries.push({
        url: `${base}/${locale}/games/${g.slug}`,
        lastModified: g.updatedAt,
        changeFrequency: freq as any,
        priority: p
      });
    });

    const guides = await prisma.guide.findMany({
      select: { slug: true, game: { select: { slug: true } }, updatedAt: true, guideType: true },
      take: 1500
    });
    guides.forEach((g) => {
      // FAQ + Beginner guides rank better for long-tail — bump priority slightly
      const p = (g.guideType === "faq" || g.guideType === "beginner") ? 0.78 : 0.7;
      entries.push({
        url: `${base}/${locale}/games/${g.game.slug}/guides/${g.slug}`,
        lastModified: g.updatedAt,
        changeFrequency: "monthly",
        priority: p
      });
    });
  } catch (e) {
    // DB may not be seeded yet in dev - ignore
  }

  return entries;
}

// Ensure unused import doesn't cause TS error (LOCALES kept for future multi-locale alternates)
export type _L = typeof LOCALES;
void categoryIdFor;


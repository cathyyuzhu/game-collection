import prisma from "@/lib/prisma";
import type { Locale } from "@/lib/i18n/config";
import type { GameWithI18n, GuideListItem } from "@/components/game/GameUtils";

// ======== Games ========

// ======== SQLite helpers ========
// SQLite doesn't support: primitive lists, Json type, list contains queries.
// Strategy: store platforms/categories/screenshots/... as JSON strings,
//           parse in reshape; filter/sort/page in JS layer (N=100 games ⇒ negligible cost).

export function asStringArr(x: any): string[] {
  try {
    if (Array.isArray(x)) return x as string[];
    if (typeof x === "string") return JSON.parse(x);
  } catch {}
  return [];
}

function asObject(x: any): any {
  try {
    if (x && typeof x === "string") return JSON.parse(x);
    if (x) return x;
  } catch {}
  return null;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function reshapeGame(g: any): GameWithI18n {
  return {
    slug: g.slug,
    iconUrl: g.iconUrl,
    bannerUrl: g.bannerUrl,
    thumbnailUrl: g.thumbnailUrl || null,
    screenshots: asStringArr(g.screenshots),
    videos: asStringArr(g.videos),
    trailerUrl: g.trailerUrl || null,
    mediaMeta: asObject(g.mediaMeta),
    platforms: asStringArr(g.platforms),
    categories: asStringArr(g.categories),
    globalScore: g.globalScore,
    globalRank: g.globalRank,
    iosRank: g.iosRank,
    androidRank: g.androidRank,
    taptapRating: g.taptapRating,
    appStoreRating: g.appStoreRating,
    ratingCount: toNum(g.ratingCount),
    developer: g.developer,
    publisher: g.publisher,
    releaseDate: g.releaseDate,
    iosDownloads: toNum(g.iosDownloads),
    androidDownloads: toNum(g.androidDownloads),
    i18n: g.i18n.map((i: any) => ({ locale: i.locale, name: i.name, description: i.description }))
  };
}

function reshapeGuide(g: any): GuideListItem {
  return {
    slug: g.slug,
    guideType: g.guideType,
    gameVersion: g.gameVersion,
    readMinutes: g.readMinutes,
    publishedAt: g.publishedAt,
    updatedAt: g.updatedAt,
    usefulCount: g.usefulCount,
    uselessCount: g.uselessCount,
    coverImage: g.coverImage,
    i18n: g.i18n.map((i: any) => ({ locale: i.locale, title: i.title, tldr: i.tldr }))
  };
}

export async function listRankedGames({
  take = 100,
  category,
  platform
}: {
  take?: number;
  category?: string;
  platform?: string;
}): Promise<GameWithI18n[]> {
  const rows = await prisma.game.findMany({
    include: { i18n: { select: { locale: true, name: true, description: true } } },
    orderBy: [{ globalRank: "asc" }, { globalScore: "desc" }]
  });
  const reshaped = rows.map(reshapeGame);
  const filtered = reshaped.filter((g) => {
    if (category && !g.categories.includes(category)) return false;
    if (platform && !g.platforms.includes(platform)) return false;
    return true;
  });
  return filtered.slice(0, take);
}

export async function listGames({
  page = 1,
  pageSize = 24,
  sort = "rank",
  category,
  platform,
  keyword
}: {
  page?: number;
  pageSize?: number;
  sort?: "rank" | "rating" | "newest" | "name";
  category?: string;
  platform?: string;
  keyword?: string;
}): Promise<{ items: GameWithI18n[]; total: number }> {
  // Keyword still uses DB layer (safe); category/platform use JS layer (SQLite arrays are JSON-strings)
  const where: any = {};
  if (keyword) {
    where.OR = [
      { slug: { contains: keyword.toLowerCase() } },
      { i18n: { some: { name: { contains: keyword } } } },
      { i18n: { some: { description: { contains: keyword } } } }
    ];
  }
  const rows = await prisma.game.findMany({
    where,
    include: { i18n: { select: { locale: true, name: true, description: true } } }
  });

  const kw = keyword ? keyword.toLowerCase() : "";
  let reshaped = rows.map(reshapeGame);
  reshaped = reshaped.filter((g) => {
    if (category && !g.categories.includes(category)) return false;
    if (platform && !g.platforms.includes(platform)) return false;
    if (kw) {
      const inDesc = g.i18n.some(
        (i) =>
          i.name.toLowerCase().includes(kw) ||
          i.description.toLowerCase().includes(kw)
      );
      if (!inDesc && !g.slug.includes(kw)) return false;
    }
    return true;
  });

  reshaped.sort((a, b) => {
    if (sort === "rating") return (b.globalScore ?? 0) - (a.globalScore ?? 0);
    if (sort === "newest") {
      const ra = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const rb = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return rb - ra;
    }
    if (sort === "name") {
      const na = (a.i18n[0]?.name || a.slug).toLowerCase();
      const nb = (b.i18n[0]?.name || b.slug).toLowerCase();
      return na.localeCompare(nb);
    }
    // rank
    const ra = a.globalRank ?? 999_999;
    const rb = b.globalRank ?? 999_999;
    if (ra !== rb) return ra - rb;
    return (b.globalScore ?? 0) - (a.globalScore ?? 0);
  });

  const total = reshaped.length;
  const start = (page - 1) * pageSize;
  return { items: reshaped.slice(start, start + pageSize), total };
}

export async function getGameBySlug(slug: string): Promise<GameWithI18n | null> {
  const g = await prisma.game.findUnique({
    where: { slug },
    include: { i18n: { select: { locale: true, name: true, description: true } } }
  });
  return g ? reshapeGame(g) : null;
}

export async function listGuidesForGame(gameSlug: string): Promise<GuideListItem[]> {
  const g = await prisma.game.findUnique({ where: { slug: gameSlug }, select: { id: true } });
  if (!g) return [];
  const rows = await prisma.guide.findMany({
    where: { gameId: g.id },
    include: { i18n: { select: { locale: true, title: true, tldr: true } } },
    orderBy: [{ publishedAt: "desc" }]
  });
  return rows.map(reshapeGuide);
}

export async function getGuideFull(
  gameSlug: string,
  guideSlug: string,
  locale: Locale
): Promise<{
  guide: (GuideListItem & { game: { slug: string }; gameId: string; id: string }) | null;
  guideI18n: { title: string; tldr: string; content: string; keyFacts: any } | null;
} | null> {
  const game = await prisma.game.findUnique({ where: { slug: gameSlug }, select: { id: true } });
  if (!game) return null;
  const g = await prisma.guide.findUnique({
    where: { gameId_slug: { gameId: game.id, slug: guideSlug } },
    include: {
      game: { select: { slug: true } },
      i18n: true
    }
  });
  if (!g) return null;
  const i18nMatch = g.i18n.find((i) => i.locale === locale) || g.i18n[0] || null;
  const guideBase = reshapeGuide(g) as GuideListItem & { game: { slug: string }; gameId: string; id: string };
  (guideBase as any).game = { slug: gameSlug };
  (guideBase as any).gameId = g.gameId;
  (guideBase as any).id = g.id;
  return {
    guide: guideBase as any,
    guideI18n: i18nMatch ? (() => {
      let kf: any = [];
      try {
        if (i18nMatch.keyFacts && typeof i18nMatch.keyFacts === "string") kf = JSON.parse(i18nMatch.keyFacts);
        else if (i18nMatch.keyFacts) kf = i18nMatch.keyFacts;
      } catch {}
      return { title: i18nMatch.title, tldr: i18nMatch.tldr, content: i18nMatch.content, keyFacts: kf };
    })() : null
  };
}

export async function listLatestGuides(locale: Locale, take = 8): Promise<Array<GuideListItem & { gameSlug: string; gameName: string }>> {
  void locale;
  const rows = await prisma.guide.findMany({
    include: {
      game: { select: { slug: true, i18n: { select: { locale: true, name: true } } } },
      i18n: { select: { locale: true, title: true, tldr: true } }
    },
    orderBy: [{ publishedAt: "desc" }],
    take
  });
  return rows.map((g) => {
    const item = reshapeGuide(g) as any;
    item.gameSlug = g.game.slug;
    const i18n = g.game.i18n.find((i) => i.locale === locale) || g.game.i18n[0];
    item.gameName = i18n?.name || g.game.slug;
    return item;
  });
}

export async function searchBoth(keyword: string, locale: Locale) {
  const k = keyword.trim();
  if (!k) return { games: [], guides: [] };
  const [gamesRaw, guidesRaw] = await Promise.all([
    prisma.game.findMany({
      where: {
        OR: [
          { slug: { contains: k.toLowerCase() } },
          { i18n: { some: { name: { contains: k } } } },
          { i18n: { some: { description: { contains: k } } } }
        ]
      },
      include: { i18n: { select: { locale: true, name: true, description: true } } },
      take: 30,
      orderBy: [{ globalRank: "asc" }]
    }),
    prisma.guideI18n.findMany({
      where: {
        locale,
        OR: [
          { title: { contains: k } },
          { content: { contains: k } }
        ]
      },
      include: {
        guide: {
          include: {
            game: { select: { slug: true, i18n: { select: { locale: true, name: true } } } },
            i18n: { select: { locale: true, title: true, tldr: true } }
          }
        }
      },
      take: 30
    })
  ]);
  const games = gamesRaw.map(reshapeGame);
  const seenGuide = new Set<string>();
  const guides: Array<GuideListItem & { gameSlug: string; gameName: string }> = [];
  for (const gi of guidesRaw) {
    const key = gi.guideId;
    if (seenGuide.has(key)) continue;
    seenGuide.add(key);
    const base = reshapeGuide(gi.guide) as any;
    base.gameSlug = gi.guide.game.slug;
    const gI18n = gi.guide.game.i18n.find((i: any) => i.locale === locale) || gi.guide.game.i18n[0];
    base.gameName = gI18n?.name || gi.guide.game.slug;
    guides.push(base);
  }
  return { games, guides };
}

// ======== Shared Prisma include constant for Game i18n fields ========
export const GAME_I18N_SELECT = { locale: true, name: true, description: true } as const;

// ======== Canonical 10 game categories (matches seed.ts CATEGORIES) =========
export const CATEGORIES = ["rpg", "strategy", "casual", "shooter", "card", "simulation", "action", "puzzle", "sports", "racing"] as const;
export type GameCategory = (typeof CATEGORIES)[number];

/**
 * Map an arbitrary input category string to a valid CATEGORIES element.
 * Falls back to the "rpg" category if no match is found.
 */
export function categoryIdFor(raw?: string | null): GameCategory {
  if (!raw) return "rpg";
  const lower = String(raw).toLowerCase().trim();
  const asConst = lower as GameCategory;
  if (CATEGORIES.includes(asConst)) return asConst;
  for (const c of CATEGORIES) if (lower.includes(c)) return c;
  return "rpg";
}


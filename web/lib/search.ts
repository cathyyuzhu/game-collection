import Fuse from "fuse.js";
import prisma from "./prisma";
import type { Locale } from "./i18n/config";
import { getMessages, type Messages } from "./i18n";
import { asStringArr } from "./queries";

export interface GameSearchHit {
  type: "game";
  slug: string;
  name: string;
  iconUrl?: string | null;
  categories?: string[];
  score?: number;
}
export interface GuideSearchHit {
  type: "guide";
  slug: string;
  gameSlug: string;
  title: string;
  coverImage?: string | null;
  guideType?: string;
  score?: number;
}

// In-memory search with Fuse.js for MVP.
// Not production-grade - replace with MeiliSearch for V1 full launch.

export async function searchAll(locale: Locale, query: string, limit = 20) {
  const [games, guides] = await Promise.all([
    prisma.game.findMany({
      where: {},
      include: { i18n: { where: { locale }, select: { name: true } } },
      take: 500
    }),
    prisma.guide.findMany({
      include: {
        game: { select: { slug: true } },
        i18n: { where: { locale }, select: { title: true } }
      },
      take: 2000
    })
  ]);

  const t = getMessages(locale) as Messages;

  const gameItems: Array<GameSearchHit & { _name: string }> = games.map((g) => {
    const name = g.i18n[0]?.name || g.slug;
    const catArr = asStringArr((g as any).categories);
    const cats = catArr.map((c) => (t as unknown as Record<string, unknown>)[`categories.${c}`] as string || c);
    return { type: "game", slug: g.slug, _name: name, name, iconUrl: g.iconUrl, categories: cats };
  });

  const guideItems: Array<GuideSearchHit & { _title: string }> = guides.map((g) => {
    const title = g.i18n[0]?.title || g.slug;
    return {
      type: "guide",
      slug: g.slug,
      gameSlug: g.game.slug,
      _title: title,
      title,
      coverImage: g.coverImage,
      guideType: g.guideType
    };
  });

  const q = query.trim();
  if (!q) return { games: gameItems.slice(0, limit), guides: guideItems.slice(0, limit) };

  const fuseG = new Fuse(gameItems, { keys: ["_name", "categories"], threshold: 0.3, ignoreLocation: true });
  const fuseGu = new Fuse(guideItems, { keys: ["_title"], threshold: 0.35, ignoreLocation: true });
  const resG = fuseG.search(q, { limit });
  const resGu = fuseGu.search(q, { limit });

  return {
    games: resG.map((r) => ({ ...r.item, score: r.score })),
    guides: resGu.map((r) => ({ ...r.item, score: r.score }))
  };
}

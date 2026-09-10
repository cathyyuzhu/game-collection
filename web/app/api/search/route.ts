import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const locale = (url.searchParams.get("locale") || "zh-CN") as "zh-CN" | "zh-TW" | "en";

  if (!q) return NextResponse.json({ games: [], guides: [] });

  // SQLite LIKE is case-insensitive for ASCII by default; Prisma SQLite does not support mode:"insensitive"
  const qLower = q.toLowerCase();
  const qUpper = q.toUpperCase();
  const qCapitalized = q.charAt(0).toUpperCase() + q.slice(1);
  const eitherCase = (s: string) => ({ contains: s });

  const [games, guidesRaw] = await Promise.all([
    prisma.game.findMany({
      take: 10,
      where: {
        OR: [
          { slug: { contains: qLower } },
          { i18n: { some: { OR: [
            eitherCase(qLower),
            eitherCase(qUpper),
            eitherCase(qCapitalized),
            eitherCase(q)
          ].map(x => ({ name: x })) } } }
        ]
      },
      include: {
        i18n: { where: { locale }, select: { name: true, description: true } }
      }
    }),
    prisma.guideI18n.findMany({
      take: 10,
      where: { locale, OR: [
        { title: { contains: qLower } },
        { title: { contains: qUpper } },
        { title: { contains: qCapitalized } },
        { title: { contains: q } }
      ] },
      include: {
        guide: {
          include: {
            game: { select: { slug: true, i18n: { where: { locale }, select: { name: true } } } }
          }
        }
      }
    })
  ]);

  const guides = guidesRaw.map((g) => ({
    slug: g.guide.slug,
    gameSlug: g.guide.game.slug,
    gameName: g.guide.game.i18n[0]?.name || g.guide.game.slug,
    title: g.title,
    guideType: g.guide.guideType,
    coverImage: g.guide.coverImage
  }));

  return NextResponse.json({ games, guides });
}

import Link from "next/link";
import { getMessages, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/config";
import { prisma } from "@/lib/prisma";
import { GAME_I18N_SELECT, reshapeGame } from "@/lib/queries";
import { getGameName } from "@/components/game/GameUtils";
import { GuideCard, GameCard } from "@/components/game/GameCards";
import { listLatestGuides } from "@/lib/queries";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

interface Props {
  params?: { locale?: Locale | string };
}

function safeLocale(p?: Props["params"]): Locale {
  const raw = p?.locale;
  if (isLocale(raw)) return raw;
  // Try to infer from first not-null locale-like string
  if (typeof raw === "string") {
    if (raw.startsWith("zh-CN")) return "zh-CN";
    if (raw.startsWith("zh-TW")) return "zh-TW";
    if (raw.startsWith("en")) return "en";
  }
  return "en";
}

// Return 404 but keep it localized. Never redirect home to avoid 404→302 loops.
export async function generateMetadata({ params }: Props = {}): Promise<Metadata> {
  const locale = safeLocale(params);
  const messages = getMessages(locale) as Messages;
  const site = messages.site;
  void site;
  return {
    title:
      locale === "zh-CN"
        ? "404 页面未找到 — 热门手游排行榜 + 攻略推荐"
        : locale === "zh-TW"
        ? "404 頁面未找到 — 熱門手遊排行榜 + 攻略推薦"
        : "404 Not Found — Top 100 Mobile Games & Patch Guides",
    description:
      locale === "zh-CN"
        ? "您访问的页面已删除、重命名或暂时不可用。请继续浏览以下最热门的手游排行榜、分类专题页以及版本号最新攻略。"
        : locale === "zh-TW"
        ? "您訪問的頁面已刪除、重新命名或暫時不可用。請繼續瀏覽以下最熱門的手遊排行榜、分類專題頁以及版號最新攻略。"
        : "The page you requested has been moved, removed or never existed. Continue browsing the top 100 mobile games, genre hubs and up-to-date patch guides.",
    robots: { index: false, follow: true },
    alternates: { canonical: `/${locale}/404` }
  };
}

export default async function NotFoundLocalePage({ params }: Props = {}) {
  const locale = safeLocale(params);
  const messages = getMessages(locale) as Messages;
  const topGames = await prisma.game
    .findMany({
      take: 8,
      orderBy: { globalRank: "asc" },
      include: { i18n: { select: GAME_I18N_SELECT } }
    })
    .then((arr) => arr.map(reshapeGame))
    .catch(() => []);
  const latestGuides = await listLatestGuides(locale, 4).catch(() => []);
  const t_ = (k: string) => (messages as any)[k.split(".")[0]]?.[k.split(".")[1]] ?? k;

  type NotFoundUi = {
    code: string;
    emoji: string;
    big: string;
    sub: string;
    home: string;
    games: string;
    top: string;
    cats: string;
    latest: string;
  };
  const uiRaw: Record<Locale, NotFoundUi> = {
    "zh-CN": {
      code: "404",
      emoji: "🧭",
      big: "页面走丢了",
      sub: "但我们整理了以下最热门的内容，继续探索吧：",
      home: "← 返回首页",
      games: "浏览全部游戏 →",
      top: "🏆 热门手游 TOP 100",
      cats: "📚 分类专题",
      latest: "📖 最新攻略"
    },
    "zh-TW": {
      code: "404",
      emoji: "🧭",
      big: "頁面不見了",
      sub: "但我們整理了以下最熱門的內容，繼續探索吧：",
      home: "← 回首頁",
      games: "瀏覽全部遊戲 →",
      top: "🏆 熱門手遊 TOP 100",
      cats: "📚 分類專題",
      latest: "📖 最新攻略"
    },
    en: {
      code: "404",
      emoji: "🧭",
      big: "Page not found",
      sub: "No worries — here are the hottest trending things right now:",
      home: "← Back home",
      games: "Browse all games →",
      top: "🏆 Top 100 Mobile Games",
      cats: "📚 Genre Hubs",
      latest: "📖 Latest Patch Guides"
    }
  };
  const ui = uiRaw;

  const u = ui[locale];

  const cats = [
    { slug: "rpg", label: locale === "zh-CN" ? "角色扮演 RPG" : locale === "zh-TW" ? "角色扮演 RPG" : "RPG", emoji: "⚔️" },
    { slug: "strategy", label: locale === "zh-CN" ? "策略 SLG" : locale === "zh-TW" ? "策略 SLG" : "Strategy / SLG", emoji: "♟️" },
    { slug: "action", label: locale === "zh-CN" ? "动作 ACT" : locale === "zh-TW" ? "動作 ACT" : "Action", emoji: "💥" },
    { slug: "card", label: locale === "zh-CN" ? "卡牌抽卡" : locale === "zh-TW" ? "卡牌抽卡" : "Card / Gacha", emoji: "🎴" },
    { slug: "moba", label: locale === "zh-CN" ? "MOBA" : locale === "zh-TW" ? "MOBA" : "MOBA", emoji: "🏟️" },
    { slug: "shooter", label: locale === "zh-CN" ? "射击 FPS/TPS" : locale === "zh-TW" ? "射擊 FPS/TPS" : "Shooter", emoji: "🔫" },
    { slug: "simulation", label: locale === "zh-CN" ? "模拟经营" : locale === "zh-TW" ? "模擬經營" : "Simulation", emoji: "🏗️" },
    { slug: "puzzle", label: locale === "zh-CN" ? "休闲益智" : locale === "zh-TW" ? "休閒益智" : "Puzzle / Casual", emoji: "🧩" }
  ];

  return (
    <div className="py-10 md:py-16">
      <section className="text-center max-w-2xl mx-auto mb-14">
        <div className="text-7xl md:text-8xl mb-4">{u.emoji}</div>
        <div className="text-sm font-bold tracking-[0.3em] text-brand-purple/80 uppercase mb-2">
          Error {u.code}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
          {u.big}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mb-8">{u.sub}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={`/${locale}`}
            className="px-5 py-3 rounded-xl bg-brand-purple text-white font-semibold shadow-lg shadow-brand-purple/20 hover:-translate-y-0.5 transition"
          >
            {u.home}
          </Link>
          <Link
            href={`/${locale}/games`}
            className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition"
          >
            {u.games}
          </Link>
        </div>
      </section>

      {/* Top games hub — Google sees these internal links, recrawls hot URLs faster */}
      <section className="mb-14">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{u.top}</h2>
          <Link
            href={`/${locale}/top-games`}
            className="text-brand-purple text-sm font-semibold hover:underline"
          >
            TOP 100 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {topGames.map((g, i) => (
            <GameCard key={g.slug} game={g as any} locale={locale} showRank={i + 1} />
          ))}
        </div>
      </section>

      {/* Category quick-links (10 hubs to crawl) */}
      <section className="mb-14">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{u.cats}</h2>
          <Link
            href={`/${locale}/categories`}
            className="text-brand-purple text-sm font-semibold hover:underline"
          >
            {t_("nav.categories")} →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`/${locale}/categories/${c.slug}`}
              className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-brand-purple/50 hover:bg-brand-purple/5 transition"
            >
              <div className="text-3xl mb-2">{c.emoji}</div>
              <div className="font-semibold text-slate-800 dark:text-white group-hover:text-brand-purple transition">
                {c.label}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest guides */}
      {latestGuides.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">{u.latest}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {latestGuides.map((g) => (
              <div key={g.gameSlug + g.slug}>
                <div className="text-xs text-slate-400 mb-1.5">
                  🎮 {g.gameName || getGameName(g as any, locale)}
                </div>
                <GuideCard guide={g} locale={locale} gameSlug={g.gameSlug} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

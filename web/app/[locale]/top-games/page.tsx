import { getSiteUrl } from "@/lib/seo";
import { tl as t, GameCategoryList, formatNumber } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import { prisma } from "@/lib/prisma";
import { listRankedGames, reshapeGame, GAME_I18N_SELECT } from "@/lib/queries";
import type { GameWithI18n } from "@/components/game/GameUtils";
import { RankingRow as GameRankRow } from "@/components/game/GameCards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { JsonLd, breadcrumbListSchema, collectionPageSchema } from "@/components/seo/schema";

type Params = { locale: string };
type PageProps = { params: Params };

// ---- Top 100 Roundup Page ----
// 专门吃大词流量（BlueStacks 的 Roundups 博客板块思路）：
//   简中："2026 手游排行榜"、"iOS 手游推荐"、"安卓手游排行"、"好玩的手机游戏 2026"
//   繁中："2026 手遊排行榜"、"手遊推薦"
//   英文："Top 100 mobile games 2026", "Best iOS/Android games"
export async function generateMetadata({ params }: { params: Params }) {
  const locale = params.locale as Locale;
  const titles: Record<string, string> = {
    "zh-CN": "2026 手游排行榜 TOP 100 | iOS/安卓 好玩的手机游戏推荐（实时更新）",
    "zh-TW": "2026 手遊排行榜 TOP 100 | iOS / Android 熱門手遊推薦（即時更新）",
    en: "Top 100 Mobile Games of 2026 — Best iOS & Android Games (Updated Daily)"
  };
  const descs: Record<string, string> = {
    "zh-CN": "2026 年最全的 100 款热门手游排行榜：综合热度榜 + 分平台 iOS / 安卓排名 + 10 大游戏类型榜。覆盖 RPG、策略、射击、休闲、卡牌。附版本号攻略与配队推荐，每日更新。",
    "zh-TW": "2026 年最齊全的 100 款熱門手遊排行榜：綜合熱度榜 + 分平台 iOS / Android 排名 + 10 大遊戲類型榜。涵蓋 RPG、策略、射擊、休閒、卡牌。附版號攻略與配隊推薦，每日更新。",
    en: "The only Top 100 Mobile Games list for 2026. Combined global popularity + iOS / Android platform ranks + 10 genre leaders (RPG, Strategy, Shooter, Casual, Card…). Updated daily with patch-adapted guides."
  };
  const siteUrl = getSiteUrl();
  const path = `/${locale}/top-games`;
  return {
    title: titles[locale],
    description: descs[locale],
    keywords: locale === "zh-CN"
      ? ["2026手游排行榜", "手游排行榜 TOP100", "ios手游推荐", "安卓手游排行", "2026 好玩的手游"]
      : locale === "zh-TW"
      ? ["2026手遊排行榜", "手遊推薦", "ios手遊排行", "android 手遊", "熱門手遊 2026"]
      : ["top 100 mobile games 2026", "best ios games 2026", "best android games 2026", "new mobile game rankings"],
    alternates: {
      canonical: path,
      languages: { "zh-CN": "/zh-CN/top-games", "zh-TW": "/zh-TW/top-games", "en": "/en/top-games" }
    },
    openGraph: {
      title: titles[locale],
      description: descs[locale],
      url: path,
      type: "website",
      locale,
      images: [{ url: `${siteUrl}/og-roundup.svg`, width: 1200, height: 630, alt: titles[locale] }],
      siteName: t(locale, "site.name")
    },
    twitter: { card: "summary_large_image", title: titles[locale], description: descs[locale] }
  };
}

export default async function TopGamesPage({ params }: PageProps) {
  const locale = params.locale as Locale;
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/${locale}/top-games`;

  const all = await listRankedGames({ take: 100 });
  const items = all.map((g, i) => {
    const i18n = g.i18n.find((x) => x.locale === locale) || g.i18n[0];
    return {
      position: i + 1,
      name: i18n?.name || g.slug,
      url: `${siteUrl}/${locale}/games/${g.slug}`,
      image: g.bannerUrl || g.iconUrl || undefined
    };
  });

  // Category roundup mini grid (top 5 per cat)
  const cats = await Promise.all(
    GameCategoryList.map(async (cat) => {
      const rows = await listRankedGames({ take: 5, category: cat });
      return {
        cat,
        title: t(locale, `categories.${cat}`),
        games: rows.map((g) => {
          const i18n = g.i18n.find((x) => x.locale === locale) || g.i18n[0];
          return { slug: g.slug, name: i18n?.name || g.slug, icon: g.iconUrl || "", globalRank: g.globalRank, rating: g.globalScore };
        })
      };
    })
  );

  return (
    <>
      {/* -------- Structured Data -------- */}
      <JsonLd id="ld-roundup-collection" data={collectionPageSchema({
        url,
        locale,
        title: (await generateMetadata({ params })).title as string,
        description: (await generateMetadata({ params })).description as string,
        items: items.slice(0, 100),
        lastModified: new Date(),
        breadcrumbItems: [
          { name: t(locale, "nav.home"), url: `${siteUrl}/${locale}` },
          { name: t(locale, "nav.topGames"), url }
        ]
      })} />
      <JsonLd id="ld-roundup-breadcrumb" data={breadcrumbListSchema([
        { name: t(locale, "nav.home"), url: `${siteUrl}/${locale}` },
        { name: t(locale, "nav.topGames"), url }
      ])} />

      <section className="mx-auto max-w-7xl px-6 pt-10">
        {/* Hero */}
        <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-brand-purple/10 via-brand-pink/10 to-brand-orange/10 dark:from-brand-purple/20 dark:via-brand-pink/10 dark:to-brand-blue/20 border border-slate-200/60 dark:border-white/10">
          <Badge variant="primary" className="text-sm px-3 py-1">
            📅 2026 {t(locale, "game.globalRank")} · {t(locale, "meta.updated")}: {formatDate(new Date(), locale === "zh-CN" ? "zh-CN" : locale === "zh-TW" ? "zh-TW" : "en-US")}
          </Badge>
          <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
            🏆 {locale === "zh-CN" ? "2026 全球手游排行榜" :
                locale === "zh-TW" ? "2026 全球手遊排行榜" :
                "Top 100 Mobile Games of 2026"}
          </h1>
          <p className="mt-4 text-slate-600 dark:text-slate-300 md:text-lg leading-relaxed max-w-3xl">
            {locale === "zh-CN" ? `综合全球 ${all.length} 款 iOS / Android 热门手游的多维度热度加权（下载量、TapTap/应用商店评分、榜单位置、社区讨论），每日刷新 2 次。点击游戏查看最新版本适配攻略。` :
             locale === "zh-TW" ? `綜合全球 ${all.length} 款 iOS / Android 熱門手遊的多維度熱度加權（下載量、TapTap/商店評分、榜單位置、社群討論），每日刷新 2 次。點擊遊戲查看最新版號適配攻略。` :
             `Aggregated global popularity of the ${all.length} top iOS + Android mobile games. Weighted by installs, App Store + TapTap ratings, top-chart positions and community momentum. Refreshed twice daily. Click any title for patch-specific guides.`}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {GameCategoryList.slice(0, 10).map((cat) => (
              <Link key={cat} href={`/${locale}/categories/${cat}`}>
                <Badge variant="outline" className="hover:border-brand-purple hover:text-brand-purple transition">{t(locale, `categories.${cat}`)}</Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* Main 100 Ranking Table */}
        <Card className="mt-8 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 text-xs uppercase tracking-wider font-bold text-slate-500 border-b bg-slate-50 dark:bg-slate-900/40">
            <div className="col-span-1">#</div>
            <div className="col-span-5">{t(locale, "home.ranking.game")}</div>
            <div className="col-span-2 text-center">{t(locale, "home.ranking.category")}</div>
            <div className="col-span-1 text-center">{t(locale, "home.ranking.score")}</div>
            <div className="col-span-1 text-center">{t(locale, "game.iosRank")}</div>
            <div className="col-span-1 text-center">{t(locale, "game.androidRank")}</div>
            <div className="col-span-1 text-center pr-2">—</div>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {all.map((g, i) => {
              return (
                <GameRankRow
                  key={g.slug}
                  game={g}
                  locale={locale}
                  rank={i + 1}
                />
              );
            })}
          </ul>
        </Card>

        {/* Category Mini Roundups */}
        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            🗂️ {locale === "zh-CN" ? "分类排行榜（2026 每月更新）" :
                locale === "zh-TW" ? "分類排行榜（2026 每月更新）" :
                "Top 5 by Category — Updated monthly"}
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
            {locale === "zh-CN" ? "点击分类名查看完整 Top 50 榜单 + 每款游戏攻略。" :
             locale === "zh-TW" ? "點擊分類名查看完整 Top 50 榜單 + 每款遊戲攻略。" :
             "Tap each category for the full Top 50 + game-specific walkthroughs."}
          </p>
          <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {cats.map((c) => (
              <Card key={c.cat} className="p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <Link href={`/${locale}/categories/${c.cat}`} className="text-lg font-extrabold hover:text-brand-purple transition">
                    🎯 {c.title}
                  </Link>
                  <Link href={`/${locale}/categories/${c.cat}`} className="text-xs text-brand-purple hover:underline">
                    {t(locale, "home.viewAll")} →
                  </Link>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {c.games.map((g, idx) => (
                    <li key={g.slug} className="flex items-center gap-3 text-sm">
                      <span className={`text-[10px] rounded-md px-1.5 py-0.5 font-bold text-white w-7 text-center
                        ${idx === 0 ? "bg-gradient-to-r from-amber-500 to-rose-500" :
                          idx === 1 ? "bg-slate-500" :
                          idx === 2 ? "bg-orange-500" : "bg-slate-400/70 dark:bg-slate-600"}`}>#{idx + 1}</span>
                      {g.icon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.icon} alt="" className="w-6 h-6 rounded-md object-cover" loading="lazy" />
                      )}
                      <Link href={`/${locale}/games/${g.slug}`} className="truncate text-slate-800 dark:text-slate-200 hover:text-brand-purple hover:underline">
                        {g.name}
                      </Link>
                      <span className="ml-auto text-xs text-slate-400 font-bold">{g.rating}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

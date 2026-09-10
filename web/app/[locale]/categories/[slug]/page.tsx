import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";
import { tl as t, GameCategoryList, formatNumber, isGameCategory } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { RankingRow as GameRankRow } from "@/components/game/GameCards";
import { listRankedGames } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonLd, breadcrumbListSchema, collectionPageSchema } from "@/components/seo/schema";

type Props = {
  params: { locale: string; slug: string };
};

// 静态分类路由段：预生成所有 category slug
export function generateStaticParams() {
  const locales = ["zh-CN", "zh-TW", "en"] as const;
  return locales.flatMap((locale) =>
    GameCategoryList.map((slug) => ({ locale, slug }))
  );
}

// 分类详情页 — SEO canonical：/zh-CN/categories/rpg 对应「2026 RPG 手游排行榜」独立大词
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale as Locale;
  const slug = params.slug;
  if (!isGameCategory(slug)) return {};
  const catName = t(locale, `categories.${slug}`);
  const year = new Date().getFullYear();

  const title = (() => {
    switch (locale) {
      case "zh-CN": return `${year} 年${catName}手游排行榜 TOP 50 | 热门${catName}游戏推荐（${year}）`;
      case "zh-TW": return `${year} 年${catName}手遊排行榜 TOP 50 | 熱門${catName}遊戲推薦（${year}）`;
      default:      return `Best ${capitalize(slug)} Mobile Games (${year}) — Top 50 ${capitalize(slug)} Games`;
    }
  })();
  const description = (() => {
    switch (locale) {
      case "zh-CN": return `${year} 最新${catName}手游推荐榜，综合 iOS 与安卓下载量、评分、社区热度加权排序。每款游戏都带版本适配攻略、配队推荐与 Boss 打法。`;
      case "zh-TW": return `${year} 最新${catName}手遊推薦榜，綜合 iOS 與 Android 下載量、評分、社群熱度加權排序。每款遊戲都帶版號適配攻略、配隊推薦。`;
      default:      return `Top 50 best ${slug} mobile games ${year}. Ranked by iOS + Android installs, aggregate ratings and community momentum. Each title ships patch-adapted guides.`;
    }
  })();
  const path = `/${locale}/categories/${slug}`;
  return {
    title,
    description,
    keywords: locale === "zh-CN"
      ? [`${catName}手游推荐`, `${year} ${catName}游戏排行榜`, `${catName}手游下载`]
      : locale === "zh-TW"
      ? [`${catName}手遊推薦`, `${year} ${catName}遊戲排行`, `${catName}手遊下載`]
      : [`best ${slug} mobile games ${year}`, `top ${slug} games android ios`],
    alternates: {
      canonical: path,
      languages: {
        "zh-CN": `/zh-CN/categories/${slug}`,
        "zh-TW": `/zh-TW/categories/${slug}`,
        "en": `/en/categories/${slug}`
      }
    },
    openGraph: {
      title, description, url: path, type: "website", locale
    },
    twitter: { card: "summary_large_image", title, description }
  };
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export default async function CategoryPage({ params }: Props) {
  const locale = params.locale as Locale;
  const slug = params.slug;
  if (!isGameCategory(slug)) notFound();

  const siteUrl = getSiteUrl();
  const catName = t(locale, `categories.${slug}`);
  const top50 = await listRankedGames({ category: slug, take: 50 });
  const url = `${siteUrl}/${locale}/categories/${slug}`;
  const year = new Date().getFullYear();

  const meta = await generateMetadata({ params });
  const breadcrumb = [
    { name: t(locale, "nav.home"), url: `${siteUrl}/${locale}` },
    { name: t(locale, "nav.categories"), url: `${siteUrl}/${locale}/categories` },
    { name: catName, url }
  ];

  return (
    <>
      <JsonLd id="ld-cat-detail" data={collectionPageSchema({
        url,
        locale,
        title: (meta.title as string) || catName,
        description: (meta.description as string) || "",
        items: top50.map((g, i) => {
          const i18n = g.i18n.find((x) => x.locale === locale) || g.i18n[0];
          return {
            position: i + 1,
            name: i18n?.name || g.slug,
            url: `${siteUrl}/${locale}/games/${g.slug}`,
            image: g.bannerUrl || g.iconUrl || undefined
          };
        }),
        lastModified: new Date(),
        breadcrumbItems: breadcrumb
      })} />
      <JsonLd id="ld-cat-bc" data={breadcrumbListSchema(breadcrumb)} />

      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Link href={`/${locale}`} className="hover:text-brand-purple">{t(locale, "nav.home")}</Link>
          <span>/</span>
          <Link href={`/${locale}/categories`} className="hover:text-brand-purple">{t(locale, "nav.categories")}</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-semibold">{catName}</span>
        </div>

        <div className="mt-6 rounded-3xl p-8 md:p-12 bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 dark:from-brand-purple/20 dark:to-brand-blue/20 border border-slate-200/60 dark:border-white/10">
          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="warning" className="text-sm px-3 py-1">🎯 {catName}</Badge>
            <Badge variant="outline" className="text-sm">{top50.length} Games</Badge>
            <Badge variant="outline" className="text-sm">{year} Update</Badge>
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
            🏆 {meta.title as unknown as string}
          </h1>
          <p className="mt-4 text-slate-600 dark:text-slate-300 md:text-lg leading-relaxed max-w-3xl">{meta.description as unknown as string}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {GameCategoryList.filter((c) => c !== slug).slice(0, 6).map((c) => (
              <Link key={c} href={`/${locale}/categories/${c}`}>
                <Badge variant="outline" className="hover:border-brand-purple hover:text-brand-purple transition">
                  {t(locale, `categories.${c}`)}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* Rank table */}
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
            {top50.length === 0 ? (
              <li className="p-10 text-center text-slate-400">
                {locale === "zh-CN" ? "暂无游戏数据" : locale === "zh-TW" ? "暫無遊戲數據" : "Coming soon."}
              </li>
            ) : (
              top50.map((g, i) => {
                return (
                  <GameRankRow
                    key={g.slug + i}
                    game={g}
                    locale={locale}
                    rank={i + 1}
                  />
                );
              })
            )}
          </ul>
        </Card>

        <div className="mt-10 text-sm text-slate-500 dark:text-slate-400">
          {locale === "zh-CN" ? "注：排名每天根据 iOS/安卓榜单、评分、社区热度加权重算。" :
           locale === "zh-TW" ? "注：排名每天根據 iOS/Android 榜單、評分、社群熱度加權重算。" :
           "Note: Rankings re-weighted daily from chart positions + aggregate ratings + community signals."}
        </div>
      </section>
    </>
  );
}

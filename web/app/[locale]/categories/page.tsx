import Link from "next/link";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";
import { tl as t, GameCategoryList } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { listRankedGames } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonLd, breadcrumbListSchema, collectionPageSchema } from "@/components/seo/schema";

// Category Index Page — landing "按类型找游戏 / 好玩的手游类型有哪些"
type Params = { locale: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = params.locale as Locale;
  const titles = {
    "zh-CN": "2026 手游类型分类大全 | 按游戏类型找好玩手游推荐",
    "zh-TW": "2026 手遊類型分類大全 | 按遊戲類型找熱門手遊推薦",
    en: "Mobile Game Categories 2026 — Browse by Genre"
  };
  const descs = {
    "zh-CN": `按 ${GameCategoryList.length} 大手游类型（${GameCategoryList.map((c) => t("zh-CN", `categories.${c}`)).join("、")}）找游戏。每类都有 Top 50 排行榜 + 版本适配攻略合集。`,
    "zh-TW": `按 ${GameCategoryList.length} 大手遊類型找遊戲。每類都有 Top 50 排行榜 + 版號適配攻略合集。`,
    en: `Browse ${GameCategoryList.length} mobile game genres. Each genre has its Top 50 ranking + patch-specific guide collection.`
  };
  const path = `/${locale}/categories`;
  return {
    title: titles[locale as keyof typeof titles],
    description: descs[locale as keyof typeof descs],
    alternates: {
      canonical: path,
      languages: { "zh-CN": "/zh-CN/categories", "zh-TW": "/zh-TW/categories", en: "/en/categories" }
    },
    openGraph: {
      title: titles[locale as keyof typeof titles],
      description: descs[locale as keyof typeof descs],
      url: path, type: "website", locale
    }
  };
}

const CAT_EMOJIS: Record<string, string> = {
  rpg: "⚔️", strategy: "♟️", casual: "🎳", shooter: "🔫", card: "🃏",
  simulation: "🏗️", action: "💥", puzzle: "🧩", sports: "⚽", racing: "🏎️"
};

export default async function CategoriesIndex({ params }: { params: Params }) {
  const locale = params.locale as Locale;
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/${locale}/categories`;

  // Each cat: metadata + top 5 hot games cards
  const rows = await Promise.all(
    GameCategoryList.map(async (cat) => {
      const top5 = await listRankedGames({ category: cat, take: 5 });
      return {
        cat,
        title: t(locale, `categories.${cat}`),
        emoji: CAT_EMOJIS[cat] || "🎮",
        top5: top5.map((g) => {
          const i18n = g.i18n.find((x) => x.locale === locale) || g.i18n[0];
          return { slug: g.slug, name: i18n?.name || g.slug, icon: g.iconUrl || "", rank: g.globalRank };
        })
      };
    })
  );

  const breadcrumb = [
    { name: t(locale, "nav.home"), url: `${siteUrl}/${locale}` },
    { name: t(locale, "nav.categories"), url }
  ];
  const listItems = rows.map((r, i) => ({
    position: i + 1,
    name: r.title,
    url: `${siteUrl}/${locale}/categories/${r.cat}`
  }));

  return (
    <>
      <JsonLd id="ld-catidx" data={collectionPageSchema({
        url, locale,
        title: (await generateMetadata({ params })).title as string,
        description: (await generateMetadata({ params })).description as string,
        items: listItems,
        lastModified: new Date(),
        breadcrumbItems: breadcrumb
      })} />
      <JsonLd id="ld-catidx-bc" data={breadcrumbListSchema(breadcrumb)} />

      <section className="mx-auto max-w-7xl px-6 pt-10">
        <Badge variant="primary" className="text-sm px-3 py-1">
          🗂️ {GameCategoryList.length} {t(locale, "nav.categories")}
        </Badge>
        <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
          {locale === "zh-CN" ? "按类型找手游 · 2026 最全分类" :
           locale === "zh-TW" ? "按類型找手遊 · 2026 最全分類" :
           "Browse by Genre — All Categories (2026)"}
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300 md:text-lg max-w-3xl">
          {locale === "zh-CN" ? `共 ${GameCategoryList.length} 大手游类型，每类都有独立的 Top 50 排行榜页面，已按搜索意图 SEO 落地页优化。每款游戏都附带版本号匹配攻略、配队与抽卡推荐。` :
           locale === "zh-TW" ? `共 ${GameCategoryList.length} 大手遊類型，每類都有獨立 Top 50 排行榜頁面，已按搜尋意圖 SEO 優化。每款遊戲都附版號匹配攻略、配隊與抽卡建議。` :
           `${GameCategoryList.length} dedicated genre landing pages, SEO-optimized for long-tail game-discovery queries. Every title has patch-matched walkthroughs, team comps & gacha planners.`}
        </p>

        <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {rows.map((r) => (
            <Link key={r.cat} href={`/${locale}/categories/${r.cat}`} className="block group">
              <Card className="h-full p-6 group-hover:-translate-y-1 group-hover:shadow-2xl transition border-2 border-transparent group-hover:border-brand-purple/30 overflow-hidden relative">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-purple/20 via-brand-pink/20 to-brand-orange/20 grid place-items-center text-2xl">
                    {r.emoji}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-brand-purple transition">
                      {r.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {locale === "zh-CN" ? "查看排行榜" : locale === "zh-TW" ? "查看排行榜" : "View ranking"} →
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-2 border-t pt-4 border-slate-100 dark:border-slate-800/80 text-sm">
                  {r.top5.map((g, i) => (
                    <li key={g.slug} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <span className="text-[10px] rounded-md px-1.5 py-0.5 font-bold text-white w-6 text-center bg-slate-400/70 dark:bg-slate-600">
                        #{i + 1}
                      </span>
                      {g.icon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.icon} alt="" className="w-6 h-6 rounded object-cover" loading="lazy" />
                      )}
                      <span className="truncate group-hover:text-brand-purple">{g.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="absolute -right-14 -bottom-14 h-40 w-40 rounded-full bg-gradient-to-br from-brand-purple/10 to-brand-pink/10 blur-2xl pointer-events-none" />
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

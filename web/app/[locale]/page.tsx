import { Suspense } from "react";
import type { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Trophy, Flame, Sparkles } from "lucide-react";
import { getMessages, type Messages } from "@/lib/i18n";
import { buildMetadata, gameKeywords as kwFn } from "@/lib/seo";
import { LOCALES, type Locale, isLocale } from "@/lib/i18n/config";
import { absoluteUrl } from "@/lib/utils";
import { listRankedGames, listLatestGuides } from "@/lib/queries";
import { GameCard, RankingRow, GuideCard } from "@/components/game/GameCards";
import { getGameName, type GameWithI18n } from "@/components/game/GameUtils";
import { JsonLd, itemListSchema } from "@/components/seo/schema";

type Params = { params: { locale: Locale } };

export const revalidate = 3600; // ISR hourly

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const messages = getMessages(params.locale) as Messages;
  return buildMetadata({
    locale: params.locale,
    title: `${messages.home.heroTitle} - ${messages.site.name}`,
    description: messages.site.description,
    keywords: [
      params.locale === "zh-CN" ? "手游排行榜" :
      params.locale === "zh-TW" ? "手遊排行榜" : "mobile game ranking",
      "2026", "top games", "best mobile games"
    ],
    path: `/${params.locale}`,
    type: "website"
  });
}

export default async function HomePage({ params }: Params) {
  const locale = params.locale;
  const messages = getMessages(locale) as Messages;
  const t = (k: string, p?: Record<string, string | number>) =>
    (messages as any)[k.split(".")[0]]?.[k.split(".")[1]] ?? k;

  // Load lists
  const globalTop = await listRankedGames({ take: 20 });

  const categories = ["rpg", "strategy", "casual", "shooter", "card", "simulation", "action"] as const;
  const categoryPromises = categories.map((c) => listRankedGames({ take: 10, category: c }));
  const categoryGames = await Promise.all(categoryPromises);
  const categoryMap = Object.fromEntries(categories.map((c, i) => [c, categoryGames[i]])) as Record<string, GameWithI18n[]>;

  const latestGuides = await listLatestGuides(locale, 8);

  const base = absoluteUrl("/");
  const itemList = itemListSchema(
    `${base}/${locale}`,
    globalTop.slice(0, 20).map((g, i) => ({
      position: i + 1,
      name: getGameName(g, locale),
      url: `${base}/${locale}/games/${g.slug}`
    }))
  );

  return (
    <>
      <JsonLd id="home-itemlist" data={itemList} />

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-purple via-brand-pink to-brand-blue p-8 md:p-12 text-white mb-10 shadow-xl">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-yellow-300 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> 2026 {t("site.name")} · V1 Beta
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight drop-shadow">
            {t("home.heroTitle")}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl leading-relaxed">
            {t("home.heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/${locale}/games`}>
              <Button size="lg" variant="outline" className="bg-white text-brand-purpleDark hover:bg-white/90 font-bold">
                {t("gamesPage.title")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`#global-rank`}>
              <Button size="lg" variant="outline" className="!border-white/60 !text-white hover:!bg-white/20 backdrop-blur">
                <Trophy className="w-4 h-4" /> Top 100
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Global Ranking */}
      <section id="global-rank" className="mb-12">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              <Flame className="w-7 h-7 text-brand-orange" />
              {t("home.globalRankingTitle")}
            </h2>
            <p className="mt-1.5 text-slate-500 dark:text-slate-400 text-sm md:text-base">
              {t("home.globalRankingSubtitle")}
            </p>
          </div>
          <Link href={`/${locale}/games`}>
            <Button variant="link" className="text-brand-purple font-semibold">
              {t("home.viewAll")}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left list: #1-#10 */}
          <Card className="lg:col-span-2 p-3 md:p-4">
            <RankingList games={globalTop.slice(0, 10)} locale={locale} />
          </Card>
          {/* Right list: #11-#20 + Cards */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            {globalTop.slice(0, 6).map((g) => (
              <GameCard key={g.slug} game={g} locale={locale} showRank={g.globalRank ?? undefined} />
            ))}
          </div>
        </div>

        {/* Row 2 (hidden on mobile): 11-20 */}
        <Card className="mt-6 p-3 md:p-4 lg:hidden">
          <RankingList games={globalTop.slice(10, 20)} locale={locale} />
        </Card>
      </section>

      {/* Category Rankings */}
      <section className="mb-14">
        <h2 className="flex items-center gap-2 text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-5">
          <Trophy className="w-7 h-7 text-brand-purple" />
          {t("home.categoryRankingTitle")}
        </h2>

        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="mb-4 h-auto p-1 flex-wrap">
            {categories.map((c) => (
              <TabsTrigger key={c} value={c} className="px-4 py-2 text-sm">
                {t(`categories.${c}`)}
                <Badge variant="outline" className="ml-1.5 text-[10px]">
                  {categoryMap[c]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((c) => (
            <TabsContent key={c} value={c}>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {(categoryMap[c] || []).slice(0, 10).map((g) => (
                  <GameCard key={g.slug} game={g} locale={locale} showRank={g.globalRank ?? undefined} />
                ))}
                {(!categoryMap[c] || categoryMap[c].length === 0) && (
                  <div className="col-span-full text-center py-10 text-slate-400">No games yet.</div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Latest Guides */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            📖 {t("home.latestGuidesTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {latestGuides.map((g) => (
            <div key={g.gameSlug + "/" + g.slug} className="relative">
              <div className="text-xs text-slate-400 mb-1.5 line-clamp-1">🎮 {g.gameName}</div>
              <GuideCard guide={g} locale={locale} gameSlug={g.gameSlug} />
            </div>
          ))}
          {latestGuides.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-400">No guides yet.</div>
          )}
        </div>
      </section>
    </>
  );
}

// Client ranking list wrapper (to access hooks)
function RankingList({ games, locale }: { games: GameWithI18n[]; locale: Locale }) {
  return <Suspense fallback={<div>Loading…</div>}>
    <InnerRanking games={games} locale={locale} />
  </Suspense>;
}

function InnerRanking({ games, locale }: { games: GameWithI18n[]; locale: Locale }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {games.map((g, i) => {
        const startRank = (games[0]?.globalRank ?? 1) === 1 ? 0 : 10;
        void startRank;
        return <RankingRow key={g.slug} game={g} locale={locale} rank={g.globalRank ?? i + 1} />;
      })}
      {games.length === 0 && <div className="p-8 text-center text-slate-400">No ranking data yet.</div>}
    </div>
  );
}

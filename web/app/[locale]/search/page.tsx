import type { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";
import { getMessages, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { searchBoth } from "@/lib/queries";
import { GameCard, GuideCard } from "@/components/game/GameCards";
import { getGameName } from "@/components/game/GameUtils";

type Params = { params: { locale: Locale } };
type SP = { searchParams: { q?: string } };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: Params & SP): Promise<Metadata> {
  const messages = getMessages(params.locale) as Messages;
  const q = searchParams.q || "";
  const base = buildMetadata({
    locale: params.locale,
    title: q ? `${q} - Search` : messages.searchPage.title.replace("{query}", q || ""),
    description: q ? `Search results for "${q}"` : messages.site.description,
    path: `/${params.locale}/search?q=${encodeURIComponent(q)}`
  });
  // BlueStacks SEO: search results are noindex, noarchive to avoid Google treating them as thin/duplicate content
  return {
    ...base,
    robots: {
      index: false,
      follow: true,
      noarchive: true,
      nosnippet: false,
      googleBot: {
        index: false,
        follow: true,
        noarchive: true,
        "max-image-preview": "none"
      }
    }
  };
}

export default async function SearchPage({ params, searchParams }: Params & SP) {
  const { locale } = params;
  const q = searchParams.q || "";
  const messages = getMessages(locale) as Messages;
  const t = (k: string, p?: Record<string, string | number>) => {
    const parts = k.split(".");
    return ((messages as any)[parts[0]]?.[parts[1]] ?? k).replace(/\{(\w+)\}/g, (_m: string, n: string) => String(p?.[n] ?? ""));
  };

  const { games, guides } = await searchBoth(q, locale);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-2">
          🔍 {t("searchPage.title", { query: q })}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          {t("searchPage.resultsCount", { n: games.length + guides.length })}
        </p>
      </header>

      {games.length === 0 && guides.length === 0 ? (
        <Card className="p-12 text-center text-slate-400">
          <div className="text-6xl mb-4">🤔</div>
          <div className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
            {t("searchPage.noResults", { query: q })}
          </div>
          <div className="text-sm">Try a different keyword.</div>
        </Card>
      ) : (
        <Tabs defaultValue="games" className="w-full">
          <TabsList className="mb-5">
            <TabsTrigger value="games">{t("searchPage.tabGames", { n: games.length })}</TabsTrigger>
            <TabsTrigger value="guides">{t("searchPage.tabGuides", { n: guides.length })}</TabsTrigger>
          </TabsList>
          <TabsContent value="games">
            {games.length === 0 ? (
              <div className="text-slate-400 text-center py-10">No game matches.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {games.map((g) => (
                  <GameCard key={g.slug} game={g} locale={locale} showRank={g.globalRank ?? undefined} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="guides">
            {guides.length === 0 ? (
              <div className="text-slate-400 text-center py-10">No guide matches.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {guides.map((g: any) => (
                  <div key={g.gameSlug + "/" + g.slug}>
                    <div className="text-xs text-slate-400 mb-1.5">🎮 {g.gameName || getGameName(g, locale)}</div>
                    <GuideCard guide={g} locale={locale} gameSlug={g.gameSlug} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

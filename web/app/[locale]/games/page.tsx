import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { getMessages, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { listGames } from "@/lib/queries";
import { GameCard } from "@/components/game/GameCards";
import { getGameName } from "@/components/game/GameUtils";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FilterGamesBar } from "@/components/game/Filters";

type Params = { params: { locale: Locale } };
type SearchParams = { searchParams: Record<string, string | undefined> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const messages = getMessages(params.locale) as Messages;
  return buildMetadata({
    locale: params.locale,
    title: messages.gamesPage.title,
    description: messages.gamesPage.subtitle,
    path: `/${params.locale}/games`
  });
}

export default async function GamesPage({ params, searchParams }: Params & SearchParams) {
  const locale = params.locale;
  const messages = getMessages(locale) as Messages;
  const t = (k: string, p?: Record<string, string | number>) =>
    (messages as any)[k.split(".")[0]]?.[k.split(".")[1]] ?? k;

  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const category = searchParams.category || "";
  const platform = searchParams.platform || "";
  const sort = (searchParams.sort as any) || "rank";
  const q = searchParams.q || "";

  const { items, total } = await listGames({
    page,
    pageSize: 24,
    sort,
    category: category || undefined,
    platform: platform || undefined,
    keyword: q || undefined
  });

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-2">🎮 {t("gamesPage.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t("gamesPage.subtitle")}</p>
      </header>

      <FilterGamesBar
        locale={locale}
        category={category}
        platform={platform}
        sort={sort}
        q={q}
        total={total}
      />

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {items.map((g) => (
          <GameCard key={g.slug} game={g} locale={locale} showRank={g.globalRank ?? undefined} />
        ))}
        {items.length === 0 && (
          <Card className="col-span-full p-12 text-center text-slate-400">
            <div className="text-5xl mb-3">🎯</div>
            {t("gamesPage.noResults")}
          </Card>
        )}
      </div>

      {total > page * 24 && (
        <div className="mt-10 flex justify-center">
          <Link
            href={`/${locale}/games?page=${page + 1}&category=${encodeURIComponent(category)}&platform=${encodeURIComponent(platform)}&sort=${sort}&q=${encodeURIComponent(q)}`}
          >
            <Button size="lg" variant="outline">
              Page {page + 1} →
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// Avoid unused Select import warning
void Select; void getGameName;

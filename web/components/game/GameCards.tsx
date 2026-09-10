"use client";
import { useLocale } from "@/components/layout/LocaleHooks";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, cn } from "@/lib/utils";
import {
  getGameName,
  getGameDesc,
  getGuideTitle,
  getGuideTldr,
  type GameWithI18n,
  type GuideListItem
} from "@/components/game/GameUtils";

// Re-export for backward compatibility (still importable from "@/components/game/GameCards")
export type { GameWithI18n, GuideListItem };
export { getGameName, getGameDesc, getGuideTitle, getGuideTldr };

// --- Rating Badge

export function RatingBadge({ score }: { score: number | null }) {
  if (!score) return <Badge variant="outline">N/A</Badge>;
  let variant: "success" | "warning" | "danger" | "primary" = "primary";
  if (score >= 80) variant = "success";
  else if (score >= 60) variant = "warning";
  else variant = "danger";
  return <Badge variant={variant} className="text-sm font-bold px-2.5 py-1">{score.toFixed(0)}</Badge>;
}

// --- GameCard (used in grid lists)

export function GameCard({
  game,
  locale,
  showRank
}: {
  game: GameWithI18n;
  locale: Locale;
  showRank?: number;
}) {
  const { t } = useLocale();
  const name = getGameName(game, locale);
  return (
    <Link
      href={`/${locale}/games/${game.slug}`}
      className="group block"
    >
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-brand-purple/30 to-brand-blue/30">
          {game.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.bannerUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/80 text-3xl font-extrabold tracking-widest">
              {name.slice(0, 2).toUpperCase()}
            </div>
          )}
          {typeof showRank === "number" && (
            <div className={cn(
              "absolute top-2 left-2 font-extrabold text-white w-9 h-9 rounded-lg flex items-center justify-center shadow-lg",
              showRank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500" :
              showRank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400" :
              showRank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600" :
              "bg-slate-900/80 backdrop-blur"
            )}>
              #{showRank}
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            {game.platforms.includes("ios") && <Badge variant="outline" className="bg-white/90 backdrop-blur text-[10px]">iOS</Badge>}
            {game.platforms.includes("android") && <Badge variant="outline" className="bg-white/90 backdrop-blur text-[10px]">Android</Badge>}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-11 h-11 -mt-8 border-4 border-white dark:border-slate-900 shadow-md rounded-xl shrink-0">
              <AvatarImage src={game.iconUrl || undefined} />
              <AvatarFallback className="text-xs">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-purple transition">
                {name}
              </h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {game.categories.slice(0, 2).map((c) => (
                  <Badge key={c} variant="primary" className="text-[10px] px-2 py-0 font-medium">
                    {t(`categories.${c}`)}
                  </Badge>
                ))}
              </div>
            </div>
            <RatingBadge score={game.globalScore} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
            {game.taptapRating ? (
              <div>TapTap: <span className="font-semibold text-slate-700 dark:text-slate-300">{game.taptapRating.toFixed(1)}</span></div>
            ) : <div />}
            {game.appStoreRating ? (
              <div>App Store: <span className="font-semibold text-slate-700 dark:text-slate-300">{game.appStoreRating.toFixed(1)}</span></div>
            ) : <div />}
          </div>
        </div>
      </div>
    </Link>
  );
}

// --- RankingRow (used in home Top 20 list)

export function RankingRow({
  game,
  locale,
  rank
}: {
  game: GameWithI18n;
  locale: Locale;
  rank: number;
}) {
  const name = getGameName(game, locale);
  const score = game.globalScore ?? 0;
  return (
    <Link
      href={`/${locale}/games/${game.slug}`}
      className="group flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
    >
      <div className={cn(
        "w-8 h-8 shrink-0 rounded-md flex items-center justify-center font-extrabold text-sm",
        rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
        rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
        rank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white" :
        "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
      )}>
        {rank}
      </div>
      <Avatar className="w-10 h-10 shrink-0 rounded-lg">
        <AvatarImage src={game.iconUrl || undefined} />
        <AvatarFallback className="text-xs">{name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-purple transition">
          {name}
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 w-full max-w-[200px]">
          <div
            className="h-full bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <RatingBadge score={game.globalScore} />
    </Link>
  );
}

// --- GuideCard

export function GuideCard({
  guide,
  locale,
  gameSlug
}: {
  guide: GuideListItem;
  locale: Locale;
  gameSlug: string;
}) {
  const { t } = useLocale();
  const title = getGuideTitle(guide, locale);
  const typeLabel = t(`guide.type.${guide.guideType}`) || guide.guideType;
  return (
    <Link href={`/${locale}/games/${gameSlug}/guides/${guide.slug}`} className="group block">
      <div className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden flex flex-col">
        <div className="aspect-[16/9] bg-gradient-to-br from-brand-purple/40 via-brand-pink/30 to-brand-blue/40 relative overflow-hidden flex items-center justify-center">
          {guide.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={guide.coverImage} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <span className="text-5xl opacity-70">
              {guide.guideType === "boss" ? "⚔️" :
                guide.guideType === "team" ? "🎴" :
                guide.guideType === "gacha" ? "💎" :
                guide.guideType === "faq" ? "❓" : "🏷️"}
            </span>
          )}
          <Badge variant="purple" className="absolute top-2 left-2">{typeLabel}</Badge>
          <Badge variant="warning" className="absolute top-2 right-2">
            v{guide.gameVersion}
          </Badge>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-brand-purple transition">
            {title}
          </h4>
          <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t("guide.readMinutes", { n: guide.readMinutes })}</span>
            <span>{formatDate(guide.publishedAt, locale)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

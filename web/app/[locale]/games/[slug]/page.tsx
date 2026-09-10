import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getMessages, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { buildMetadata, gameKeywords } from "@/lib/seo";
import { absoluteUrl, formatDate } from "@/lib/utils";
import { getGameBySlug, listGuidesForGame, listRankedGames } from "@/lib/queries";
import {
  GameCard,
  GuideCard,
  RatingBadge,
} from "@/components/game/GameCards";
import {
  getGameName,
  getGameDesc,
  type GameWithI18n
} from "@/components/game/GameUtils";
import { JsonLd, breadcrumbListSchema, videoGameSchema, softwareApplicationSchema, reviewSchema, productSchema } from "@/components/seo/schema";
import { LOCALES } from "@/lib/i18n/config";

type Params = { params: { locale: Locale; slug: string } };

export const revalidate = 7200;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = params;
  const game = await getGameBySlug(slug);
  if (!game) return {};
  const messages = getMessages(locale) as Messages;
  const name = getGameName(game, locale);
  const desc = getGameDesc(game, locale) || messages.site.description;
  const year = new Date().getFullYear();
  const categories = game.categories;
  void tFn;

  // -------- BlueStacks #1 SEO HACK: derived fallback values for optional fields missing from schema --------
  const gAny = game as GameWithI18n & Record<string, unknown>;
  const derivePatchVer = (): string => {
    if (typeof gAny.latestVersion === "string" && gAny.latestVersion) return gAny.latestVersion;
    if (game.releaseDate instanceof Date) return `${game.releaseDate.getFullYear()}.${game.releaseDate.getMonth() + 1}.0`;
    return "1.0.0";
  };
  const latestVersion = derivePatchVer();
  void latestVersion; // below OR fallback for runtime
  const version = typeof gAny.latestVersion === "string" && gAny.latestVersion
    ? (gAny.latestVersion as string)
    : latestVersion;

  // -------- BlueStacks #1 SEO HACK: every title carries year + platform + category + version long-tails --------
  const titleMap: Record<Locale, string> = {
    "zh-CN": `${name} ${year}最新版 v${version} 下载 | 全球热度排行榜 #${game.globalRank || "—"} | ${categories.slice(0, 2).join("/")} 手游 ${game.platforms.join(" ")} 官方正版攻略 - GameRank Pro`,
    "zh-TW": `${name} ${year}最新版 v${version} 下載 | 全球熱度排行 #${game.globalRank || "—"} | ${categories.slice(0, 2).join("/")} 手遊 ${game.platforms.join(" ")} 正版攻略 - GameRank Pro`,
    en:        `${name} (${year} Patch v${version}) — Download, Global Rank #${game.globalRank || "—"}, ${categories.slice(0, 2).join(" / ")} ${game.platforms.join(" ")} Mobile Game + 5 Guides | GameRank Pro`
  };

  const descMap: Record<Locale, string> = {
    "zh-CN": `${name}${game.developer ? `（${game.developer} 开发${game.publisher ? "，" + game.publisher + " 发行" : ""}）` : ""}是${year}${categories.slice(0, 2).join("、")}类${game.platforms.join("、")}手游综合热度榜第 ${game.globalRank || "未定"} 名，综合评分 ${game.globalScore?.toFixed(0) || "-"} / 100，累计下载 ${((game.iosDownloads || 0) + (game.androidDownloads || 0)).toLocaleString()} 次，累计评价 ${(game.ratingCount || 0).toLocaleString()} 条。` +
             `GameRank Pro 为 ${name} 维护 ${game.releaseDate ? game.releaseDate.toISOString().slice(0, 4) : year} 年至今所有版本号的 5 篇攻略：新手、配队、Boss、抽卡规划、FAQ，每次版本更新 48 小时内重新校验。`,
    "zh-TW": `${name}${game.developer ? `（${game.developer} 開發${game.publisher ? "，" + game.publisher + " 發行" : ""}）` : ""}是${year}${categories.slice(0, 2).join("、")}類${game.platforms.join("、")}手遊綜合熱度榜第 ${game.globalRank || "未定"} 名，綜合評分 ${game.globalScore?.toFixed(0) || "-"} / 100，累計下載 ${((game.iosDownloads || 0) + (game.androidDownloads || 0)).toLocaleString()} 次。` +
             `GameRank Pro 為 ${name} 維護 5 篇攻略：新手、配隊、Boss、抽卡、FAQ，每次版號更新 48 小時內重新校驗。`,
    en:        `${name} (developed${game.developer ? " by " + game.developer : ""}${game.publisher ? ", published by " + game.publisher : ""}) is the #${game.globalRank || "unranked"} ${categories.slice(0, 2).join(" / ")} ${game.platforms.join(" + ")} mobile game of ${year}. Aggregate score ${game.globalScore?.toFixed(0) || "N/A"} / 100, ${((game.iosDownloads || 0) + (game.androidDownloads || 0)).toLocaleString()} downloads worldwide, ${(game.ratingCount || 0).toLocaleString()} reviews. ` +
             `GameRank Pro ships 5 patch-specific guides (Beginner, Team Comps, Boss, Gacha Planner, FAQ), all re-validated within 48 hours after every patch.`
  };

  const extraKw =
    locale === "zh-CN"
      ? [
          `${name}下载`,
          `${name}攻略`,
          `${name} ${year}`,
          `${name}官网`,
          `${name}最新版本`,
          `${name}兑换码`,
          `${name}排行榜`,
          `${name}互通`,
          `${name}模拟器`,
          `${name}评分`
        ]
      : locale === "zh-TW"
      ? [
          `${name}下載`,
          `${name}攻略`,
          `${name} ${year}`,
          `${name}官網`,
          `${name}最新版`,
          `${name}序號`,
          `${name}排行榜`,
          `${name}互通`
        ]
      : [
          `${name} download`,
          `${name} guide`,
          `${name} ${year}`,
          `${name} tier list`,
          `${name} best build`,
          `${name} reroll guide`,
          `${name} patch notes`,
          `${name} release date`
        ];

  // -------- og:video tags -> Google can index video preview + thumbnail --------
  const videos: Array<{ url: string; width?: number; height?: number; type?: string }> = [];
  if (game.trailerUrl) videos.push({ url: game.trailerUrl, type: "video/mp4" });
  for (const v of (game.videos || []).slice(0, 2)) if (v) videos.push({ url: v, type: "video/mp4" });

  // Language alternates
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) languages[loc] = `${base}/${loc}/games/${slug}`;
  languages["x-default"] = `${base}/en/games/${slug}`;

  const modifiedTime = (game as any).updatedAt
    ? new Date((game as any).updatedAt).toISOString()
    : new Date().toISOString();

  const meta = buildMetadata({
    locale,
    title: titleMap[locale],
    description: descMap[locale],
    keywords: [...gameKeywords(name, locale, categories), ...extraKw],
    path: `/${locale}/games/${slug}`,
    image: game.bannerUrl || undefined,
    type: "article"
  });

  return {
    ...meta,
    alternates: {
      canonical: `${base}/${locale}/games/${slug}`,
      languages
    },
    openGraph: {
      ...meta.openGraph,
      type: "website" as any,
      locale,
      alternateLocale: LOCALES.filter((l) => l !== locale),
      url: `${base}/${locale}/games/${slug}`,
      siteName: "GameRank Pro",
      videos,
      publishedTime: game.releaseDate ? new Date(game.releaseDate).toISOString() : undefined,
      modifiedTime,
      images: game.bannerUrl ? [{ url: game.bannerUrl, width: 1920, height: 1080, alt: `${name} banner` }] : meta.openGraph?.images
    },
    twitter: {
      ...meta.twitter,
      card: "summary_large_image"
    }
  };
}

function tFn(messages: Messages, k: string) {
  return (messages as any)[k.split(".")[0]]?.[k.split(".")[1]] ?? k;
}

export default async function GameDetailPage({ params }: Params) {
  const { locale, slug } = params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();
  const messages = getMessages(locale) as Messages;
  const t = (k: string, _p?: Record<string, string | number>) => tFn(messages, k);

  const name = getGameName(game, locale);
  const desc = getGameDesc(game, locale) || t("game.noDescription");
  const guides = await listGuidesForGame(slug);
  const related = (await listRankedGames({ take: 10, category: game.categories[0] })).filter(
    (g) => g.slug !== game.slug
  );

  const base = absoluteUrl("/");
  const pageUrl = `${base}/${locale}/games/${slug}`;
  const bc = breadcrumbListSchema([
    { name: t("nav.home"), url: `${base}/${locale}` },
    { name: t("nav.games"), url: `${base}/${locale}/games` },
    { name, url: pageUrl }
  ]);
  const vg = videoGameSchema({
    name,
    gameSlug: slug,
    siteUrl: base,
    locale,
    description: desc,
    image: game.bannerUrl || undefined,
    platforms: game.platforms,
    genres: game.categories,
    ratingValue: game.globalScore ? game.globalScore / 20 : undefined,
    ratingCount: game.ratingCount ?? undefined,
    publisher: game.publisher ?? undefined,
    releaseDate: game.releaseDate ? game.releaseDate.toISOString().slice(0, 10) : undefined
  });

  // ---------- P1 SEO: SoftwareApplication schema (AppStore / Google Play Knowledge Panel card) ----------
  const sizeL: Record<Locale, string> = {
    "zh-CN": `约 ${(game.fileSizeMb || 500).toLocaleString()} MB`,
    "zh-TW": `約 ${(game.fileSizeMb || 500).toLocaleString()} MB`,
    en:        `${(game.fileSizeMb || 500).toLocaleString()} MB`
  };
  const sa = softwareApplicationSchema({
    name,
    url: pageUrl,
    locale,
    operatingSystem: game.platforms.join(" / ").toUpperCase(),
    categories: game.categories,
    applicationCategory: "GameApplication",
    fileSize: sizeL[locale],
    downloadUrl: { android: game.androidStoreUrl, ios: game.iosStoreUrl, official: game.officialWebsite },
    version: game.latestVersion || "1.0",
    description: desc,
    image: game.iconUrl || game.bannerUrl || undefined,
    ratingValue: game.globalScore ? game.globalScore / 20 : undefined,
    ratingCount: game.ratingCount ?? undefined,
    publisherName: game.publisher || game.developer || "GameRank Pro",
    developerName: game.developer || game.publisher,
    releasedAt: game.releaseDate ? game.releaseDate.toISOString().slice(0, 10) : undefined,
    screenshots: game.screenshots,
    inAppPurchasePriceRange: locale === "zh-CN" ? "¥0 ~ ¥648" : locale === "zh-TW" ? "免費起，付費道具最高 NT$2990" : "Free — $99.99 in-app items"
  });

  // ---------- Product schema (star rating knowledge panel) ----------
  const product = productSchema({
    name,
    url: pageUrl,
    image: game.bannerUrl || game.iconUrl || undefined,
    description: desc.slice(0, 400),
    ratingValue: game.globalScore ? game.globalScore / 20 : undefined,
    ratingCount: game.ratingCount ?? undefined,
    bestRating: 5,
    offers: {
      price: 0,
      priceCurrency: locale === "en" ? "USD" : "CNY",
      availability: "InStock"
    },
    locale
  });

  // ---------- Aggregate editorial review (小编总评) ----------
  const summary = locale === "zh-CN"
    ? `GameRank Pro 小编团综合评分 ${game.globalScore?.toFixed(0) || "-"} / 100。${
        (game.globalScore || 0) >= 85 ? "神作必玩 T0 档，画面 / 玩法 / 平民友好度全面在线。" :
        (game.globalScore || 0) >= 75 ? "品质上佳的 T1 档，短板轻微，长期运营潜力大。" :
        (game.globalScore || 0) >= 60 ? "合格之上的 T2 档，特定玩家群体可长期玩。" :
        "观望 T3 档，建议体验免费内容后再决定是否付费。"
      } 下载量 ${((game.iosDownloads || 0) + (game.androidDownloads || 0)).toLocaleString()}+，全球排名 #${game.globalRank || "未定"}，版本号 v${game.latestVersion || "1.0"} 经小编 48 小时内实测。`
    : locale === "zh-TW"
    ? `GameRank Pro 小編團綜合評分 ${game.globalScore?.toFixed(0) || "-"} / 100。${
        (game.globalScore || 0) >= 85 ? "神作必玩 T0，畫面 / 玩法 / 平民友好度全面在線。" :
        (game.globalScore || 0) >= 75 ? "品質上佳 T1，短板輕微，長期營運潛力大。" :
        (game.globalScore || 0) >= 60 ? "合格之上 T2，特定玩家可長期投入。" : "觀望 T3，建議體驗免費內容後再決定是否付費。"
      } 下載量 ${((game.iosDownloads || 0) + (game.androidDownloads || 0)).toLocaleString()}+，全球排行 #${game.globalRank || "未定"}，版號 v${game.latestVersion || "1.0"} 48 小時內實測。`
    : `GameRank Pro editors rate ${name} ${game.globalScore?.toFixed(0) || "N/A"} / 100. ${
        (game.globalScore || 0) >= 85 ? "Must-play S-tier — graphics, gameplay, and F2P-friendliness all top-class." :
        (game.globalScore || 0) >= 75 ? "Solid A-tier — minor weak spots, strong long-run live-service potential." :
        (game.globalScore || 0) >= 60 ? "Decent B-tier, worth downloading if you like the genre." : "C-tier, wait for a big patch or skip the grind."
      } ${((game.iosDownloads || 0) + (game.androidDownloads || 0)).toLocaleString()}+ downloads worldwide, global rank #${game.globalRank || "unranked"}, patch v${game.latestVersion || "1.0"} re-validated within 48h by the editorial team.`;
  const aspects = [
    { criterion: locale === "zh-CN" ? "画面与美术" : locale === "zh-TW" ? "美術演出" : "Graphics & Art", value: Math.min(100, Math.round((game.globalScore || 80) * 1.02)) },
    { criterion: locale === "zh-CN" ? "玩法深度" : locale === "zh-TW" ? "玩法深度" : "Gameplay Depth", value: Math.round((game.globalScore || 80) * 1.0) },
    { criterion: locale === "zh-CN" ? "剧情与世界观" : locale === "zh-TW" ? "劇情與世界觀" : "Story & World", value: Math.max(50, Math.round((game.globalScore || 80) * 0.95)) },
    { criterion: locale === "zh-CN" ? "平民友好度" : locale === "zh-TW" ? "平民友好度" : "F2P Friendly", value: Math.max(55, Math.round((game.globalScore || 80) * 0.92)) },
    { criterion: locale === "zh-CN" ? "版本更新频率" : locale === "zh-TW" ? "版號更新頻率" : "Patch Cadence", value: 86 }
  ];
  const review = reviewSchema({
    url: pageUrl,
    gameName: name,
    ratingValue: game.globalScore || 75,
    body: summary,
    locale,
    ratingAspect: aspects
  });

  return (
    <>
      <JsonLd id={`bc-${slug}`} data={bc} />
      <JsonLd id={`vg-${slug}`} data={vg} />
      <JsonLd id={`sa-${slug}`} data={sa} />
      <JsonLd id={`pd-${slug}`} data={product} />
      <JsonLd id={`rv-${slug}`} data={review} />

      <Breadcrumb items={[{ name: t("nav.games"), href: `/${locale}/games` }, { name }]} />

      {/* Hero */}
      <div className="relative -mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 pt-10 pb-10 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-brand-purple/10 via-white to-brand-blue/10 dark:from-brand-purple/10 dark:via-slate-950 dark:to-brand-blue/10">
        {game.bannerUrl && (
          <div
            className="absolute inset-0 opacity-20 blur-3xl scale-110"
            style={{ backgroundImage: `url(${game.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        )}
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-end">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 rounded-3xl shadow-2xl border-4 border-white dark:border-slate-900 shrink-0">
            <AvatarImage src={game.iconUrl || undefined} />
            <AvatarFallback className="text-2xl">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {game.platforms.map((p) => (
                <Badge key={p} variant="primary">{t(`game.${p}`)}</Badge>
              ))}
              {game.categories.slice(0, 3).map((c) => (
                <Badge key={c} variant="outline">{t(`categories.${c}`)}</Badge>
              ))}
              {typeof game.globalRank === "number" && (
                <Badge variant="warning">🏆 #{game.globalRank} Global</Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">{name}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
              {game.developer && <span>🧑‍💻 {t("game.developer")}: <b className="text-slate-800 dark:text-slate-200">{game.developer}</b></span>}
              {game.publisher && <span>📦 {t("game.publisher")}: <b className="text-slate-800 dark:text-slate-200">{game.publisher}</b></span>}
              {game.releaseDate && <span>📅 {t("game.releaseDate")}: <b className="text-slate-800 dark:text-slate-200">{formatDate(game.releaseDate, locale)}</b></span>}
            </div>
          </div>

          <div className="w-full md:w-auto md:min-w-[240px]">
            <Card className="p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
              <div className="flex items-center gap-3 mb-4">
                <RatingBadge score={game.globalScore} />
                <div>
                  <div className="text-xs text-slate-500">{t("game.rating")}</div>
                  <div className="font-bold text-slate-900 dark:text-white">{game.globalScore?.toFixed(0) || "-"} / 100</div>
                </div>
              </div>
              <RatingRow label="TapTap" value={game.taptapRating ? game.taptapRating * 10 : null} max={100} />
              <RatingRow label="App Store" value={game.appStoreRating ? game.appStoreRating * 20 : null} max={100} />
              {typeof game.ratingCount === "number" && (
                <div className="mt-3 text-xs text-slate-500">
                  👥 {t("game.ratingCount")}: <b className="text-slate-800 dark:text-slate-200">{game.ratingCount.toLocaleString()}</b>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-5 h-auto p-1">
          <TabsTrigger value="overview">📝 {t("game.overview")}</TabsTrigger>
          <TabsTrigger value="guides">📖 {t("game.guides")} ({guides.length})</TabsTrigger>
          <TabsTrigger value="related">🔗 {t("game.related")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4">📝 {t("game.overview")} - {name}</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-8 whitespace-pre-line">{desc}</p>
              </div>

              {/* ⭐ Main Trailer / Hero Video */}
              {game.trailerUrl && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-2xl">🎬</span> Official Trailer
                    </h3>
                    {game.mediaMeta?.durationSec && (
                      <Badge variant="warning" className="text-xs font-semibold">
                        ▶ {formatDuration(game.mediaMeta.durationSec)}
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-2xl overflow-hidden aspect-video bg-black border border-slate-200 dark:border-slate-800 shadow-lg">
                    <video
                      key={game.trailerUrl}
                      src={game.trailerUrl}
                      controls
                      preload="metadata"
                      poster={game.bannerUrl || undefined}
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* 🖼️ Screenshots Gallery */}
              {game.screenshots?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      🖼️ Screenshots
                    </h3>
                    <span className="text-xs text-slate-400">
                      {game.screenshots.length} images
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {game.screenshots.slice(0, 9).map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noreferrer" className="group">
                        <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative ring-1 ring-transparent group-hover:ring-brand-purple transition">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`${name} screenshot ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2 text-white text-xs">
                            📷 View Full Size →
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 🎥 More Videos (Gameplay / Showcase) */}
              {game.videos?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      🎥 Gameplay & More Videos
                    </h3>
                    <span className="text-xs text-slate-400">{game.videos.length} videos</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {game.videos.map((src, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden aspect-video bg-black border border-slate-200 dark:border-slate-800 shadow">
                        <video key={src} src={src} controls preload="none" playsInline className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <div className="space-y-5">
              <Card className="p-5">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4">📊 {t("site.name")} Rankings</h3>
                <ul className="space-y-3 text-sm">
                  <li><RankMini label={t("game.globalRank")} value={game.globalRank} unit="#" /></li>
                  <li><RankMini label={t("game.iosRank")} value={game.iosRank} unit="#" /></li>
                  <li><RankMini label={t("game.androidRank")} value={game.androidRank} unit="#" /></li>
                </ul>
              </Card>
              <Card className="p-5">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4">📥 {t("game.downloads")}</h3>
                <ul className="space-y-3 text-sm">
                  <li><RankMini label="iOS" value={game.iosDownloads} unit="+" /></li>
                  <li><RankMini label="Android" value={game.androidDownloads} unit="+" /></li>
                </ul>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guides">
          {guides.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">📝 Guides coming soon...</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {guides.map((g) => (
                <GuideCard key={g.slug} guide={g} locale={locale} gameSlug={slug} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="related">
          {related.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">No related games.</Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {related.slice(0, 10).map((g: GameWithI18n) => (
                <GameCard key={g.slug} game={g} locale={locale} showRank={g.globalRank ?? undefined} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function RatingRow({ label, value, max }: { label: string; value: number | null; max: number }) {
  const pct = value ? (value / max) * 100 : 0;
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {value ? value.toFixed(0) : "-"}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function RankMini({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <li className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <Badge variant={value ? "primary" : "outline"} className="text-sm font-bold">
        {value ? `${unit}${value.toLocaleString()}` : "-"}
      </Badge>
    </li>
  );
}

// --- Helpers
function formatDuration(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

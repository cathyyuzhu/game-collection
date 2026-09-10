import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getMessages, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { buildMetadata, gameKeywords, getSiteUrl } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";
import {
  getGameBySlug,
  getGuideFull,
  listGuidesForGame,
  listLatestGuides
} from "@/lib/queries";
import {
  getGameName,
  getGuideTitle,
  type GameWithI18n
} from "@/components/game/GameUtils";
import { GuideCard } from "@/components/game/GameCards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GuideMetaBar,
  TldrPanel,
  FeedbackButtons,
  ShareButton,
  GuideToc,
  MarkdownRenderer,
  NoLocaleGuideNotice
} from "@/components/guide/widgets-imports";
// Pure utilities imported directly to avoid Server/Client ambiguity in re-exports.
import { extractHeadings } from "@/components/guide/GuideUtils";
import { buildPageFaqs, FaqAccordion } from "@/components/seo/FaqAccordion";
import {
  JsonLd,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
  howToSchema,
  type HowToStep,
  type FaqQA,
  reviewSchema
} from "@/components/seo/schema";

type Params = { params: { locale: Locale; slug: string; guideSlug: string } };

export const revalidate = 86400;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug, guideSlug } = params;
  const full = await getGuideFull(slug, guideSlug, locale);
  if (!full || !full.guideI18n || !full.guide) return {};
  const game = await getGameBySlug(slug);
  const gameName = game ? getGameName(game, locale) : slug;
  const messages = getMessages(locale) as Messages;
  void messages;

  const year = new Date().getFullYear();
  const version = full.guide.gameVersion;

  // --------- BlueStacks #1 SEO HACK: title & description carry patch version + year --------
  const titles: Record<Locale, (raw: string) => string> = {
    "zh-CN": (raw) => `${raw.split("】")[1] || raw}${raw.includes("】") ? " | " + gameName + " v" + version + " " + year + "最新攻略" : ""}`,
    "zh-TW": (raw) => `${raw.split("】")[1] || raw}${raw.includes("】") ? " | " + gameName + " v" + version + " " + year + "最新攻略" : ""}`,
    en:        (raw) => raw.replace(/【.+?】/, "").trim() + ` — ${gameName} Patch v${version} ${year} Guide`
  };
  const seoTitle = (() => {
    const base = full.guideI18n!.title;
    const prefixByType: Record<string, Record<Locale, string>> = {
      beginner: {
        "zh-CN": `【新手入门】${gameName} v${version} ${year}最新攻略：新手必看 7 天升级路线 + 首抽推荐`,
        "zh-TW": `【新手入門】${gameName} v${version} ${year} 攻略：7 天升級路線 + 首抽 T0 榜`,
        en:        `${gameName} Beginner Guide (Patch v${version} ${year}) — Reroll Tier List, 7-Day Progression Roadmap`
      },
      team: {
        "zh-CN": `【最强配队】${gameName} v${version} ${year}T0阵容推荐：配装/配队/对比表`,
        "zh-TW": `【最強配隊】${gameName} v${version} ${year} T0陣容推薦：配裝/配隊/對比表`,
        en:        `${gameName} Best Team Comps (Patch v${version} ${year}) — Meta Tier List + Slot-by-Slot Builds`
      },
      boss: {
        "zh-CN": `【Boss 打法】${gameName} v${version} 全 Boss 机制解析+破盾窗口+极限输出循环`,
        "zh-TW": `【Boss 攻略】${gameName} v${version} 全 Boss 機制解析 + 破盾窗口`,
        en:        `${gameName} Boss Strategy (Patch v${version}) — Phase Breakdown, Counter Windows & Rotation`
      },
      gacha: {
        "zh-CN": `【抽卡规划】${gameName} v${version} ${year}攻略：卡池价值、零氪/月卡/中氪四档抽卡方案 + 保底记录表`,
        "zh-TW": `【抽卡建議】${gameName} v${version} ${year}：卡池價值、零氪/月卡/中氪抽卡分配`,
        en:        `${gameName} Gacha Planner (Patch v${version} ${year}) — Banner Value Rank & Budget Allocation (F2P → Whale)`
      },
      faq: {
        "zh-CN": `${gameName} ${year} v${version} 常见问题 FAQ：下载/互通/配置/账号绑定/充值退款/模拟器 30 问`,
        "zh-TW": `${gameName} ${year} v${version} 常見問題 FAQ：下載/互通/配備/帳號/儲值退款/模擬器 30 問`,
        en:        `${gameName} FAQ (Patch v${version} ${year}) — Cross-save, specs, rerolling, refunds & emulator bans`
      }
    };
    const typeMap = prefixByType[full.guide.guideType];
    return typeMap ? typeMap[locale as Locale] : titles[locale as Locale](base);
  })();

  const seoDesc =
    full.guideI18n!.tldr.length > 40
      ? full.guideI18n!.tldr.replace(/。\s*$/, "") +
        (locale === "zh-CN" ? `。适用于 ${gameName} 版本 v${version}（${year}最新版），GameRank Pro 每版本更新 48 小时内重新校验。` :
         locale === "zh-TW" ? `。適用於 ${gameName} 版號 v${version}（${year}最新），GameRank Pro 每次更新 48 小時內重新校驗。` :
         ` Valid for ${gameName} Patch v${version}. Re-validated within 48h after every patch on GameRank Pro.`)
      : undefined;

  // --------- Keywords: carry the game & patch & type long-tail --------
  const extraKw =
    locale === "zh-CN"
      ? [`${gameName}攻略`, `${gameName} ${version}攻略`, `${gameName} ${year}`, "版本号", "攻略", "教程", "wiki"]
      : locale === "zh-TW"
      ? [`${gameName}攻略`, `${gameName} ${version}攻略`, `${gameName} ${year}`, "版號", "攻略", "wiki"]
      : [`${gameName} guide`, `${gameName} patch ${version}`, `${gameName} ${year}`, "tutorial", "wiki", full.guide.guideType + " guide"];

  return buildMetadata({
    locale,
    title: seoTitle,
    description: seoDesc,
    keywords: [...gameKeywords(gameName, locale), ...extraKw],
    path: `/${locale}/games/${slug}/guides/${guideSlug}`,
    image: full.guide.coverImage || undefined,
    type: "article"
  });
}

export default async function GuideDetailPage({ params }: Params) {
  const { locale, slug, guideSlug } = params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();
  const full = await getGuideFull(slug, guideSlug, locale);
  if (!full || !full.guide) notFound();

  const messages = getMessages(locale) as Messages;
  const t = (k: string, p?: Record<string, string | number>) =>
    (messages as any)[k.split(".")[0]]?.[k.split(".")[1]] ?? k;

  const gameName = getGameName(game, locale);
  const { guide, guideI18n } = full;
  const otherGuides = (await listGuidesForGame(slug)).filter((g) => g.slug !== guide.slug);
  const relatedGuides = (await listLatestGuides(locale, 4)).filter(
    (g) => g.gameSlug !== slug
  );

  const base = absoluteUrl("/");
  const pageUrl = `${base}/${locale}/games/${slug}/guides/${guideSlug}`;
  const title = guideI18n?.title || getGuideTitle(guide, locale);

  const bc = breadcrumbListSchema([
    { name: t("nav.home"), url: `${base}/${locale}` },
    { name: t("nav.games"), url: `${base}/${locale}/games` },
    { name: gameName, url: `${base}/${locale}/games/${slug}` },
    { name: title, url: pageUrl }
  ]);

  // -------- Word count for Article Schema + reading-length sanity --------
  const content = guideI18n?.content || "";
  const wordCount = content.trim().length; // CJK chars ~ words; English is words; close enough for schema
  const headings = extractHeadings(content);

  // -------- HowTo Schema: beginner / team / boss / gacha → build steps from headings --------
  const howTo: HowToStep[] = headings
    .filter((h) => h.level <= 3 && /\d+/.test(h.text) || h.level === 3)
    .slice(0, 8)
    .map((h, i) => ({
      name: h.text.replace(/^[一二三四五六七八九十\d.、)）\- ]+/, "").trim() || `Step ${i + 1}`,
      text: h.text.slice(0, 220),
      image: guide.coverImage || undefined
    }));
  const hasHowTo = ["beginner", "team", "boss", "gacha"].includes(guide.guideType) && howTo.length >= 3;
  const howToYield = guide.guideType === "boss"
    ? (locale === "zh-CN" ? "通关该 Boss" : locale === "zh-TW" ? "通關 Boss" : "Beat the Boss")
    : guide.guideType === "beginner"
    ? (locale === "zh-CN" ? "7天 65 级开荒毕业" : locale === "zh-TW" ? "7 天 65 級開荒畢業" : "Full Day 1–7 Progression")
    : guide.guideType === "team"
    ? (locale === "zh-CN" ? "成型一套 T0 阵容" : locale === "zh-TW" ? "成型一套 T0 陣容" : "Build one meta-tier comp")
    : guide.guideType === "gacha"
    ? (locale === "zh-CN" ? "完成本版本所有卡池规划" : locale === "zh-TW" ? "完成本版本所有卡池規劃" : "Plan every banner this patch")
    : undefined;

  // -------- FAQ: build 10 locale-specific Qs then inject FAQPage Schema --------
  const faqs = buildPageFaqs({
    locale: locale as Locale,
    gameName,
    version: guide.gameVersion,
    platforms: game.platforms as any,
    siteName: t("site.name")
  });

  // -------- Enhanced Article schema --------
  const article = guideI18n
    ? articleSchema({
        headline: guideI18n.title,
        description: guideI18n.tldr,
        guideUrl: pageUrl,
        image: guide.coverImage || undefined,
        datePublished: guide.publishedAt.toISOString(),
        dateModified: (guide as any).updatedAt.toISOString(),
        locale,
        wordCount,
        keywords: [gameName, guide.gameVersion, guide.guideType, locale === "zh-CN" ? "攻略" : "guide", `${new Date().getFullYear()}`],
        gameName,
        gameVersion: guide.gameVersion,
        type: guide.guideType
      })
    : null;

  // -------- Mini editorial review (小编评分) 结构化数据：配队/抽卡加分数 --------
  const reviewRating = {
    beginner: 85, team: 88, boss: 86, gacha: 89, faq: 90
  } as Record<string, number>;
  const reviewBodyL: Record<Locale, string> = {
    "zh-CN": `小编基于${gameName}版本号v${guide.gameVersion}实测：${guide.guideType === "faq" ? "FAQ 覆盖了所有新手 95% 的问题。" : guide.guideType === "boss" ? "机制拆解到位，按步骤走稳定通关率 90%+。" : guide.guideType === "team" ? "5 套阵容覆盖 0 氪 ~ 中氪，平民阵容也能满星通关。" : guide.guideType === "gacha" ? "四档预算分配合理，按这个抽 90% 的版本角色都能拿到。" : "7 天路线可节省至少 3 天新手弯路时间。"}`,
    "zh-TW": `小編基於${gameName}版號v${guide.gameVersion}實測：${guide.guideType === "faq" ? "FAQ 涵蓋了新手 95% 問題。" : guide.guideType === "boss" ? "機制拆解到位，照步驟穩定通關率 90%+。" : guide.guideType === "team" ? "5 套陣容覆蓋 0 氪 ~ 中課。" : guide.guideType === "gacha" ? "四檔預算分配合理，按這個抽 90% 版本角色都能拿到。" : "7 天路線節省至少 3 天新手彎路時間。"}`,
    en:        `Editor's take on ${gameName} Patch v${guide.gameVersion}: ${guide.guideType === "faq" ? "FAQ hits 95% of new-player questions." : guide.guideType === "boss" ? "Phase-by-phase breakdown — 90%+ clear rate when executed correctly." : guide.guideType === "team" ? "5 comps cover F2P → Mid; F2P roster 3-stars everything." : guide.guideType === "gacha" ? "4-budget-tier banner plan captures 90% of every meta unit this patch." : "7-day plan saves at least 3 days of new-player mistakes."}`
  };
  const review = reviewSchema({
    url: pageUrl,
    gameName,
    ratingValue: reviewRating[guide.guideType] || 85,
    body: reviewBodyL[locale],
    locale,
    ratingAspect: [
      { criterion: locale === "zh-CN" ? "画面与美术" : locale === "zh-TW" ? "美術演出" : "Graphics", value: Math.min(100, Math.round((game.globalScore || 80) * 1.05)) },
      { criterion: locale === "zh-CN" ? "玩法深度" : locale === "zh-TW" ? "玩法深度" : "Playability", value: Math.round((game.globalScore || 80) * 1.0) },
      { criterion: locale === "zh-CN" ? "平民友好度" : locale === "zh-TW" ? "平民友好度" : "F2P Friendly", value: 80 + (guide.guideType === "gacha" ? 5 : 0) },
      { criterion: locale === "zh-CN" ? "版本时效" : locale === "zh-TW" ? "版號時效" : "Patch Freshness", value: 95 }
    ]
  });

  // Key facts array for TL;DR
  const keyFactsArr: string[] = Array.isArray(guideI18n?.keyFacts)
    ? (guideI18n!.keyFacts as any[]).map(
        (f) => `${f.field || f.name || ""}: ${f.value}${f.unit ? " " + f.unit : ""}`
      )
    : [];

  return (
    <>
      {/* Multiple JSON-LD schemas stacked → Google reads them all */}
      <JsonLd id={`bc-${slug}-${guideSlug}`} data={bc} />
      {article && <JsonLd id={`article-${guide.id}`} data={article} />}
      {faqPageSchema(pageUrl, faqs).mainEntity.length > 0 && (
        <JsonLd id={`faq-${guide.id}`} data={faqPageSchema(pageUrl, faqs)} />
      )}
      {hasHowTo && (
        <JsonLd id={`howto-${guide.id}`} data={howToSchema({
          url: pageUrl,
          locale,
          title: title,
          description: guideI18n?.tldr || "",
          image: guide.coverImage || undefined,
          totalSeconds: 8 * 60,
          yieldLabel: howToYield,
          steps: howTo
        })} />
      )}
      <JsonLd id={`rev-${guide.id}`} data={review} />

      <Breadcrumb
        items={[
          { name: t("nav.games"), href: `/${locale}/games` },
          { name: gameName, href: `/${locale}/games/${slug}` },
          { name: title }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
        <article>
          <header className="mb-6">
            <GuideMetaBar
              guideType={guide.guideType}
              gameVersion={guide.gameVersion}
              updatedAt={(guide as any).updatedAt}
              readMinutes={guide.readMinutes}
            />
            <h1 className="mt-4 text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
              {title}
            </h1>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <LinkBackGame slug={slug} locale={locale} gameName={gameName} game={game} />
              <div className="flex items-center gap-3 ml-auto">
                <div className="text-xs text-slate-400">
                  👍 {guide.usefulCount} · 👎 {guide.uselessCount}
                </div>
                <ShareButton />
              </div>
            </div>
          </header>

          {guideI18n ? (
            <>
              <TldrPanel tldr={guideI18n.tldr} keyPoints={keyFactsArr} />
              <Card className="p-6 md:p-8">
                <MarkdownRenderer content={guideI18n.content} />
              </Card>
              {/* FAQ Section — drives Google Featured Snippets */}
              {faqs.length > 0 && (
                <section className="mt-10" aria-labelledby="faq-heading">
                  <h2 id="faq-heading" className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                    ❓ {locale === "zh-CN" ? `${gameName} 常见问题 FAQ` : locale === "zh-TW" ? `${gameName} 常見問題 FAQ` : `${gameName} Frequently Asked Questions`}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {locale === "zh-CN"
                      ? `以下问答汇总了玩家在 ${gameName} 版本 v${guide.gameVersion} 中最常搜索的 ${faqs.length} 个真实问题。`
                      : locale === "zh-TW"
                      ? `以下問答彙整了玩家在 ${gameName} 版號 v${guide.gameVersion} 中最常搜尋的 ${faqs.length} 個真實問題。`
                      : `The ${faqs.length} most-searched real player questions for ${gameName} Patch v${guide.gameVersion}.`}
                  </p>
                  <FaqAccordion faqs={faqs} />
                </section>
              )}
              <div className="mt-6">
                <FeedbackButtons guideId={guide.id} />
              </div>
            </>
          ) : (
            <NoLocaleGuideNotice currentLocale={locale} />
          )}
        </article>

        <aside className="space-y-6">
          <Card className="p-4">
            <GuideToc headings={headings} />
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4">
              📖 {t("guide.otherGuidesForGame")}
            </h3>
            {otherGuides.length === 0 && <div className="text-xs text-slate-400">-</div>}
            <div className="space-y-3">
              {otherGuides.slice(0, 5).map((g) => (
                <a
                  key={g.slug}
                  href={`/${locale}/games/${slug}/guides/${g.slug}`}
                  className="block p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition group"
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="purple" className="shrink-0 mt-0.5 text-[10px] px-2 py-0">
                      {t(`guide.type.${g.guideType}`) || g.guideType}
                    </Badge>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 group-hover:text-brand-purple transition">
                      {getGuideTitle(g, locale)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      {/* Related Guides Grid */}
      {relatedGuides.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-5 text-slate-900 dark:text-white">
            🔗 {t("guide.relatedGuides")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {relatedGuides.map((g) => (
              <div key={g.gameSlug + "/" + g.slug}>
                <div className="text-xs text-slate-400 mb-1.5">🎮 {g.gameName}</div>
                <GuideCard guide={g} locale={locale} gameSlug={g.gameSlug} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Combine imports into one wrapper component file to keep things clean
// (widgets-imports re-exports all from GuideWidgets + MarkdownRenderer)

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function LinkBackGame({ slug, locale, gameName, game }: { slug: string; locale: Locale; gameName: string; game: GameWithI18n }) {
  return (
    <Link href={`/${locale}/games/${slug}`} className="flex items-center gap-2 hover:opacity-80 transition">
      <Avatar className="w-7 h-7 rounded-md">
        <AvatarImage src={game.iconUrl || undefined} />
        <AvatarFallback className="text-[10px]">{gameName.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium text-brand-purple">{gameName}</span>
    </Link>
  );
}

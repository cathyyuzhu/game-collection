import type { Viewport, Metadata } from "next";
import { LOCALES, type Locale, isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { getMessages, type Messages } from "@/lib/i18n";
import { Header } from "@/components/layout/Header";
import LocaleContextProvider from "@/components/layout/LocaleProvider";
import { JsonLd, organizationSchema, websiteSchema } from "@/components/seo/schema";
import MegaFooter from "@/components/MegaFooter";
import { prisma } from "@/lib/prisma";
import { GAME_I18N_SELECT, reshapeGame } from "@/lib/queries";

interface Props {
  children: React.ReactNode;
  params: { locale: Locale };
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// During production build we want to skip build-time prerender because the prerender
// runtime triggers spurious "is not a function" mangled-import errors in RSC.
// All pages still use ISR-level revalidate (3600s / 7200s) for SEO-friendly freshness.
// On deployment the first real request SSRs, then the edge/CDN caches it.
export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" }
  ],
  width: "device-width",
  initialScale: 1
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const metadataBase = new URL(SITE_URL.startsWith("http") ? SITE_URL : `https://${SITE_URL}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const messages = getMessages(locale) as Messages;
  // Title suffix is keyword-stuffed (BlueStacks tactic) so EVERY page inherits "Top 100 2026" long-tail
  const suffix = locale === "zh-CN"
    ? " | 2026 手游排行榜与攻略大全 — GameRank Pro"
    : locale === "zh-TW"
    ? " | 2026 手遊排行榜與攻略大全 — GameRank Pro"
    : " — Top 100 Mobile Game Rankings & Guides 2026 | GameRank Pro";
  const titles = {
    "zh-CN": "2026 手游排行榜 TOP 100 | iOS 安卓热门游戏攻略与配队推荐",
    "zh-TW": "2026 手遊排行榜 TOP 100 | iOS Android 熱門遊戲攻略與配隊推薦",
    en: "Top 100 Mobile Games 2026 — Rankings, Tier Lists & Patch Guides"
  } as Record<string, string>;
  const descs = {
    "zh-CN": "GameRank Pro 是 2026 年最专业的手游排行榜与攻略聚合站。覆盖 100 款热门 iOS/安卓游戏综合热度榜、分类榜、权威评分；每款游戏 5 篇版本适配攻略（新手/配队/Boss 打法/抽卡规划/FAQ），抓包、洗稿均不可，事实校验严格。",
    "zh-TW": "GameRank Pro 是 2026 年最專業的手遊排行榜與攻略聚合站。涵蓋 100 款熱門 iOS/安卓遊戲綜合熱度榜、分類榜、權威評分；每款遊戲 5 篇版號適配攻略（新手/配隊/Boss 打法/抽卡規劃/FAQ）。",
    en: "GameRank Pro is the 2026 up-to-date aggregator for the top 100 iOS + Android mobile games in the world. Cross-platform global popularity, 10 genre category rankings, critic/user ratings. Every game ships 5 patch-specific walkthroughs: Beginner, Tier-list & Team Comps, Boss Strategy, Gacha Planner and FAQ."
  } as Record<string, string>;

  const alternates = {
    canonical: `/${locale}`,
    languages: {
      "zh-CN": "/zh-CN",
      "zh-TW": "/zh-TW",
      en: "/en",
      // x-default fallback for geo-redirect
      "x-default": "/en"
    }
  };

  return {
    metadataBase,
    title: {
      default: titles[locale] + suffix,
      template: `%s${suffix}`
    },
    description: descs[locale],
    keywords: (() => {
      switch (locale) {
        case "zh-CN":
          return ["手游排行榜", "2026手游推荐", "手机游戏排行", "ios手游", "安卓手游", "游戏攻略", "手游配队推荐", "抽卡攻略", "boss打法"];
        case "zh-TW":
          return ["手遊排行榜", "2026手遊推薦", "手機遊戲排行", "ios手遊", "android手遊", "遊戲攻略", "手遊配隊推薦", "抽卡攻略"];
        default:
          return ["top 100 mobile games 2026", "best mobile games", "ios android game rankings", "gacha guide", "tier list", "team comp", "boss guide", "patch walkthrough"];
      }
    })(),
    authors: [{ name: "GameRank Pro Editorial" }],
    creator: "GameRank Pro",
    publisher: "GameRank Pro",
    category: "Games / Mobile Games / Video Game Strategy Guides",
    alternates,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      locale,
      siteName: messages.site.name,
      url: `/${locale}`,
      title: titles[locale],
      description: descs[locale],
      images: [
        {
          url: "/og-cover.svg",
          width: 1200,
          height: 630,
          alt: titles[locale],
          type: "image/svg+xml"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: titles[locale],
      description: descs[locale],
      creator: "@GameRankPro"
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1
      }
    },
    // Canonical + alternates + favicon already covered; explicit verification
    verification: {
      // google: "REPLACE_WITH_GOOGLE_SEARCH_CONSOLE_HTML_TAG", — fill in when connecting GSC
      // other: { me: ["REPLACE_BING_WEBMASTER_META"] }
    }
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const messages = getMessages(locale) as Messages;
  const siteUrl = SITE_URL;

  // Top 12 hot games for MegaFooter internal-link hub
  const top12Raw = await prisma.game.findMany({
    orderBy: [{ globalRank: "asc" }],
    take: 12,
    include: { i18n: { select: GAME_I18N_SELECT } }
  }).catch(() => []);
  const top12 = top12Raw.map((g) => {
    try {
      const reshaped = reshapeGame(g);
      const nameMap: Record<string, string> = {};
      reshaped.i18n.forEach((i) => (nameMap[i.locale] = i.name));
      return { slug: reshaped.slug, name: nameMap };
    } catch {
      return null;
    }
  }).filter((x): x is { slug: string; name: Record<string, string> } => !!x);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Website + Organization schema at layout level (shared) */}
        <JsonLd id={`website-${locale}`} data={websiteSchema(siteUrl, locale)} />
        <JsonLd id={`org-${locale}`} data={organizationSchema(siteUrl, locale)} />
        {/* Prefetch public CDN origin for speed */}
        <link rel="preconnect" href={siteUrl} />
        <link rel="dns-prefetch" href={siteUrl} />
        <meta name="author" content="GameRank Pro Editorial" />
        <meta name="robots" content="max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      </head>
      <body className="min-h-screen flex flex-col">
        <LocaleContextProvider locale={locale} messages={messages}>
          <Header />
          <main className="flex-1 container py-6 md:py-10">{children}</main>
          <MegaFooter top12Games={top12} locale={locale} />
        </LocaleContextProvider>
      </body>
    </html>
  );
}


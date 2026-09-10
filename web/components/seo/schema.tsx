/**
 * JSON-LD injector — outputs a plain <script> tag (App Router compatible).
 * We intentionally do NOT use next/script with beforeInteractive — App Router
 * docs disallow it; inline application/ld+json scripts render immediately with
 * the same SEO value (Googlebot parses HTML regardless of next/script strategy).
 */
export function JsonLd({ data, id }: { data: unknown; id?: string }) {
  const stableId = id || ("jsonld-" + hashOf(JSON.stringify(data)));
  return (
    <script
      id={stableId}
      type="application/ld+json"
      // Do not add "defer" / "async" — crawlers must read this inline with the HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function hashOf(s: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

export function websiteSchema(siteUrl: string, locale: string, altName = "GameRank") {
  const nameByLocale = {
    "zh-CN": "GameRank Pro - 手游排行榜与攻略中心",
    "zh-TW": "GameRank Pro - 手遊排行榜與攻略中心",
    en: "GameRank Pro - Mobile Game Rankings & Guides"
  } as Record<string, string>;
  const descByLocale = {
    "zh-CN": "2026 年最新 100 款热门 iOS / Android 手游排行榜、权威评分、版本适配游戏攻略、配队推荐与 Boss 打法。",
    "zh-TW": "2026 年最新 100 款熱門 iOS / Android 手遊排行榜、權威評分、版號適配遊戲攻略、配隊推薦與 Boss 打法。",
    en: "2026 Top 100 iOS & Android mobile game rankings, aggregate critic/user ratings, patch-adapted walkthroughs, team comps, boss guides and gacha planners."
  } as Record<string, string>;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: nameByLocale[locale] || "GameRank Pro",
    alternateName: altName,
    description: descByLocale[locale],
    inLanguage: locale,
    // Explicit SearchAction → 让 Google 在 SERP 上出现站内搜索框 (Sitelinks Searchbox)
    potentialAction: [
      {
        "@type": "SearchAction",
        target: `${siteUrl}/${locale}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    ]
  };
}

// ---- Organization (for Homepage E-E-A-T) ----
export function organizationSchema(siteUrl: string, locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "GameRank Pro",
    alternateName: "GameRank.pro",
    url: siteUrl,
    inLanguage: locale,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/favicon.svg`,
      width: 512,
      height: 512
    },
    sameAs: [
      `${siteUrl}/`,
      `${siteUrl}/${locale}/top-games`
    ],
    // DMCA / Copyright contact
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "copyright / dmca",
      email: "dmca@gamerank.pro",
      url: `${siteUrl}/${locale}#copyright`,
      availableLanguage: ["zh-CN", "zh-TW", "en"]
    },
    areaServed: "Worldwide",
    // Our editorial model
    publishingPrinciples: `${siteUrl}/${locale}#editorial`
  };
}

// ---- CollectionPage (Top-Games / Category roundups) ----
export function collectionPageSchema(args: {
  url: string;
  locale: string;
  title: string;
  description: string;
  items: { name: string; url: string; position: number; image?: string }[];
  lastModified: Date;
  breadcrumbItems: { name: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${args.url}#webpage`,
        url: args.url,
        name: args.title,
        description: args.description,
        inLanguage: args.locale,
        dateModified: args.lastModified.toISOString(),
        mainEntity: {
          "@type": "ItemList",
          itemListElement: args.items.map((it) => ({
            "@type": "ListItem",
            position: it.position,
            name: it.name,
            url: it.url,
            ...(it.image ? { image: it.image } : {})
          }))
        }
      },
      breadcrumbListSchema(args.breadcrumbItems)
    ]
  };
}

export function videoGameSchema(args: {
  name: string;
  gameSlug: string;
  siteUrl: string;
  locale: string;
  description: string;
  image?: string;
  banner?: string;
  platforms?: string[];
  genres?: string[];
  ratingValue?: number;
  ratingCount?: number;
  bestRating?: number;
  worstRating?: number;
  publisher?: string;
  developer?: string;
  releaseDate?: string;
  updatedAt?: string;
  keywords?: string;
  trailerUrl?: string;
  screenshots?: string[];
}) {
  const {
    name, gameSlug, siteUrl, locale, description, image, banner, platforms, genres,
    ratingValue, ratingCount, bestRating = 100, worstRating = 0,
    publisher, developer, releaseDate, updatedAt, keywords, trailerUrl, screenshots
  } = args;
  const url = `${siteUrl}/${locale}/games/${gameSlug}`;
  const platformMap: Record<string, string> = {
    ios: "https://schema.org/iOS",
    android: "https://schema.org/Android"
  };
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "@id": `${url}#game`,
    url,
    name,
    description,
    inLanguage: locale,
    keywords,
    ...(image ? { image: [image, ...(screenshots || []).slice(0, 4)].filter(Boolean) } : {}),
    ...(banner ? { thumbnailUrl: banner } : {}),
    ...(platforms?.length ? { gamePlatform: platforms.map((p) => platformMap[p.toLowerCase()] || p) } : {}),
    ...(genres?.length ? { genre: genres } : {}),
    ...(developer ? { creator: { "@type": "Organization", name: developer } } : {}),
    ...(publisher ? { publisher: { "@type": "Organization", name: publisher } } : {}),
    ...(releaseDate ? { datePublished: releaseDate } : {}),
    ...(updatedAt ? { dateModified: updatedAt } : {}),
    ...(trailerUrl ? {
      trailer: {
        "@type": "VideoObject",
        name: `${name} Official Trailer`,
        url: trailerUrl,
        thumbnailUrl: banner || image,
        embedUrl: trailerUrl,
        ...(releaseDate ? { uploadDate: releaseDate } : {})
      }
    } : {}),
    ...(ratingValue ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue,
        bestRating,
        worstRating,
        ratingCount: ratingCount || 1
      }
    } : {})
  };
}

// ---- SoftwareApplication schema (mobile app page) → 配合 VideoGame 使用，覆盖 "应用商店类" long-tail ----
export function softwareApplicationSchema(args: {
  name: string;
  slug?: string;           // Legacy compatibility: compute page URL from siteUrl + slug
  siteUrl?: string;        // Legacy compat
  url?: string;            // Preferred: direct canonical page URL
  locale: string;
  description: string;
  icon?: string;           // same as image
  image?: string;
  platforms?: ("ios" | "android")[] | string[];
  operatingSystem?: string; // Pre-joined override (e.g. "IOS / ANDROID")
  categories?: string[];
  applicationCategory?: string;
  ratingValue?: number;    // 1-5 scale
  ratingCount?: number;
  appStoreId?: string;
  fileSizeBytes?: number;
  fileSize?: string;       // Pre-formatted e.g. "500 MB"
  version?: string;        // softwareVersion
  price?: string;
  screenshots?: (string | null)[] | null;
  downloadUrl?: { android?: string | null; ios?: string | null; official?: string | null } | null;
  publisherName?: string | null;
  developerName?: string | null;
  releasedAt?: string | null;     // ISO date YYYY-MM-DD
  inAppPurchasePriceRange?: string | null;
}) {
  const {
    name, locale, description, version, price = "Free",
    applicationCategory = "GameApplication"
  } = args;
  const url =
    args.url ||
    (args.siteUrl && args.slug ? `${args.siteUrl}/${locale}/games/${args.slug}` : "");
  const os =
    args.operatingSystem ||
    (Array.isArray(args.platforms) ? args.platforms.map((p) => String(p).toUpperCase()).join(" / ") : "IOS / ANDROID");
  const appStore = args.downloadUrl?.ios;
  const playStore = args.downloadUrl?.android;
  const official = args.downloadUrl?.official;

  const sameAs: string[] = [];
  if (args.appStoreId) sameAs.push(`https://apps.apple.com/app/id${args.appStoreId}`);
  if (appStore) sameAs.push(appStore);
  if (playStore) sameAs.push(playStore);
  if (official) sameAs.push(official);

  const result: any = {
    "@context": "https://schema.org",
    "@type": "MobileApplication" as const,
    "@id": `${url}#app`,
    url,
    name,
    description,
    inLanguage: locale,
    operatingSystem: os,
    applicationCategory,
    applicationSubCategory: (args.categories || []).join(","),
    ...(args.version ? { softwareVersion: args.version } : {}),
    ...(args.image || args.icon ? { image: args.image || args.icon, thumbnailUrl: args.image || args.icon } : {}),
    ...(args.fileSize ? { fileSize: args.fileSize } : args.fileSizeBytes ? { fileSize: `${args.fileSizeBytes} B` } : {}),
    ...(args.releasedAt ? { datePublished: args.releasedAt } : {}),
    ...(args.developerName ? { author: { "@type": "Organization", name: args.developerName } } : {}),
    ...(args.publisherName ? { publisher: { "@type": "Organization", name: args.publisherName } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(args.screenshots?.length ? { screenshot: args.screenshots } : {}),
    ...(args.inAppPurchasePriceRange ? { offers: [
      {
        "@type": "Offer",
        name: "Base game",
        price: price === "Free" ? 0 : price,
        priceCurrency: locale === "zh-CN" ? "CNY" : locale === "zh-TW" ? "TWD" : "USD",
        availability: "https://schema.org/InStock"
      },
      {
        "@type": "Offer",
        name: "In-app purchases",
        description: args.inAppPurchasePriceRange,
        priceCurrency: locale === "zh-CN" ? "CNY" : locale === "zh-TW" ? "TWD" : "USD",
        availability: "https://schema.org/InStock"
      }
    ] } : {
      offers: {
        "@type": "Offer",
        price: price === "Free" ? 0 : price,
        priceCurrency: locale === "zh-CN" ? "CNY" : locale === "zh-TW" ? "TWD" : "USD",
        availability: "https://schema.org/InStock"
      }
    }),
    ...(args.ratingValue ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: args.ratingValue,
        bestRating: 5,
        worstRating: 0,
        ratingCount: args.ratingCount || 1
      }
    } : {})
  };
  return result;
}

// ---- Article (Game Guide) enhanced: wordCount, keywords, inLanguage explicit ----
export function articleSchema(args: {
  headline: string;
  description: string;
  guideUrl: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  authorName?: string;
  locale: string;
  wordCount?: number;
  keywords?: string[];
  gameName?: string;
  gameVersion?: string;
  type?: string; // beginner / team / boss / gacha / faq
}) {
  const {
    headline, description, guideUrl, image, datePublished, dateModified,
    authorName = "GameRank Pro Editorial", locale, wordCount, keywords,
    gameName, gameVersion, type
  } = args;
  const articleSections: Record<string, string> = {
    beginner: "Beginner Guides",
    team: "Team Comps",
    boss: "Boss Strategy",
    gacha: "Gacha Planner",
    faq: "FAQ"
  };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${guideUrl}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": guideUrl },
    headline,
    description,
    inLanguage: locale,
    ...(image ? { image: [image] } : {}),
    datePublished,
    dateModified,
    author: { "@type": "Organization", name: authorName },
    editor: { "@type": "Organization", name: "GameRank Pro Editorial" },
    publisher: {
      "@type": "Organization",
      name: "GameRank Pro",
      logo: { "@type": "ImageObject", url: new URL("/favicon.svg", guideUrl).toString() }
    },
    ...(wordCount ? { wordCount } : {}),
    ...(keywords?.length ? { keywords } : {}),
    ...(gameName ? { about: [{ "@type": "Thing", name: gameName }] } : {}),
    ...(type ? { articleSection: articleSections[type] || "Guides" } : {}),
    version: gameVersion || "1.0"
  };
}

// ---- FAQPage: 攻略/FAQ 页吃 Google Featured Snippets 的核心结构 ----
export interface FaqQA {
  question: string;
  answer: string; // plain text or HTML
  answerPlain: string; // use for JSON-LD (no tags)
}
export function faqPageSchema(url: string, faqs: FaqQA[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: faqs
      .filter((f) => f.question && f.answerPlain)
      .slice(0, 30)
      .map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answerPlain
        }
      }))
  };
}

// ---- HowTo: Boss / 配队 / 新手 (带步骤编号的攻略) 出步骤富摘要 ----
export interface HowToStep {
  name: string;
  text: string;
  image?: string;
  videoUrl?: string;
  durationSeconds?: number;
}
export function howToSchema(args: {
  url: string;
  title: string;
  description: string;
  locale: string;
  image?: string;
  totalSeconds?: number;
  yieldLabel?: string; // e.g. "通关该 Boss"
  steps: HowToStep[];
}) {
  const langStr = { "zh-CN": "zh-Hans", "zh-TW": "zh-Hant", en: "en" } as Record<string, string>;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${args.url}#howto`,
    inLanguage: langStr[args.locale] || args.locale,
    name: args.title,
    description: args.description,
    ...(args.image ? { image: args.image } : {}),
    ...(args.totalSeconds ? { totalTime: `PT${Math.floor(args.totalSeconds / 60)}M${args.totalSeconds % 60}S` } : {}),
    ...(args.yieldLabel ? { yield: args.yieldLabel } : {}),
    step: args.steps.slice(0, 20).map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.name,
      text: s.text,
      ...(s.image ? { image: s.image } : {}),
      ...(s.videoUrl ? { video: { "@type": "VideoObject", contentUrl: s.videoUrl } } : {})
    }))
  };
}

// ---- Product schema (for star-rating Knowledge Panel + Google Shopping-style snippets) ----
export function productSchema(args: {
  name: string;
  url: string;
  description: string;
  image?: string;
  ratingValue?: number;   // 1-5 (divide globalScore by 20)
  ratingCount?: number;
  bestRating?: number;
  worstRating?: number;
  locale: string;
  brandName?: string;
  offers?: {
    price: number;
    priceCurrency: string;
    availability?: "InStock" | "OutOfStock" | "PreOrder";
    url?: string;
  };
  sku?: string;
  mpn?: string;
  gtin13?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${args.url}#product`,
    inLanguage: args.locale,
    name: args.name,
    image: args.image,
    description: args.description,
    sku: args.sku,
    mpn: args.mpn,
    gtin13: args.gtin13,
    url: args.url,
    brand: { "@type": "Brand", name: args.brandName || "GameRank Pro Featured" },
    ...(args.ratingValue && args.ratingValue > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: args.ratingValue,
            bestRating: args.bestRating || 5,
            worstRating: args.worstRating || 1,
            ratingCount: args.ratingCount || 1,
            reviewCount: args.ratingCount || 1
          }
        }
      : {}),
    ...(args.offers
      ? {
          offers: {
            "@type": "Offer",
            url: args.offers.url || args.url,
            priceCurrency: args.offers.priceCurrency,
            price: args.offers.price,
            availability: `https://schema.org/${args.offers.availability || "InStock"}`,
            seller: { "@type": "Organization", name: "GameRank Pro Editorial" }
          }
        }
      : {})
  };
}

// ---- Review schema (小编综合评分 / 单条评测 富摘要) ----
export function reviewSchema(args: {
  url: string;
  gameName: string;
  authorOrg?: string;
  ratingValue: number;
  bestRating?: number;
  worstRating?: number;
  ratingAspect?: { criterion: string; value: number }[]; // Graphics, Playability, Monetization, F2P-friendliness
  body: string;
  locale: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "@id": `${args.url}#review`,
    inLanguage: args.locale,
    itemReviewed: { "@type": "VideoGame", name: args.gameName },
    author: { "@type": "Organization", name: args.authorOrg || "GameRank Pro Editorial" },
    reviewBody: args.body,
    reviewRating: {
      "@type": "Rating",
      ratingValue: args.ratingValue,
      bestRating: args.bestRating || 100,
      worstRating: args.worstRating || 0,
      ...(args.ratingAspect?.length ? { reviewAspect: args.ratingAspect.map((r) => ({
        "@type": "Rating",
        aspect: r.criterion,
        ratingValue: r.value
      })) } : {})
    }
  };
}

export function breadcrumbListSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url
    }))
  };
}

export function itemListSchema(url: string, items: { name: string; url: string; position: number; image?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${url}#itemlist`,
    url,
    itemListElement: items.map((it) => ({
      "@type": "ListItem",
      position: it.position,
      name: it.name,
      url: it.url,
      ...(it.image ? { image: it.image } : {})
    }))
  };
}


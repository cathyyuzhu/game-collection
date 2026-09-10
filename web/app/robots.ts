import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // BlueStacks SEO: explicitly block search & api pages (thin/param content)
        disallow: [
          "/api/",
          "/_next/",
          "/*?*q=",       // query-param URLs (search duplicates)
          "/search",
          "/search/",
          "*/search*"
        ],
        crawlDelay: 2
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/search", "/search/", "*/search*"],
        crawlDelay: 1
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/",
        disallow: ["/api/", "/search"]
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/search", "/search/"],
        crawlDelay: 3
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: ["/api/", "/search"],
        crawlDelay: 3
      },
      {
        userAgent: "baiduspider",
        allow: "/",
        disallow: ["/api/", "/search"],
        crawlDelay: 3
      }
    ],
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/zh-CN/sitemap.xml`,
      `${base}/zh-TW/sitemap.xml`,
      `${base}/en/sitemap.xml`
    ],
    host: base
  };
}


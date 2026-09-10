import type { MetadataRoute } from "next";
import { LOCALES, type Locale } from "@/lib/i18n/config";

// Root sitemap index: lists each locale's individual sitemap
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return LOCALES.map((loc: Locale) => ({
    url: `${base}/${loc}/sitemap.xml`,
    lastModified: new Date()
  }));
}

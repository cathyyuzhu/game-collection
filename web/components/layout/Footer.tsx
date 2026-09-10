"use client";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/components/layout/LocaleHooks";

export function Footer() {
  const { t, locale } = useLocale();
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur">
      <div className="container py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple via-brand-pink to-brand-blue flex items-center justify-center shadow">
              <span className="text-white font-bold text-xs">GR</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{t("site.name")}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-md leading-6">{t("footer.copyright")}</p>
          <p className="mt-3 text-emerald-600 dark:text-emerald-400 text-xs font-medium">✨ {t("footer.noAds")}</p>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">GameRank Pro</h4>
          <ul className="space-y-2 text-slate-500 dark:text-slate-400">
            <li><Link className="hover:text-brand-purple" href={`/${locale}`}>{t("nav.home")}</Link></li>
            <li><Link className="hover:text-brand-purple" href={`/${locale}/games`}>{t("nav.games")}</Link></li>
            <li><Link className="hover:text-brand-purple" href={`/${locale}/sitemap.xml`}>{t("footer.sitemap")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Languages</h4>
          <ul className="space-y-2 text-slate-500 dark:text-slate-400">
            <li><Link className="hover:text-brand-purple" href={replaceLocale(locale, "zh-CN")}>简体中文</Link></li>
            <li><Link className="hover:text-brand-purple" href={replaceLocale(locale, "zh-TW")}>繁體中文</Link></li>
            <li><Link className="hover:text-brand-purple" href={replaceLocale(locale, "en")}>English</Link></li>
          </ul>
        </div>
      </div>
      <Separator />
      <div className="container py-5 text-xs text-slate-400 dark:text-slate-500 flex flex-col md:flex-row justify-between gap-2">
        <span>© 2026 {t("site.name")}. All rights reserved.</span>
        <span>Built with Next.js · SEO Optimized · 100% Ad-Free (beta)</span>
      </div>
    </footer>
  );
}

import { swapLocale, type Locale as LocaleT } from "@/lib/i18n/config";
function replaceLocale(currentLocale: LocaleT, target: LocaleT) {
  // simple helper: footer hrefs just go to /target (home)
  void currentLocale;
  return "/" + target;
}
// keep swapLocale import referenced (for future use)
void swapLocale;

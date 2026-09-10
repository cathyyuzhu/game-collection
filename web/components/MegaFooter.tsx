"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GameCategoryList, GamePlatformList, tl as t } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/config";

/**
 * 🦶 Mega Footer (BlueStacks-inspired)
 * Key SEO tactic: a giant footer acts as site-wide internal-link network,
 * giving PageRank to every category and major landing page.
 *
 * Structure (aligned with the 3-locale strategy):
 *   Col 1: Categories (top 10 types, canonical links → high-value "RPG games 2026" long-tail)
 *   Col 2: Platforms (iOS / Android) + Top-Games roundup page
 *   Col 3: Hot Games (Top 12 by globalRank) → drives crawl-depth + internal link juice
 *   Col 4: Site / Brand (Home / About / Privacy / Disclaimer) — E-E-A-T signals
 *   Bottom: 3-locale switch links (explicit, not JS-only, helps SEO hreflang)
 */
export default function MegaFooter({
  top12Games,
  locale: localeProp
}: {
  top12Games: { slug: string; name: Record<string, string> }[];
  locale: Locale;
}) {
  const loc = usePathname().split("/")[1] || localeProp; // /zh-CN/xxx → zh-CN
  const locale = (isLocale(loc) ? loc : localeProp) as Locale;
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  void Card;

  const switchLocale = (next: string) => {
    // Strip current locale prefix from pathname, e.g. /zh-CN/games/genshin → /games/genshin
    const rest = pathname.split("/").slice(2).join("/");
    return rest ? `/${next}/${rest}` : `/${next}`;
  };

  const brand = t(locale, "site.name");
  const tagline = t(locale, "site.tagline");

  // Use UTC year to match SSR vs client hydration (prevents Dec 31/Jan 1 split across timezones).
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-24 border-t border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
      {/* =========== TOP CTA BAND =========== */}
      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-8 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
              🔥 {locale === "zh-CN" ? "订阅 2026 手游排行榜月报" :
                locale === "zh-TW" ? "訂閱 2026 手機遊戲排行榜月報" :
                "Get the monthly Top Mobile Games report (2026)"}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              {locale === "zh-CN" ? "每月一封邮件：全球热榜 Top100、5 个版本强势角色、最新攻略合集。零广告，随时取消订阅。" :
                locale === "zh-TW" ? "每月一封 Email：全球熱榜 Top100、5 個版本強勢角色、最新攻略合集。零廣告，隨時取消。" :
                "Top 100 World Ranking, 5 meta must-pull heroes, and new guide digest — once a month. No spam. Unsubscribe any time."}
            </p>
          </div>
          <form
            className="flex gap-2 w-full md:max-w-md md:ml-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder={locale === "zh-CN" ? "输入你的邮箱..." :
                locale === "zh-TW" ? "輸入你的 Email..." :
                "your@email.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-purple/40"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-brand-purple to-brand-pink text-white px-5 py-3 text-sm font-bold whitespace-nowrap shadow hover:opacity-95 transition"
            >
              {locale === "zh-CN" ? "免费订阅" :
                locale === "zh-TW" ? "免費訂閱" :
                "Subscribe free"}
            </button>
          </form>
        </div>
      </section>

      {/* =========== MAIN GRID (4 col on xl, 2 on md, stacked on sm) =========== */}
      <section className="mx-auto max-w-7xl px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8">
        {/* Col 1: Brand + Categories */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-purple via-brand-pink to-brand-orange grid place-items-center text-white font-black shadow-lg">
              G
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange bg-clip-text text-transparent">
              {brand}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tagline}</p>
          <p className="mt-4 text-xs uppercase tracking-wider text-slate-400 font-semibold">
            {t(locale, "nav.categories")} <span className="opacity-50">(10)</span>
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-y-2 gap-x-3 text-sm">
            {GameCategoryList.map((cat) => (
              <li key={cat}>
                <Link
                  href={`/${locale}/categories/${cat}`}
                  className="hover:text-brand-purple dark:hover:text-brand-pink text-slate-700 dark:text-slate-300 transition"
                  title={`${t(locale, `categories.${cat}`)} ${locale === "zh-CN" ? "手游推荐 2026" : locale === "zh-TW" ? "手遊推薦 2026" : "recommendations 2026"}`}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-purple/50 mr-2 align-middle" />
                  {t(locale, `categories.${cat}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 2: Platforms + Roundup pages */}
        <div>
          <h4 className="text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-white">
            {locale === "zh-CN" ? "排行榜中心" :
              locale === "zh-TW" ? "排行榜中心" :
              "Rankings Hub"}
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link
                href={`/${locale}/top-games`}
                className="group hover:text-brand-purple text-slate-700 dark:text-slate-300 flex items-center gap-2"
              >
                <span className="text-lg">🏆</span>
                <b className="group-hover:underline">
                  {locale === "zh-CN" ? "2026 全球手游排行榜 TOP 100" :
                    locale === "zh-TW" ? "2026 全球手遊排行 TOP 100" :
                    "Top 100 Mobile Games of 2026"}
                </b>
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/games?platform=ios`} className="hover:text-brand-purple text-slate-700 dark:text-slate-300 flex items-center gap-2">
                🍎 {t(locale, "platforms.ios")} {t(locale, "game.globalRank")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/games?platform=android`} className="hover:text-brand-purple text-slate-700 dark:text-slate-300 flex items-center gap-2">
                🤖 {t(locale, "platforms.android")} {t(locale, "game.globalRank")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/categories`} className="hover:text-brand-purple text-slate-700 dark:text-slate-300 flex items-center gap-2">
                🗂️ {locale === "zh-CN" ? "按类型找游戏" : locale === "zh-TW" ? "按類型找遊戲" : "Browse by category"}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/games`} className="hover:text-brand-purple text-slate-700 dark:text-slate-300 flex items-center gap-2">
                🎮 {t(locale, "nav.allGames")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/search`} className="hover:text-brand-purple text-slate-700 dark:text-slate-300 flex items-center gap-2">
                🔍 {t(locale, "nav.search")}
              </Link>
            </li>
          </ul>

          <h4 className="mt-8 text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-white">
            {locale === "zh-CN" ? "平台" : locale === "zh-TW" ? "平台" : "Platforms"}
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {GamePlatformList.map((p) => (
              <li key={p}>
                <Link
                  href={`/${locale}/games?platform=${p}`}
                  className="hover:text-brand-purple text-slate-700 dark:text-slate-300"
                >
                  {t(locale, `platforms.${p}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Hot Games (Top 12) */}
        <div>
          <h4 className="text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-white">
            🔥 {locale === "zh-CN" ? "本周热门手游 (Top 12)" :
              locale === "zh-TW" ? "本週熱門 (Top 12)" :
              "Hot This Week (Top 12)"}
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            {top12Games.map((g, i) => {
              const name = g.name[locale] || g.name.en || g.slug;
              return (
                <li key={g.slug} className="flex items-center gap-2">
                  <span className={`text-[10px] rounded-md px-1.5 py-0.5 font-bold text-white
                    ${i < 3 ? "bg-gradient-to-r from-amber-500 to-rose-500" :
                      "bg-slate-400/70 dark:bg-slate-600"}`}>
                    #{i + 1}
                  </span>
                  <Link
                    href={`/${locale}/games/${g.slug}`}
                    className="truncate hover:text-brand-purple text-slate-700 dark:text-slate-300 hover:underline"
                    title={`${name}${locale === "zh-CN" ? " 最新版攻略与排行榜位置" : locale === "zh-TW" ? " 最新版攻略與排行位置" : " ranking + latest patch guides"}`}
                  >
                    {name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Col 4: E-E-A-T brand links + Social */}
        <div>
          <h4 className="text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-white">
            {locale === "zh-CN" ? "关于本站" :
              locale === "zh-TW" ? "關於本站" :
              "Brand & Trust"}
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
            <li className="hover:text-brand-purple cursor-default">
              🕒 {locale === "zh-CN" ? "数据更新：每日 12:00 + 18:00" :
                locale === "zh-TW" ? "資料更新：每日 12:00 + 18:00" :
                "Ranking refresh: 12:00 & 18:00 UTC+8"}
            </li>
            <li className="hover:text-brand-purple cursor-default">
              📝 {locale === "zh-CN" ? "每篇攻略标注适用游戏版本号" :
                locale === "zh-TW" ? "每篇攻略標註適用遊戲版號" :
                "Every guide labeled by applicable game patch"}
            </li>
            <li className="hover:text-brand-purple cursor-default">
              ⚖️ {locale === "zh-CN" ? "来源留痕 + LLM 改写相似度 < 30%" :
                locale === "zh-TW" ? "來源留痕 + LLM 改寫相似度 < 30%" :
                "Source traceable & LLM-rewrite similarity < 30%"}
            </li>
          </ul>

          <h4 className="mt-8 text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-white">
            {locale === "zh-CN" ? "语言版本" : locale === "zh-TW" ? "語言版本" : "Language versions"}
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            {(["zh-CN", "zh-TW", "en"] as const).map((l) => {
              const labels: Record<string, string> = {
                "zh-CN": "🇨🇳 简体中文 / Simplified Chinese",
                "zh-TW": "🇭🇰 繁體中文 / Traditional Chinese",
                "en": "🌐 English / International"
              };
              const active = l === locale;
              return (
                <li key={l}>
                  {active ? (
                    <span className="text-slate-900 dark:text-white font-semibold inline-flex items-center gap-2">
                      {labels[l]} <span className="text-[10px] bg-emerald-500 text-white rounded px-1.5 py-0.5">ACTIVE</span>
                    </span>
                  ) : (
                    <Link href={switchLocale(l)} className="hover:text-brand-purple text-slate-600 dark:text-slate-400 hover:underline">
                      {labels[l]}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* =========== DISCLAIMER STRIP (E-E-A-T + DMCA defense) =========== */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <b className="text-slate-700 dark:text-slate-300">⚠️ {t(locale, "footer.disclaimerH")}</b>
          {" "}{t(locale, "footer.disclaimer")}
        </div>
      </section>

      {/* =========== BOTTOM LEGAL =========== */}
      <section className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            © {year} {brand} · {locale === "zh-CN" ? "保留所有权利。内容由用户贡献及 LLM 二次整理。" :
              locale === "zh-TW" ? "保留所有權利。內容由用戶貢獻及 LLM 二次整理。" :
              "All rights reserved. Content community-sourced + LLM-refined for patch accuracy."}
          </div>
          <div className="flex items-center gap-5">
            <Link href={`/${locale}`} className="hover:text-brand-purple">
              {t(locale, "nav.home")}
            </Link>
            <Link href={`/${locale}/top-games`} className="hover:text-brand-purple">
              {locale === "zh-CN" ? "排行榜" : locale === "zh-TW" ? "排行榜" : "Rankings"}
            </Link>
            <Link href={`/${locale}/categories`} className="hover:text-brand-purple">
              {locale === "zh-CN" ? "分类" : locale === "zh-TW" ? "分類" : "Categories"}
            </Link>
            <Link href={`/${locale}/games`} className="hover:text-brand-purple">
              {locale === "zh-CN" ? "全游戏" : locale === "zh-TW" ? "全遊戲" : "All Games"}
            </Link>
            <Link href={`/${locale}/search`} className="hover:text-brand-purple">
              🔎
            </Link>
          </div>
        </div>
      </section>
    </footer>
  );
}

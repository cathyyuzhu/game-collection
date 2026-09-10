"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLocale } from "@/components/layout/LocaleHooks";
import { Search } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";

export function FilterGamesBar({
  locale,
  category,
  platform,
  sort,
  q,
  total
}: {
  locale: Locale;
  category: string;
  platform: string;
  sort: string;
  q: string;
  total: number;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [keyword, setKeyword] = useState(q);

  const update = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ category, platform, sort, q: keyword });
    Object.entries(patch).forEach(([k, v]) => {
      if (!v) params.delete(k);
      else params.set(k, v);
    });
    router.push(`/${locale}/games?${params.toString()}`);
  };

  const categoriesList = ["", "rpg", "strategy", "casual", "shooter", "card", "simulation", "action", "puzzle", "sports", "racing"];
  const platformsList = ["", "ios", "android"];
  const sortList = [
    { v: "rank", l: t("gamesPage.filters.sortByRank") },
    { v: "rating", l: t("gamesPage.filters.sortByRating") },
    { v: "newest", l: t("gamesPage.filters.sortByNewest") },
    { v: "name", l: t("gamesPage.filters.sortByName") }
  ];

  return (
    <Card className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-end">
      <div className="md:col-span-5">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">{t("nav.search")}</label>
        <form onSubmit={(e) => { e.preventDefault(); update({ q: keyword }); }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              className="pl-9 pr-3"
            />
          </div>
        </form>
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">{t("game.platform")}</label>
        <Select
          value={platform}
          onChange={(v) => update({ platform: v })}
          options={[
            { value: "", label: t("gamesPage.filters.allPlatforms") },
            ...platformsList.filter((p) => p).map((p) => ({ value: p, label: t(`game.${p}`) }))
          ]}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">{t("game.category")}</label>
        <Select
          value={category}
          onChange={(v) => update({ category: v })}
          options={categoriesList.map((c) => ({
            value: c,
            label: c ? t(`categories.${c}`) : t("gamesPage.filters.allCategories")
          }))}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">{t("gamesPage.filters.sortBy")}</label>
        <Select
          value={sort}
          onChange={(v) => update({ sort: v })}
          options={sortList.map((s) => ({ value: s.v, label: s.l }))}
        />
      </div>
      <div className="md:col-span-1 md:text-right text-xs text-slate-500">
        <div className="font-bold text-brand-purple text-sm">{total}</div>
        <span>games</span>
      </div>
    </Card>
  );
}

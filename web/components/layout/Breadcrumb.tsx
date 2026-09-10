"use client";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleHooks";
import type { Locale } from "@/lib/i18n/config";

export interface CrumbItem {
  name: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: CrumbItem[] }) {
  const { locale, t } = useLocale();
  const full: CrumbItem[] = [{ name: t("nav.home"), href: `/${locale}` }, ...items];
  return (
    <nav aria-label="breadcrumb" className="mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-slate-500 dark:text-slate-400">
        {full.map((c, idx) => {
          const isLast = idx === full.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1">
              {idx === 0 ? <Home className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
              {c.href && !isLast ? (
                <Link href={c.href} className="hover:text-brand-purple transition line-clamp-1 max-w-[180px]">
                  {c.name}
                </Link>
              ) : (
                <span className={isLast ? "text-slate-800 dark:text-slate-200 font-medium line-clamp-1 max-w-[260px]" : ""}>
                  {c.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

void ({} as Locale);

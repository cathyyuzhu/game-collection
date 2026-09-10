"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Gamepad2, Menu, X, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/layout/LocaleHooks";
import { LOCALE_LABELS, type Locale, swapLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function Header() {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/${locale}/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 backdrop-blur-lg bg-white/80 dark:bg-slate-950/80 dark:border-slate-800/80">
      <div className="container flex h-16 items-center gap-4">
        <Link href={`/${locale}`} className="flex items-center gap-2 shrink-0 group">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple via-brand-pink to-brand-blue flex items-center justify-center shadow-md group-hover:scale-105 transition">
            <Gamepad2 className="w-5 h-5 text-white" />
          </span>
          <span className="font-extrabold text-lg bg-gradient-to-r from-brand-purpleDark to-brand-blue bg-clip-text text-transparent hidden sm:inline">
            {t("site.name")}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 shrink-0 ml-2">
          <NavLink href={`/${locale}`} label={t("nav.home")} pathname={pathname} locale={locale} />
          <NavLink href={`/${locale}/games`} label={t("nav.games")} pathname={pathname} locale={locale} />
        </nav>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-xl mx-auto">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              className="pl-10 pr-20 h-10 w-full"
            />
            <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-4">
              {t("nav.search")}
            </Button>
          </div>
        </form>

        <div className="flex items-center ml-auto gap-2 shrink-0">
          <LocaleSwitcher />
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-3 bg-white dark:bg-slate-950">
          <form onSubmit={onSearch} className="w-full">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("nav.searchPlaceholder")} className="pl-9 w-full" />
            </div>
          </form>
          <div className="flex flex-col gap-1 text-sm font-medium">
            <Link href={`/${locale}`} onClick={() => setMenuOpen(false)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              🏠 {t("nav.home")}
            </Link>
            <Link href={`/${locale}/games`} onClick={() => setMenuOpen(false)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              🎮 {t("nav.games")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  label,
  pathname,
  locale
}: {
  href: string;
  label: string;
  pathname: string;
  locale: Locale;
}) {
  const segments = pathname.split("/").filter(Boolean);
  const targetSegments = href.split("/").filter(Boolean);
  const isActive =
    targetSegments.length <= 2
      ? segments[0] === locale && segments[1] === targetSegments[1]
      : segments.join("/") === targetSegments.join("/");
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-md text-sm font-medium transition",
        isActive
          ? "text-brand-purpleDark bg-brand-purple/10 dark:text-brand-purple"
          : "text-slate-700 hover:text-brand-purpleDark hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </Link>
  );
}

function LocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => {
              const target = swapLocale(pathname, l);
              document.cookie = `X-NEXT-LOCALE=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
              router.push(target);
            }}
            className={cn(l === locale && "bg-accent text-accent-foreground")}
          >
            {LOCALE_LABELS[l]} {l === locale && "✓"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

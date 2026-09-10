"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Lightbulb, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/layout/LocaleHooks";
import type { Locale } from "@/lib/i18n/config";
import { absoluteUrl, formatDate } from "@/lib/utils";

export function GuideMetaBar({
  guideType,
  gameVersion,
  updatedAt,
  readMinutes
}: {
  guideType: string;
  gameVersion: string;
  updatedAt: Date;
  readMinutes: number;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const params = useParams();
  void router; void params;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
      <Badge variant="purple" className="px-3 py-1">
        {t(`guide.type.${guideType}`) || guideType}
      </Badge>
      <Badge variant="warning" className="px-3 py-1">
        {t("guide.applicableVersion")}: {gameVersion}
      </Badge>
      <Badge variant="outline" className="px-3 py-1">
        {t("guide.lastUpdated")}: {formatDate(updatedAt, locale)}
      </Badge>
      <Badge variant="outline" className="px-3 py-1">
        {t("guide.readMinutes", { n: readMinutes })}
      </Badge>
    </div>
  );
}

export function TldrPanel({ tldr, keyPoints }: { tldr: string; keyPoints?: string[] }) {
  const { t } = useLocale();
  return (
    <div className="mb-8 rounded-2xl border-2 border-dashed border-brand-purple/40 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white shadow">
          <Lightbulb className="w-4 h-4" />
        </span>
        <h2 className="text-lg font-bold text-brand-purpleDark dark:text-brand-purple">{t("guide.tldr")}</h2>
      </div>
      <p className="leading-7 text-slate-800 dark:text-slate-200">{tldr}</p>
      {keyPoints && keyPoints.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">✅ {t("guide.corePoints")}</h3>
          <ul className="space-y-1.5">
            {keyPoints.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <span className="mt-2 w-1.5 h-1.5 shrink-0 rounded-full bg-brand-orange" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FeedbackButtons({ guideId }: { guideId: string }) {
  const { t } = useLocale();
  const [loading, setLoading] = React.useState<"useful" | "useless" | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (v: "useful" | "useless") => {
    setLoading(v);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId, isUseful: v === "useful" })
      });
      setDone(true);
    } finally {
      setLoading(null);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 p-4 text-sm font-medium">
        ✅ {t("guide.thanksForFeedback")}
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6">
      <div className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3">{t("guide.feedbackQuestion")}</div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => submit("useful")} disabled={!!loading} variant="outline" size="lg" className="hover:!bg-emerald-50 hover:!text-emerald-700 border border-emerald-200">
          {loading === "useful" ? "…" : t("guide.useful")}
        </Button>
        <Button onClick={() => submit("useless")} disabled={!!loading} variant="outline" size="lg" className="hover:!bg-red-50 hover:!text-red-700 border border-red-200">
          {loading === "useless" ? "…" : t("guide.useless")}
        </Button>
      </div>
    </div>
  );
}

export function ShareButton() {
  const { t } = useLocale();
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl(window.location.pathname));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <Button variant="ghost" size="sm" onClick={copy} className="gap-1.5 text-slate-600 dark:text-slate-300">
      {copied ? <><Check className="w-4 h-4 text-emerald-600" /> {t("guide.copyLink")}</> : <><Share2 className="w-4 h-4" /> {t("guide.share")}</>}
    </Button>
  );
}

export function GuideToc({ headings }: { headings: { id: string; text: string; level: number }[] }) {
  const { t } = useLocale();
  void t;
  return (
    <nav aria-label="toc" className="space-y-1 text-sm sticky top-24">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pl-3">{t("guide.tableOfContents")}</div>
      {headings.length === 0 && <div className="pl-3 text-slate-400 text-xs">-</div>}
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className="block border-l-2 border-transparent hover:border-brand-purple hover:text-brand-purple pl-3 py-1.5 text-slate-600 dark:text-slate-400 transition line-clamp-2"
          style={{ paddingLeft: 12 + (h.level - 1) * 12 }}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}

export function NoLocaleGuideNotice({ currentLocale }: { currentLocale: Locale }) {
  const { t } = useLocale();
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-6 text-center">
      <div className="text-4xl mb-3">🌐</div>
      <div className="text-amber-800 dark:text-amber-300 font-semibold">
        {t("guide.noLocaleContent", { locale: currentLocale })}
      </div>
    </div>
  );
}

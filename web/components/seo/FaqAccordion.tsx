"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FaqQA } from "@/components/seo/schema";

/**
 * 🪗 FAQ 手风琴区
 *  - 移动端友好折叠
 *  - 每条 Q 都独立 id，方便 #fragment 链接直达 + Google 锚点
 *  - 对应 FAQPage Schema（在 Server 组件里用 faqToSchema + JsonLd 单独注入）
 */
export function FaqAccordion({
  faqs,
  title,
  id = "faq",
}: {
  faqs: FaqQA[];
  title?: string;
  id?: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id={id} className="space-y-3">
      {title && (
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          {title}
        </h2>
      )}
      <ol className="space-y-3">
        {faqs.map((f, i) => {
          const open = openIdx === i;
          return (
            <li key={i} id={`faq-${i + 1}`} className="scroll-mt-24">
              <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
                <button
                  className="w-full px-5 md:px-6 py-4 text-left flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                >
                  <ChevronDown className={cn(
                    "mt-1 shrink-0 w-5 h-5 transition-transform text-slate-400 group-hover:text-brand-purple",
                    open && "rotate-180 text-brand-purple"
                  )} />
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-brand-purple/10 text-brand-purple mt-0.5">
                        Q{i + 1}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-7 group-hover:text-brand-purple transition">
                        {f.question}
                      </h3>
                    </div>
                  </div>
                </button>
                <div className={cn(
                  "grid transition-all duration-300 ease-out",
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}>
                  <div className="overflow-hidden">
                    <div
                      className="px-5 md:px-6 pb-5 md:pb-6 ml-10 prose prose-slate dark:prose-invert text-slate-700 dark:text-slate-300 text-sm md:text-[15px] leading-7 prose-a:text-brand-purple prose-strong:text-slate-900 dark:prose-strong:text-white max-w-none"
                      // answer 可能带 HTML / <br> 格式化（注意：仅在 server 端已 sanitize 下使用）
                      dangerouslySetInnerHTML={{ __html: f.answer }}
                    />
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

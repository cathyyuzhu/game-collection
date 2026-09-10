// Dynamic OG Image endpoint for game / guide detail pages.
// Returns a 1200x630 SVG (served as SVG). No @vercel/og/satori required → zero deps,
// works on Node / Edge runtime, renders perfectly in social crawlers.
//
// URL patterns:
//   /api/og/games-<slug>                → game detail OG card
//   /api/og/guide-<gameSlug>-<guideSlug> → guide OG card
//   /api/og/category-<slug>-<locale>    → category hub OG card
//   /api/og/topgames-<locale>           → top 100 roundup OG card
//   /api/og/home-<locale>               → homepage OG card

import { NextRequest } from "next/server";

type Params = { params: { slug: string } };

export const runtime = "edge";
export const revalidate = 604800; // 7d hard cache

export async function GET(_req: NextRequest, { params }: Params) {
  const slug = decodeURIComponent(params.slug || "home-en");

  let title = "Top 100 Mobile Games 2026";
  let subtitle = "GameRank Pro — Rankings · Tier Lists · 5 Patch Guides / Game";
  let headerTag = "GAMERANK · PRO";
  let accent = "#7c3aed";
  let meta = "www.gamerank.pro";

  if (slug.startsWith("games-")) {
    const s = slug.replace("games-", "");
    const [name, version, rank, score] = s.split("__");
    title = `${unesc(name)}`;
    const rankPart = rank ? `#${unesc(rank)} Global` : "Top 100";
    const scorePart = score ? ` · ${unesc(score)}/100` : "";
    const versionPart = version ? ` · v${unesc(version)}` : "";
    subtitle = `${rankPart}${scorePart}${versionPart} · 5 patch-specific guides (Beginner · Boss · Team · Gacha · FAQ)`;
    headerTag = "🎮 MOBILE GAME CARD";
    accent = "#22c55e";
    meta = "GameRank Pro · Patch verified 2026";
  } else if (slug.startsWith("guide-")) {
    const rest = slug.replace("guide-", "");
    const [game, gslug, type, version] = rest.split("__");
    const TYPE_LABEL: Record<string, string> = {
      beginner: "NEW PLAYER GUIDE",
      team: "META TEAM COMPS",
      boss: "BOSS STRATEGY",
      gacha: "GACHA & BANNER PLAN",
      faq: "FREQUENTLY ASKED QUESTIONS"
    };
    headerTag = TYPE_LABEL[type || "guide"] || "PATCH GUIDE";
    title = unesc(gslug);
    const ver = version ? ` (Patch v${unesc(version)})` : "";
    subtitle = `${unesc(game || "")}${ver} — Step-by-step walkthrough, TL;DR + FAQ + screenshots`;
    accent = "#f59e0b";
    meta = "GameRank Pro · Re-validated within 48 hours after every patch";
  } else if (slug.startsWith("category-")) {
    const rest = slug.replace("category-", "");
    const [cat, loc] = rest.split("__");
    headerTag = "GENRE HUB";
    title = unesc(cat).toUpperCase() + " · TOP RANKINGS";
    const locLabel: Record<string, string> = { "zh-CN": "中文版", "zh-TW": "繁體中文", en: "English" };
    subtitle = `${locLabel[loc || "en"] || ""} 100+ games ranked, every game ships 5 patch-specific guides.`;
    accent = "#0ea5e9";
    meta = "GameRank Pro · 10 Genre hubs worldwide";
  } else if (slug.startsWith("topgames-")) {
    const loc = slug.replace("topgames-", "");
    headerTag = "TOP 100 ROUNDUP";
    title = "TOP 100 MOBILE GAMES 2026";
    const locLabel: Record<string, string> = { "zh-CN": "全球热度榜 · 简体中文", "zh-TW": "全球熱度榜 · 繁體中文", en: "Global Popularity · English" };
    subtitle = `${locLabel[loc] || "Global popularity"} — iOS + Android cross-platform ranking, 48h patch freshness`;
    accent = "#ef4444";
    meta = "GameRank Pro · Updated hourly";
  } else if (slug.startsWith("home-")) {
    const loc = slug.replace("home-", "");
    headerTag = "GAMERANK · PRO";
    const locLabel: Record<string, string> = {
      "zh-CN": "2026 手游排行榜 TOP 100 — 攻略 · 配队 · 每版本更新",
      "zh-TW": "2026 手遊排行榜 TOP 100 — 攻略 · 配隊 · 每次版號更新",
      en: "Top 100 Mobile Games 2026 — Rankings, Tier Lists & 5 Patch Guides per Game"
    };
    title = locLabel[loc] || locLabel.en;
    subtitle = "iOS · Android cross-platform · 10 genre hubs · 500 guides · 3 languages";
    accent = "#7c3aed";
    meta = "www.gamerank.pro";
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="20%" r="80%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0b1020" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M1 1h2v2h-2z" fill="#ffffff" fill-opacity="0.05"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>

  <!-- Watermark top-left -->
  <g transform="translate(72, 64)">
    <rect rx="14" ry="14" width="56" height="56" fill="${accent}" opacity="0.95"/>
    <text x="28" y="40" font-family="Inter, sans-serif" font-weight="900" font-size="28" text-anchor="middle" fill="#fff">G</text>
    <text x="76" y="44" font-family="Inter, sans-serif" font-weight="800" font-size="30" fill="#fff">GameRank<tspan fill="#cbd5e1" font-weight="500"> Pro</tspan></text>
  </g>

  <!-- Tag pill -->
  <g transform="translate(72, 176)">
    <rect rx="999" ry="999" height="38" width="auto" x="0" y="0" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)">
      <animate attributeName="width" from="1" to="${Math.min(720, Math.max(320, headerTag.length * 15 + 40))}" dur="0.2s" fill="freeze"/>
    </rect>
    <text x="20" y="26" font-family="Inter, sans-serif" font-weight="700" font-size="18" letter-spacing="3" fill="#e0e7ff">
      ${headerTag}
    </text>
  </g>

  <!-- Title (max-width 1080) -->
  <g transform="translate(72, 276)">
    <foreignObject x="0" y="0" width="1056" height="220">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Inter, 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: #fff;
        font-size: 58px;
        line-height: 1.1;
        font-weight: 900;
        letter-spacing: -0.02em;
        overflow-wrap: anywhere;
        word-break: break-word;
        max-height: 220px;
        text-shadow: 0 4px 30px rgba(0,0,0,.5);
      ">${escapeHtml(title)}</div>
    </foreignObject>
  </g>

  <!-- Subtitle -->
  <g transform="translate(72, 500)">
    <foreignObject x="0" y="0" width="1056" height="72">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Inter, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
        color: #e2e8f0;
        font-size: 24px;
        line-height: 1.45;
        font-weight: 500;
        opacity: .92;
      ">${escapeHtml(subtitle)}</div>
    </foreignObject>
  </g>

  <!-- Meta bar bottom -->
  <g transform="translate(0, 572)">
    <line x1="72" y1="0" x2="1128" y2="0" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <g transform="translate(72, 22)">
      <circle cx="10" cy="10" r="6" fill="${accent}"/>
      <text x="28" y="15" font-family="Inter, sans-serif" font-size="18" font-weight="600" fill="#cbd5e1">
        ${meta}
      </text>
    </g>
    <g transform="translate(900, 18)">
      <text x="0" y="0" font-family="Inter, sans-serif" font-size="16" font-weight="600" text-anchor="end" fill="#94a3b8">
        ${new Date().getFullYear()} · GameRank Pro SEO Preview
      </text>
    </g>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400, immutable",
      "Content-Length": new Blob([svg]).size.toString()
    }
  });
}

function unesc(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}
function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

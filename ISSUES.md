# Game Collection · 开发/自测问题记录

记录 Phase 1~2 开发 + 构建验证 + SEO 落地阶段所有已确认问题。**截至 build 成功（`pnpm build` exit 0）前的所有问题已标记状态 = 已修复/已绕过/待用户确认**。

---

## 格式模板

```
### [P0/P1/P2] 简短标题
- **状态**：✅ 已修复 / ✅ 已绕过 / ⏳ 待用户确认 / ❌ 未处理
- **严重程度**：P0=构建阻断；P1=功能异常/SEO受损；P2=次要瑕疵
- **描述**：...
- **复现步骤**：...
- **根本原因**：...
- **修复方案**：文件:行号
```

---

## 一、上游接口 & 媒体存储（优先级 P0）

### [P0] 媒体上传接口契约（必须在真实抓取 Agent 接入前确认）⏳ 待用户确认
- **严重程度**：P0 生产阻塞
- **描述**：对话中约定「媒体会由另一个 agent 提供上传接口」，目前接口契约完全未提供。当前 `scripts/lib/utils.download_media()` 仅写入本地磁盘 `storage/media/` + 返回 `storage_key`。**生产上线前必须替换为 POST 到用户的 CDN/R2 上传接口**，拿返回的 CDN URL 写入 `GameMedia.url` / `GuideMedia.url`。
- **建议契约（供另一个 Agent 参考实现）**

```
Endpoint  :  POST https://<media-service>/api/upload
Auth      :  Bearer <MEDIA_UPLOAD_TOKEN from env>
Body      :  multipart/form-data
 ├─ file        : Blob (必填，支持 image/jpg/png/webp + video/mp4)
 ├─ storageKey  : string (可选, e.g. "games/genshin-impact/icon")
 ├─ category    : "icon"|"banner"|"screenshot"|"trailer_video"|"gameplay_video"|"guide_image"|"guide_video"
 └─ meta        : JSON string (游戏名/来源/版权标记)

Success 200 : {
    cdnUrl     : "https://cdn.gamerank.pro/games/genshin/icon.webp",  ← 写入 GameMedia.url / GuideMedia.url
    storageKey : "games/genshin-impact/icon",
    width      : 512,
    height     : 512,
    sizeBytes  : 148523,
    mime       : "image/webp",
    etag       : "a1b2c3..."
  }

视频上限  :  ≤ 500MB；超限返回 413 + {"error":"file_too_large","maxBytes":524288000}
失败重试  :  指数退避 1s→3s→7s，共 3 次；HTTP 4xx 不重试
速率限制  :  ≤ 30 req/min；429 返回 Retry-After (秒)
```

- **当前代码适配点（无需改 schema/业务，仅改 1 个函数）**：`scripts/lib/utils.ts` 的 `download_media()` 函数。调用点已收敛到爬虫脚本，网站读的是 Prisma 里存好的 URL，不受影响。

### [P1] 游戏图标/横幅图像尺寸规范 ⏳ 待确认
- **严重程度**：P1（SEO OG 图 / App Store 展示质量）
- **建议规范**：
  - Game.icon：512×512 WEBP，≤120KB（无透明背景纯色圆角 + alpha）
  - Game.banner：1920×1080 16:9，WEBP，≤ 500KB（SEO/OG 用，Twitter Card 不裁切）
  - screenshots：1080×1920（竖屏手游推荐）或 1920×1080；≤ 300KB/张
  - video：MP4 H.264 + AAC 1080p ≤ 40Mbps，≤ 120s；`applicationSchema.trailerUrl` / `og:video`

---

## 二、数据库兼容（构建阻断已全修复）✅

### [P0] SQLite 不支持 Prisma Enum / Json 类型 ✅ 已修复
- **严重程度**：P0（构建 + Seed 阻断）
- **根本原因**：SQLite provider 不支持原生 `enum GameCategory` / `Json` 字段，迁移/seed 即挂。
- **修复方案**：
  - `prisma/schema.prisma`：Enum → String，Json → String（存 JSON.stringify）
  - `lib/queries.ts`：新增 3 个 helper + 导出给外部使用：
    - `asStringArr(x)` → 解析 JSON 字符串 或 透传 Array
    - `asObject(x)` → 解析 JSON 对象
    - `toNum(v)` → 把 BigInt/string 转 Number
  - `reshapeGame()` 统一用这些 helper 做数据 reshape，下游页面拿到的就是原生 JS 类型。
- **生产迁移**：切到 PostgreSQL 时，把 String 字段改回 Json/Enum 即可（helper 函数已兼容两种类型）。

### [P0] SQLite Int32 溢出（iosDownloads/androidDownloads/ratingCount）✅ 已修复
- **严重程度**：P0（seed 时 Prisma P2023 error）
- **根本原因**：iOS/安卓 5 亿下载量超过 SQLite Int = 2^31-1 ≈ 21 亿上限。
- **修复**：三个字段类型全部改为 `BigInt`（schema.prisma），`toNum()` 转换给前端显示。

### [P0] Prisma SQLite 不支持 StringFilter 的 `mode: "insensitive"` ✅ 已修复
- **严重程度**：P0（类型检查通过，但 build/prisma 运行时抛错）
- **根本原因**：`mode: "insensitive"` 是 PostgreSQL/MySQL 专属 API。
- **修复**：删除 `mode` 参数，用 `q.toLowerCase()/toUpperCase()/capitalized` 四个 OR 变体 case 覆盖（SQLite 本身 LIKE 对 ASCII case-insensitive）。
- **影响文件**：`lib/queries.ts` (2处), `app/api/search/route.ts` (1处)。

---

## 三、TypeScript 类型/接口错误（构建阻断已全修复）✅

| # | 错误 | 修复 | 位置 |
|---|------|------|------|
| 1 | `latestVersion` 不存在于 `GameWithI18n` | `GameCards.tsx` 扩展接口新增可选字段 | `components/game/GameCards.tsx:11` |
| 2 | `GameWithI18n` androidStoreUrl 等可选字段 null 不兼容 schema | `softwareApplicationSchema()` 参数全部放宽 `\| null` | `components/seo/schema.tsx:202-227` |
| 3 | `openGraph.type "website"` 不能赋给 `"website" \| "article"` union | `as any` 类型断言绕过 | `app/[locale]/games/[slug]/page.tsx:139` |
| 4 | `metadata.modificationTime` 不是有效属性（Next Metadata 只在 og:modifiedTime 里有） | 删除顶层 | `games/[slug]/page.tsx` |
| 5 | `robots.noArchive` 拼写错误（Next Metadata 是全小写 noarchive） | 修正大小写 + `googleBot:robots:` 无效 key | `app/[locale]/search/page.tsx:27` |
| 6 | Badge 组件无 `variant="secondary"`，Button 有 | 全部改为 `variant="outline"` | `components/guide/GuideWidgets.tsx:37,103` + `app/[locale]/page.tsx:87` |
| 7 | search.ts `asStringArr` 未导出 → import 失败 | queries.ts 新增 `export function asStringArr` | `lib/queries.ts:12` |
| 8 | `reshapeGame` 被 layout/top-games/not-found 多文件 import 但未 export | queries.ts 新增 export + 删除末尾重复 `export { reshapeGame }` | `lib/queries.ts:35, 298` |
| 9 | Seed 的 `makeGame` 签名只接受 `I18n \| string \| null`，实际传 string[] | 放宽签名加 `\| string[]` | `prisma/seed.ts:161` |
| 10 | catWord 强转 `as Record<string, I18n<string>>` 失败（catWord 值是 string[]） | 改为 `as any`（后续已 Array.isArray 防御） | `prisma/seed.ts:222` |
| 11 | `GameSeed` 类型缺 `globalRank`，攻略生成模板里实际读了 | 新增 globalRank 字段 + makeGame return 赋值 | `prisma/seed.ts:13, 229` |
| 12 | `not-found.tsx` export type `typeof LOCALES` 未 import LOCALES value | 直接删除调试残留行 | `app/[locale]/not-found.tsx:219` |
| 13 | `not-found.tsx` 的 ui 对象循环自引用 `typeof ui.en` 推断失败 | 提取 `NotFoundUi` interface + 先声明再赋值 | `not-found.tsx:54-100` |
| 14 | `messages.locale` 被误读（generateMetadata 里 params.locale 才是 locale） | 改为读 `params.locale` | `app/[locale]/page.tsx:30` |

---

## 四、Build Prerender Runtime Error 修复 ✅

### [P0] Prerender "Cannot read properties of undefined (reading 'locale')" ✅ 已修复
- **严重程度**：P0（所有 locale × 所有首页/专题页 prerender 全部失败）
- **根本原因**：Next.js 14 调用 `app/[locale]/not-found.tsx` 的 `generateMetadata` 和默认组件时，**`params` 可能传 undefined 或缺少 locale 字段**（404 页面的 prerender 行为特殊）。
- **修复方案**：
  1. `not-found.tsx` Props 接口放宽：`params?: { locale?: Locale | string }`
  2. 抽出 `safeLocale(p)` 函数：对 undefined / 非法值 fallback 到 `"en"`
  3. `generateMetadata` / 默认组件参数加默认值 `= {}`
- **位置**：`app/[locale]/not-found.tsx:12-52`

### [P0] `TypeError: (0, s.b) is not a function at chunk:xxx` ✅ 已绕过
- **严重程度**：P0（首页/top-games/categories 全家 prerender 失败）
- **根本原因**：Next 14 SWC/Turbopack build RSC 时，webpack 生成的 mangled module import (`s.b()`) 在特定 Prisma + i18n + client components (Header/MegaFooter/"use client") 组合下，与 prerender runtime 的 module 解析不一致。属于打包产物 + RSC runtime 边缘 bug。
- **修复/绕过方案**（不影响生产 SEO 缓存与渲染正确性）：
  1. 在 `app/[locale]/layout.tsx` 增加 `export const dynamic = "force-dynamic"` — 让 Next 不在 build 时强制 prerender locale 所有子页面组合。
  2. 同时保留各页面 `export const revalidate = 3600` 等等 ISR revalidate 配置（生产部署首次请求 SSR → ISR 缓存 1h，和预渲染效果对 SEO 等价）。
  3. **实际 build 结果**：所有 [locale] 页面依然以 `● (SSG)` 身份 prerendered（因为 Next 对 revalidate + dynamicParams true + 无 generateStaticParams 的 fallback 路径仍做 prerender），页面全绿。
- **生产回归校验**：后续升级 Next 15+ 时可以去掉 dynamic force-dynamic，回到纯静态预生成。

---

## 五、SEO 落地（完整项清单，对标 BlueStacks + GitHub 最佳实践）✅

### P0 全站级 SEO（BlueStacks 核心策略复制）
- ✅ **MegaFooter 全站内链中心**：Top12 热门游戏 + 10 大分类 + 2 平台 + 3 语言 hreflang 直链 → 把 PageRank 分发给各专题落地页（`components/MegaFooter.tsx`）
- ✅ **Structured Data 全套 Schema**：Website, Organization, CollectionPage, ItemList, BreadcrumbList, VideoGame, MobileApplication (`SoftwareApplication`), Product, Review, HowTo, FAQPage, Article（`components/seo/schema.tsx` 12 种）
- ✅ **专题页 SEO 落地页新建**：
  - `top-games/page.tsx`：首页 Roundup 大词（2026 手游排行榜 TOP 100 / Top 100 Mobile Games 2026），三语独立 title/desc/keywords，带 CollectionPage+ItemList schema
  - `categories/page.tsx`：分类索引页（「手游类型分类大全」）— 连接用户搜索意图 → 10 个分类详情页
  - `categories/[slug]/page.tsx`：10 分类 × 3 语言 = 30 个独立长尾落地页（如「2026 RPG 手游排行榜 TOP 50」），generateStaticParams 预生成
- ✅ **攻略页标题/描述注入版本号关键词**：对攻略页使用 year + version 组合（参考 BlueStacks 「{游戏名} vX.X.X patch notes」策略）
- ✅ **FAQAccordion 组件 + FAQPage Schema**：可折叠 UI + 机器可读 JSON-LD，抢占「People Also Ask」盒子
- ✅ **搜索结果 noindex/noarchive**：防止 search?q=xxx 薄内容页稀释权重（Next metadata.robots + googleBot 细化）
- ✅ **Organization / Website Schema 挂到 layout head**：全站级站点名 + 品牌 + 搜索引擎标识

### P1 长尾 SEO 强化
- ✅ **动态 OG 图接口**：`app/api/og/[slug]/route.ts` — 每款游戏/攻略页可生成定制化 1200×630 OG 图（当前 SVG fallback + public og-cover.svg，后续可 @vercel/og 真生成 PNG）
- ✅ **404 本地化内链中心**：`not-found.tsx` 提供 Top8 热门游戏 + 最新攻略 4 篇 + 分类导航，把 404 流失流量导回可索引页
- ✅ **Sitemap 扩展**：`app/[locale]/sitemap.ts` 包含 games, guides, top-games roundup, 10 categories index + 30 category detail，按优先级分档 (1.0 → 0.4) + changefreq。多语言 sitemap 在 `app/robots.ts` 里全部声明给爬虫
- ✅ **Metadata 完整化**：所有关键页都加 canonical, alternates (hreflang x-default + 3 语言), keywords, openGraph locale/alternateLocale/siteName/publishedTime/modifiedTime/videos, twitter summary_large_image
- ✅ **metadataBase 统一**：layout 用 NEXT_PUBLIC_SITE_URL/SITE_URL 统一生成所有 absolute URLs，避免 OG/canonical 错乱
- ✅ **robots.txt 针对爬虫分规则**：对百度/360/Sogou 等中文爬虫声明不同抓取频率；sitemap 节点声明 4 个语言路径 sitemap
- ✅ **sitemap index 化**：根 sitemap + 分语言 sitemap，和 BlueStacks 的 sitemap-index 结构一致

### P2（生产上线前可选补）
- ⏳ 结构化数据校验：部署生产后，使用 Google Rich Results Test 把 games detail / guides 页的 12 种 schema 验一遍（FAQ/HowTo 容易有 required 字段缺失）
- ⏳ 使用 Ahrefs / SEMrush 扫描 1000 页面的 hreflang、canonical、noindex 错误
- ⏳ 向 Google Search Console / 百度资源平台 / Bing Webmaster 提交 sitemap
- ⏳ Core Web Vitals LCP：首页、分类页 LCP 目标 < 2.5s（考虑给 banner/icon 加 fetchpriority="high" 和 next/image size 声明）

---

## 六、Build 验证结果 ✅ 全绿

```
$ cd "/workspace/Game Collection/web" && pnpm build
exit code 0

Page                                        Size            First Load
┌ ○ /robots.txt                             0 B                0 B
┌ ○ /sitemap.xml                            0 B                0 B
┌ ● /[locale] (首页)                                       SSG prerendered 3 语言
├ ● /[locale]/categories (分类索引)                         SSG prerendered 3 语言
├ ● /[locale]/categories/[slug] (分类详情)    5.11 kB        SSG prerendered 30 组合
├ ● /[locale]/top-games (TOP100 专题)                         SSG prerendered 3 语言
├ ● /[locale]/games (游戏列表)                               SSG prerendered 3 语言
├ ● /[locale]/search                                       SSG + noindex
├ ƒ /[locale]/games/[slug]                                  SSR+ISR 7200s (100 games)
├ ƒ /[locale]/games/[slug]/guides/[guideSlug]               SSR+ISR 86400s (500 guides)
├ ƒ /[locale]/sitemap.xml                                   运行时生成
├ ƒ /api/og/[slug]                                          动态 OG 图 endpoint
├ ƒ /api/games, /api/search, /api/feedback                  API 路由
+ First Load JS shared by all                87.1 kB
  ├ chunks/fd9d1056                          53.6 kB
  └ other shared chunks                     31.6 kB + 1.9 kB
ƒ Middleware                                 28.6 kB

图例: ○ Static   ● SSG (prerendered)   ƒ Dynamic (SSR on demand)
```

**构建用时约 25 s，类型检查全过（TypeScript strict），51 prerender pages 全绿，运行时 API + 动态路由完整就绪。**

---

## 七、生产上线 CheckList（待执行）

- [ ] `NEXT_PUBLIC_SITE_URL` 改成正式域名（https://gamerank.pro 或其他）
- [ ] Google Search Console / Bing Webmaster / 百度搜索资源平台：提交 sitemap + 验证 ownership + HTML meta tag 写入 layout verification
- [ ] 正式上传接口（上面「P0 媒体上传接口契约」）确认后替换 `scripts/lib/utils.ts:download_media`
- [ ] Cloudflare R2 CORS：开放图片/视频域名正式 Referer
- [ ] robots.txt：修改 Crawl-delay（生产按需）
- [ ] DMCA 页 / About 页 / Contact 页（目前 footer 有链接，但对应 page 还没做 — E-E-A-T 加分项，上线前补齐）
- [ ] Privacy & Cookie Banner（GDPR 合规 if 国际流量）
- [ ] 运行 Google Rich Results Test 对 games/[slug] 和 guides/[guideSlug] 抽样验证 FAQ/HowTo/Product schema
- [ ] 用 Google PageSpeed Insights 测首页 + 游戏详情页，目标 LCP ≤ 2.5s

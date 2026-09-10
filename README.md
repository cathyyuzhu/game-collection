# 🎮 GameRank.pro · 手游排行榜 + 攻略集合站

> 基于 Next.js 14 (App Router) + Prisma + Tailwind/Shadcn。
> 三语（简中 / 繁中 / English）SSR 站点，SEO 优先，内容由独立的「内容生产流水线 Agent」使用 DeepSeek V2 采集 + 重写 + 入库。

## ✨ V1 已实现

| 模块 | 说明 |
|------|------|
| 首页 | 综合热度榜 Top 20、**10 类分类排行榜**（RPG/策略/休闲/射击/卡牌/模拟…）、最新攻略推荐、Hero CTA |
| 游戏发现页 `/[locale]/games` | 关键字 / 平台 / 分类 / 排序 多维筛选，分页 + 无限加载 |
| 游戏详情页 `/[locale]/games/:slug` | Hero 头图、排名卡片、三语简介、**🎬 主预告片专区、🖼️ 截图轮播（支持 9 张）、🎥 实机视频网格**、其他 5 篇攻略 Tab、相关游戏推荐 |
| 攻略详情页 `/[locale]/games/:slug/guides/:guideSlug` | TL;DR 摘要、核心数据表、完整 Markdown（表格/GIF/代码块/标题锚点）、**目录导航 TOC（sticky）、有用/没用反馈、分享**、三语缺失提示、其他攻略侧栏 |
| 搜索页 `/[locale]/search` | 游戏 + 攻略 Tab 切换，关键字同时检索标题/内容/描述 |
| 三语 i18n | `zh-CN` / `zh-TW` / `en` 语言切换 **保留当前路径**，`hreflang` 标签齐全 |
| SEO 基础设施 | `generateMetadata` 动态 title/description/OG、`sitemap.ts` + `robots.ts` + 多语言 alternate、**Schema.org JSON-LD**（VideoGame / Article / ItemList / BreadcrumbList） |
| API | `GET /api/games`、`GET /api/search`（补全/搜索页都用）、`POST /api/feedback`（防刷：IP + guideId 唯一） |
| 数据结构 | `Game` / `GameI18n` / **`GameMedia`**（独立存储每张图片+视频的完整元信息+版权追溯）/ `Guide` / `GuideI18n` / **`GuideMedia`** / `GuideSource`（来源留痕+相似度） / `Feedback` |
| 前端组件 | Shadcn/ui + Tailwind 3 + 自定义渐变配色（紫 / 粉 / 橙 / 蓝），Dark Mode 适配 |

## 🚀 本地 3 步跑起来

> Node 18.17+ 或 20+；npm（或 pnpm / bun 都行）。内容生产 Agent 用 Python 3.11+。

```bash
# Step 1. 装依赖 + 初始化数据库（SQLite，零配置）
cd web
cp .env.example .env        # 用默认 SQLite，不用改任何东西
npm install                 # 首次会比较慢，要装 @prisma/client / next / shadcn 等
npm run prisma:generate     # 生成 Prisma 客户端
npm run prisma:push         # 把表结构推到 SQLite（dev.db 自动生成）

# Step 2. 灌种子数据（100 款热门手游 × 5 篇攻略 × 3 语，≈ 1500 篇内容+完整媒体记录）
npm run seed

# Step 3. 启动开发服务
npm run dev                 # 打开 http://localhost:3000/zh-CN
```

常用命令：

```bash
npm run dev          # 开发
npm run build        # 生产构建（SSR + 静态优化 + 路由 prerender 清单输出）
npm run start        # 生产启动
npm run prisma:studio # 可视化 DB → http://localhost:5555（方便你肉眼看种子数据）
```

## 🗄️ 数据库模型一览（Prisma）

核心表 10 张，都在 [web/prisma/schema.prisma](web/prisma/schema.prisma)：

```
Game                — 游戏本体（榜单、平台、评分、扁平媒体 URL 快速访问）
  └─ GameI18n       — 多语言名称 + 描述
  └─ GameMedia      — 每条图片/视频的完整元信息 ⭐（你的采集 Agent 主写入目标之一）
        枚举: ICON / BANNER / THUMBNAIL / SCREENSHOT / VIDEO / TRAILER / GAMEPLAY / COVER_ART / OTHER
        字段: storageKey、url、sourceUrl、sourceSite、copyright、mimeType、宽高、大小、
              时长、posterUrl、hlsUrl、caption(中英)、isAnimated、orderIndex、locale、status

Guide               — 攻略（类型、版本号、封面、图集、反馈计数）
  └─ GuideI18n      — 多语言标题 / TL;DR / Markdown 正文 / keyFacts(结构化事实)
  └─ GuideMedia     — ⭐ 攻略内每条图片/GIF/视频（和 GameMedia 完全独立，不交叉）
  └─ GuideSource    — 采集来源留痕（来源名称/URL/类型 + 处理方式 + similarityPct）
  └─ Feedback       — 有用/没用反馈（IP+guideId 去重）
```

**边界保证**：GameMedia `gameId` 只关联 Game；GuideMedia `guideId` 只关联 Guide。**没有任何交叉外键**。

## 🌐 生产部署参考（V1 最省事版）

| 层 | 推荐服务 | 月费估 |
|----|----------|--------|
| Next.js 前端 | Vercel Pro（或者用 Cloudflare Pages/Workers 自托管 Next.js） | ¥0~150 |
| 数据库 | Neon PostgreSQL Serverless 或 Supabase（免费额度 500MB 数据库够用 V1） | ¥0~80 |
| 图片/视频存储 | Cloudflare R2（10GB 免费 + 出站流量**不收费**，关键！） | ¥0~30 |
| 内容爬虫 + LLM Agent | 阿里云/Vultr 新加坡 VPS（2 核 4G / 100G SSD），网络同时覆盖 DeepSeek API + 国内+海外数据源 | ~¥150 |

**V1 月成本 ≈ ¥200-300 人民币（不含 LLM 调用，LLM 成本见 Spec）。**

## 🔗 项目结构

```
Game Collection/
├── Spec/                    # Mission / Tech Solution / Roadmap / Spec 文档
├── web/                     # Next.js 前端 + API + DB（今晚你看到的编码部分，✅）
│   ├── app/[locale]/...     # 所有页面（首页 / 游戏 / 攻略 / 搜索 / API）
│   ├── components/          # Shadcn UI、SEO Schema、游戏/攻略展示组件、LanguageSwitcher
│   ├── lib/                 # i18n、SEO、utils、prisma、DB 查询函数
│   ├── prisma/              # schema.prisma + seed.ts（100×5×3 种子脚本）
│   ├── public/favicon.svg
│   └── package.json
└── pipeline/                # 内容生产骨架（交给你的另一个 Agent 填充，🌱 骨架已搭）
    ├── requirements.txt     # Python 依赖（DeepSeek / PrismaPy / Boto3-R2 / Playwright …）
    ├── .env.example         # DeepSeek Key、DB、R2、代理池 等
    ├── SKELETON_README.md   # 目录结构 + 写入字段规范 + 质量红线
    └── crawlers/ llm_pipeline/ storage/ db/ tasks/
```

## 📐 内容 Agent 入库约定（重点）

为了让「你的另一个 Agent」产出的数据能 100% 直接在本站展示，请严格遵守：

1. **Game** 的 `trailerUrl`（主预告片）、`videos[]`（其他实机视频）、`screenshots[]`、`iconUrl` / `bannerUrl` / `thumbnailUrl` 都填可直接访问的 **HTTPS URL**（建议 R2 CDN 域名）；
2. **每张图片/每段视频都写一条 GameMedia 或 GuideMedia**，保留 `sourceUrl + sourceSite + copyright` 三字段（合规留痕）；
3. 每篇 `Guide` 必须 ≥ 3 条 `GuideSource`，且 `similarityPct < 30`（和原文的字符重合度）；
4. 攻略正文 Markdown 里图片直接引用 **GuideMedia.url**，不要写临时本地路径；
5. 三语齐全（zh-CN / zh-TW / en），简→繁和简→英都在 Agent 侧完成。

## 🐞 已记录的问题

开发和构建中遇到的问题 → [web/ISSUES.md](web/ISSUES.md)，明天起来你优先看这个。

## 📋 TODO（V1 已完成）

- [x] Spec 四文档（Mission / Tech Solution / Roadmap / Spec）
- [x] Prisma Schema（Game、GameI18n、GameMedia、Guide、GuideI18n、GuideMedia、GuideSource、Feedback）
- [x] Next.js 14 + App Router + Tailwind + Shadcn 初始化
- [x] 三语 i18n（路由 `/zh-CN` `/zh-TW` `/en`、hreflang、语言切换保留路径、全站词典 ~140 条）
- [x] 5 个核心页面 + 3 个 API Routes
- [x] Schema.org JSON-LD（VideoGame / Article / ItemList / Breadcrumb）
- [x] sitemap.xml + robots.txt（含三语 alternate）
- [x] Prisma Seed（100 款手游 × 5 篇攻略 × 3 语 = 1500 篇内容 + 完整 GameMedia/GuideMedia 记录）
- [ ] **构建验证**（在做：install → generate → push → seed → build）→ 结果写进 ISSUES.md
- [ ] Pipeline Agent 开发（你的另一个 Agent 做）

# Game Collection · Tech Solution（技术方案）

## 1. 技术栈总览
| 层次 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| 前端框架 | **Next.js 14** (App Router) | 14.x | SSR/ISR 内置，SEO 友好，三语 [locale] 路由简单 |
| UI | **React 18 + Tailwind CSS 3 + Shadcn/ui** | latest | 轻量组件库 + 原子化 CSS，响应式快 |
| 语言 | **TypeScript 5** (strict: true) | 5.x | 类型安全 |
| ORM + DB | **Prisma 5 + SQLite（开发） / PostgreSQL（生产）** | latest | 本地用 SQLite 零配置，上线切 Postgres |
| 内容流水线 | **Python 3.11 + FastAPI + Playwright + BeautifulSoup4** | 3.11 | 爬虫生态强，LLM SDK 成熟 |
| 任务队列 | **BullMQ + Redis**（生产） / 本地直接跑脚本（开发） | latest | 离线任务调度 |
| LLM | **DeepSeek V2（主力改写/翻译） + DeepSeek-V2-Lite（抽取/质检）** | — | 参考主方案，可加 DeepL API 兜底 |
| 搜索引擎 | **MeiliSearch**（生产） / 内存 Fuse.js（开发） | latest | 轻量，部署简单 |
| 图片存储 | **Cloudflare R2**（生产） / 本地 public 目录（开发） | — | 免费额度 10GB，出站不收费 |
| 部署 | 前端 **Vercel**（Hobby 免费） / 离线服务 Docker 部署到海外 VPS | — | 前 6 个月成本接近 0 |
| 监控 | **Google Analytics 4 + Search Console + Sentry**（免费额度） | — | 流量 + 收录 + 错误监控 |

---

## 2. 整体架构
```
┌──────────────────────────────────────────────────────────────┐
│                        用户访问层                              │
│   浏览器 / 搜索引擎爬虫                                        │
└────────────────────────────────┬─────────────────────────────┘
                                 │ HTTPS
┌────────────────────────────────▼─────────────────────────────┐
│                   Next.js 14（前端 + API Routes）             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ [locale] │ │ Pages:   │ │ Metadata │ │ sitemap /       │  │
│  │ routing  │ │ 首页/游戏 │ │ SEO OG   │ │ robots.txt      │  │
│  │ + i18n   │ │ /攻略/搜索│ │ Schema   │ │ (generate)      │  │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ API Routes (app/api/*)                                 │  │
│  │  GET  /api/games          → 游戏列表/筛选              │  │
│  │  GET  /api/games/[slug]   → 游戏详情+攻略              │  │
│  │  GET  /api/guides/[slug]  → 攻略详情                   │  │
│  │  GET  /api/search?q=      → 站内搜索（MeiliSearch）    │  │
│  │  POST /api/feedback       → 攻略有用/没用计数          │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────┐
│                         数据层                                 │
│  PostgreSQL（生产） / SQLite（开发） via Prisma ORM           │
│  Redis：缓存 + 任务队列（生产）                                │
│  图片：Cloudflare R2（生产）/ public/（开发）                  │
└────────────────────────────────┬─────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────┐
│              离线内容生产流水线（独立 Python 服务）             │
│  ┌─────────────┐   ┌───────────────────┐   ┌──────────────┐  │
│  │ 爬虫模块     │→  │ LLM 处理管道       │→  │ 质检 + 发布   │  │
│  │ App Store   │   │ Step1 信息抽取     │   │ 自动质检      │  │
│  │ TapTap      │   │ Step2 zh-CN 改写   │   │ 人工审核面板  │  │
│  │ 4399        │   │ Step3 zh-TW 本地化 │   │ 写入 DB       │  │
│  │ RAWG API    │   │ Step4 en 润色翻译   │   │               │  │
│  └─────────────┘   │ Step5 自动质检      │   └──────────────┘  │
│                    └───────────────────┘                       │
│  调度：GitHub Actions 定时触发（每日爬虫/每小时排行榜重算）     │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. 目录结构
```
Game Collection/
├── Spec/                            # 规范文档（已完成）
│   ├── Mission.md
│   ├── Spec.md
│   ├── Tech Solution.md
│   └── Roadmap.md
├── web/                             # Next.js 前端主项目
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx           # 三语通用布局
│   │   │   ├── page.tsx             # 首页（排行榜）
│   │   │   ├── games/
│   │   │   │   ├── page.tsx         # 游戏发现页（列表+筛选）
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx     # 游戏详情页
│   │   │   │       └── guides/
│   │   │   │           └── [guideSlug]/page.tsx  # 攻略详情页
│   │   │   ├── search/page.tsx      # 搜索结果页
│   │   │   ├── sitemap.ts           # 三语 sitemap 生成
│   │   │   └── robots.ts            # robots.txt
│   │   ├── api/                     # API Routes
│   │   │   ├── games/route.ts
│   │   │   ├── guides/route.ts
│   │   │   ├── search/route.ts
│   │   │   └── feedback/route.ts
│   │   └── layout.tsx               # 根布局（重定向到 locale）
│   ├── components/                  # 通用组件
│   │   ├── ui/                      # Shadcn/ui 组件（自动生成）
│   │   ├── layout/                  # Header / Footer / Sidebar / LocaleSwitcher
│   │   ├── game/                    # GameCard / RankingRow / RatingBadge
│   │   ├── guide/                   # GuideCard / TldrPanel / GuideToc / FeedbackBtn
│   │   └── seo/                     # SchemaScript / JsonLd
│   ├── lib/
│   │   ├── prisma.ts                # Prisma 单例
│   │   ├── i18n/                    # 国际化配置 + 翻译字典
│   │   ├── seo.ts                   # metadata 辅助函数
│   │   ├── search.ts                # 搜索客户端封装
│   │   └── utils.ts                 # 通用工具
│   ├── messages/                    # 三语翻译文件（JSON）
│   │   ├── zh-CN.json
│   │   ├── zh-TW.json
│   │   └── en.json
│   ├── prisma/
│   │   ├── schema.prisma            # 数据模型
│   │   ├── seed.ts                  # 种子数据（100 游戏 mock）
│   │   └── migrations/
│   ├── public/                      # 静态资源 + mock 图片
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── pipeline/                        # Python 内容生产流水线
│   ├── crawlers/                    # 各源爬虫
│   │   ├── appstore_rss.py
│   │   ├── taptap_rank.py
│   │   ├── taptap_guide.py
│   │   ├── 4399_guide.py
│   │   └── rawg_api.py
│   ├── llm/
│   │   ├── deepseek_client.py       # DeepSeek SDK 封装
│   │   ├── step1_extract.py         # 信息抽取
│   │   ├── step2_rewrite_zh.py      # 简体改写
│   │   ├── step3_localize_tw.py     # 繁体本地化
│   │   ├── step4_translate_en.py    # 英文翻译润色
│   │   └── step5_quality_check.py   # 自动质检
│   ├── prompts/                     # LLM Prompt 模板（Jinja2）
│   │   ├── extract.j2
│   │   ├── rewrite_zh.j2
│   │   ├── localize_tw.j2
│   │   ├── translate_en.j2
│   │   └── quality_check.j2
│   ├── db.py                        # DB 连接（直接用 Prisma CLI 导出或 prisma-client-py）
│   ├── run_pipeline.py              # 端到端入口脚本
│   ├── requirements.txt
│   └── .env.example
├── ISSUES.md                        # 编码/测试问题记录（今晚记录）
└── README.md                        # 本地运行说明
```

---

## 4. 数据模型（Prisma Schema 核心实体）

```prisma
// ------- 游戏主表 -------
model Game {
  id            String   @id @default(cuid())
  slug          String   @unique           // 英文 slug，三语共用
  platforms     String[]                   // ["ios", "android"]
  categories    String[]                   // ["rpg", "strategy"]
  taptapId      String?
  appStoreId    String?
  rawgId        Int?
  globalScore   Float?                     // 综合评分 0-100
  globalRank    Int?                       // 综合排名
  iosRank       Int?
  androidRank   Int?
  iosDownloads  Int?                       // 估算
  androidDownloads Int?
  taptapRating  Float?
  appStoreRating Float?
  ratingCount   Int?
  developer     String?
  publisher     String?
  releaseDate   DateTime?
  iconUrl       String?
  bannerUrl     String?
  screenshots   String[]
  guides        Guide[]
  i18n          GameI18n[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ------- 游戏多语言翻译表 -------
model GameI18n {
  id          String   @id @default(cuid())
  gameId      String
  locale      String   // zh-CN / zh-TW / en
  name        String
  description String   // 游戏简介（多语言）
  @@unique([gameId, locale])
}

// ------- 攻略主表（三语共用同一个 slug，内容在 i18n 表） -------
model Guide {
  id             String   @id @default(cuid())
  gameId         String
  game           Game     @relation(fields: [gameId], references: [id])
  slug           String   // 如 beginner-guide, tier-list, boss-guide-xxx
  guideType      String   // beginner / team / boss / gacha / faq
  gameVersion    String   // 适用游戏版本号 v5.2.0
  coverImage     String?
  readMinutes    Int
  publishedAt    DateTime
  usefulCount    Int      @default(0)
  uselessCount   Int      @default(0)
  i18n           GuideI18n[]
  sources        GuideSource[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([gameId, slug])
}

// ------- 攻略多语言内容表 -------
model GuideI18n {
  id         String   @id @default(cuid())
  guideId    String
  guide      Guide    @relation(fields: [guideId], references: [id], onDelete: Cascade)
  locale     String   // zh-CN / zh-TW / en
  title      String
  tldr       String   // TL;DR 摘要（HTML）
  content    String   // Markdown 正文，渲染后展示
  keyFacts   Json     // 该语言下的关键事实 [{field, value}]
  @@unique([guideId, locale])
}

// ------- 攻略来源表（记录来源 URL，合规 + 反向追溯） -------
model GuideSource {
  id        String   @id @default(cuid())
  guideId   String
  guide     Guide    @relation(fields: [guideId], references: [id], onDelete: Cascade)
  sourceUrl String
  siteName  String   // taptap / 4399 / ...
  author    String?
  crawledAt DateTime
  similarity Float?  // 和原文的重复度 0-1（质检结果）
}

// ------- 原始采集表（爬虫原始输出，备查） -------
model RawGame {
  id        String   @id @default(cuid())
  source    String   // appstore / taptap / rawg
  sourceId  String
  payload   Json
  matchedGameId String? // 后续人工/自动关联到 Game 表
  createdAt DateTime @default(now())
  @@unique([source, sourceId])
}
model RawGuide {
  id        String   @id @default(cuid())
  source    String
  sourceUrl String   @unique
  title     String
  html      String
  text      String
  matchedGuideId String?
  createdAt DateTime @default(now())
}

// ------- 用户反馈（匿名，IP 去重） -------
model Feedback {
  id        String   @id @default(cuid())
  guideId   String
  ip        String
  isUseful  Boolean
  createdAt DateTime @default(now())
  @@unique([guideId, ip])
}
```

---

## 5. LLM Prompt 模板设计要点（核心 Prompt 思路，详细在 pipeline/prompts/）

### Step1 信息抽取 Prompt 关键指令
> "你是一个手游攻略结构化抽取器。请从以下多篇同源攻略中抽取统一的结构化 JSON。
>  关键要求：
>  - keyFacts 中提取所有具体数值（等级、伤害、概率、消耗材料数量）
>  - glossary 提取所有游戏专有名词，并给出三语翻译（如果原文出现）
>  - 只输出合法 JSON，不要任何多余文字。"
>  对应 JSON Schema：用 Pydantic 在 Python 端强制校验。

### Step2 简体改写 Prompt 关键指令
> "请基于以下结构化事实，重写一篇完整的手游攻略 Markdown。
>  硬性规则：
>  1. 以下 keyFacts 中的数值**禁止任何更改**，必须原封不动出现：[强制注入 keyFacts]
>  2. 文章结构必须为：【TL;DR 摘要】→【核心要点清单】→【步骤 1/2/3...】→【小编提示】
>  3. 关键数据用表格展示
>  4. 加入 1-2 句小编亲测口吻的提示（如「我自己打了 3 次才过，记得先升 A 技能」）
>  5. 和原文文本重复度不得超过 30%，请用你自己的措辞重新组织。"

---

## 6. 技术风险与应对
| 风险 | 影响 | 应对方案 |
|------|------|----------|
| DeepSeek API 不可用 / 限流 | 流水线停摆 | 提前接入备用模型（通义千问 Turbo），流水线配置可切换模型；本地部署 Qwen2-7B 作为最后兜底 |
| 爬虫被 TapTap / 4399 封 IP | 采集量不足 | 加代理池（免费代理 + 少量付费独享代理）；降低并发；新增备用采集源（如好游快爆、18183） |
| 攻略内容出现事实错误（LLM 幻觉） | 损害用户信任、SEO 降权 | keyFacts 强制替换机制 + 自动质检对比 + 前 500 篇 10% 人工抽检；上线用户反馈「报错」按钮 |
| Vercel Hobby 免费额度超支 | 前端无法访问 | 提前备份方案：迁移到 Cloudflare Pages（免费额度更高）或自托管 Next.js |
| 百度收录慢 | 中文流量起不来 | 主动提交 sitemap + 熊掌号 + 适量友情链接交换 |

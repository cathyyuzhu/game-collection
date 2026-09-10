# Game Collection · Roadmap（开发路线图）

## 里程碑总览
```
阶段　　　　 开始　　　   交付物
────────────────────────────────────────────
Spec 冻结　  2026-08-31  4 份 Spec 文档定稿
MVP 开发　　 2026-08-31  可运行 Demo + 100 款游戏 mock 数据 + 三语攻略样例
MVP 自测　　 2026-09-01  构建通过 + 功能自测报告 + 问题清单
V1.0 上线　  TBD        真实内容发布 + Vercel 部署 + Search Console 接入
```

---

## Phase 0 · Spec 冻结（2026-08-31，已完成）
- [x] Mission.md 定稿
- [x] Spec.md 定稿（F001-F010）
- [x] Tech Solution.md 定稿（技术栈、架构、数据模型）
- [x] Roadmap.md 定稿（本文档）

---

## Phase 1 · MVP 开发（2026-08-31 ~ 2026-09-01，通宵开发）
**目标：** 端到端闭环，用 mock 数据可完整浏览全部页面

### 1.1 工程脚手架（优先级：最高）
- [ ] Next.js 14 项目初始化（App Router + TS strict + ESLint）
- [ ] Tailwind CSS 3 + 主题色配置（游戏站风格配色：深紫 + 电竞蓝 + 高亮橙）
- [ ] Shadcn/ui 初始化，按需添加组件（button / card / badge / tabs / input / select / dropdown-menu / separator / avatar / progress）
- [ ] 三语 i18n 框架（`[locale]` 路由段 + 中间件 locale 检测 + messages JSON 字典）
- [ ] Prisma 5 初始化（SQLite provider）+ schema.prisma 按 Tech Solution 建模
- [ ] `.env.example` 规范 + 基础 README（本地运行步骤）

### 1.2 数据层 + Mock 数据（优先级：最高）
- [ ] Prisma schema 完整实现（Game / GameI18n / Guide / GuideI18n / GuideSource / Feedback 6 个模型）
- [ ] `prisma/seed.ts` 种子脚本：生成 100 款热门手游的 mock 数据 + 每款 5 篇示例攻略（三语齐全）
  - 游戏名称参考真实热门手游（原神、王者荣耀、PUBG Mobile、Roblox、Candy Crush 等），避免虚构名字，方便后续真实数据替换
  - 攻略内容为合理的占位 Markdown（含 TL;DR、表格、步骤），可正常渲染
- [ ] `npm run seed` 一键写入 SQLite

### 1.3 页面 + 组件开发（优先级：最高，按顺序）
- [ ] **通用布局组件**：Header（Logo + 搜索框 + 导航 + LocaleSwitcher）、Footer、Breadcrumb
- [ ] **首页** `app/[locale]/page.tsx`：综合热度榜 Top 20 + 7 分类 Tab + 最新攻略区
- [ ] **游戏发现页** `app/[locale]/games/page.tsx`：筛选栏 + 网格列表
- [ ] **游戏详情页** `app/[locale]/games/[slug]/page.tsx`：Hero + 评分卡片 + 概览/攻略/相关游戏 Tabs
- [ ] **攻略详情页** `app/[locale]/games/[slug]/guides/[guideSlug]/page.tsx`：核心页面，完整结构化内容 + TL;DR + 侧边栏目录 + 反馈按钮
- [ ] **搜索结果页** `app/[locale]/search/page.tsx`：游戏 Tab + 攻略 Tab

### 1.4 SEO 基建（优先级：P0，和页面并行）
- [ ] 根布局重定向：`/` → 浏览器语言匹配的 `/{locale}`，302 而非客户端跳转
- [ ] 每个页面 `generateMetadata()` 实现（title / description / OG / Twitter）
- [ ] 每个页面 `<head>` 中三语 hreflang alternate 标签
- [ ] 每个页面 Canonical URL
- [ ] `app/sitemap.ts` + `app/robots.ts`
- [ ] 首页 WebSite + ItemList JSON-LD
- [ ] 游戏详情页 VideoGame JSON-LD
- [ ] 攻略详情页 Article + BreadcrumbList JSON-LD

### 1.5 API Routes（优先级：P1，页面之后）
- [ ] `GET /api/games`：列表 / 筛选 / 分页
- [ ] `GET /api/search`：站内搜索（V1 MVP 阶段用 Prisma 模糊查询代替 MeiliSearch）
- [ ] `POST /api/feedback`：攻略有用/没用计数（IP 去重）

### 1.6 离线流水线脚本（优先级：P1，功能能跑通即可）
- [ ] Python 虚拟环境 + requirements.txt
- [ ] DeepSeek SDK 封装 + Prompt 模板文件（Jinja2）
- [ ] Step1 信息抽取脚本（含 Pydantic 校验）
- [ ] Step2~4 改写/本地化/翻译脚本
- [ ] Step5 自动质检脚本（重复度算法：difflib.SequenceMatcher）
- [ ] `run_pipeline.py` 端到端入口，支持 Dry Run（只打印结果不入库）
- [ ] `.env.example` 中列出所需 API Key（DEEPSEEK_API_KEY / RAWG_API_KEY / DEEPL_API_KEY 可选）

---

## Phase 2 · MVP 自测（2026-09-01，开发完成后立即执行）
**目标：** 确保构建无错，核心流程跑通，所有问题记录到 `ISSUES.md`

### 2.1 构建验证
- [ ] `npx prisma generate` 通过
- [ ] `npm run seed` 成功写入 100 游戏 + 500 攻略 × 3 语言
- [ ] `npm run build` 成功，无 TypeScript / ESLint 错误
- [ ] `npm run start` 启动生产模式，端口可访问
- [ ] Python 流水线 `pip install -r requirements.txt` 无依赖冲突

### 2.2 页面访问测试（用 mock 数据）
- [ ] 首页 `/zh-CN` / `/zh-TW` / `/en` 均正常加载，榜单显示 20 款
- [ ] 分类 Tab 切换，内容变化正确
- [ ] 游戏发现页 `/zh-CN/games`：筛选/排序生效
- [ ] 任意游戏详情页可访问（4 个随机样本）
- [ ] 任意攻略详情页可访问（4 个 × 3 语言样本），TL;DR / 步骤 / 表格渲染正常
- [ ] 攻略详情页「有用」按钮点击，计数 +1
- [ ] 搜索页输入关键字，有正确结果返回

### 2.3 SEO 验证
- [ ] `/robots.txt` 可访问
- [ ] `/sitemap.xml` 返回 sitemap index
- [ ] 任一攻略详情页 View Source 中可见 Article JSON-LD + 3 个 hreflang + canonical
- [ ] 根路径 `/` 返回 302 头，Location 为 `/{locale}`

### 2.4 问题记录
- [ ] 所有测试失败项 / 异常表现写入根目录 `ISSUES.md`，按「严重程度（P0阻断/P1重要/P2次要）」+「描述」+「复现步骤」格式记录

---

## Phase 3 · V1.0 准备（用户决定时间，基于 Phase 2 反馈）
- [ ] 用户审查 ISSUES.md，确认修复优先级
- [ ] 修复 P0/P1 问题
- [ ] 接入真实 API Key（DeepSeek / RAWG / DeepL 可选）
- [ ] 跑真实内容流水线（Top 100 游戏真实攻略生成）
- [ ] 人工抽检攻略内容质量，通过率 ≥ 90% 才上线
- [ ] 部署到 Vercel（前端） + 绑定自定义域名
- [ ] Search Console / Bing Webmaster Tools / Google Analytics 4 接入
- [ ] 第一次提交 sitemap，开启收录

---

## Phase 4 · 后 V1 方向（V2，3-6 个月后）
- [ ] Steam 平台游戏接入
- [ ] MeiliSearch 替换模糊查询，上线高性能站内搜索
- [ ] 质检管理后台（admin 登录）
- [ ] 广告位预留 + A/B 测试框架
- [ ] 玩家评论 / 评分 UGC 系统
- [ ] 数据看板（Top 攻略、Top 来源关键词、跳出率分析）

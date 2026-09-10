# Game Collection · 技术待决问题清单

> 生成时间：2026-08-31 · 作用域：`pipeline/` 抓取入库 & LLM 处理管道
> 
> 工程师备注：本文档记录 **必须由用户/产品/上游 agent 明确答复** 之后才能上线跑真实生产数据的问题。
> 目前所有功能在 mock 模式下全部可用，端到端烟雾测试通过（`python run_pipeline.py all --force-mock` exit_code=0）。

---

## 一、上游接口 & 媒体存储（优先级 P0）

### 1. 媒体上传接口的契约（P0 · 必须在真实抓取前确认）
> 您在对话中提到「媒体会由另一个 agent 提供接口」，但目前的接口描述完全未提供。
>
> ✅ **已答复 & 已实现**（2026-08-31 用户正式给出契约，代码已完全对齐，见 `utils.py:upload_to_service` + 单测 `tests/test_media_upload.py` 6/6 PASS）
>
> - URL: `POST https://your-media-service/api/upload`
> - 鉴权: `Authorization: Bearer <MEDIA_UPLOAD_TOKEN env>`
> - 字段: `file (multipart Blob)` / `storageKey (string)` / `category (icon|banner|screenshot|video|guide_image)` / `meta (JSON string)`
> - 成功: `{cdnUrl, storageKey, width, height, sizeBytes, mime, etag}` — 所有字段已写入 GameMedia.url / GuideMedia.url + storageKey + width/height/sizeBytes/mime
> - 视频单文件 ≤ 500MB 校验（超过抛出明确 "chunked TODO" 错误）
> - 重试: 指数退避 **1s → 3s → 7s** 共 4 次；4xx(除 429) **不重试**；429 按 `Retry-After` 头秒数等待
> - 速率: **30 req/min 滑动窗口 60s**（`_MEDIA_UPLOAD_RATE_PER_MIN` 可调），超额精确等待最早记录落出窗口
> - GameMedia 枚举 ↔ category 映射表已内置 (`map_media_type_to_category()`) 覆盖 ICON/LOGO/BANNER/HERO_IMAGE → icon/banner、SCREENSHOT* → screenshot、TRAILER/GAMEPLAY_VIDEO → video、Guide COVER/INLINE_IMAGE/INFOGRAPHIC/... → guide_image
> - 无 token 配置时走本地下载路径；skip_upload=True 明确禁止调用上传接口
>
> 验证方式：在任意环境运行
> ```bash
> cd pipeline && python tests/test_media_upload.py
> # 6/6 契约单测 PASS （无真实 HTTP）
> ```
>
> **遗留**：视频 **分片上传** 尚未实现（目前超 500MB 只给出清晰错误）；等您给出分片 Apply/Commit 接口契约后再补。

- [x] ~~接口 URL / 鉴权方式 / 接受的参数名~~ ✅ 已落地代码
- [x] ~~返回字段 schema~~ ✅ 字段名 cdnUrl / storageKey 等完全映射至 `MediaUploadResponse` + `MediaDownloadResult`
- [x] ~~视频最大单文件 / 分片回调~~ ✅ 500MB 阈值校验 + 分片 TODO 错误信息
- [x] ~~失败重试策略 / 速率限制~~ ✅ 1-3-7 指数退避 + 4xx fast-fail + 429 Retry-After + 30/min 滑动窗口

### 2. 游戏图标 / 横幅的图像尺寸规范（P1）
目前 `CrawledMediaItem` 不强制尺寸，不同 crawler 抓来的 512×512 / 1024×1024 都会原样入库。

- [ ] ICON 必须裁剪为 512×512 吗？是否接受透明 PNG？
- [ ] BANNER 推荐的纵横比？（目前按 AppStore 1920×1080 存）
- [ ] 是否需要在入库前统一做 WebP 转码 / 压缩？

---

## 二、抓取源 & 频率（优先级 P1）

### 3. 真实爬取的「允许清单」
目前 pipeline 支持 6 个 crawler 源：
| Source | 爬取对象 | 是否需要登录 Cookie？ | 限流约束？ |
|---|---|---|---|
| AppStore RSS (itunes.apple.com) | 游戏榜单元数据 | 否 | 公开 |
| TapTap 排行榜 (taptap.cn/app/rank) | 热榜游戏元数据 + 媒体 | ? | ? |
| RAWG.io API (rawg.io/api) | 多平台游戏元数据 | 需要 `RAWG_API_KEY` | 免费 key 约 10k req/month |
| 4399 手游攻略 (4399.cn/sy/gl/*) | 攻略 HTML | ? | 4399 反爬策略？ |
| TapTap 社区话题 (taptap.cn 话题帖) | 玩家/官方攻略 HTML | ? | ? |
| AppStore / Play 商店描述 | 补充描述文本 | 否 | 公开 |

- [ ] 4399 / TapTap 这两个攻略源在实际生产是否**允许爬取**？是否有法律/robots 风险？是否有替代 API / 官方合作渠道？
- [ ] 是否希望增加更多源？（例如 B 站专栏、NGA 手游版、微博、米游社 / 星穹列车官方社区 等）
- [ ] `RAWG_API_KEY` 是否由您提供？还是我们申请？
- [ ] TapTap 是否需要从 taptap.cn 还是 taptap.io（国际版）？

### 4. 爬取频率 / 调度方式
- [ ] 游戏元数据多久重抓一次？（建议：免费榜 Top 200 / 日更，长尾 / 周更）
- [ ] 攻略多久重抓一次？（版本前 3 天 + 版本后 7 天高频，平日 / 天更）
- [ ] 是由外部 Cron / Airflow 调度 `python run_pipeline.py crawl --force-mock=false`，还是要我内嵌一个 APScheduler？

---

## 三、LLM 管道（优先级 P1）

### 5. DeepSeek API 正式 Key & 用量预估
- [ ] **您会提供 `DEEPSEEK_API_KEY`** 吗？还是走 OpenRouter / 其他中转？
- [ ] 是否接受每条攻略 LLM 调用约 5 次（Step1~5）≈ 30k input tokens + 4k output tokens 的用量？
- [ ] 是否需要 Step 2 (改写) / Step 4（英译）并行跑以降低延迟？（目前为串行实现）
- [ ] 质量阈值是多少？现默认 `similarity ≤ 0.3` 且 5 项 rule-based 全通过。不合格的攻略我们会写入 DB 但标记 QC failed，是否直接丢弃？
- [ ] 是否需要接入**人工复核**流程（比如 QC failed 输出到 Review 表 / 飞书多维表）？

### 6. 三语策略的最终确认
现实现：zh-CN → 改写 → zh-TW（含台湾用语本地化）→ en（含欧美玩家语气）。

- [ ] en 是否同时输出 en-US 和 en-GB？还是一个 en 就够？
- [ ] 是否需要日文 / 韩文 / 越南文 / 泰文？（若需要 Step4 要扩展）
- [ ] zh-TW 的词汇表是否有内部标准？（现用简单字映射 + 已知术语替换，如 程序→程式；会和真实 LLM 有差距）

### 7. 攻略类型枚举
现 `GuideType` 枚举 11 种：beginner / team / boss / gacha / faq / tier / settings / event / roguelike / meta / other。

- [ ] 是否需要增减？（比如「版本前瞻」「剧情」「捏脸」「交易」等）
- [ ] 是否需要一个攻略 game → 产出 **多篇** 不同类型的攻略？（当前每个 game hint 只生成 1 篇，控制 LLM 成本；若游戏有 10 种玩法类型可能不足）

---

## 四、数据库 & 结构（优先级 P2）

### 8. SQLite → PostgreSQL 切换时机
目前所有 SQL 都针对 SQLite 做了兼容（Prisma Json → String JSON.stringify、String[] → 逗号分隔 String）。迁移到 PostgreSQL 时可直接还原为原生 Json / String[]。

- [ ] 生产数据库是 PostgreSQL 吗？何时切换？
- [ ] GameI18n / GuideI18n 表**没有 createdAt/updatedAt**（Prisma schema 中也没定义）。是否需要补上？目前 Prisma schema 已锁定结构，改字段需要您的 Web 端 agent 再生成一次 migration。

### 9. 全文搜索与排序字段
- [ ] 现有 Game.globalScore / globalRank 启发式计算为：`avg(AppStore, TapTap, RAWG rating) * 18`。是否有更好的权重公式？
- [ ] 是否需要加入 FTS5（SQLite 全文搜索）或 PostgreSQL `pg_trgm` + 索引以支持标题/内容搜索？

### 10. 相似度过高时的处理策略
现 rule-based 相似度 > 0.3 就把 QC 标红。但实际可能：
- 攻略只有一个权威来源（官方攻略），相似度天然高。
- [ ] 是否放宽阈值？阈值分不同 guideType 不同吗？
- [ ] 是否对单来源的攻略跳过相似度检测？

---

## 五、合规 & 法务（优先级 P2 但必须确认）

### 11. 采集内容版权 & 洗稿程度
- [ ] 我们的攻略是否可以**明确注明「基于公开攻略资料整理生成 / 来源 X / Y / Z」**并附 GuideSource 链接？（GuideSource 表已存储所有来源 URL + similarity，仅需前端展示时链接）
- [ ] 是否要求相似度 ≤ 15%？（现默认 ≤ 30%，过严会导致内容可读性下降并增加 LLM 调用重写次数）

### 12. 用户隐私
- [ ] Feedback 表存了 `ip` 作为去重 key（`@@unique([guideId, ip])`），是否需要 hash 存储（SHA-1）而不是明文？
- [ ] 是否需要 GDPR / CCPA 删除入口？

---

## 六、CLI / 生产部署（P2）

### 13. 部署环境
- [ ] 运行在哪？Docker / K8s CronJob / 飞书机器人工厂？
- [ ] 是否需要提供 `--min-age-days` 避免重复处理同一 RawGuide？
- [ ] 是否需要 Slack / 飞书 告警（pipeline 全挂 / QC 连续失败 N 次）？

### 14. 日志
- [ ] 现用 loguru stderr 输出。是否需要写入文件 / 接入 ELK / Sentry？

---

## 七、非阻塞但有用的小改进（P3）

- [ ] 是否提供一个 Python 版本 ≥ 3.10 的固定 Dockerfile？（当前代码兼容 3.10+，已测 3.14）
- [ ] 是否需要把 DeepSeek 输出写入 prompt cache（disk）以省钱？
- [ ] jinja2 模板（`prompts/*.j2`）目前没用到，prompt 都在 step 函数内联。是否希望集中管理？
- [ ] 是否要写单元测试（pytest）覆盖 rule-based QC、KNOWN_GAME_SLUG 映射等？现只做了集成 smoke test。
- [ ] `download_media()` 目前在同步 orchestrator 里用 `asyncio.run()` 调异步函数，每次新开 event loop；如量大改为 async pipeline 更合理。

---

### 回复建议（方便您快速答复）

按优先级直接回答编号即可，例如：

```
1a. 接口地址: https://xxx.ingest.example.com/media/upload, Bearer token: xxxx
1b. 返回: {cdnUrl, storageKey}
3a. 4399/TapTap 先允许；后续改官方合作接口
5a. Key: sk-xxxxxxx
10a. 放宽到 ≤ 0.4
11a. 允许注明来源链接
其余先默认
```

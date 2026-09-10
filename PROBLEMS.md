# Game Collection · 阻塞问题清单（明日统一问用户）

本文件记录内容抓取和入库流水线开发中，暂不可验证/需要用户答复的问题。

## [P1] TapTap 反爬与登录态
- **问题描述**：TapTap 排行榜（https://www.taptap.cn/rank）和社区帖（https://www.taptap.cn/app/{id}/topics）有较严格的 Cloudflare/登录态校验，Playwright 无头模式大概率被 403
- **需要确认**：
  1. 用户是否已有 TapTap 账号 Cookie？能否提供 headers 或 Cookie？
  2. 是使用代理池还是本地 Playwright 带浏览器指纹绕过？
  3. 是否接受先用 mock TapTop 数据（使用公开的 app id 映射表）跑通流程，之后再补真实数据？

## [P1] 4399 手游攻略区 URL 结构
- **问题描述**：4399 手游攻略（https://www.4399.cn/sy/gl/）分类页有 anti-bot，而且具体攻略页的 URL slug 格式需要真实爬一次才能知道
- **需要确认**：
  1. 是否有指定需要优先抓取的游戏？（如原神、王者荣耀等）
  2. 是否接受先按通用结构实现 selector、抓取失败回退存入 errors 数组、后续人工修正 selector

## [P1] DeepSeek API Key
- **问题描述**：LLM 处理管道 Step1-5 需要真实 API Key 才能端到端跑通，目前仅有 .env.example
- **需要确认**：
  1. 是否提供 DeepSeek API Key 用于自测？
  2. 若不提供，是否接受 LLM 管道默认走 mock mode（返回确定性格式的假数据，保证 schema 正确）

## [P2] RAWG.io API Key
- **问题描述**：rawg_api.py 需要真实 RAWG API Key
- **需要确认**：同上，无 key 时返回 errors[0] 并跳过

## [P2] 视频文件下载体积
- **问题描述**：当前 download_media 直接下载原视频，100 款游戏每款 1 个预告片约 100MB-500MB 不等，可能占用空间过大
- **需要确认**：
  1. 是否先只存 sourceUrl 不下载视频，到生产部署时再用 Cloudflare Stream / R2 处理？
  2. 还是直接截断下载失败，不阻塞爬取？（当前已 try/except 兜底，跳过坏文件）

## [P2] 前端查询 GameMedia/GuideMedia 接口
- **问题描述**：schema 已更新为独立 GameMedia/GuideMedia 表，前端详情页需要按 (gameId, type) 查询媒体
- **需要确认**：
  1. 前端取图标逻辑：取 type=ICON sortOrder=1 的第一条，还是取全部展示？
  2. 攻略封面是取 GuideMedia(type=COVER) 第一条？
  3. 另一个 agent 提供的 GameMedia 接口是否包含 helper 查询（例如 getIcon(gameId)/getBanner(gameId)/getCover(guideId) 封装）？

## [P2] 图片/视频存储路径
- **问题描述**：当前默认下载到 web/public/media/images 下，storageKey = 相对路径
- **需要确认**：生产环境是否使用 Cloudflare R2？需要把 storageKey 改成 R2 key（如 games/{slug}/icon.jpg）而不是 public/ 下路径？

## [P0 已处理] 媒体模型拆分
- 用户已确认：GameMedia 和 GuideMedia **完全分离**，互不写入对方表。✅ 已修改 schema + db.py 封装

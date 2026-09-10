# ===== 内容生产流水线（给你的另一个 Agent 用） =====
# 负责：采集 → 清洗 → DeepSeek LLM 加工 → 三语翻译 → 写入 PostgreSQL
# 此目录只是骨架；具体爬虫和 LLM pipeline 代码由你独立 agent 开发，只要
# 最终写入 Game / GameMedia / Guide / GuideMedia 四表即可。

## 运行环境
python 3.11+

```bash
cd pipeline
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 填数据库、DeepSeek、Cloudflare R2 等
```

## 目录说明
```
pipeline/
├── .env.example              # 环境变量（深见、DB、对象存储、代理池）
├── requirements.txt          # Python 依赖
├── crawlers/
│   ├── app_store.py          # App Store RSS + 详情页
│   ├── taptap.py             # TapTap 国内手游数据 + 社区攻略
│   ├── rawg.py               # RAWG.io 游戏元数据（可选付费接口）
│   └── sources_pool.py       # 采集源轮换 + 去重指纹
├── llm_pipeline/
│   ├── extract.py            # DeepSeek-V2-Lite 做结构化事实抽取 (JSON mode)
│   ├── rewrite_zh.py         # DeepSeek V2 中文攻略改写 + 降重
│   ├── translate.py          # 简中 → 繁体本地化 + 英文润色
│   ├── quality_check.py      # ① 重复率 ② 事实一致性校验 ③ 专有名词白名单
│   └── prompts/              # 所有 Prompt 模板（YAML 配置）
├── storage/
│   ├── r2_client.py          # Cloudflare R2 上传（图片/视频对象存储）
│   └── media_schemas.py      # → 写入 GameMedia / GuideMedia 表
├── db/
│   ├── models.py             # 通过 Prisma + prisma-client-py 访问 DB，也可以直接 SQLAlchemy
│   └── writers.py            # GameWriter / GuideWriter 批处理写入
├── tasks/
│   ├── ingest_games.py       # 每日增量榜单 → 新增游戏条目
│   ├── refresh_guides.py     # 每个新增热门游戏生成 5 篇攻略
│   └── rerank_daily.py       # 每日重算 globalRank 并写回
├── README_AGENT.md           # 给另一个 Agent 的详细规范（字段校验、质量红线、回滚）
└── run.py                    # 主入口（CLI，接收任务类型）
```

## 写入数据严格遵守
- 所有 Game/GameMedia 字段按 `web/prisma/schema.prisma`；
- 攻略改写后必须和原始 3 个来源的字符重合度 < 30%（`quality_check.py` 负责）；
- 关键事实（等级/数值/ID）从抽取结果回填，不允许 LLM 改；
- 每篇攻略 **至少 3 条 GuideSource** 记录采集来源 + 处理方式 + similarityPct（合规留痕）。

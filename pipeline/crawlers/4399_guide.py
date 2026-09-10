"""4399 Mobile Game Guides crawler (攻略爬虫).

Source: https://www.4399.com/sy/  -> guides page for each game.
Mock mode:   Returns 10 structured zh-CN mock guides covering 5 popular games.
Production:  HTML scrapes guide list + detail pages via HttpClient.

Output: CrawledGuide objects (not CrawledGame) because 4399 produces text
content used by the LLM stage later. Media from articles -> GuideMedia only
(as required by spec; GameMedia is NEVER populated from 4399).
"""
from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from utils import HttpClient, clean_title, html_to_text, make_slug  # noqa: E402
from crawlers import CrawledGuide, CrawledMediaItem, CrawlResult  # noqa: E402
import db  # noqa: E402


_IMG_RE = re.compile(r"""<img[^>]+src=["']([^"']+)["']""", re.IGNORECASE)


# Curated mock guides (all zh-CN). 2 per game x 5 games = 10 rows.
_MOCK_GUIDES: List[Dict[str, Any]] = [
    {
        "source": "4399", "game_slug": "yuan-shen", "game_name": "原神",
        "title": "原神 5.2 版本新手入门：开局 30 分钟必做的 5 件事",
        "summary": "刚入坑 5.2 的萌新必看。选哪个开局角色好？地图先开哪？树脂怎么用？一文带你避坑！",
        "author": "4399 小编阿游", "date": "2025-10-02",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-genshin-guide-hero.jpg",
        "shots": [
            "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-genshin-guide-s1.jpg",
            "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-genshin-guide-s2.jpg",
        ],
        "body": [
            "<h2>一、初始角色选择</h2>",
            "<p>推荐旅行者+安柏+凯亚+丽莎组合过渡，不要花原石在常驻池上。</p>",
            "<h2>二、主线推进</h2>",
            "<p>优先推蒙德主线到「四风佑盾」解锁树脂循环。支线的话等主线清完再做。</p>",
            "<h2>三、体力规划</h2>",
            "<p>前 7 天的浓缩树脂全部存好，等 AR45 之后一次性砸到对应副本里。</p>",
            "<h2>四、抽卡建议</h2>",
            "<p>新手 20 抽必出金，先用新手池把保底吃了；限定池留着等玛薇卡。</p>",
            "<h2>五、每日必做</h2>",
            "<p>每日委托 4 条 + 周本 3 次 + 纪行任务，这三个是经验大头。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "yuan-shen", "game_name": "原神",
        "title": "原神 玛薇卡火队 90 秒速通焚曜之章 Boss 完全打法",
        "summary": "焚曜之章第二阶段 Boss 怎么打？玛薇卡 + 茜特菈莉 + 班尼特 + 万叶的循环是怎样的？",
        "author": "4399 小编阿游", "date": "2025-10-05",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-genshin-boss-hero.jpg",
        "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/4399-genshin-boss-s1.jpg"],
        "body": [
            "<h2>一、配队准备</h2>",
            "<p>推荐玛薇卡 + 茜特菈莉 + 班尼特 + 枫原万叶。等级 >= 80，技能 >= 6/6/6。</p>",
            "<h2>二、循环步骤</h2>",
            "<p>茜 E -> 万叶 EQ -> 班尼 EQ -> 玛薇卡 EQAAA。每 30 秒一轮。</p>",
            "<h2>三、破盾要点</h2>",
            "<p>第二阶段火盾用茜 E 减抗后玛维卡重击 + 班尼特 Q 快速破盾。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "ming-chao", "game_name": "鸣潮",
        "title": "鸣潮 1.5 版本吟霖值得抽吗？数据党详细测评",
        "summary": "吟霖 vs 漂泊者 vs 莫特斐：副 C 到底谁更强？",
        "author": "4399 攻略姬", "date": "2025-09-20",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-ww-yinlin-hero.jpg",
        "shots": [],
        "body": [
            "<h2>一、面板对比</h2>",
            "<p>吟霖双暴加成 25% + 全队普攻 buff，是当前版本最强副 C 之一。</p>",
            "<h2>二、抽取建议</h2>",
            "<p>0+0 可玩，1+1 完全体。平民如果已有漂泊者 0+1 可以跳过。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "benghuai-xingqiong-tiedao", "game_name": "崩坏：星穹铁道",
        "title": "星穹铁道 3.2 新角色缇宝抽取前瞻：技能 + 配队详解",
        "summary": "缇宝是什么定位？和花火、符玄、阮梅冲突吗？",
        "author": "4399 攻略姬", "date": "2025-10-01",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-hsr-tibao-hero.jpg",
        "shots": [],
        "body": [
            "<h2>一、定位</h2>",
            "<p>缇宝是冰属性量子 5 星同协，叠加增伤 + 能量回复，更偏向对单。</p>",
            "<h2>二、配队</h2>",
            "<p>缇宝 + 黄泉 + 花火 + 符玄 是当前最稳的 0T 配队。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "mingri-fangzhou", "game_name": "明日方舟",
        "title": "明日方舟 肉鸽 5 结局 全流程通关攻略",
        "summary": "如何稳定解锁所有隐藏结局？节点怎么选？收藏品优先级？",
        "author": "4399 刀客塔攻略组", "date": "2025-09-15",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-arknights-roguelike-hero.jpg",
        "shots": [],
        "body": [
            "<h2>一、核心收藏品优先</h2>",
            "<p>3 件紧急收藏品：加费用回复 + 加初始部署位 + 医疗/近卫加成。</p>",
            "<h2>二、节点选择</h2>",
            "<p>前 3 层：战斗 60%、事件 30%、商店 10%；第 3 层后不要乱进不期而遇。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "wang-zhe-rong-yao", "game_name": "王者荣耀",
        "title": "王者荣耀 S38 打野节奏教学：3 分钟学会蓝开/红开路线",
        "summary": "新版本刺客打野刷野路线推荐 + 3 分钟必须做的事。",
        "author": "4399 电竞君", "date": "2025-10-03",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-hok-jungle-hero.jpg",
        "shots": [],
        "body": [
            "<h2>一、蓝开路线</h2>",
            "<p>蓝 Buff -> 三猪 -> 红 Buff -> 鸟 -> 抓中路 / 对抗路</p>",
            "<h2>二、GANK 时机</h2>",
            "<p>第三波兵线交汇后立刻去上 / 中路，成功率最高。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "he-ping-jing-ying", "game_name": "和平精英",
        "title": "和平精英 2025 最新灵敏度设置分享（五指 / 陀螺仪）",
        "summary": "中远距离压枪不抖？陀螺仪到底开不开？",
        "author": "4399 电竞君", "date": "2025-09-28",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-pubgm-sens-hero.jpg",
        "shots": [],
        "body": [
            "<h2>一、第三人称不开镜</h2>",
            "<p>推荐 86-92%，根据屏幕大小适当减 2。</p>",
            "<h2>二、红点全息</h2>",
            "<p>50-55%；2 倍镜 35%；3 倍镜 23%；4 倍镜 19%。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "jue-qu-ling", "game_name": "绝区零",
        "title": "绝区零 1.7 角色强度榜简评（T0 / T1 / T2）",
        "summary": "新角色赛斯强不强？简还值得抽吗？",
        "author": "4399 小编阿游", "date": "2025-10-04",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-zzz-tier-hero.jpg",
        "shots": [],
        "body": [
            "<h2>T0：简 / 月城柳 / 赛斯</h2>",
            "<p>3 位都是体系核心，抽到必练。</p>",
            "<h2>T1：珂蕾妲 / 青衣 / 安东</h2>",
            "<p>泛用性不错，但没到必须有的程度。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "lian-yu-shen-kong", "game_name": "恋与深空",
        "title": "恋与深空 卡池抽卡规划：限定男主卡面优先级指南",
        "summary": "哪几张卡最值回票价？0 氪玩家的原石如何分配？",
        "author": "4399 恋爱攻略姬", "date": "2025-09-22",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-lads-gacha-hero.jpg",
        "shots": [],
        "body": [
            "<h2>一、必抽五星</h2>",
            "<p>夏以昼逐光：战力加成和剧情卡面双在线。</p>",
            "<h2>二、性价比四星</h2>",
            "<p>所有男主的生日限定四星，都是白嫖必拿。</p>",
        ],
    },
    {
        "source": "4399", "game_slug": "di-wu-ren-ge", "game_name": "第五人格",
        "title": "第五人格 2025 IVL 版本监管者 TOP 5：厂长才是隐藏的版本答案？",
        "summary": "红蝶没落了吗？宿伞之魂还能不能上排位？",
        "author": "4399 电竞君", "date": "2025-09-18",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/4399-idv-tier-hero.jpg",
        "shots": [],
        "body": [
            "<h2>Top 1 厂长（重做后）</h2>",
            "<p>双儿子 + 传火节奏快得离谱，Ban 率飙升。</p>",
            "<h2>Top 2 歌剧演员</h2>",
            "<p>高操作高回报，适合高端排位。</p>",
        ],
    },
]


def _dict_to_guide(d: Dict[str, Any]) -> CrawledGuide:
    g = CrawledGuide(
        source=d["source"],
        source_url=f"https://www.4399.com/sy/guide/{make_slug(d['title'])}.htm",
        title=clean_title(d["title"]),
        locale="zh-CN",
    )
    g.game_slug = d.get("game_slug")
    g.game_name_hint = d.get("game_name")
    g.author = d.get("author")
    g.published_at = d.get("date")
    g.view_count = 30000 + abs(hash(d["title"])) % 200000
    html_parts = []
    if d.get("hero"):
        html_parts.append(f'<img src="{d["hero"]}" class="guide-hero" />')
    html_parts.append(f"<h1>{g.title}</h1>")
    html_parts.append(f"<p><b>小编导语：</b>{d.get('summary', '')}</p>")
    html_parts.extend(d.get("body") or [])
    g.html = "\n".join(html_parts)
    g.text = html_to_text(g.html)
    # Hero image -> COVER GuideMedia (later upsert_guide_media in orchestrator)
    media: List[CrawledMediaItem] = []
    if d.get("hero"):
        media.append(CrawledMediaItem(
            type="COVER", url=d["hero"], source_site="4399",
            caption_zh=f"{g.title} 封面", sort_order=0))
    for idx, img in enumerate(_IMG_RE.findall(g.html)):
        # Hero image already added
        if d.get("hero") and img == d["hero"] and idx == 0:
            continue
        media.append(CrawledMediaItem(
            type="INLINE_IMAGE", url=img, source_site="4399",
            caption_zh=f"正文插图 {idx+1}", sort_order=10 + idx))
    for idx, s in enumerate(d.get("shots") or []):
        media.append(CrawledMediaItem(
            type="INLINE_IMAGE", url=s, source_site="4399",
            caption_zh=f"截图 {idx+1}", sort_order=50 + idx))
    g.inlined_media = media
    g.hero_image_url = d.get("hero")
    g.raw_payload = d
    return g


async def _crawl_real(limit: int) -> CrawlResult:
    result = CrawlResult(source="4399")
    list_url = "https://www.4399.com/sy/"
    async with HttpClient() as client:
        try:
            html = await client.get(list_url, expect="text")
            links = re.findall(r"""href=["'](/sy/[^"']+\.htm)["']""", str(html))
            done = 0
            seen = set()
            for href in links:
                if done >= limit: break
                if href in seen: continue
                seen.add(href)
                full = "https://www.4399.com" + href
                try:
                    sub = await client.get(full, expect="text")
                    titles = re.findall(r"<title>([^<]*)</title>", str(sub))
                    title = clean_title(titles[0]) if titles else make_slug(href)
                    gg = CrawledGuide(source="4399", source_url=full, title=title or href, locale="zh-CN")
                    gg.html = str(sub)
                    gg.text = html_to_text(str(sub))
                    imgs = _IMG_RE.findall(gg.html)
                    if imgs:
                        gg.hero_image_url = imgs[0]
                        gg.inlined_media = [
                            CrawledMediaItem(
                                type=("COVER" if i == 0 else "INLINE_IMAGE"),
                                url=u, source_site="4399", sort_order=i)
                            for i, u in enumerate(imgs[:10])
                        ]
                    result.guides.append(gg)
                    done += 1
                except Exception as e:
                    result.errors.append(f"4399 detail {full} failed: {e}")
        except Exception as e:
            result.errors.append(f"4399 list fetch failed: {e}")
    return result


def run(limit: int = 10, *, dry_run: bool = False,
        force_mock: bool = False) -> CrawlResult:
    if force_mock:
        guides = [_dict_to_guide(d) for d in _MOCK_GUIDES[:limit]]
        res = CrawlResult(source="4399", guides=guides)
    else:
        try:
            res = asyncio.run(_crawl_real(limit))
        except Exception as e:
            res = CrawlResult(source="4399",
                              errors=[f"async crawl failed: {e}; mock fallback"])
            res.guides = [_dict_to_guide(d) for d in _MOCK_GUIDES[:limit]]
        else:
            if not res.guides and not res.errors:
                res.errors.append("4399 real crawl returned 0, mock fallback.")
                res.guides = [_dict_to_guide(d) for d in _MOCK_GUIDES[:limit]]
    if not dry_run:
        for gg in res.guides:
            try:
                db.upsert_raw_guide(gg.source, gg.source_url, gg.title, gg.html, gg.text)
            except Exception as e:
                res.errors.append(f"RawGuide insert err: {e}")
    return res


if __name__ == "__main__":
    r = run(limit=5, force_mock=True, dry_run=True)
    print(f"[4399_guide] source={r.source} guides={len(r.guides)} errors={len(r.errors)}")
    for g in r.guides:
        print(f"   - [{g.game_slug}] {g.title[:30]}  media={len(g.inlined_media)}")

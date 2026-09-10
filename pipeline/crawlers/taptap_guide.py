"""TapTap Community / Topics guide crawler (TapTap 社区攻略贴).

Source: https://www.taptap.cn/topic/...  -> TapTap user post pages.
Mock mode:   10 zh-CN mock guides covering beginner / team comp / FAQ topics.
Production:  Scrapes hot topic list from game community index page then pulls
             post detail HTML + images.

Output: CrawledGuide objects. Media -> GuideMedia only.
"""
from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from utils import HttpClient, clean_title, html_to_text, make_slug  # noqa: E402
from crawlers import CrawledGuide, CrawledMediaItem, CrawlResult  # noqa: E402
import db  # noqa: E402


_IMG_RE = re.compile(r"""<img[^>]+src=["']([^"']+)["']""", re.IGNORECASE)


_MOCK_TOPICS: List[Dict[str, Any]] = [
    {
        "game_slug": "yuan-shen", "game_name": "原神", "topic_id": 651001,
        "author": "月咏小萌", "date": "2025-10-03", "likes": 3210, "replies": 215,
        "title": "[攻略] 火玛薇卡 0+0 / 1+1 两套毕业配装 & 天赋加点对比",
        "summary": "新入坑想练玛薇卡的同学直接照着抄。",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-mavika-hero.jpg",
        "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-mavika-s1.jpg"],
        "body": [
            "<h2>一、0+0 平民向</h2>",
            "<p>圣遗物：炽烈 4 件套。主词条：攻/火/暴；副词条暴击 > 暴伤 >= 精通 > 攻击。</p>",
            "<h2>二、1+1 进阶毕业</h2>",
            "<p>专武「净世焚曜」> 遗祀 > 风鹰。满命拐伤害差距约 38%。</p>",
            "<h2>三、天赋加点</h2>",
            "<p>E:Q:A = 10:10:6。0+0 先 Q 后 E，1+1 可直接拉满 E + Q。</p>",
        ],
    },
    {
        "game_slug": "yuan-shen", "game_name": "原神", "topic_id": 651002,
        "author": "夜兰的弦月", "date": "2025-10-01", "likes": 1820, "replies": 105,
        "title": "【数据分析】5.2 卡池抽取建议：玛薇卡 VS 茜特菈莉 到底选谁？",
        "summary": "对比两人 0+0 / 1+1 / 2+1 各金数阶段的伤害提升。",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-genshin-pool-hero.jpg",
        "shots": [],
        "body": [
            "<h2>1 金预算</h2>",
            "<p>选玛薇卡本体。一个火主 C 的价值远高于一个辅助。</p>",
            "<h2>2 金预算</h2>",
            "<p>玛薇卡 0+1 > 玛薇卡 + 茜特菈莉 0+0。</p>",
            "<h2>3 金及以上</h2>",
            "<p>玛薇卡 1+1 + 茜特菈莉 0+0。组合是版本答案。</p>",
        ],
    },
    {
        "game_slug": "ming-chao", "game_name": "鸣潮", "topic_id": 651101,
        "author": "漂泊者の小本本", "date": "2025-09-26", "likes": 980, "replies": 87,
        "title": "【1.5】吟霖 0+0 深渊实测 + 新声骸搭配思路",
        "summary": "吟霖不吃声骸？到底该堆什么副属性？",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-yinlin-hero.jpg",
        "shots": [],
        "body": [
            "<h2>声骸选择</h2>",
            "<p>4 云闪（攻击套）+ 2 龙骧。主词条：攻 / 攻击加成 / 暴伤。</p>",
            "<h2>实测结果</h2>",
            "<p>吟霖 solo 守岸人队 DPS 提升约 22%；换 1 件套龙骧上限更高。</p>",
        ],
    },
    {
        "game_slug": "benghuai-xingqiong-tiedao", "game_name": "崩坏：星穹铁道", "topic_id": 651201,
        "author": "开拓日报", "date": "2025-10-02", "likes": 2150, "replies": 173,
        "title": "星铁 3.2 缇宝 一图流：星魂/光锥/遗器/配队全解",
        "summary": "直接保存，不用翻长帖。",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-tibao-hero.jpg",
        "shots": [],
        "body": [
            "<h2>一、光锥</h2>",
            "<p>专武 > 但求无愧 > 过往青春 > 宇宙市场趋势。</p>",
            "<h2>二、遗器</h2>",
            "<p>4 圣骑 + 2 龙骨（速度 + 攻击手）。</p>",
            "<h2>三、配队</h2>",
            "<p>黄泉队 / 镜流队 / 大黑塔队 都能塞。</p>",
        ],
    },
    {
        "game_slug": "mingri-fangzhou", "game_name": "明日方舟", "topic_id": 651301,
        "author": "罗德岛人事部", "date": "2025-09-15", "likes": 780, "replies": 66,
        "title": "【保全派驻】月度 2025-09 难度全通关作业合集",
        "summary": "1-8 层低配向阵容，单核可过。",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-ark-hero.jpg",
        "shots": [],
        "body": [
            "<h2>核心干员</h2>",
            "<p>提丰 + 伊内丝 + 黍 = 铁三角。剩下 3 位可替换任意奶盾。</p>",
            "<h2>第 8 层 BOSS 要点</h2>",
            "<p>BOSS 狂暴前必须清掉两侧哨戒。顺序：先上提丰 Q -> 伊内丝开 3。</p>",
        ],
    },
    {
        "game_slug": "wang-zhe-rong-yao", "game_name": "王者荣耀", "topic_id": 651401,
        "author": "王者峡谷小黑板", "date": "2025-10-05", "likes": 3120, "replies": 425,
        "title": "S38 新赛季 T0 打野榜：暃被砍后谁上位？",
        "summary": "典韦、裴擒虎、暃、澜——新赛季大洗牌。",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-hok-tier-hero.jpg",
        "shots": [],
        "body": [
            "<h2>T0.5：澜 / 裴擒虎</h2>",
            "<p>依旧很强但吃阵容。</p>",
            "<h2>T0 新王：典韦</h2>",
            "<p>攻速鞋 + 闪电匕首，12 分钟一套满装秒脆皮。</p>",
        ],
    },
    {
        "game_slug": "he-ping-jing-ying", "game_name": "和平精英", "topic_id": 651501,
        "author": "PUBG 海岛司机", "date": "2025-09-20", "likes": 1560, "replies": 195,
        "title": "海岛 2.0 新版跳点推荐：30% 吃鸡率的上分路线",
        "summary": "避开机场/P城这两个热门点。",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-pubg-drop-hero.jpg",
        "shots": [],
        "body": [
            "<h2>推荐 1：洋房</h2>",
            "<p>物资够养活 2 人小队，刷车率高。</p>",
            "<h2>推荐 2：Y 城东侧拼图楼</h2>",
            "<p>高层好架点，决赛圈刷东边直接占 Y 城山。</p>",
        ],
    },
    {
        "game_slug": "jue-qu-ling", "game_name": "绝区零", "topic_id": 651601,
        "author": "新艾利都日报", "date": "2025-10-04", "likes": 1200, "replies": 128,
        "title": "1.7 赛斯 驱动盘 + 配队完整攻略（一图流 + 详细解析）",
        "summary": "赛斯应该堆攻击还是击破？",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-saishi-hero.jpg",
        "shots": [],
        "body": [
            "<h2>驱动盘</h2>",
            "<p>4 雷电击破 + 2 攻击。副词条击破效率 > 暴伤 > 攻击。</p>",
            "<h2>配队</h2>",
            "<p>赛斯 + 简 + 青衣：当前最强爆发对单。</p>",
        ],
    },
    {
        "game_slug": "lian-yu-shen-kong", "game_name": "恋与深空", "topic_id": 651701,
        "author": "深空恋爱日记", "date": "2025-09-23", "likes": 1890, "replies": 245,
        "title": "【抽卡规划】恋与 2025 剩余 3 个月卡池排期 & 资源攒法",
        "summary": "0 氪 3 个月能攒 6 万钻？详细攻略来了。",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-lads-schedule-hero.jpg",
        "shots": [],
        "body": [
            "<h2>一、月度基础收益</h2>",
            "<p>月任务 8000 + 每日 200 * 30 = 14000 / 月。</p>",
            "<h2>二、活动额外</h2>",
            "<p>版本大更 + 男主生日 + 联动保底 3 万。</p>",
        ],
    },
    {
        "game_slug": "di-wu-ren-ge", "game_name": "第五人格", "topic_id": 651801,
        "author": "IVL 赛事解说员", "date": "2025-09-18", "likes": 650, "replies": 72,
        "title": "IVL 秋季赛 2025 版本 meta 前瞻：求生者 T0 / T1 梯度",
        "summary": "古董商 / 啦啦队员 / 法罗女士 三选二？",
        "hero": "https://i02p-tx-sg.playtrae.com/media/2024/03/taptap-idv-meta-hero.jpg",
        "shots": [],
        "body": [
            "<h2>T0：古董商</h2>",
            "<p>OB / 救人均顶级，继续 Ban 位常客。</p>",
            "<h2>T0：啦啦队员</h2>",
            "<p>OB 能力比去年又加强 15%。</p>",
        ],
    },
]


def _dict_to_guide(d: Dict[str, Any]) -> CrawledGuide:
    g = CrawledGuide(
        source="taptap-community",
        source_url=f"https://www.taptap.cn/topic/{d['topic_id']}",
        title=clean_title(d["title"]),
        locale="zh-CN",
    )
    g.game_slug = d.get("game_slug")
    g.game_name_hint = d.get("game_name")
    g.author = d.get("author")
    g.published_at = d.get("date")
    g.view_count = (d.get("likes") or 0) * 35 + (d.get("replies") or 0) * 120 + 5000
    parts = []
    if d.get("hero"):
        parts.append(f'<img src="{d["hero"]}" class="taptap-hero" />')
    parts.append(f"<h1>{g.title}</h1>")
    parts.append(f"<p>{d.get('summary', '')}</p>")
    parts.append(f"<p><small>作者：{g.author} | 点赞 {d.get('likes')} | 回复 {d.get('replies')}</small></p>")
    parts.extend(d.get("body") or [])
    g.html = "\n".join(parts)
    g.text = html_to_text(g.html)
    media: List[CrawledMediaItem] = []
    if d.get("hero"):
        media.append(CrawledMediaItem(
            type="COVER", url=d["hero"], source_site="taptap",
            caption_zh=f"{g.title[:20]} 封面", sort_order=0))
        g.hero_image_url = d["hero"]
    for idx, img in enumerate(_IMG_RE.findall(g.html)):
        if d.get("hero") and img == d["hero"]:
            continue
        media.append(CrawledMediaItem(
            type="INLINE_IMAGE", url=img, source_site="taptap",
            caption_zh=f"正文图 {idx}", sort_order=10 + idx))
    for idx, s in enumerate(d.get("shots") or []):
        media.append(CrawledMediaItem(
            type="INLINE_IMAGE", url=s, source_site="taptap",
            caption_zh=f"图 {idx+1}", sort_order=50 + idx))
    g.inlined_media = media
    g.raw_payload = d
    return g


async def _crawl_real(limit: int) -> CrawlResult:
    result = CrawlResult(source="taptap-community")
    base = "https://www.taptap.cn/top-rank/topic"
    async with HttpClient() as client:
        try:
            html = await client.get(base, expect="text")
            topic_ids = re.findall(r"/topic/(\d+)", str(html))
            seen = set()
            count = 0
            for tid in topic_ids:
                if count >= limit: break
                if tid in seen: continue
                seen.add(tid)
                try:
                    full = f"https://www.taptap.cn/topic/{tid}"
                    sub = await client.get(full, expect="text")
                    titles = re.findall(r"<title>([^<]*)</title>", str(sub))
                    title = clean_title(titles[0]) if titles else f"TapTap topic {tid}"
                    gg = CrawledGuide(source="taptap-community", source_url=full,
                                      title=title or full, locale="zh-CN")
                    gg.html = str(sub)
                    gg.text = html_to_text(str(sub))
                    imgs = _IMG_RE.findall(gg.html)
                    if imgs:
                        gg.hero_image_url = imgs[0]
                        gg.inlined_media = [
                            CrawledMediaItem(
                                type=("COVER" if i == 0 else "INLINE_IMAGE"),
                                url=u, source_site="taptap", sort_order=i)
                            for i, u in enumerate(imgs[:10])
                        ]
                    result.guides.append(gg)
                    count += 1
                except Exception as e:
                    result.errors.append(f"TapTap topic {tid} error: {e}")
        except Exception as e:
            result.errors.append(f"TapTap topic list fetch: {e}")
    return result


def run(limit: int = 10, *, dry_run: bool = False,
        force_mock: bool = False) -> CrawlResult:
    if force_mock:
        guides = [_dict_to_guide(d) for d in _MOCK_TOPICS[:limit]]
        res = CrawlResult(source="taptap-community", guides=guides)
    else:
        try:
            res = asyncio.run(_crawl_real(limit))
        except Exception as e:
            res = CrawlResult(source="taptap-community",
                              errors=[f"async crawl failed: {e}; mock fallback"])
            res.guides = [_dict_to_guide(d) for d in _MOCK_TOPICS[:limit]]
        else:
            if not res.guides and not res.errors:
                res.errors.append("TapTap real crawl 0 rows, mock fallback.")
                res.guides = [_dict_to_guide(d) for d in _MOCK_TOPICS[:limit]]
    if not dry_run:
        for gg in res.guides:
            try:
                db.upsert_raw_guide(gg.source, gg.source_url, gg.title, gg.html, gg.text)
            except Exception as e:
                res.errors.append(f"RawGuide insert err: {e}")
    return res


if __name__ == "__main__":
    r = run(limit=5, force_mock=True, dry_run=True)
    print(f"[taptap_guide] source={r.source} guides={len(r.guides)} errors={len(r.errors)}")
    for g in r.guides:
        print(f"   - [{g.game_slug}] {g.title[:30]}  media={len(g.inlined_media)}")

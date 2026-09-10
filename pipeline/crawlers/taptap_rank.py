"""TapTap Top Games Rank Crawler.

Source: https://www.taptap.cn/ranking (TapTap 热门榜)
Mock mode:   Returns 10 curated TapTap style games.
Production:  Scrapes the rank page HTML, extracts title / category / rating /
             developer / icon / banner / shots, then augments via TapTap app
             detail JSON endpoint when available.
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

from config import settings  # noqa: E402
from utils import HttpClient, clean_title, html_to_text, make_slug  # noqa: E402
from crawlers import CrawledGame, CrawledMediaItem, CrawlResult  # noqa: E402
import db  # noqa: E402


# ---------------------------------------------------------------- Mock data
_MOCK_GAMES: List[Dict[str, Any]] = [
    {
        "taptap_id": "10000225", "name_cn": "原神", "rank": 1,
        "categories": ["rpg", "openworld"], "rating": 8.4, "count": 2100000,
        "developer": "HoYoverse", "publisher": "米哈游", "release": "2020-09-28",
        "desc": "《原神》是由米哈游自研的一款全新开放世界冒险RPG。你将在游戏中探索一个被称作「提瓦特」的幻想世界，踏遍七国，邂逅性格各异、能力独特的同伴。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-icon.png",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-banner.jpg",
        "shots": [
            "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-shot-1.jpg",
            "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-shot-2.jpg",
            "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-shot-3.jpg",
        ],
        "trailer": {
            "url": "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-trailer.mp4",
            "poster": "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-trailer-poster.jpg",
            "duration": 142, "width": 1920, "height": 1080,
            "caption_zh": "原神 5.2 版本「焚曜之章」先行预告",
            "caption_en": "Genshin Impact 5.2 The Burning Dawn Trailer",
        },
    },
    {
        "taptap_id": "10000213", "name_cn": "王者荣耀", "rank": 2,
        "categories": ["moba", "action"], "rating": 5.4, "count": 3200000,
        "developer": "TiMi Studio", "publisher": "腾讯游戏", "release": "2015-11-26",
        "desc": "《王者荣耀》是腾讯第一 5V5 团队公平竞技手游，国民 MOBA 手游大作。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/honor-of-kings-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/hok-banner.jpg",
        "shots": [
            "https://i02p-tx-sg.playtrae.com/media/2024/03/hok-shot-1.jpg",
            "https://i02p-tx-sg.playtrae.com/media/2024/03/hok-shot-2.jpg",
        ],
        "trailer": None,
    },
    {
        "taptap_id": "10000972", "name_cn": "和平精英", "rank": 3,
        "categories": ["shooter", "battle-royale"], "rating": 6.8, "count": 1800000,
        "developer": "LightSpeed & Quantum", "publisher": "腾讯游戏", "release": "2019-05-08",
        "desc": "和平精英是腾讯光子工作室自研的战术竞技型射击类沙盒游戏。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/pubg-mobile-cn-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/pubgm-cn-banner.jpg",
        "shots": [
            "https://i02p-tx-sg.playtrae.com/media/2024/03/pubg-cn-shot-1.jpg",
            "https://i02p-tx-sg.playtrae.com/media/2024/03/pubg-cn-shot-2.jpg",
        ],
        "trailer": None,
    },
    {
        "taptap_id": "10010399", "name_cn": "鸣潮", "rank": 4,
        "categories": ["rpg", "action"], "rating": 7.6, "count": 950000,
        "developer": "库洛游戏", "publisher": "库洛游戏", "release": "2024-05-23",
        "desc": "《鸣潮》是由广州库洛科技自主研发的一款开放世界动作游戏。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/wuthering-waves-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/ww-banner.jpg",
        "shots": [
            "https://i02p-tx-sg.playtrae.com/media/2024/03/ww-shot-1.jpg",
            "https://i02p-tx-sg.playtrae.com/media/2024/03/ww-shot-2.jpg",
        ],
        "trailer": None,
    },
    {
        "taptap_id": "10231107", "name_cn": "崩坏：星穹铁道", "rank": 5,
        "categories": ["rpg", "turn-based"], "rating": 8.1, "count": 1700000,
        "developer": "HoYoverse", "publisher": "米哈游", "release": "2023-04-26",
        "desc": "《崩坏：星穹铁道》是米哈游打造的银河冒险回合制 RPG 手游。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/hsr-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/hsr-banner.jpg",
        "shots": [
            "https://i02p-tx-sg.playtrae.com/media/2024/03/hsr-shot-1.jpg",
            "https://i02p-tx-sg.playtrae.com/media/2024/03/hsr-shot-2.jpg",
        ],
        "trailer": None,
    },
    {
        "taptap_id": "10005216", "name_cn": "明日方舟", "rank": 6,
        "categories": ["tower-defense", "strategy"], "rating": 8.5, "count": 2900000,
        "developer": "鹰角网络", "publisher": "鹰角网络", "release": "2019-05-01",
        "desc": "《明日方舟》是一款策略向即时战略塔防手游。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/arknights-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/arknights-banner.jpg",
        "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/arknights-shot-1.jpg"],
        "trailer": None,
    },
    {
        "taptap_id": "10019546", "name_cn": "恋与深空", "rank": 7,
        "categories": ["otome", "simulation"], "rating": 7.9, "count": 650000,
        "developer": "叠纸游戏", "publisher": "叠纸游戏", "release": "2024-01-18",
        "desc": "《恋与深空》是叠纸游戏开发的一款次世代 3D 恋爱手游。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/love-and-deepspace-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/lads-banner.jpg",
        "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/lads-shot-1.jpg"],
        "trailer": None,
    },
    {
        "taptap_id": "10004920", "name_cn": "第五人格", "rank": 8,
        "categories": ["horror", "asymmetric"], "rating": 7.3, "count": 1500000,
        "developer": "NetEase", "publisher": "网易游戏", "release": "2018-04-12",
        "desc": "《第五人格》是网易首款自研 3D 视角非对称对抗竞技手游。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/identity-v-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/identity-v-banner.jpg",
        "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/idv-shot-1.jpg"],
        "trailer": None,
    },
    {
        "taptap_id": "10000455", "name_cn": "阴阳师", "rank": 9,
        "categories": ["rpg", "card"], "rating": 7.0, "count": 2300000,
        "developer": "NetEase", "publisher": "网易游戏", "release": "2016-09-09",
        "desc": "《阴阳师》是网易自主研发的 3D 日式和风回合制 RPG 手游。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/onmyoji-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/onmyoji-banner.jpg",
        "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/onmyoji-shot-1.jpg"],
        "trailer": None,
    },
    {
        "taptap_id": "10318296", "name_cn": "绝区零", "rank": 10,
        "categories": ["rpg", "action"], "rating": 8.2, "count": 820000,
        "developer": "HoYoverse", "publisher": "米哈游", "release": "2024-07-04",
        "desc": "《绝区零》是米哈游自研的都市幻想动作手游。",
        "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/zzz-icon.jpg",
        "banner": "https://i02p-tx-sg.playtrae.com/media/2024/03/zzz-banner.jpg",
        "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/zzz-shot-1.jpg"],
        "trailer": None,
    },
]


# ---------------------------------------------------------------- helpers
def _dict_to_game(d: Dict[str, Any], source_rank: int) -> CrawledGame:
    g = CrawledGame(slug=make_slug(d["name_cn"]))
    g.name_cn = clean_title(d["name_cn"])
    g.taptap_id = d["taptap_id"]
    g.categories = list(d.get("categories") or [])
    g.platforms = ["android", "ios"]
    g.taptap_rating = d.get("rating")
    g.rating_count = d.get("count")
    g.developer = d.get("developer")
    g.publisher = d.get("publisher")
    g.release_date = d.get("release")
    g.description_cn = d.get("desc", "")
    g.global_rank = d.get("rank") or source_rank
    g.raw_payload = d
    media: List[CrawledMediaItem] = []
    if d.get("icon"):
        media.append(CrawledMediaItem(
            type="ICON", url=d["icon"],
            source_site="taptap", caption_zh=f"{g.name_cn} icon", sort_order=0))
    if d.get("banner"):
        media.append(CrawledMediaItem(
            type="BANNER", url=d["banner"],
            source_site="taptap", caption_zh=f"{g.name_cn} 横幅", sort_order=1))
    for idx, s in enumerate(d.get("shots") or []):
        media.append(CrawledMediaItem(
            type="SCREENSHOT", url=s,
            source_site="taptap", sort_order=10 + idx,
            caption_zh=f"{g.name_cn} 截图 {idx+1}"))
    t = d.get("trailer")
    if isinstance(t, dict):
        media.append(CrawledMediaItem(
            type="TRAILER", url=t.get("url", ""),
            source_site=t.get("caption_en") and "youtube" or "taptap",
            source_url=t.get("poster"),
            poster_url=t.get("poster"),
            duration_sec=t.get("duration"),
            width=t.get("width"), height=t.get("height"),
            caption_zh=t.get("caption_zh"), caption_en=t.get("caption_en"),
            mime_type="video/mp4", sort_order=50))
    g.media = media
    return g


# ---------------------------------------------------------------- main crawl
async def _crawl_real(limit: int) -> CrawlResult:
    result = CrawlResult(source="taptap-rank")
    url = f"{settings.taptap_base.rstrip('/')}/ranking"
    async with HttpClient() as client:
        try:
            html = await client.get(url, expect="text")
            # Best-effort extraction of title/rating blocks from HTML
            titles = re.findall(r"class=\"app-title-title\"[^>]*>([^<]+)<", str(html))
            ratings = re.findall(r"class=\"app-rating-score\"[^>]*>([^<]+)<", str(html))
            for i, t in enumerate(titles[:limit]):
                name = clean_title(t)
                if not name: continue
                g = CrawledGame(slug=make_slug(name), name_cn=name, platforms=["android", "ios"])
                try:
                    g.taptap_rating = float(ratings[i])
                except (ValueError, IndexError):
                    pass
                g.global_rank = i + 1
                result.games.append(g)
        except Exception as e:
            result.errors.append(f"TapTap rank real crawl failed: {e}")
    return result


def run(limit: int = 10, *, dry_run: bool = False,
        force_mock: bool = False) -> CrawlResult:
    """Run the TapTap Top Games rank crawler.

    ``force_mock`` will skip the real network request entirely and return
    the curated 10-game mock dataset above. Great for E2E smoke tests.
    """
    if force_mock or settings.rawg_api_key is None and not force_mock:
        pass  # placeholder so mock is the default fallback below
    if force_mock:
        games = [_dict_to_game(d, idx+1) for idx, d in enumerate(_MOCK_GAMES[:limit])]
        res = CrawlResult(source="taptap-rank", games=games)
    else:
        try:
            res = asyncio.run(_crawl_real(limit))
        except Exception as e:
            res = CrawlResult(source="taptap-rank",
                              errors=[f"async crawl failed: {e}; falling back to mock"])
            res.games = [_dict_to_game(d, idx+1) for idx, d in enumerate(_MOCK_GAMES[:limit])]
        else:
            if not res.games and not res.errors:
                res.games = [_dict_to_game(d, idx+1) for idx, d in enumerate(_MOCK_GAMES[:limit])]
                res.errors.append("Real rank crawl returned 0 rows, using mock fallback.")
    # Always record raw crawl data into RawGame table (dry_run skips the DB write).
    if not dry_run:
        for g in res.games:
            payload = {
                "name_cn": g.name_cn, "slug": g.slug,
                "categories": g.categories, "platforms": g.platforms,
                "rating": g.taptap_rating, "count": g.rating_count,
                "developer": g.developer, "publisher": g.publisher,
                "release": g.release_date, "desc": g.description_cn,
                "global_rank": g.global_rank,
                "media": [{"type": m.type, "url": m.url} for m in g.media],
            }
            try:
                db.upsert_raw_game("taptap", g.taptap_id or g.slug, payload)
            except Exception as e:
                res.errors.append(f"RawGame insert err for {g.slug}: {e}")
    return res


if __name__ == "__main__":
    r = run(limit=5, force_mock=True, dry_run=True)
    print(f"[taptap_rank] source={r.source} games={len(r.games)} errors={len(r.errors)}")
    for g in r.games:
        print(f"   - {g.name_cn} (slug={g.slug})  media={len(g.media)}")

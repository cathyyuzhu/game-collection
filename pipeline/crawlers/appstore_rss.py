"""App Store RSS Top Free Apps Crawler (games only).

Source: https://rss.applemarketingtools.com/api/v2/<region>/top-free-apps/<limit>/apps.json
Mock mode:   Returns 10 popular games with curated metadata.
Production:  Apple RSS endpoint returns JSON. No API key required.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from config import settings  # noqa: E402
from utils import HttpClient, clean_title, make_slug  # noqa: E402
from crawlers import CrawledGame, CrawledMediaItem, CrawlResult  # noqa: E402
import db  # noqa: E402


_GENRE_MAP = {
    "Games": "game", "Role Playing": "rpg", "Action": "action",
    "Adventure": "adventure", "Strategy": "strategy", "Simulation": "simulation",
    "Puzzle": "puzzle", "Card": "card", "Casual": "casual", "Board": "board",
    "Racing": "racing", "Sports": "sports", "Music": "music",
    "Trivia": "trivia", "Word": "word", "Family": "family",
    "Educational": "educational",
}


_MOCK_APPS: List[Dict[str, Any]] = [
    {"id": "1560490975", "name": "Genshin Impact", "genre": "Role Playing",
     "rating": 4.7, "count": 3200000, "dev": "HoYoverse",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/genshin-as-cover.jpg"},
    {"id": "1517783697", "name": "Honkai: Star Rail", "genre": "Role Playing",
     "rating": 4.8, "count": 2100000, "dev": "HoYoverse",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/hsr-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/hsr-as-cover.jpg"},
    {"id": "1599099590", "name": "Wuthering Waves", "genre": "Role Playing",
     "rating": 4.5, "count": 800000, "dev": "Kuro Games",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/ww-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/ww-as-cover.jpg"},
    {"id": "6482120874", "name": "PUBG Mobile", "genre": "Action",
     "rating": 4.3, "count": 5400000, "dev": "Tencent",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/pubg-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/pubg-as-cover.jpg"},
    {"id": "1094591345", "name": "Arena of Valor", "genre": "Action",
     "rating": 4.2, "count": 4100000, "dev": "Tencent TiMi",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/aov-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/aov-as-cover.jpg"},
    {"id": "1586486035", "name": "Zenless Zone Zero", "genre": "Action",
     "rating": 4.6, "count": 900000, "dev": "HoYoverse",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/zzz-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/zzz-as-cover.jpg"},
    {"id": "1063742536", "name": "Arknights", "genre": "Strategy",
     "rating": 4.7, "count": 1500000, "dev": "Hypergryph",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/arknights-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/arknights-as-cover.jpg"},
    {"id": "1496228170", "name": "League of Legends - Wild Rift", "genre": "Strategy",
     "rating": 4.1, "count": 2600000, "dev": "Riot Games",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/wr-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/wr-as-cover.jpg"},
    {"id": "1540281243", "name": "Love and Deepspace", "genre": "Simulation",
     "rating": 4.4, "count": 500000, "dev": "Papergames",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/lads-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/lads-as-cover.jpg"},
    {"id": "1551499585", "name": "Honor of Kings World", "genre": "Action",
     "rating": 4.0, "count": 1900000, "dev": "Tencent TiMi",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/hkw-as-icon.png",
     "cover": "https://i02p-tx-sg.playtrae.com/media/2024/03/hkw-as-cover.jpg"},
]


def _to_game(d: Dict[str, Any], rank: int) -> CrawledGame:
    g = CrawledGame(slug=make_slug(d["name"]))
    g.name_en = clean_title(d["name"])
    g.name_cn = g.name_en  # to be overwritten by other crawlers later; placeholder
    g.appstore_id = d["id"]
    g.platforms = ["ios"]
    genre = _GENRE_MAP.get(d.get("genre", ""), "game")
    g.categories = [genre] if genre != "game" else ["casual"]
    g.appstore_rating = d.get("rating")
    g.rating_count = d.get("count")
    g.developer = d.get("dev")
    g.publisher = d.get("dev")
    g.ios_rank = rank
    g.raw_payload = d
    media: List[CrawledMediaItem] = []
    if d.get("icon"):
        media.append(CrawledMediaItem(
            type="ICON", url=d["icon"], source_site="appstore",
            caption_en=f"{g.name_en} iOS icon", sort_order=0))
    if d.get("cover"):
        media.append(CrawledMediaItem(
            type="COVER", url=d["cover"], source_site="appstore",
            caption_en=f"{g.name_en} App Store cover", sort_order=2))
    g.media = media
    return g


async def _crawl_real(limit: int, region: str = "cn") -> CrawlResult:
    result = CrawlResult(source="appstore-rss")
    url = (f"https://rss.applemarketingtools.com/api/v2/{region}/"
           f"top-free-apps/{limit}/apps.json")
    async with HttpClient() as client:
        try:
            data = await client.get(url, expect="json")
            if isinstance(data, dict) and isinstance(data.get("feed"), dict):
                results = data["feed"].get("results") or []
            else:
                results = []
            for idx, entry in enumerate(results[:limit]):
                name = clean_title(entry.get("name"))
                if not name: continue
                g = CrawledGame(slug=make_slug(name))
                g.name_en = name
                g.appstore_id = str(entry.get("id") or "")
                g.platforms = ["ios"]
                genres = entry.get("genres") or []
                cats: List[str] = []
                for gg in genres:
                    n = gg if isinstance(gg, str) else (gg.get("name") or "")
                    mapped = _GENRE_MAP.get(n)
                    if mapped: cats.append(mapped)
                g.categories = cats or ["casual"]
                g.developer = entry.get("artistName")
                g.publisher = entry.get("artistName")
                icon = ""
                for a in (entry.get("assets") or []) + (entry.get("artworkUrl") and [{"url": entry.get("artworkUrl")}] or []):
                    if isinstance(a, dict) and a.get("url") and not icon:
                        icon = a["url"]
                if icon:
                    g.media.append(CrawledMediaItem(
                        type="ICON", url=icon, source_site="appstore", sort_order=0))
                g.ios_rank = idx + 1
                g.raw_payload = entry
                result.games.append(g)
        except Exception as e:
            result.errors.append(f"AppStore RSS fetch failed: {e}")
    return result


def run(limit: int = 10, *, dry_run: bool = False,
        force_mock: bool = False, region: str = "cn") -> CrawlResult:
    if force_mock:
        games = [_to_game(d, idx+1) for idx, d in enumerate(_MOCK_APPS[:limit])]
        res = CrawlResult(source="appstore-rss", games=games)
    else:
        try:
            res = asyncio.run(_crawl_real(limit, region))
        except Exception as e:
            res = CrawlResult(source="appstore-rss",
                              errors=[f"async crawl failed: {e}; using mock fallback"])
            res.games = [_to_game(d, idx+1) for idx, d in enumerate(_MOCK_APPS[:limit])]
        else:
            if not res.games and not res.errors:
                res.errors.append("Apple RSS returned 0 rows, using mock fallback.")
                res.games = [_to_game(d, idx+1) for idx, d in enumerate(_MOCK_APPS[:limit])]
    if not dry_run:
        for g in res.games:
            payload = {
                "name_en": g.name_en, "slug": g.slug,
                "categories": g.categories, "platforms": g.platforms,
                "rating": g.appstore_rating, "count": g.rating_count,
                "developer": g.developer, "publisher": g.publisher,
                "ios_rank": g.ios_rank,
                "media": [{"type": m.type, "url": m.url} for m in g.media],
            }
            try:
                db.upsert_raw_game("appstore", g.appstore_id or g.slug, payload)
            except Exception as e:
                res.errors.append(f"RawGame insert err for {g.slug}: {e}")
    return res


if __name__ == "__main__":
    r = run(limit=5, force_mock=True, dry_run=True)
    print(f"[appstore_rss] source={r.source} games={len(r.games)} errors={len(r.errors)}")
    for g in r.games:
        print(f"   - {g.name_en} (slug={g.slug})  media={len(g.media)}")

"""RAWG.io Video Games Database API Crawler (enriches game metadata).

Source: https://api.rawg.io/api/games  (official API, needs API key).
Mock mode:   Returns 10 western/multi-platform games with RAWG-style fields.
Production:  Authenticates via `RAWG_API_KEY` env var, pulls games list and
             augments every game with screenshots, trailers and descriptions.
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


CAT_MAP = {
    "role-playing-games-rpg": "rpg",
    "action": "action",
    "shooter": "shooter",
    "strategy": "strategy",
    "adventure": "adventure",
    "puzzle": "puzzle",
    "simulation": "simulation",
    "sports": "sports",
    "racing": "racing",
    "casual": "casual",
    "indie": "indie",
    "massively-multiplayer": "mmo",
    "card": "card",
    "board-games": "board",
    "family": "family",
}


_MOCK_RAWG: List[Dict[str, Any]] = [
    {"id": 3328, "slug_rawg": "genshin-impact", "name": "Genshin Impact",
     "released": "2020-09-28", "rating": 4.5, "ratings_count": 2800,
     "playtime": 120, "genres": ["role-playing-games-rpg", "action", "adventure"],
     "platforms": ["pc", "playstation", "xbox", "nintendo-switch", "ios", "android"],
     "publishers": ["HoYoverse"], "developers": ["HoYoverse"],
     "desc_en": "Genshin Impact is an open-world action RPG where you explore the fantasy world of Teyvat.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-genshin-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-genshin-icon.jpg",
     "shots": [
         "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-genshin-s1.jpg",
         "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-genshin-s2.jpg",
     ],
     "trailer": None},
    {"id": 5286, "slug_rawg": "the-legend-of-zelda-breath-of-the-wild",
     "name": "The Legend of Zelda: Breath of the Wild",
     "released": "2017-03-03", "rating": 4.9, "ratings_count": 5200,
     "playtime": 95, "genres": ["adventure", "role-playing-games-rpg", "puzzle"],
     "platforms": ["nintendo-switch", "wii-u"],
     "publishers": ["Nintendo"], "developers": ["Nintendo EPD"],
     "desc_en": "Breath of the Wild is an open-world action adventure in the Zelda series.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-botw-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-botw-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-botw-s1.jpg"],
     "trailer": None},
    {"id": 4162, "slug_rawg": "cyberpunk-2077", "name": "Cyberpunk 2077",
     "released": "2020-12-10", "rating": 4.2, "ratings_count": 4100,
     "playtime": 60, "genres": ["role-playing-games-rpg", "shooter", "action"],
     "platforms": ["pc", "playstation", "xbox"],
     "publishers": ["CD PROJEKT RED"], "developers": ["CD PROJEKT RED"],
     "desc_en": "Cyberpunk 2077 is an open-world, action-adventure RPG set in Night City.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-cp2077-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-cp2077-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-cp2077-s1.jpg"],
     "trailer": None},
    {"id": 3498, "slug_rawg": "grand-theft-auto-v", "name": "Grand Theft Auto V",
     "released": "2013-09-17", "rating": 4.7, "ratings_count": 6400,
     "playtime": 40, "genres": ["action", "shooter"],
     "platforms": ["pc", "playstation", "xbox"],
     "publishers": ["Rockstar Games"], "developers": ["Rockstar North"],
     "desc_en": "GTA V is an open world action-adventure game by Rockstar.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-gta5-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-gta5-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-gta5-s1.jpg"],
     "trailer": None},
    {"id": 10259, "slug_rawg": "call-of-duty-mobile", "name": "Call of Duty: Mobile",
     "released": "2019-10-01", "rating": 3.9, "ratings_count": 1900,
     "playtime": 30, "genres": ["shooter", "action", "massively-multiplayer"],
     "platforms": ["ios", "android"],
     "publishers": ["Activision"], "developers": ["TiMi Studio Group"],
     "desc_en": "CoD Mobile is a free-to-play shooter for mobile.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-codm-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-codm-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-codm-s1.jpg"],
     "trailer": None},
    {"id": 58555, "slug_rawg": "wuthering-waves", "name": "Wuthering Waves",
     "released": "2024-05-22", "rating": 4.1, "ratings_count": 600,
     "playtime": 80, "genres": ["role-playing-games-rpg", "action", "adventure"],
     "platforms": ["pc", "ios", "android"],
     "publishers": ["Kuro Games (Guangzhou)", "China"],
     "developers": ["Kuro Games (Guangzhou)"],
     "desc_en": "Wuthering Waves is an open-world action RPG developed by Kuro Games.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-ww-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-ww-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-ww-s1.jpg"],
     "trailer": None},
    {"id": 19366, "slug_rawg": "honkai-star-rail", "name": "Honkai: Star Rail",
     "released": "2023-04-26", "rating": 4.4, "ratings_count": 1200,
     "playtime": 50, "genres": ["role-playing-games-rpg", "strategy"],
     "platforms": ["pc", "ios", "android", "playstation"],
     "publishers": ["HoYoverse"], "developers": ["HoYoverse"],
     "desc_en": "Honkai: Star Rail is a turn-based space fantasy RPG by HoYoverse.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-hsr-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-hsr-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-hsr-s1.jpg"],
     "trailer": None},
    {"id": 20802, "slug_rawg": "zenless-zone-zero", "name": "Zenless Zone Zero",
     "released": "2024-07-04", "rating": 4.3, "ratings_count": 500,
     "playtime": 40, "genres": ["action", "role-playing-games-rpg"],
     "platforms": ["pc", "ios", "android"],
     "publishers": ["HoYoverse"], "developers": ["HoYoverse"],
     "desc_en": "Zenless Zone Zero is an urban fantasy action RPG by HoYoverse.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-zzz-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-zzz-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-zzz-s1.jpg"],
     "trailer": None},
    {"id": 32033, "slug_rawg": "arknights", "name": "Arknights",
     "released": "2020-01-16", "rating": 4.4, "ratings_count": 900,
     "playtime": 100, "genres": ["strategy", "role-playing-games-rpg"],
     "platforms": ["ios", "android"],
     "publishers": ["Hypergryph", "Yostar"], "developers": ["Hypergryph"],
     "desc_en": "Arknights is a mobile tower defense / strategy RPG.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-ark-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-ark-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-ark-s1.jpg"],
     "trailer": None},
    {"id": 58174, "slug_rawg": "love-and-deepspace", "name": "Love and Deepspace",
     "released": "2024-01-17", "rating": 3.8, "ratings_count": 300,
     "playtime": 20, "genres": ["simulation", "adventure", "role-playing-games-rpg"],
     "platforms": ["ios", "android"],
     "publishers": ["Papergames"], "developers": ["Papergames"],
     "desc_en": "Love and Deepspace is a 3D romantic otome mobile game by Papergames.",
     "bg": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-lads-bg.jpg",
     "icon": "https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-lads-icon.jpg",
     "shots": ["https://i02p-tx-sg.playtrae.com/media/2024/03/rawg-lads-s1.jpg"],
     "trailer": None},
]


def _to_game(d: Dict[str, Any]) -> CrawledGame:
    slug = d.get("slug_rawg") or make_slug(d["name"])
    g = CrawledGame(slug=make_slug(slug))
    g.name_en = clean_title(d["name"])
    g.name_cn = g.name_en
    g.rawg_id = d.get("id")
    g.release_date = d.get("released")
    g.global_score = float(d["rating"] * 20) if d.get("rating") else None
    g.rating_count = d.get("ratings_count")
    g.developer = (d.get("developers") or [""])[0] or None
    g.publisher = (d.get("publishers") or [""])[0] or None
    cats: List[str] = []
    for gg in d.get("genres") or []:
        m = CAT_MAP.get(gg)
        if m: cats.append(m)
    g.categories = cats or ["casual"]
    plats: List[str] = []
    for pp in d.get("platforms") or []:
        if pp == "ios": plats.append("ios")
        elif pp == "android": plats.append("android")
        elif pp in ("pc", "playstation", "xbox", "nintendo-switch", "wii-u"):
            plats.append(pp)
    plats = plats or ["ios", "android"]
    g.platforms = plats
    g.description_en = d.get("desc_en", "")
    g.raw_payload = d
    media: List[CrawledMediaItem] = []
    if d.get("icon"):
        media.append(CrawledMediaItem(
            type="ICON", url=d["icon"], source_site="rawg",
            caption_en=f"{g.name_en} RAWG icon", sort_order=0))
    if d.get("bg"):
        media.append(CrawledMediaItem(
            type="BANNER", url=d["bg"], source_site="rawg",
            caption_en=f"{g.name_en} RAWG background", sort_order=1))
    for idx, s in enumerate(d.get("shots") or []):
        media.append(CrawledMediaItem(
            type="SCREENSHOT", url=s, source_site="rawg",
            caption_en=f"{g.name_en} screenshot {idx+1}",
            sort_order=10 + idx))
    if isinstance(d.get("trailer"), dict):
        t = d["trailer"]
        media.append(CrawledMediaItem(
            type="TRAILER", url=t.get("url", ""), source_site="youtube",
            poster_url=t.get("poster"), duration_sec=t.get("duration"),
            width=t.get("width"), height=t.get("height"),
            caption_en=t.get("caption_en"), mime_type="video/mp4", sort_order=50))
    g.media = media
    return g


async def _crawl_real(limit: int) -> CrawlResult:
    result = CrawlResult(source="rawg-api")
    if not settings.rawg_api_key:
        result.errors.append("RAWG_API_KEY not set in env.")
        return result
    url = "https://api.rawg.io/api/games"
    params: Dict[str, Any] = {
        "key": settings.rawg_api_key,
        "page_size": min(limit, 40),
        "ordering": "-added",
    }
    async with HttpClient() as client:
        try:
            data = await client.get(url, params=params, expect="json")
            results = data.get("results") or [] if isinstance(data, dict) else []
            for entry in results[:limit]:
                name = clean_title(entry.get("name") or "")
                if not name: continue
                g = CrawledGame(slug=make_slug(entry.get("slug") or name))
                g.rawg_id = entry.get("id")
                g.name_en = name
                g.release_date = entry.get("released")
                g.global_score = entry.get("metacritic") or (
                    float(entry.get("rating", 0) * 20) or None)
                g.rating_count = entry.get("ratings_count")
                g.developer = None  # requires second detail call
                g.publisher = None
                g.platforms = [
                    str((p if isinstance(p, str) else p.get("platform", {}) or {}).get("slug") or "")
                    for p in (entry.get("parent_platforms") or entry.get("platforms") or [])
                ]
                g.platforms = [pl for pl in g.platforms if pl] or ["ios", "android"]
                g.categories = [
                    CAT_MAP.get(str(ge if isinstance(ge, str) else (ge or {}).get("slug") or ""))
                    for ge in (entry.get("genres") or [])
                ]
                g.categories = [c for c in g.categories if c] or ["casual"]
                g.description_en = entry.get("description_raw") or entry.get("description") or ""
                bg = entry.get("background_image")
                if bg:
                    g.media.append(CrawledMediaItem(
                        type="BANNER", url=bg, source_site="rawg", sort_order=1))
                g.raw_payload = entry
                result.games.append(g)
        except Exception as e:
            result.errors.append(f"RAWG fetch failed: {e}")
    return result


def run(limit: int = 10, *, dry_run: bool = False,
        force_mock: bool = False) -> CrawlResult:
    if force_mock or not settings.rawg_api_key:
        games = [_to_game(d) for d in _MOCK_RAWG[:limit]]
        res = CrawlResult(source="rawg-api", games=games)
        if not force_mock:
            res.errors.append("RAWG_API_KEY not configured, using mock fallback.")
    else:
        try:
            res = asyncio.run(_crawl_real(limit))
        except Exception as e:
            res = CrawlResult(source="rawg-api",
                              errors=[f"async crawl failed: {e}; mock fallback"])
            res.games = [_to_game(d) for d in _MOCK_RAWG[:limit]]
        else:
            if not res.games:
                res.errors.append("RAWG API returned 0 rows, mock fallback.")
                res.games = [_to_game(d) for d in _MOCK_RAWG[:limit]]
    if not dry_run:
        for g in res.games:
            payload = {
                "name_en": g.name_en, "slug": g.slug,
                "rawg_id": g.rawg_id, "categories": g.categories,
                "platforms": g.platforms, "global_score": g.global_score,
                "rating_count": g.rating_count, "released": g.release_date,
                "developer": g.developer, "publisher": g.publisher,
                "description_en": g.description_en,
                "media": [{"type": m.type, "url": m.url} for m in g.media],
            }
            try:
                db.upsert_raw_game("rawg", str(g.rawg_id or g.slug), payload)
            except Exception as e:
                res.errors.append(f"RawGame insert err for {g.slug}: {e}")
    return res


if __name__ == "__main__":
    r = run(limit=5, force_mock=True, dry_run=True)
    print(f"[rawg_api] source={r.source} games={len(r.games)} errors={len(r.errors)}")
    for g in r.games:
        print(f"   - {g.name_en} (slug={g.slug})  media={len(g.media)}")

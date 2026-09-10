"""SQLite DB writers (matches Prisma schema layout exactly).

We write DIRECTLY to the SQLite file used by Prisma (`web/prisma/dev.db`) using
the stdlib sqlite3 driver. This lets the Python pipeline run without depending
on prisma-client-py, which is currently broken on Python 3.13+.

All writes use row-level SQL matching the Prisma table DDLs exactly.

Schema notes (SQLite adapter workarounds for Prisma features the connector
does not support on SQLite):
    Game.platforms      -> TEXT, comma-separated list  (was Prisma String[])
    Game.categories     -> TEXT, comma-separated list  (was Prisma String[])
    GuideI18n.keyFacts  -> TEXT, JSON.stringify'd array of {field,value,unit}
    RawGame.payload     -> TEXT, JSON.stringify'd raw crawl dict
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from config import settings  # noqa: E402


# ---------------------------------------------------------------- helpers
def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def cuid() -> str:
    """Cheap 32-hex random id (works because Prisma cuid() also yields random
    string ids; the value is opaque to the app so pure hex is fine).
    """
    return os.urandom(16).hex()


@contextmanager
def get_sqlite_conn() -> Iterator[sqlite3.Connection]:
    path = settings.sqlite_file
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        yield conn
        conn.commit()
    finally:
        conn.close()


# -------------------------------------------------------------- Raw tables
def upsert_raw_game(source: str, source_id: str, payload: Dict[str, Any],
                    matched_game_id: Optional[str] = None) -> str:
    payload_text = json.dumps(payload, ensure_ascii=False)
    with get_sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO RawGame (id, source, sourceId, payload, matchedGameId, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(source, sourceId) DO UPDATE SET
                payload = excluded.payload,
                matchedGameId = COALESCE(excluded.matchedGameId, RawGame.matchedGameId)
            """,
            (cuid(), source, source_id, payload_text, matched_game_id, now_iso()),
        )
        row = conn.execute(
            "SELECT id FROM RawGame WHERE source=? AND sourceId=?",
            (source, source_id),
        ).fetchone()
        return row["id"] if row else ""


def upsert_raw_guide(source: str, source_url: str, title: str, html: str, text: str,
                     matched_guide_id: Optional[str] = None) -> str:
    with get_sqlite_conn() as conn:
        # Prisma schema: RawGuide UNIQUE only on sourceUrl (single column)
        conn.execute(
            """
            INSERT INTO RawGuide (id, source, sourceUrl, title, html, text, matchedGuideId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sourceUrl) DO UPDATE SET
                source = excluded.source,
                title  = excluded.title,
                html   = excluded.html,
                text   = excluded.text,
                matchedGuideId = COALESCE(excluded.matchedGuideId, RawGuide.matchedGuideId)
            """,
            (cuid(), source, source_url, title, html, text, matched_guide_id),
        )
        row = conn.execute(
            "SELECT id FROM RawGuide WHERE sourceUrl=?",
            (source_url,),
        ).fetchone()
        return row["id"] if row else ""


# ---------------------------------------------------------------- Game
def upsert_game(
    slug: str,
    platforms: List[str] = None,
    categories: List[str] = None,
    taptap_id: Optional[str] = None,
    appstore_id: Optional[str] = None,
    rawg_id: Optional[int] = None,
    global_score: Optional[float] = None,
    global_rank: Optional[int] = None,
    ios_rank: Optional[int] = None,
    android_rank: Optional[int] = None,
    ios_downloads: Optional[int] = None,
    android_downloads: Optional[int] = None,
    taptap_rating: Optional[float] = None,
    appstore_rating: Optional[float] = None,
    rating_count: Optional[int] = None,
    developer: Optional[str] = None,
    publisher: Optional[str] = None,
    release_date: Optional[str] = None,
) -> str:
    plats = ",".join(platforms or [])
    cats = ",".join(categories or [])
    merge = lambda new, old: new if new is not None else old
    with get_sqlite_conn() as conn:
        existing = conn.execute("SELECT id FROM Game WHERE slug=?", (slug,)).fetchone()
        if existing:
            cur = conn.execute("SELECT * FROM Game WHERE slug=?", (slug,)).fetchone()
            row = dict(cur)
            new_plats = plats if platforms is not None else (row.get("platforms") or "")
            new_cats = cats if categories is not None else (row.get("categories") or "")
            conn.execute(
                """
                UPDATE Game SET
                    platforms=?, categories=?,
                    taptapId=?, appStoreId=?, rawgId=?,
                    globalScore=?, globalRank=?, iosRank=?, androidRank=?,
                    iosDownloads=?, androidDownloads=?,
                    taptapRating=?, appStoreRating=?, ratingCount=?,
                    developer=?, publisher=?, releaseDate=?, updatedAt=?
                WHERE slug=?
                """,
                (
                    new_plats, new_cats,
                    merge(taptap_id, row.get("taptapId")),
                    merge(appstore_id, row.get("appStoreId")),
                    merge(rawg_id, row.get("rawgId")),
                    merge(global_score, row.get("globalScore")),
                    merge(global_rank, row.get("globalRank")),
                    merge(ios_rank, row.get("iosRank")),
                    merge(android_rank, row.get("androidRank")),
                    merge(ios_downloads, row.get("iosDownloads")),
                    merge(android_downloads, row.get("androidDownloads")),
                    merge(taptap_rating, row.get("taptapRating")),
                    merge(appstore_rating, row.get("appStoreRating")),
                    merge(rating_count, row.get("ratingCount")),
                    merge(developer, row.get("developer")),
                    merge(publisher, row.get("publisher")),
                    merge(release_date, row.get("releaseDate")),
                    now_iso(),
                    slug,
                ),
            )
            return existing["id"]
        conn.execute(
            """
            INSERT INTO Game (
                id, slug, platforms, categories,
                taptapId, appStoreId, rawgId,
                globalScore, globalRank, iosRank, androidRank,
                iosDownloads, androidDownloads,
                taptapRating, appStoreRating, ratingCount,
                developer, publisher, releaseDate, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cuid(), slug, plats, cats,
                taptap_id, appstore_id, rawg_id,
                global_score, global_rank, ios_rank, android_rank,
                ios_downloads, android_downloads,
                taptap_rating, appstore_rating, rating_count,
                developer, publisher, release_date, now_iso(), now_iso(),
            ),
        )
        return conn.execute("SELECT id FROM Game WHERE slug=?", (slug,)).fetchone()["id"]


def upsert_game_i18n(game_id: str, locale: str, name: str, description: str) -> str:
    with get_sqlite_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM GameI18n WHERE gameId=? AND locale=?", (game_id, locale)
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE GameI18n SET name=?, description=?
                   WHERE gameId=? AND locale=?""",
                (name, description, game_id, locale),
            )
            return existing["id"]
        conn.execute(
            """INSERT INTO GameI18n (id, gameId, locale, name, description)
               VALUES (?, ?, ?, ?, ?)""",
            (cuid(), game_id, locale, name, description),
        )
        return conn.execute(
            "SELECT id FROM GameI18n WHERE gameId=? AND locale=?", (game_id, locale)
        ).fetchone()["id"]


# -------------------------------------------------------------- GameMedia
def upsert_game_media(game_id: str, type: str, url: str, *,
                      storage_key: Optional[str] = None,
                      source_url: Optional[str] = None,
                      source_site: Optional[str] = None,
                      mime_type: Optional[str] = None,
                      size_bytes: Optional[int] = None,
                      width: Optional[int] = None,
                      height: Optional[int] = None,
                      duration_sec: Optional[int] = None,
                      poster_url: Optional[str] = None,
                      sort_order: int = 0,
                      caption_zh: Optional[str] = None,
                      caption_en: Optional[str] = None) -> str:
    """Per user rule: **Only GameMedia must be used for game media**.

    Never ever write a guide's cover/video/screenshot through here. Guides use
    GuideMedia exclusively.
    """
    with get_sqlite_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM GameMedia WHERE gameId=? AND type=? AND url=?",
            (game_id, type, url),
        ).fetchone()
        row: Dict[str, Any] = {}
        if existing:
            cur = conn.execute("SELECT * FROM GameMedia WHERE id=?", (existing["id"],)).fetchone()
            row = dict(cur)
        def nv(new, old):
            return new if new is not None else old
        vals = (
            game_id, type, url,
            nv(storage_key, row.get("storageKey")),
            nv(source_url, row.get("sourceUrl")),
            nv(source_site, row.get("sourceSite")),
            nv(mime_type, row.get("mimeType")),
            nv(size_bytes, row.get("sizeBytes")),
            nv(width, row.get("width")),
            nv(height, row.get("height")),
            nv(duration_sec, row.get("durationSec")),
            nv(poster_url, row.get("posterUrl")),
            sort_order,
            caption_zh if caption_zh is not None else row.get("captionZh"),
            caption_en if caption_en is not None else row.get("captionEn"),
            now_iso(),
        )
        if existing:
            conn.execute(
                """UPDATE GameMedia SET
                    gameId=?, type=?, url=?,
                    storageKey=?, sourceUrl=?, sourceSite=?,
                    mimeType=?, sizeBytes=?, width=?, height=?, durationSec=?, posterUrl=?,
                    sortOrder=?, captionZh=?, captionEn=?, updatedAt=?
                   WHERE id=?""",
                vals + (existing["id"],),
            )
            return existing["id"]
        conn.execute(
            """INSERT INTO GameMedia (
                id, gameId, type, url,
                storageKey, sourceUrl, sourceSite,
                mimeType, sizeBytes, width, height, durationSec, posterUrl,
                sortOrder, captionZh, captionEn, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cuid(),) + vals + (now_iso(),),
        )
        return conn.execute(
            "SELECT id FROM GameMedia WHERE gameId=? AND type=? AND url=?",
            (game_id, type, url),
        ).fetchone()["id"]


# ---------------------------------------------------------------- Guide
def upsert_guide(game_id: str, slug: str, guide_type: str, *,
                 game_version: str = "v1.0.0",          # Prisma: gameVersion String (required!)
                 read_minutes: Optional[int] = None,
                 published_at: Optional[str] = None,
                 gallery: Optional[List[str]] = None) -> str:
    """Upsert into Guide table. Columns (Prisma / SQLite actual):
       id, gameId, slug, guideType, gameVersion, gallery, readMinutes, publishedAt,
       usefulCount, uselessCount, createdAt, updatedAt.
    """
    gallery_json = json.dumps(gallery or [], ensure_ascii=False)
    with get_sqlite_conn() as conn:
        existing = conn.execute("SELECT id FROM Guide WHERE gameId=? AND slug=?", (game_id, slug)).fetchone()
        if existing:
            conn.execute(
                """UPDATE Guide SET guideType=?, gameVersion=?, gallery=?, readMinutes=?, publishedAt=?, updatedAt=?
                   WHERE id=?""",
                (guide_type, game_version, gallery_json, read_minutes or 5, published_at or now_iso(),
                 now_iso(), existing["id"]),
            )
            return existing["id"]
        conn.execute(
            """INSERT INTO Guide (
                id, gameId, slug, guideType, gameVersion, gallery, readMinutes, publishedAt,
                usefulCount, uselessCount, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, ?)""",
            (
                cuid(), game_id, slug, guide_type, game_version, gallery_json,
                read_minutes or 5, published_at or now_iso(), now_iso(),
            ),
        )
        return conn.execute("SELECT id FROM Guide WHERE gameId=? AND slug=?",
                            (game_id, slug)).fetchone()["id"]


def upsert_guide_i18n(guide_id: str, locale: str, title: str, tldr: str, content: str,
                      key_facts: Optional[List[Dict[str, Any]]] = None) -> str:
    kf_text = json.dumps(key_facts, ensure_ascii=False) if key_facts else None
    with get_sqlite_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM GuideI18n WHERE guideId=? AND locale=?",
            (guide_id, locale),
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE GuideI18n SET title=?, tldr=?, content=?, keyFacts=?
                   WHERE guideId=? AND locale=?""",
                (title, tldr, content, kf_text, guide_id, locale),
            )
            return existing["id"]
        conn.execute(
            """INSERT INTO GuideI18n (id, guideId, locale, title, tldr, content, keyFacts)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (cuid(), guide_id, locale, title, tldr, content, kf_text),
        )
        return conn.execute(
            "SELECT id FROM GuideI18n WHERE guideId=? AND locale=?", (guide_id, locale)
        ).fetchone()["id"]


# -------------------------------------------------------------- GuideSource
_SOURCE_TYPE_BY_SITE = {
    "taptap": "community_guide",
    "4399": "wiki",
    "appstore": "professional_guide",
    "rawg": "professional_guide",
}


def upsert_guide_source(guide_id: str, site_name: str, source_url: str,
                        author: Optional[str] = None,
                        crawled_at: Optional[str] = None,
                        similarity: Optional[float] = None,
                        source_type: Optional[str] = None,
                        transformation: Optional[str] = None) -> str:
    """Writes GuideSource row per Prisma schema.

    Prisma fields: guideId, sourceUrl, sourceName, sourceType (required),
    author, crawledAt (DateTime), transformation, similarityPct.
    crawled_at accepts ISO string; we fall back to now().
    """
    dt = crawled_at or now_iso()
    stype = source_type or _SOURCE_TYPE_BY_SITE.get(site_name, "community_guide")
    with get_sqlite_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM GuideSource WHERE guideId=? AND sourceUrl=?",
            (guide_id, source_url),
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE GuideSource SET sourceName=?, sourceType=?, author=?, crawledAt=?,
                   transformation=?, similarityPct=?
                   WHERE id=?""",
                (site_name, stype, author, dt, transformation, similarity, existing["id"]),
            )
            return existing["id"]
        conn.execute(
            """INSERT INTO GuideSource (
                id, guideId, sourceName, sourceUrl, sourceType, author, crawledAt,
                transformation, similarityPct
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cuid(), guide_id, site_name, source_url, stype, author, dt, transformation, similarity),
        )
        return conn.execute(
            "SELECT id FROM GuideSource WHERE guideId=? AND sourceUrl=?",
            (guide_id, source_url),
        ).fetchone()["id"]


# -------------------------------------------------------------- GuideMedia
def upsert_guide_media(guide_id: str, type: str, url: str, *,
                       storage_key: Optional[str] = None,
                       source_url: Optional[str] = None,
                       source_site: Optional[str] = None,
                       mime_type: Optional[str] = None,
                       size_bytes: Optional[int] = None,
                       width: Optional[int] = None,
                       height: Optional[int] = None,
                       duration_sec: Optional[int] = None,
                       poster_url: Optional[str] = None,
                       sort_order: int = 0,
                       caption_zh: Optional[str] = None,
                       caption_en: Optional[str] = None,
                       anchor: Optional[str] = None) -> str:
    """**Per user rule: Only GuideMedia is used for a guide's media.**

    If you are handling a guide cover/inline image/video, call ONLY this
    function. Never write the same asset into GameMedia.

    Prisma column name: anchor (not sectionAnchor).
    """
    with get_sqlite_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM GuideMedia WHERE guideId=? AND kind=? AND url=?",
            (guide_id, type, url),
        ).fetchone()
        row: Dict[str, Any] = {}
        if existing:
            cur = conn.execute("SELECT * FROM GuideMedia WHERE id=?", (existing["id"],)).fetchone()
            row = dict(cur)
        def nv(n, o):
            return n if n is not None else o
        vals = (
            guide_id, type, url,
            nv(storage_key, row.get("storageKey")),
            nv(source_url, row.get("sourceUrl")),
            nv(source_site, row.get("sourceSite")),
            nv(mime_type, row.get("mimeType")),
            nv(size_bytes, row.get("sizeBytes")),
            nv(width, row.get("width")),
            nv(height, row.get("height")),
            nv(duration_sec, row.get("durationSec")),
            nv(poster_url, row.get("posterUrl")),
            sort_order,
            caption_zh if caption_zh is not None else row.get("captionZh"),
            caption_en if caption_en is not None else row.get("captionEn"),
            anchor if anchor is not None else row.get("anchor"),
            now_iso(),
        )
        if existing:
            conn.execute(
                """UPDATE GuideMedia SET
                    guideId=?, kind=?, url=?,
                    storageKey=?, sourceUrl=?, sourceSite=?,
                    mimeType=?, sizeBytes=?, width=?, height=?, durationSec=?, posterUrl=?,
                    orderIndex=?, captionZh=?, captionEn=?, contentRef=?, updatedAt=?
                   WHERE id=?""",
                vals + (existing["id"],),
            )
            return existing["id"]
        conn.execute(
            """INSERT INTO GuideMedia (
                id, guideId, kind, url,
                storageKey, sourceUrl, sourceSite,
                mimeType, sizeBytes, width, height, durationSec, posterUrl,
                orderIndex, captionZh, captionEn, contentRef, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cuid(),) + vals + (now_iso(),),
        )
        return conn.execute(
            "SELECT id FROM GuideMedia WHERE guideId=? AND kind=? AND url=?",
            (guide_id, type, url),
        ).fetchone()["id"]


# ---------------------------------------------------------- Stats / finders
def find_game_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    with get_sqlite_conn() as conn:
        row = conn.execute("SELECT * FROM Game WHERE slug=?", (slug,)).fetchone()
        return dict(row) if row else None


def get_game_id_by_slug(slug: str) -> Optional[str]:
    r = find_game_by_slug(slug)
    return r["id"] if r else None


def find_guide_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    with get_sqlite_conn() as conn:
        row = conn.execute("SELECT * FROM Guide WHERE slug=?", (slug,)).fetchone()
        return dict(row) if row else None


def batch_insert_game_media(game_id: str, items: List[Dict[str, Any]]) -> int:
    """Bulk insert GameMedia rows from a list of kwargs-dicts (see upsert_game_media)."""
    if not items:
        return 0
    n = 0
    for kw in items:
        try:
            upsert_game_media(game_id, **kw)
            n += 1
        except Exception:
            pass
    return n


def batch_insert_guide_media(guide_id: str, items: List[Dict[str, Any]]) -> int:
    if not items:
        return 0
    n = 0
    for kw in items:
        try:
            upsert_guide_media(guide_id, **kw)
            n += 1
        except Exception:
            pass
    return n


def count_all() -> Dict[str, int]:
    with get_sqlite_conn() as conn:
        def n(t):
            return conn.execute(f"SELECT COUNT(*) AS c FROM {t}").fetchone()["c"]
        return {
            "games": n("Game"),
            "game_media": n("GameMedia"),
            "guides": n("Guide"),
            "guide_i18n": n("GuideI18n"),
            "guide_media": n("GuideMedia"),
            "raw_games": n("RawGame"),
            "raw_guides": n("RawGuide"),
        }

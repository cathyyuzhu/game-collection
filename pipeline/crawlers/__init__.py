"""Crawlers data types & 4399_guide alias export.

Each crawler module exposes a standard interface:

    def run(limit: int = 10, *, dry_run: bool = False,
            force_mock: bool = False) -> CrawlResult

Note on 4399_guide.py: the file name starts with a digit, which Python cannot
import as a normal identifier (``from crawlers import 4399_guide`` is SyntaxError).
Therefore, this __init__.py dynamically imports it using ``importlib`` and
re-exports it under the alias ``_4399_guide``. Everywhere else in the codebase
you MUST write ``from crawlers import _4399_guide``.
"""
from __future__ import annotations

import importlib
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))
_PKG_ROOT = _HERE.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))


# ============================================================
# Shared data contracts between crawlers -> orchestrator
# ============================================================
@dataclass
class CrawledMediaItem:
    """A media item captured by crawlers. Later -> upsert_game_media()
    or upsert_guide_media() (chosen by orchestrator based on context)."""
    type: str                                    # ICON / BANNER / COVER / SCREENSHOT / TRAILER / INLINE_IMAGE / INLINE_VIDEO
    url: str
    source_url: Optional[str] = None
    source_site: Optional[str] = None             # taptap / 4399 / rawg / appstore / youtube / ...
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_sec: Optional[int] = None            # for TRAILER / video
    poster_url: Optional[str] = None              # for TRAILER / video
    caption_zh: Optional[str] = None
    caption_en: Optional[str] = None
    sort_order: int = 0
    section_anchor: Optional[str] = None          # for guide inline media (anchor inside markdown)


@dataclass
class CrawledGame:
    """Raw crawled game. Orchestrator will deduplicate via slug + upsert."""
    slug: str
    name_cn: str = ""
    name_tw: str = ""
    name_en: str = ""
    description_cn: str = ""
    description_tw: str = ""
    description_en: str = ""
    platforms: List[str] = field(default_factory=list)    # ios / android / pc
    categories: List[str] = field(default_factory=list)   # rpg / strategy / shooter / card ...
    taptap_id: Optional[str] = None
    appstore_id: Optional[str] = None
    rawg_id: Optional[int] = None
    developer: Optional[str] = None
    publisher: Optional[str] = None
    release_date: Optional[str] = None
    taptap_rating: Optional[float] = None
    appstore_rating: Optional[float] = None
    rating_count: Optional[int] = None
    global_score: Optional[float] = None
    global_rank: Optional[int] = None
    ios_rank: Optional[int] = None
    android_rank: Optional[int] = None
    ios_downloads: Optional[int] = None
    android_downloads: Optional[int] = None
    media: List[CrawledMediaItem] = field(default_factory=list)
    raw_payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CrawledGuide:
    """Raw crawled guide. Later -> step1_extract through LLM -> Guide rows."""
    source: str
    source_url: str
    title: str
    locale: str = "zh-CN"
    html: str = ""
    text: str = ""
    game_slug: Optional[str] = None
    game_name_hint: Optional[str] = None     # matched by title
    hero_image_url: Optional[str] = None
    inlined_media: List[CrawledMediaItem] = field(default_factory=list)
    author: Optional[str] = None
    published_at: Optional[str] = None
    view_count: Optional[int] = None
    raw_payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CrawlResult:
    source: str = ""
    games: List[CrawledGame] = field(default_factory=list)
    guides: List[CrawledGuide] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


# ------------------------------------------------------------
# 4399_guide alias import (name starts with digit -> can't be normal import)
# ------------------------------------------------------------
try:
    _mod_4399 = importlib.import_module(".4399_guide", package="crawlers")
except Exception as _e:
    _mod_4399 = None
    _4399_IMPORT_ERR: Optional[str] = str(_e)
else:
    _4399_IMPORT_ERR = None

# Expose as attribute on this package so `from crawlers import _4399_guide` works
_this_pkg = sys.modules[__name__]
if _mod_4399 is not None:
    setattr(_this_pkg, "_4399_guide", _mod_4399)
else:
    # Fallback stub so orchestrator never crashes during import.
    import types as _types
    _stub = _types.ModuleType("_4399_guide_stub")
    def _stub_run(*a, **kw):
        return CrawlResult(
            source="4399-stub",
            errors=[
                "crawlers._4399_guide failed to import during __init__.py. "
                + (_4399_IMPORT_ERR or "unknown error.")
            ],
        )
    _stub.run = _stub_run  # type: ignore[attr-defined]
    setattr(_this_pkg, "_4399_guide", _stub)


__all__ = [
    "CrawledGame", "CrawledGuide", "CrawledMediaItem", "CrawlResult",
    "_4399_guide",
]

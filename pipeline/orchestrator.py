"""Pipeline orchestrator: ties crawlers -> source merge -> DB write -> LLM pipeline -> DB write.

Exposes:
  - run_crawl_stage(...)  : crawlers + source merge + DB writers for Game / GameI18n / GameMedia / RawGuide
  - run_llm_stage(...)    : group RawGuides by matched game -> 5-step LLM -> Guide + GuideI18n / Source / Media
  - run_pipeline(stage, opts): unified entry used by CLI run_pipeline.py
"""
from __future__ import annotations

import asyncio
import hashlib
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

try:
    from loguru import logger  # type: ignore
except Exception:  # pragma: no cover
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("orchestrator")  # type: ignore

# -------------- crawlers ---------------
from crawlers import (  # noqa: E402
    CrawledGame, CrawledGuide, CrawlResult, CrawledMediaItem,
    appstore_rss, taptap_rank, rawg_api, _4399_guide, taptap_guide,
)
from utils import clean_title, make_slug  # noqa: E402
from utils import download_media  # noqa: E402
from config import settings  # noqa: E402

# -------------- DB writers ---------------
from db import (  # noqa: E402
    upsert_game, upsert_game_i18n, upsert_game_media, batch_insert_game_media,
    upsert_guide, upsert_guide_i18n, upsert_guide_source,
    upsert_guide_media,
    get_game_id_by_slug, now_iso,
)

# -------------- LLM steps ---------------
from llm.step1_extract import extract  # noqa: E402
from llm.step2_rewrite_zh import rewrite_zh_cn  # noqa: E402
from llm.step3_localize_tw import localize_zh_tw  # noqa: E402
from llm.step4_translate_en import translate_en  # noqa: E402
from llm.step5_quality_check import check_quality, compute_similarities  # noqa: E402
from llm.schemas import (  # noqa: E402
    ExtractedGuide, ProcessedGuide, QualityReport, KeyFact, GlossaryItem,
)


# ---------------------------------------------------------------------------
# Name → slug mapping (for well-known games; also used to match raw guide → game)
# ---------------------------------------------------------------------------
KNOWN_GAME_SLUG: Dict[str, str] = {
    "原神": "genshin-impact",
    "Genshin Impact": "genshin-impact",
    "王者荣耀": "honor-of-kings",
    "Honor of Kings": "honor-of-kings",
    "和平精英": "game-for-peace",
    "Game for Peace": "game-for-peace",
    "PUBG MOBILE": "pubg-mobile",
    "英雄联盟手游": "league-of-legends-wild-rift",
    "League of Legends: Wild Rift": "league-of-legends-wild-rift",
    "Wild Rift": "league-of-legends-wild-rift",
    "蛋仔派对": "eggy-party",
    "Eggy Party": "eggy-party",
    "世界之外": "beyond-the-world",
    "鸣潮": "wuthering-waves",
    "Wuthering Waves": "wuthering-waves",
    "崩坏：星穹铁道": "honkai-star-rail",
    "Honkai: Star Rail": "honkai-star-rail",
    "王者荣耀世界": "honor-of-kings-world",
    "恋与深空": "love-and-deepspace",
    "Love and Deepspace": "love-and-deepspace",
    "第五人格": "identity-v",
    "Identity V": "identity-v",
    "明日方舟": "arknights",
    "Arknights": "arknights",
    "阴阳师": "onmyoji",
    "Onmyoji": "onmyoji",
    "燕云十六声": "where-winds-meet",
    "Where Winds Meet": "where-winds-meet",
}


# ============================================================
# Stage A: crawlers + multi-source merge into Game / GameI18n / GameMedia
# ============================================================
@dataclass
class CrawlReport:
    total_games_merged: int = 0
    total_game_media: int = 0
    total_raw_guides: int = 0
    errors: List[str] = field(default_factory=list)


class MergedGame:
    """Aggregates CrawledGame records from multiple sources keyed by slug."""

    def __init__(self, slug: str):
        self.slug = slug
        self.taptap_id: Optional[str] = None
        self.appstore_id: Optional[str] = None
        self.rawg_id: Optional[int] = None
        self.name_zh_cn: Optional[str] = None
        self.name_zh_tw: Optional[str] = None
        self.name_en: Optional[str] = None
        self.desc_zh_cn: Optional[str] = None
        self.desc_zh_tw: Optional[str] = None
        self.desc_en: Optional[str] = None
        self.platforms: List[str] = []
        self.categories: List[str] = []
        self.developer: Optional[str] = None
        self.publisher: Optional[str] = None
        self.release_date: Optional[str] = None
        self.taptap_rating: Optional[float] = None
        self.appstore_rating: Optional[float] = None
        self.rating_count: Optional[int] = None
        self.ios_rank: Optional[int] = None
        self.android_rank: Optional[int] = None
        self.global_rank: Optional[int] = None
        self.global_score: Optional[float] = None
        self.ios_downloads: Optional[int] = None
        self.android_downloads: Optional[int] = None
        self.media_kwargs: List[Dict[str, Any]] = []

    def merge(self, cg: CrawledGame):
        def first(a, b):
            return a if a not in (None, "") else b
        self.taptap_id = first(self.taptap_id, cg.taptap_id)
        self.appstore_id = first(self.appstore_id, cg.appstore_id)
        self.rawg_id = first(self.rawg_id, cg.rawg_id)
        self.name_zh_cn = first(self.name_zh_cn, cg.name_cn)
        self.name_zh_tw = first(self.name_zh_tw, cg.name_tw)
        self.name_en = first(self.name_en, cg.name_en)
        self.desc_zh_cn = first(self.desc_zh_cn, cg.description_cn)
        self.desc_zh_tw = first(self.desc_zh_tw, cg.description_tw)
        self.desc_en = first(self.desc_en, cg.description_en)
        for p in cg.platforms:
            if p and p not in self.platforms:
                self.platforms.append(p)
        for c in cg.categories:
            if c and c not in self.categories:
                self.categories.append(c)
        self.developer = first(self.developer, cg.developer)
        self.publisher = first(self.publisher, cg.publisher)
        self.release_date = first(self.release_date, cg.release_date)
        self.taptap_rating = first(self.taptap_rating, cg.taptap_rating)
        self.appstore_rating = first(self.appstore_rating, cg.appstore_rating)
        if cg.rating_count is not None:
            if self.rating_count is None or cg.rating_count > self.rating_count:
                self.rating_count = cg.rating_count
        self.ios_rank = first(self.ios_rank, cg.ios_rank)
        self.android_rank = first(self.android_rank, cg.android_rank)
        self.ios_downloads = first(self.ios_downloads, cg.ios_downloads)
        self.android_downloads = first(self.android_downloads, cg.android_downloads)
        # Use crawled global_score/rank when available
        self.global_score = first(self.global_score, cg.global_score)
        self.global_rank = first(self.global_rank, cg.global_rank)
        # Media: append kwargs for every item
        for m in cg.media:
            self.media_kwargs.append(_media_to_kwargs(m))
        self._finalize_ranks()

    def _finalize_ranks(self):
        ranks = [r for r in (self.ios_rank, self.android_rank) if isinstance(r, int)]
        if ranks:
            self.global_rank = min(ranks)
        ratings = [r for r in (self.taptap_rating, self.appstore_rating) if isinstance(r, (int, float))]
        if ratings:
            avg = sum(ratings) / len(ratings)
            self.global_score = round(min(100.0, max(0.0, avg * 18.0)), 2)


def _media_to_kwargs(m: CrawledMediaItem) -> Dict[str, Any]:
    url = m.url or m.source_url or ""
    from utils import build_storage_key
    sk = None
    if url and not url.startswith("http"):
        sk = url.lstrip("/")
    elif url:
        sk = build_storage_key(url, subdir="games")
    return dict(
        type=m.type or "OTHER",
        url=url,
        storage_key=sk,
        source_url=m.source_url,
        source_site=m.source_site,
        mime_type=m.mime_type,
        size_bytes=m.size_bytes,
        width=m.width,
        height=m.height,
        duration_sec=m.duration_sec,
        poster_url=m.poster_url,
        sort_order=m.sort_order or 0,
        caption_zh=m.caption_zh,
        caption_en=m.caption_en,
    )


def _resolve_slug(cg: CrawledGame) -> Optional[str]:
    if cg.slug:
        return cg.slug
    for candidate in (cg.name_en, cg.name_cn, cg.name_tw):
        if not candidate:
            continue
        if candidate in KNOWN_GAME_SLUG:
            return KNOWN_GAME_SLUG[candidate]
    for candidate in (cg.name_en, cg.name_cn, cg.name_tw):
        if candidate:
            s = make_slug(candidate)
            if s:
                return s
    if cg.appstore_id:
        return f"app-{cg.appstore_id}"
    if cg.taptap_id:
        return f"taptap-{cg.taptap_id}"
    return None


def _write_merged_game(mg: MergedGame) -> str:
    name_en = mg.name_en or mg.name_zh_cn or mg.slug
    name_zh_cn = mg.name_zh_cn or name_en
    name_zh_tw = mg.name_zh_tw or name_zh_cn
    desc_en = mg.desc_en or f"{name_en} – mobile game."
    desc_zh_cn = mg.desc_zh_cn or f"{name_zh_cn} 是一款精彩的移动游戏。"
    desc_zh_tw = mg.desc_zh_tw or desc_zh_cn

    game_id = upsert_game(
        slug=mg.slug,
        platforms=sorted(mg.platforms) or ["android", "ios"],
        categories=sorted(mg.categories) or ["casual"],
        taptap_id=mg.taptap_id,
        appstore_id=mg.appstore_id,
        rawg_id=mg.rawg_id,
        global_score=mg.global_score,
        global_rank=mg.global_rank,
        ios_rank=mg.ios_rank,
        android_rank=mg.android_rank,
        ios_downloads=mg.ios_downloads,
        android_downloads=mg.android_downloads,
        taptap_rating=mg.taptap_rating,
        appstore_rating=mg.appstore_rating,
        rating_count=mg.rating_count,
        developer=mg.developer,
        publisher=mg.publisher,
        release_date=mg.release_date,
    )
    upsert_game_i18n(game_id, "zh-CN", name_zh_cn, desc_zh_cn)
    upsert_game_i18n(game_id, "zh-TW", name_zh_tw, desc_zh_tw)
    upsert_game_i18n(game_id, "en", name_en, desc_en)

    # De-duplicate media by (type, url)
    seen: set = set()
    uniq: List[Dict] = []
    for kw in mg.media_kwargs:
        key = (kw["type"], kw["url"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(kw)

    # Optionally download each game media + upload to the upstream service.
    # When MEDIA_UPLOAD_TOKEN is set we'll overwrite url/storage_key/size/width/height/mime
    # using the authoritative service response. Safe no-op when token is absent.
    if uniq:
        meta_ctx = dict(
            game_slug=mg.slug,
            name_cn=mg.name_zh_cn,
            name_en=mg.name_en,
            developer=mg.developer,
            publisher=mg.publisher,
            note="from MergedGame multi-source crawl",
        )
        async def _proc_items(items: List[Dict]) -> List[Dict]:
            out: List[Dict] = []
            for kw in items:
                u = kw.get("url") or ""
                mt = kw.get("type") or "OTHER"
                if not u:
                    out.append(kw)
                    continue
                res = await download_media(
                    u, "games", force_mock=False,
                    media_type=mt,
                    meta={**meta_ctx, "original_source_site": kw.get("source_site")},
                    skip_upload=not bool(settings.media_upload_token),
                )
                new_kw = dict(kw)
                if res.ok:
                    new_kw["url"] = res.url or new_kw["url"]
                    new_kw["storage_key"] = res.storage_key or new_kw.get("storage_key")
                    new_kw["width"] = res.width or new_kw.get("width")
                    new_kw["height"] = res.height or new_kw.get("height")
                    new_kw["size_bytes"] = res.size_bytes or new_kw.get("size_bytes")
                    new_kw["mime_type"] = res.mime or new_kw.get("mime_type")
                out.append(new_kw)
            return out
        uniq = asyncio.run(_proc_items(uniq))
        batch_insert_game_media(game_id, uniq)
    return game_id


def run_crawl_stage(
    *,
    appstore_limit: int = 200,
    taptap_limit: int = 100,
    rawg_limit: int = 50,
    guide_limit_per_source: int = 30,
    force_mock: bool = True,
    dry_run: bool = False,
) -> CrawlReport:
    report = CrawlReport()
    # 1. Crawl game metadata sources
    try:
        logger.info("[CrawlStage] AppStore RSS limit={}", appstore_limit)
        game_results: List[CrawlResult] = [
            appstore_rss.run(limit=appstore_limit, dry_run=dry_run, force_mock=force_mock)
        ]
    except Exception as e:
        msg = f"AppStore crawl error: {e}"
        logger.error(msg); report.errors.append(msg)
        game_results = []
    try:
        r = taptap_rank.run(limit=taptap_limit, dry_run=dry_run, force_mock=force_mock)
        game_results.append(r)
    except Exception as e:
        msg = f"TapTap crawl error: {e}"
        logger.error(msg); report.errors.append(msg)
    try:
        if not force_mock:
            game_results.append(rawg_api.run(page_size=rawg_limit, dry_run=dry_run))
    except Exception as e:
        msg = f"RAWG crawl error: {e}"
        logger.error(msg); report.errors.append(msg)

    for g in game_results:
        report.errors.extend(g.errors)

    # 2. Merge by slug
    merged: Dict[str, MergedGame] = {}
    for result in game_results:
        for game in result.games:
            slug = _resolve_slug(game)
            if not slug:
                continue
            mg = merged.get(slug) or MergedGame(slug=slug)
            mg.merge(game)
            merged[slug] = mg
    logger.info(f"[CrawlStage] Merged {len(merged)} unique game slugs.")

    # 3. Write Game / i18n / media
    if not dry_run:
        for slug, mg in merged.items():
            try:
                _write_merged_game(mg)
                report.total_games_merged += 1
                report.total_game_media += len(mg.media_kwargs)
            except Exception as e:
                report.errors.append(f"Write game {slug}: {e!r}")
        logger.info(f"[CrawlStage] Written {report.total_games_merged} games "
                     f"with {report.total_game_media} media kwargs.")

    # 4. Crawl guide sources → RawGuide (upsert_raw_guide written inside each crawler)
    try:
        g4399 = _4399_guide.run(limit=guide_limit_per_source, dry_run=dry_run, force_mock=force_mock)
        report.total_raw_guides += len(g4399.guides)
        report.errors.extend(g4399.errors)
    except Exception as e:
        report.errors.append(f"4399 guide crawl: {e!r}")
    try:
        gtt = taptap_guide.run(limit=guide_limit_per_source, dry_run=dry_run, force_mock=force_mock)
        report.total_raw_guides += len(gtt.guides)
        report.errors.extend(gtt.errors)
    except Exception as e:
        report.errors.append(f"TapTap community guide crawl: {e!r}")
    logger.info(f"[CrawlStage] Raw guides discovered+persisted: {report.total_raw_guides}.")
    return report


# ============================================================
# Stage B: 5-step LLM pipeline per group of raw guides
# ============================================================
@dataclass
class LLMReport:
    total_pipelines: int = 0
    passed: int = 0
    failed: int = 0
    total_guides_written: int = 0
    total_guide_media: int = 0
    errors: List[str] = field(default_factory=list)


@dataclass
class PipelineOutcome:
    """Result of process_single_guide_pipeline().

    We do NOT reuse ProcessedGuide (pydantic single-locale schema) here because
    we need to carry all three locales + quality data together.
    """
    extracted: ExtractedGuide
    zh_cn: ProcessedGuide
    zh_tw: ProcessedGuide
    en: ProcessedGuide
    quality: QualityReport
    similarity_scores: Dict[str, float]
    source_urls: List[str]


def _guess_game_name_for_raw(rg: Dict) -> Optional[str]:
    title = rg.get("title") or ""
    text = (rg.get("text") or rg.get("html") or "")[:800]
    haystack = f"{title} {text}"
    for known in KNOWN_GAME_SLUG.keys():
        if known in haystack:
            return known
    return None


def process_single_guide_pipeline(
    *,
    game_hint: str,
    raw_guides: List[Dict],
    force_mock: bool = False,
    llm_retries: int = 1,
) -> PipelineOutcome:
    """Runs 5 LLM steps; returns combined PipelineOutcome regardless of QC."""
    sources_payload = [
        {"title": rg.get("title") or "",
         "text": rg.get("text") or rg.get("html") or "",
         "source_url": rg.get("sourceUrl") or rg.get("source_url") or ""}
        for rg in raw_guides
    ]

    extracted = extract(sources_payload, force_mock=force_mock, max_retries=llm_retries)

    # Step 2 rewrite zh-CN
    p_cn = rewrite_zh_cn(extracted, force_mock=force_mock, max_retries=llm_retries)

    # Step 3 TW localization
    p_tw = localize_zh_tw(
        p_cn.content, extracted.glossary,
        title_cn=p_cn.title, tldr_cn=p_cn.tldr,
        force_mock=force_mock, max_retries=llm_retries,
    )

    # Step 4 English
    game_name = game_hint or extracted.gameNameHint or extracted.title
    p_en = translate_en(
        p_cn.content, extracted.glossary,
        game_name=game_name, game_version="v1.0.0",
        guide_type=extracted.guideType,
        title_cn=p_cn.title, tldr_cn=p_cn.tldr,
        force_mock=force_mock, max_retries=llm_retries,
    )

    # Step 5 QC
    raw_texts = [s["text"] for s in sources_payload]
    qc = check_quality(
        extracted.keyFacts,
        p_cn.content, p_tw.content, p_en.content,
        raw_texts,
        extracted_steps_n=max(2, len(extracted.steps)),
        force_mock=force_mock,
        max_retries=llm_retries,
    )
    sims = compute_similarities(p_cn.content, p_tw.content, p_en.content, raw_texts)
    return PipelineOutcome(
        extracted=extracted, zh_cn=p_cn, zh_tw=p_tw, en=p_en,
        quality=qc, similarity_scores=sims,
        source_urls=[s["source_url"] for s in sources_payload if s.get("source_url")],
    )


def _write_processed_guide_to_db(
    game_hint: str,
    out: PipelineOutcome,
    raw_guides: List[Dict],
    force_mock: bool = False,
) -> Tuple[bool, int]:
    # 1. Derive slug + game_id
    name_hint = (out.extracted.gameNameHint or game_hint or
                 out.extracted.title or "unknown-game")
    slug = KNOWN_GAME_SLUG.get(name_hint) or KNOWN_GAME_SLUG.get(game_hint)
    if not slug:
        slug = make_slug(name_hint)
    game_id = get_game_id_by_slug(slug)
    if not game_id:
        # Upsert minimal game placeholder so FK is valid
        game_id = upsert_game(
            slug=slug,
            platforms=["android", "ios"],
            categories=["casual"],
        )
        upsert_game_i18n(game_id, "zh-CN", name_hint, f"{name_hint} 简介占位。")
        upsert_game_i18n(game_id, "zh-TW", name_hint, f"{name_hint} 簡介占位。")
        upsert_game_i18n(game_id, "en", slug.replace("-", " ").title(), f"{slug} game.")

    # 2. Guide row
    suffix = hashlib.md5(out.zh_cn.title.encode("utf-8")).hexdigest()[:6]
    gtype_val = out.extracted.guideType.value
    g_slug = f"{gtype_val}-{slug}-{suffix}"

    guide_id = upsert_guide(
        game_id=game_id,
        slug=g_slug,
        guide_type=gtype_val,
        game_version="v1.0.0",
        read_minutes=max(1, out.zh_cn.readMinutes or 2),
        published_at=now_iso(),
    )

    # 3. GuideI18n × 3 locales
    kf_dicts = [kf.model_dump() for kf in (out.extracted.keyFacts or [])]
    upsert_guide_i18n(guide_id, "zh-CN", out.zh_cn.title, out.zh_cn.tldr, out.zh_cn.content, kf_dicts)
    upsert_guide_i18n(guide_id, "zh-TW", out.zh_tw.title, out.zh_tw.tldr, out.zh_tw.content, kf_dicts)
    upsert_guide_i18n(guide_id, "en",    out.en.title,    out.en.tldr,    out.en.content,    kf_dicts)

    # 4. GuideSource
    for rg in raw_guides:
        src_url = rg.get("sourceUrl") or rg.get("source_url") or f"raw-id-{rg.get('id')}"
        site = rg.get("source") or "unknown"
        sim_cn = out.similarity_scores.get("zh-CN")
        upsert_guide_source(
            guide_id=guide_id,
            site_name=site,
            source_url=src_url,
            author=None,
            crawled_at=now_iso(),
            similarity=round(float(sim_cn), 4) if isinstance(sim_cn, (int, float)) else None,
        )

    # 5. GuideMedia. If no HTML images available → emit a COVER placeholder + infographic placeholders.
    n_media = 0
    first_html = raw_guides[0].get("html") if raw_guides else ""
    img_urls: List[str] = re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", first_html or "", flags=re.I)
    for i, src in enumerate(img_urls[:5]):
        mt = "COVER" if i == 0 else "INLINE_IMAGE"
        try:
            md = asyncio.run(download_media(
                src, "guides", force_mock=force_mock,
                media_type=mt,
                meta=dict(
                    game_slug=slug,
                    guide_slug=g_slug,
                    source_site=(raw_guides[0].get("source") if raw_guides else None),
                    source_url=src,
                ),
            ))
            url = md.url or src
            sk = md.storage_key
            w = md.width
            h = md.height
            mb = md.size_bytes
            mm = md.mime
        except Exception as e:
            url = src
            sk = None
            w = h = mb = None
            mm = None
        upsert_guide_media(
            guide_id=guide_id,
            type=mt,
            url=url,
            storage_key=sk,
            source_url=src,
            source_site=(raw_guides[0].get("source") if raw_guides else None),
            mime_type=mm,
            size_bytes=mb,
            width=w, height=h,
            sort_order=i,
            anchor=(None if i == 0 else f"figure-{i}"),
            caption_zh=f"攻略配图 {i+1}",
            caption_en=f"Guide figure {i+1}",
        )
        n_media += 1

    if n_media == 0:
        placeholder = f"/media/images/guides/{slug}/{g_slug}-cover.svg"
        upsert_guide_media(
            guide_id=guide_id,
            type="COVER",
            url=placeholder,
            storage_key=placeholder.lstrip("/"),
            sort_order=0,
            caption_zh=f"{out.zh_cn.title} 封面",
            caption_en=f"{out.en.title or g_slug} cover",
        )
        n_media += 1
    return True, n_media


def run_llm_stage(
    *,
    matched_only: bool = True,
    max_pipelines: int = 100,
    llm_retries: int = 1,
    force_mock: bool = False,
    write_to_db: bool = True,
) -> LLMReport:
    from db import get_sqlite_conn
    report = LLMReport()

    with get_sqlite_conn() as conn:
        rows = conn.execute(
            "SELECT rg.id, rg.source, rg.sourceUrl, rg.title, rg.html, rg.text "
            "FROM RawGuide rg ORDER BY rg.createdAt DESC LIMIT ?",
            (max(max_pipelines * 10, 200),),
        ).fetchall()
    raw_list = [dict(r) for r in rows]
    logger.info(f"[LLMStage] Loaded {len(raw_list)} raw guides. Grouping by game hint...")

    groups: Dict[str, List[Dict]] = defaultdict(list)
    for rg in raw_list:
        hint = _guess_game_name_for_raw(rg) or "__unmatched__"
        groups[hint].append(rg)

    done = 0
    for game_hint, guides in groups.items():
        if done >= max_pipelines:
            break
        if game_hint == "__unmatched__" and matched_only:
            continue
        if not guides:
            continue
        pipeline_sources = guides[:5]
        try:
            outcome = process_single_guide_pipeline(
                game_hint="" if game_hint == "__unmatched__" else game_hint,
                raw_guides=pipeline_sources,
                force_mock=force_mock,
                llm_retries=llm_retries,
            )
            report.total_pipelines += 1
            if outcome.quality.passAll:
                report.passed += 1
            else:
                report.failed += 1
                report.errors.append(
                    f"QC failed for {game_hint} (score={outcome.quality.overallScore}): {outcome.quality.notes}"
                )
            if write_to_db:
                written, n_media = _write_processed_guide_to_db(
                    game_hint, outcome, pipeline_sources, force_mock=force_mock,
                )
                if written:
                    report.total_guides_written += 1
                    report.total_guide_media += n_media
        except Exception as e:
            report.failed += 1
            report.errors.append(f"Pipeline error for {game_hint}: {e!r}")
        done += 1

    logger.info(
        f"[LLMStage] Finished. pipelines={report.total_pipelines} passed={report.passed} "
        f"failed={report.failed} guides_written={report.total_guides_written} "
        f"guide_media_rows={report.total_guide_media}."
    )
    return report


# ============================================================
# Unified CLI entry (referenced by run_pipeline.py)
# ============================================================
@dataclass
class PipelineOpts:
    force_mock: bool = True
    dry_run: bool = False
    skip_media_download: bool = False
    appstore_limit: int = 10
    taptap_limit: int = 10
    rawg_limit: int = 10
    guide_limit_per_source: int = 10
    llm_source_limit: int = 5
    llm_matched_only: bool = False  # allow __unmatched__ guides to produce output in smoke tests


@dataclass
class PipelineReport:
    stage: str = ""
    crawl: Optional[CrawlReport] = None
    llm: Optional[LLMReport] = None
    exit_code: int = 0

    def pretty(self) -> str:
        lines = [f"PipelineReport(stage={self.stage}, exit_code={self.exit_code})"]
        if self.crawl:
            lines.append(
                f"  Crawl: games={self.crawl.total_games_merged} "
                f"media={self.crawl.total_game_media} raw_guides={self.crawl.total_raw_guides} "
                f"errors={len(self.crawl.errors)}"
            )
        if self.llm:
            lines.append(
                f"  LLM  : pipelines={self.llm.total_pipelines} passed={self.llm.passed} "
                f"failed={self.llm.failed} guides_written={self.llm.total_guides_written} "
                f"media={self.llm.total_guide_media} errors={len(self.llm.errors)}"
            )
        return "\n".join(lines)


def run_pipeline(stage: str, opts: PipelineOpts) -> PipelineReport:
    report = PipelineReport(stage=stage)
    try:
        if stage in ("crawl", "all"):
            report.crawl = run_crawl_stage(
                appstore_limit=opts.appstore_limit,
                taptap_limit=opts.taptap_limit,
                rawg_limit=opts.rawg_limit,
                guide_limit_per_source=opts.guide_limit_per_source,
                force_mock=opts.force_mock,
                dry_run=opts.dry_run,
            )
        if stage in ("llm", "all"):
            report.llm = run_llm_stage(
                matched_only=opts.llm_matched_only,
                max_pipelines=opts.llm_source_limit,
                llm_retries=1,
                force_mock=opts.force_mock,
                write_to_db=not opts.dry_run,
            )
        # Compute exit code
        errs = (report.crawl.errors if report.crawl else []) + (report.llm.errors if report.llm else [])
        report.exit_code = 0 if len(errs) == 0 else 2
    except Exception as e:
        logger.exception(f"Pipeline[{stage}] crashed: {e}")
        report.exit_code = 1
    return report

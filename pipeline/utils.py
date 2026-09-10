"""Shared utilities: HTTP client, slugifier, HTML->text, media download + upload helpers."""
from __future__ import annotations

import asyncio
import hashlib
import json
import mimetypes
import os
import random
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union

from bs4 import BeautifulSoup
import httpx

# add pipeline root to sys.path so absolute imports work always
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from config import settings  # noqa: E402

_WS_RE = re.compile(r"\s+")
_SLUG_BAD_RE = re.compile(r"[^a-z0-9\-]+")
_SLUG_DASH_RE = re.compile(r"-+")


def now_iso() -> str:
    """Current UTC time in ISO-8601 format."""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_slug(text: str) -> str:
    """Turn an arbitrary title into a lowercase dashed slug (ASCII only)."""
    if not text:
        return ""
    # transliterate common unicode letters via python-slugify if available,
    # fallback to simple ASCII filter
    try:
        from slugify import slugify  # python-slugify
        s = slugify(text, allow_unicode=False, lowercase=True, separator="-")
    except Exception:
        s = text.strip().lower()
        s = _WS_RE.sub("-", s)
        s = _SLUG_BAD_RE.sub("-", s)
    s = _SLUG_DASH_RE.sub("-", s).strip("-")
    return s[:80] or "untitled"


def clean_title(title: Optional[str]) -> str:
    return _WS_RE.sub(" ", (title or "")).strip()


def html_to_text(html: Optional[str]) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    for t in soup(["script", "style", "noscript", "iframe"]):
        t.decompose()
    text = soup.get_text(separator="\n", strip=True)
    return _WS_RE.sub(" ", text).strip()


# ============================================================
# HTTP client (httpx) with retry + UA + logging
# ============================================================
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
)


@dataclass
class HttpClient:
    """httpx.AsyncClient wrapper with retries, used by crawlers."""
    timeout: int = settings.httpx_timeout
    retries: int = settings.httpx_retries
    user_agent: str = DEFAULT_USER_AGENT
    headers: Optional[Dict[str, str]] = None
    _client: Optional[httpx.AsyncClient] = None

    def _build_client(self) -> httpx.AsyncClient:
        merged_headers = {"User-Agent": self.user_agent}
        if self.headers:
            merged_headers.update(self.headers)
        return httpx.AsyncClient(
            timeout=self.timeout,
            headers=merged_headers,
            follow_redirects=True,
        )

    async def get(self, url: str, *, params: Optional[Dict[str, Any]] = None,
                  expect: str = "json") -> Union[httpx.Response, Dict, List, str]:
        last_err: Optional[Exception] = None
        for attempt in range(self.retries + 1):
            try:
                if self._client is None:
                    self._client = self._build_client()
                r = await self._client.get(url, params=params)
                if r.status_code >= 500 and attempt < self.retries:
                    await asyncio.sleep(0.6 * (attempt + 1))
                    continue
                r.raise_for_status()
                if expect == "json":
                    return r.json()
                if expect == "text":
                    return r.text
                return r
            except Exception as e:
                last_err = e
                await asyncio.sleep(0.3 * (attempt + 1))
        raise RuntimeError(f"GET {url} failed after {self.retries+1} tries: {last_err}")

    async def close(self):
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:
                pass
            self._client = None

    async def __aenter__(self): return self
    async def __aexit__(self, exc_type, exc, tb): await self.close()


import asyncio  # noqa: E402  (used inside get method)


# ============================================================
# Media / URL helpers
# ============================================================
def build_storage_key(url: str, subdir: str = "games", ext: Optional[str] = None) -> str:
    h = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]
    if ext is None:
        p = Path(url.split("?", 1)[0])
        ext = p.suffix.lower() or ".bin"
    return f"{subdir}/{h[:2]}/{h}{ext}"


def guess_mime(url: str, content_type: Optional[str] = None) -> Optional[str]:
    if content_type:
        return content_type.split(";", 1)[0].strip() or None
    p = Path(url.split("?", 1)[0]).suffix.lower().lstrip(".")
    m = {
        "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp",
        "gif": "image/gif", "bmp": "image/bmp", "svg": "image/svg+xml",
        "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
    }
    return m.get(p)


# ----------------------------------------------------------------- Media <-> category mapping
# Contract (per user spec): category ∈ {icon, banner, screenshot, video, guide_image}
# Our Prisma media.type 枚举与 category 的映射：
_CATEGORY_BY_MEDIA_TYPE: Dict[str, str] = {
    # GameMedia types
    "ICON": "icon",
    "LOGO": "icon",
    "BANNER": "banner",
    "HERO_IMAGE": "banner",
    "SCREENSHOT": "screenshot",
    "SCREENSHOT_PORTRAIT": "screenshot",
    "SCREENSHOT_LANDSCAPE": "screenshot",
    "TRAILER": "video",
    "GAMEPLAY_VIDEO": "video",
    "CINEMATIC": "video",
    "VIDEO": "video",
    # GuideMedia types → always guide_image per user rule
    "COVER": "guide_image",
    "INLINE_IMAGE": "guide_image",
    "INFOGRAPHIC": "guide_image",
    "COMPARISON": "guide_image",
    "WATERFALL_CHART": "guide_image",
    "STATS_TABLE": "guide_image",
    "STEP_SCREENSHOT": "guide_image",
    "SHORT_VIDEO": "video",
    "LONG_VIDEO": "video",
    "OTHER": "screenshot",
}


def map_media_type_to_category(media_type: str) -> str:
    """Translate our DB media.type to the upstream service category enum.

    Falls back to "screenshot" for images and "video" for VIDEO-like suffixes
    we don't explicitly map.
    """
    if not media_type:
        return "screenshot"
    mt = media_type.upper().strip()
    if mt in _CATEGORY_BY_MEDIA_TYPE:
        return _CATEGORY_BY_MEDIA_TYPE[mt]
    if "VIDEO" in mt or mt.endswith("_V"):
        return "video"
    return "screenshot"


# ----------------------------------------------------------------- Global media upload rate limiter
# 30 req / min sliding window. We track wall-clock timestamps of completed calls.
_MEDIA_UPLOAD_TS: List[float] = []
_MEDIA_UPLOAD_LOCK = asyncio.Lock()


async def _rate_limit_wait_for_media_upload() -> None:
    """Blocks until the 60s sliding window has < rate_per_min uploads."""
    rate = max(1, int(settings.media_upload_rate_per_min))
    window_seconds = 60.0
    async with _MEDIA_UPLOAD_LOCK:
        # drop stale entries outside 60s window
        now = time.monotonic()
        cutoff = now - window_seconds
        while _MEDIA_UPLOAD_TS and _MEDIA_UPLOAD_TS[0] < cutoff:
            _MEDIA_UPLOAD_TS.pop(0)
        while len(_MEDIA_UPLOAD_TS) >= rate:
            # sleep exactly until oldest entry falls outside the window + tiny epsilon
            sleep_for = (_MEDIA_UPLOAD_TS[0] + window_seconds) - now + 0.01
            await asyncio.sleep(max(0.05, sleep_for))
            now = time.monotonic()
            cutoff = now - window_seconds
            while _MEDIA_UPLOAD_TS and _MEDIA_UPLOAD_TS[0] < cutoff:
                _MEDIA_UPLOAD_TS.pop(0)
        # reserve a slot on call START (not completion) to avoid races on concurrent waits.
        # We'll update timestamp to real completion after success.
        _MEDIA_UPLOAD_TS.append(now)


def _rate_limit_mark_media_upload_done() -> None:
    # Replace the last reserved timestamp (end of list) with current time so
    # the 60s window becomes accurate for next-pass evictions.
    now = time.monotonic()
    if _MEDIA_UPLOAD_TS:
        _MEDIA_UPLOAD_TS[-1] = now


@dataclass
class MediaUploadResponse:
    """Parsed JSON from the upstream upload service."""
    cdn_url: str
    storage_key: str
    width: Optional[int] = None
    height: Optional[int] = None
    size_bytes: Optional[int] = None
    mime: Optional[str] = None
    etag: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict)  # type: ignore[name-defined]  # noqa


async def upload_to_service(
    *,
    file_bytes: bytes,
    storage_key: Optional[str],
    category: str,
    meta: Optional[Dict[str, Any]] = None,
    filename_hint: str = "upload.bin",
    extra_headers: Optional[Dict[str, str]] = None,
) -> MediaUploadResponse:
    """POST multipart/form-data to the media service per ISSUE#1 contract.

    Retry spec (per user doc):
      - 3 attempts total; exponential backoff 1s → 3s → 7s between attempts.
      - 4xx (except 429) do NOT retry; raise immediately.
      - 429: honour Retry-After header (seconds) before next attempt; this
        consumes one attempt slot.
      - 5xx / network errors: retry with backoff.

    Rate limit spec:
      - 30 req/min (default). Caller (or download_media wrapper) MUST call
        _rate_limit_wait_for_media_upload() BEFORE this function.

    Video spec:
      - Caller should reject files > MEDIA_UPLOAD_VIDEO_MAX_BYTES for VIDEO
        category; we do NOT yet implement chunking. Return a clear error with
        a TODO note so it's actionable later.
    """
    import base64  # noqa: F401  (in case meta embeds b64; also for debug)

    token = settings.media_upload_token
    if not token:
        raise RuntimeError("MEDIA_UPLOAD_TOKEN not set; cannot call upload API")

    backoffs = [1.0, 3.0, 7.0]
    attempts_total = len(backoffs) + 1  # first attempt + N retries
    last_exc: Optional[BaseException] = None

    headers: Dict[str, str] = {"Authorization": f"Bearer {token}"}
    if extra_headers:
        headers.update(extra_headers)

    for attempt in range(attempts_total):
        try:
            meta_json = json.dumps(meta, ensure_ascii=False) if meta is not None else None
            files_fields: Dict[str, Any] = {
                "file": (filename_hint, file_bytes, guess_mime(filename_hint) or "application/octet-stream"),
            }
            data_fields: Dict[str, str] = {"category": category}
            if storage_key:
                data_fields["storageKey"] = storage_key
            if meta_json is not None:
                data_fields["meta"] = meta_json

            async with httpx.AsyncClient(timeout=settings.media_upload_timeout) as hc:
                resp = await hc.post(
                    settings.media_upload_url,
                    headers=headers,
                    files=files_fields,
                    data=data_fields,
                )

                # Fast-fail 4xx (except 429) per spec — do NOT retry.
                if 400 <= resp.status_code < 500 and resp.status_code != 429:
                    body_snippet = resp.text[:300]
                    raise RuntimeError(
                        f"Media upload 4xx (not retried). "
                        f"status={resp.status_code} body={body_snippet!r}"
                    )

                # 429: use Retry-After seconds instead of our default backoff.
                if resp.status_code == 429:
                    retry_after = resp.headers.get("Retry-After") or resp.headers.get("retry-after")
                    wait: float
                    try:
                        wait = float(retry_after) if retry_after else backoffs[min(attempt, len(backoffs) - 1)]
                    except (TypeError, ValueError):
                        wait = backoffs[min(attempt, len(backoffs) - 1)]
                    if attempt == attempts_total - 1:
                        raise RuntimeError(
                            f"Media upload 429 exhausted all attempts. "
                            f"Last Retry-After={wait}s. url={settings.media_upload_url}"
                        )
                    last_exc = RuntimeError(f"Media upload 429 Retry-After={wait}s")
                    await asyncio.sleep(wait)
                    continue

                resp.raise_for_status()
                payload: Dict[str, Any] = resp.json()
                cdn_url = payload.get("cdnUrl") or payload.get("cdn_url") or ""
                sk = payload.get("storageKey") or payload.get("storage_key") or storage_key or ""
                if not cdn_url:
                    raise RuntimeError(f"Media upload response missing cdnUrl. Full: {payload!r}")
                return MediaUploadResponse(
                    cdn_url=cdn_url,
                    storage_key=sk,
                    width=payload.get("width"),
                    height=payload.get("height"),
                    size_bytes=payload.get("sizeBytes") or payload.get("size_bytes"),
                    mime=payload.get("mime"),
                    etag=payload.get("etag"),
                    raw=payload,
                )

        except (httpx.HTTPError, RuntimeError, json.JSONDecodeError) as e:
            # For 4xx (non-429) RuntimeError we intentionally already raised inside try block.
            # For other errors + 5xx, retry.
            last_exc = e
            if attempt == attempts_total - 1:
                break
            wait = backoffs[attempt]
            await asyncio.sleep(wait)

    assert last_exc is not None, "Upload failed but no exception captured"
    raise last_exc


@dataclass
class MediaDownloadResult:
    url: str
    path: Optional[Path] = None
    storage_key: Optional[str] = None
    size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    mime: Optional[str] = None
    ok: bool = False
    error: Optional[str] = None


async def download_media(url: str, subdir: str = "games",
                         client: Optional["HttpClient"] = None,
                         force_mock: bool = False,
                         *,
                         media_type: str = "OTHER",
                         category: Optional[str] = None,
                         meta: Optional[Dict[str, Any]] = None,
                         skip_upload: bool = False) -> MediaDownloadResult:
    """Download a media asset (HTTP → bytes → local FS cache) and optionally
    upload it to the user-provided media service.

    Args
    ----
    url:
        Public URL to fetch the media bytes from.
    subdir:
        Subdirectory inside ``MEDIA_DIR`` used to compute a deterministic
        ``storage_key`` (games / guides / raw).
    media_type:
        Our Prisma enum (ICON / SCREENSHOT / COVER / TRAILER / ...).  It is
        mapped to the upstream service category via
        :func:`map_media_type_to_category` unless ``category`` is supplied
        explicitly.
    category:
        Overrides the auto-mapped category (icon / banner / screenshot /
        video / guide_image).
    meta:
        Optional JSON-serialisable dict that is sent to the service as the
        ``meta`` form field (game name / source / copyright notice, ...).
    skip_upload:
        If True we never call the upstream upload endpoint, even if
        ``MEDIA_UPLOAD_TOKEN`` is set.  Useful for guide-media fallback when
        orchestrator still wants a storage_key placeholder.
    """
    result = MediaDownloadResult(url=url)
    result.storage_key = build_storage_key(url, subdir=subdir)
    result.mime = guess_mime(url)
    eff_category = category or map_media_type_to_category(media_type)

    if (not settings.download_media) or force_mock:
        result.ok = True
        result.size_bytes = random.randint(40_000, 900_000)
        result.width = random.choice([1080, 1170, 1242, 1284, 1920, 2556])
        result.height = random.choice([810, 1920, 2532, 2778, 2796, 3420])
        return result

    out_path = settings.media_download_dir / result.storage_key
    out_path.parent.mkdir(parents=True, exist_ok=True)
    file_bytes: bytes = b""
    try:
        c = client or HttpClient()
        resp = await c._build_client().get(url)
        resp.raise_for_status()
        file_bytes = resp.content
        out_path.write_bytes(file_bytes)
        result.path = out_path
        result.size_bytes = len(file_bytes)
        result.mime = guess_mime(url, resp.headers.get("content-type"))
        # best-effort dimension probe for local images (Pillow optional)
        if eff_category != "video":
            try:
                from PIL import Image  # type: ignore
                with Image.open(out_path) as im:
                    result.width, result.height = im.size
            except Exception:
                pass
        result.ok = True
    except Exception as e:
        result.error = f"download failed: {e}"
        result.ok = False
        return result

    # ---- Optional upload to the service ----
    should_upload = (
        bool(settings.media_upload_token)
        and (not skip_upload)
        and file_bytes
    )
    if not should_upload:
        # No token configured → keep local path & storage_key only.
        return result

    # Video size check BEFORE hitting the service.
    if eff_category == "video" and result.size_bytes and result.size_bytes > settings.media_upload_video_max_bytes:
        result.ok = False
        result.error = (
            f"VIDEO single-file size {result.size_bytes} bytes exceeds "
            f"MEDIA_UPLOAD_VIDEO_MAX_BYTES={settings.media_upload_video_max_bytes}. "
            f"[TODO] Chunked upload is required by upstream service but not yet implemented."
        )
        return result

    filename_hint = out_path.name or "upload.bin"
    await _rate_limit_wait_for_media_upload()
    try:
        up = await upload_to_service(
            file_bytes=file_bytes,
            storage_key=result.storage_key,
            category=eff_category,
            meta=meta,
            filename_hint=filename_hint,
        )
    except Exception as e:
        result.ok = False
        result.error = f"upload failed: {e}"
        return result
    finally:
        _rate_limit_mark_media_upload_done()

    # Overwrite result fields from the authoritative service response.
    result.url = up.cdn_url
    result.storage_key = up.storage_key
    result.size_bytes = up.size_bytes or result.size_bytes
    result.width = up.width or result.width
    result.height = up.height or result.height
    result.mime = up.mime or result.mime
    # etag currently has no matching DB column; keep only in result.error-free.
    result.ok = True
    return result


async def batch_download_images(urls: Iterable[str], subdir: str = "games",
                                force_mock: bool = False,
                                limit: int = 50) -> Dict[str, MediaDownloadResult]:
    """Download many URLs in parallel, return {url -> result} map."""
    urls_l = list(urls)[:limit]
    results = await asyncio.gather(*[
        download_media(u, subdir=subdir, force_mock=force_mock) for u in urls_l
    ], return_exceptions=True)
    out: Dict[str, MediaDownloadResult] = {}
    for u, r in zip(urls_l, results):
        if isinstance(r, Exception):
            out[u] = MediaDownloadResult(url=u, ok=False, error=str(r))
        else:
            out[u] = r
    return out


# ============================================================
# Step 5 helper: source similarity
# ============================================================
def max_similarity_against_sources(candidate: str, sources: List[str]) -> float:
    """Best token-set (difflib) similarity score vs source texts."""
    if not candidate or not sources:
        return 0.0
    from difflib import SequenceMatcher

    def norm(s: str) -> str:
        return _WS_RE.sub(" ", (s or "")).strip().lower()

    cand = norm(candidate)
    if not cand:
        return 0.0
    best = 0.0
    for s in sources:
        other = norm(s)
        if not other:
            continue
        score = SequenceMatcher(None, cand, other).ratio()
        if score > best:
            best = score
    return round(best, 4)

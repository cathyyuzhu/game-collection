"""Global settings for the Game Collection pipeline.

Reads DATABASE_URL, DeepSeek keys, etc. from environment variables.
Falls back to reasonable defaults so a developer can run everything
without touching .env first (mock mode works out of the box).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent
PIPELINE_ROOT: Path = Path(__file__).resolve().parent
WEB_PRISMA_DIR: Path = PROJECT_ROOT / "web" / "prisma"


class Settings:
    # ---------------- DB ----------------
    # SQLite file managed by Prisma (web/prisma/dev.db). We connect via sqlite3 stdlib.
    database_url: str = os.getenv("DATABASE_URL", f"file:{WEB_PRISMA_DIR}/dev.db").strip()

    # ---------------- DeepSeek LLM ----------------
    deepseek_api_key: Optional[str] = os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENROUTER_API_KEY") or None
    deepseek_base_url: str = (os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com/v1").strip()
    deepseek_model_v2: str = (os.getenv("DEEPSEEK_MODEL_V2") or "deepseek-chat").strip()
    deepseek_model_v2_lite: str = (os.getenv("DEEPSEEK_MODEL_V2_LITE") or "deepseek-chat").strip()
    deepseek_model_reasoner: str = (os.getenv("DEEPSEEK_MODEL_REASONER") or "deepseek-reasoner").strip()
    llm_request_timeout: int = int(os.getenv("LLM_TIMEOUT", "90"))
    llm_max_retries: int = int(os.getenv("LLM_MAX_RETRIES", "3"))

    # ---------------- Optional 3rd-party ----------------
    deepl_api_key: Optional[str] = os.getenv("DEEPL_API_KEY") or None
    deepl_base_url: str = (os.getenv("DEEPL_BASE_URL") or "https://api-free.deepl.com/v2").strip()

    # ---------------- HTTP crawlers ----------------
    rawg_api_key: Optional[str] = os.getenv("RAWG_API_KEY") or None
    taptap_base: str = (os.getenv("TAPTAP_BASE") or "https://www.taptap.cn").strip()
    httpx_timeout: int = int(os.getenv("HTTPX_TIMEOUT", "20"))
    httpx_retries: int = int(os.getenv("HTTPX_RETRIES", "2"))

    # ---------------- Media download ----------------
    download_media: bool = os.getenv("DOWNLOAD_MEDIA", "1").strip() not in ("0", "false", "False", "no")
    media_download_dir: Path = Path(os.getenv("MEDIA_DIR", str(PROJECT_ROOT / "storage" / "media"))).resolve()

    # ---------------- Media upload (user-defined service) ----------------
    # Spec: POST https://your-media-service/api/upload  (multipart/form-data)
    #   Bearer: MEDIA_UPLOAD_TOKEN env
    #   fields: file (Blob), storageKey (string, optional), category (enum string), meta (JSON string)
    #   returns: {cdnUrl, storageKey, width, height, sizeBytes, mime, etag}
    media_upload_token: Optional[str] = os.getenv("MEDIA_UPLOAD_TOKEN") or None
    media_upload_url: str = (
        os.getenv("MEDIA_UPLOAD_URL") or "https://your-media-service/api/upload"
    ).strip()
    media_upload_timeout: int = int(os.getenv("MEDIA_UPLOAD_TIMEOUT", "120"))
    # Rate limit: 30 req/min (default per spec). We throttle globally per process.
    media_upload_rate_per_min: int = int(os.getenv("MEDIA_UPLOAD_RATE_PER_MIN", "30"))
    # Video single-file limit before requiring chunking (spec: ≤500MB).
    media_upload_video_max_bytes: int = int(
        os.getenv("MEDIA_UPLOAD_VIDEO_MAX_BYTES", str(500 * 1024 * 1024))
    )

    # ---------------- Misc ----------------
    log_level: str = (os.getenv("LOG_LEVEL") or "INFO").upper()

    @property
    def sqlite_file(self) -> Path:
        """Resolve the real SQLite file path from file: URL or plain path."""
        url = self.database_url
        if url.startswith("file:"):
            url = url[len("file:"):].split("?", 1)[0].split("&", 1)[0]
            url = url.lstrip("/") if "://" in self.database_url else url
        p = Path(url)
        if not p.is_absolute():
            # relative paths are relative to web/prisma dir (per Prisma convention)
            p = (WEB_PRISMA_DIR / p).resolve()
        return p

    @property
    def llm_mock_mode(self) -> bool:
        """If no API key is set we fall back to deterministic mock output."""
        return not bool(self.deepseek_api_key)


settings = Settings()

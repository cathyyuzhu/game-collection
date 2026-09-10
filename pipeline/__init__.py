"""Game Collection Content Pipeline package.

Submodules:
- config    : env-based Settings (pydantic-settings)
- db        : SQLite direct upsert helpers (matches Prisma schema)
- utils     : HTTP client, slugify, HTML -> text, media download
- crawlers  : AppStore RSS / TapTap / RAWG / 4399 / TapTap community crawlers
- llm       : DeepSeek client + 5-step guide processing pipeline
- orchestrator : crawl + LLM stage runner & DB writer (real ETL)
- run_pipeline : CLI entry (python run_pipeline.py [crawl|llm|all] ...)
"""
from __future__ import annotations
import os
import sys

# Ensure `import config`, `from db import x`, etc. work from a naked
# `python run_pipeline.py` invocation where there is no package context.
_PKG_ROOT = os.path.dirname(os.path.abspath(__file__))
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

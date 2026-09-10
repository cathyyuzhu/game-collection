"""LLM processing subpackage for the Game Collection pipeline.

5-step workflow for every crawled raw guide:
    1. step1_extract       : parse free-form raw HTML/text -> structured ExtractedGuide
    2. step2_rewrite_zh    : rewrite zh-CN content into a polished, well-structured guide
    3. step3_localize_tw   : translate zh-CN -> zh-TW (with TW term localization)
    4. step4_translate_en  : translate zh-CN -> English (western gamer tone)
    5. step5_quality_check: quality check vs source texts + similarity + rule validations

The package exposes a convenience client, `llm.get_llm_client()`, which either
uses the real DeepSeek API (via OpenAI-compatible protocol) or a deterministic
mock fallback if the DEEPSEEK_API_KEY is missing or ``mock=True`` is requested.
"""
from __future__ import annotations

import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

# Re-export commonly used dataclasses so other modules can
# `from llm import XYZ, LLMClient`.
from llm.schemas import (  # noqa: E402
    KeyFact,
    StepItem,
    GlossaryItem,
    GuideType,
    ExtractedGuide,
    ProcessedGuide,
    QualityCheck,
    QualityReport,
)
from llm.deepseek_client import LLMClient, get_llm_client  # noqa: E402

__all__ = [
    "KeyFact",
    "StepItem",
    "GlossaryItem",
    "GuideType",
    "ExtractedGuide",
    "ProcessedGuide",
    "QualityCheck",
    "QualityReport",
    "LLMClient",
    "get_llm_client",
]

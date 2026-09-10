"""Pydantic schemas used by every LLM step.

We use ``pydantic.BaseModel`` (v2) so the DeepSeek structured-output / function
call endpoint can return valid JSON, and the mock client returns identical
shapes.
"""
from __future__ import annotations

import sys
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from pydantic import BaseModel, Field


class GuideType(str, Enum):
    BEGINNER = "beginner"    # 新手入门
    TEAM = "team"            # 配队 / 阵容
    BOSS = "boss"            # Boss 打法 / 通关
    GACHA = "gacha"          # 抽卡 / 版本抽取建议
    FAQ = "faq"              # 常见问题 / 一图流
    TIER = "tier"            # 强度榜
    SETTINGS = "settings"    # 灵敏度 / 参数设置
    EVENT = "event"          # 活动 / 版本活动
    ROGUELIKE = "roguelike"  # 肉鸽 / 保全派驻
    META = "meta"            # 版本环境 / meta
    OTHER = "other"


class KeyFact(BaseModel):
    """A single numeric/important fact: level threshold, damage %, etc."""
    field: str = Field(description="Short label, e.g. '推荐角色等级'")
    value: str = Field(description="Numeric or enumerated value, e.g. '>= 80'")
    unit: Optional[str] = Field(default=None, description="Unit: 级 / % / 秒 / 人, or None")


class StepItem(BaseModel):
    """A numbered step in a boss / beginner / rotation guide."""
    order: int
    title: str
    detail: str
    tip: Optional[str] = None


class GlossaryItem(BaseModel):
    """For translation steps: keep brand names / proper nouns consistent."""
    term_zh_cn: str
    term_zh_tw: Optional[str] = None
    term_en: Optional[str] = None
    note: Optional[str] = None


# ============================================================
# Step 1 output
# ============================================================
class ExtractedGuide(BaseModel):
    """Structured guide extracted from raw zh-CN source text (step 1)."""
    gameSlug: Optional[str] = None
    gameNameHint: Optional[str] = None
    title: str = Field(description="Clean zh-CN title (no emoji noise).")
    guideType: GuideType = GuideType.BEGINNER
    tldr: str = Field(description="1-2 sentence zh-CN summary.")
    keyFacts: List[KeyFact] = Field(default_factory=list)
    steps: List[StepItem] = Field(default_factory=list)
    faqs: List[str] = Field(default_factory=list)
    glossary: List[GlossaryItem] = Field(default_factory=list)
    sourceLocale: str = "zh-CN"


# ============================================================
# Steps 2/3/4 output: ProcessedGuide for a SINGLE locale
# ============================================================
class ProcessedGuide(BaseModel):
    """A fully processed (rewritten / localized / translated) guide body."""
    locale: str                 # zh-CN / zh-TW / en
    title: str
    tldr: str
    content: str = Field(description="Full Markdown guide body, already finalized.")
    keyFacts: List[KeyFact] = Field(default_factory=list)
    glossary: List[GlossaryItem] = Field(default_factory=list)
    readMinutes: Optional[int] = None
    usedMock: bool = False


# ============================================================
# Step 5 output
# ============================================================
class QualityCheck(BaseModel):
    name: str = Field(description="Check identifier, e.g. 'keyFacts_numeric_match'.")
    ok: bool
    errors: List[str] = Field(default_factory=list)


class QualityReport(BaseModel):
    passAll: bool
    overallScore: float = Field(ge=0.0, le=1.0, description="0..1 overall quality score.")
    checks: List[QualityCheck] = Field(default_factory=list)
    sourceSimilarities: Dict[str, float] = Field(default_factory=dict)
    notes: Optional[str] = None

"""Step 1 · Information extraction (DeepSeek-V2-Lite / mock).

Input : list of raw source dicts {title, text, source_url} (homogeneous guides).
Output: ExtractedGuide pydantic model (validated structured JSON).

Works identically whether the LLM client is in real or mock mode.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from loguru import logger  # type: ignore
except Exception:  # pragma: no cover - loguru missing fallback
    import logging as logger  # type: ignore

from llm.deepseek_client import get_llm_client  # noqa: E402
from llm.schemas import ExtractedGuide  # noqa: E402


def _build_user_prompt(sources: List[Dict[str, Any]]) -> str:
    parts = [
        "请从以下多篇同源攻略中抽取统一的结构化 JSON。",
        "",
        "【关键要求】",
        "1. keyFacts 提取所有具体数值：等级、伤害百分比、所需材料、原石/合成玉、命座数、圣遗物词条百分比、HP/ATK/DEF 具体数。",
        "2. glossary 提取所有游戏专有名词，给出 zh-CN / zh-TW / en。",
        "3. steps 步骤数 >= 2，必须是可执行操作。",
        "4. guideType 只能是 beginner / team / boss / gacha / faq / tier / settings / event / roguelike / meta / other。",
        "5. 只输出合法 JSON。",
        "",
        "【输入原始攻略内容】",
    ]
    for i, src in enumerate(sources, 1):
        parts.append(f"--- 来源 #{i}  URL: {src.get('source_url') or '(unknown)'} ---")
        parts.append(f"标题：{src.get('title', '')}")
        parts.append("正文：")
        text = (src.get("text") or "")[:8000]
        parts.append(text)
        parts.append("")
    parts.append("输出 JSON 字段：gameSlug(可选), gameNameHint(可选), title, guideType, tldr, keyFacts[{field,value,unit}], steps[{order,title,detail,tip}], faqs[], glossary[{term_zh_cn,term_zh_tw,term_en,note}], sourceLocale。")
    return "\n".join(parts)


def extract(sources: List[Dict[str, Any]], *, force_mock: bool = False,
            max_retries: int = 2) -> ExtractedGuide:
    """Extract structured guide info from multiple homogeneous raw guides."""
    if not sources:
        raise ValueError("extract() requires at least one source.")
    client = get_llm_client(force_mock=force_mock)
    system = (
        "你是手游攻略结构化抽取专家。严格按 Schema 输出合法 JSON，只输出 JSON，不要 Markdown 代码块，不要说明。"
    )
    user = _build_user_prompt(sources)
    last: Exception | None = None
    for _ in range(max(1, max_retries + 1)):
        try:
            return client.chat_json(system, user, ExtractedGuide, model="v2-lite")
        except Exception as e:
            last = e
            try:
                logger.warning(f"Step1 extract attempt failed: {e}")
            except Exception:
                pass
    raise RuntimeError(f"Step1 extract failed after retries. Last: {last}")


# ---------------- self-test (mock) ----------------
if __name__ == "__main__":
    sample = [
        dict(title="《原神》5.2 焚曜之章 Boss 速通攻略",
             source_url="https://example.com/genshin-boss",
             text="""# 原神 5.2 版本 焚曜之章 Boss 攻略
推荐角色等级 80 级以上，主 C 暴击率至少 45%。技能要 6/6/6。
第一步：先开辅助 E 减抗，确认全队能量大于 70%。
第二步：副 C Q 全开，不要贪普攻。
第三步：主 C 全力输出。Boss 虚弱阶段不要留技能。
常见问题：没有五星怎么办？用四星过渡即可。
""")
    ]
    eg = extract(sample, force_mock=True)
    print("Step1 mock OK:", eg.title, "| type=", eg.guideType.value)
    print("  steps:", len(eg.steps), " keyFacts:", len(eg.keyFacts))

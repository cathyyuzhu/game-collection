"""Step 2 · 简体中文攻略改写 (DeepSeek V2 / mock).

Input : ExtractedGuide (structured facts).
Output: ProcessedGuide with locale=zh-CN, full markdown content + structured fields.

In mock mode we produce a deterministic, well-formed markdown guide (see
deepseek_client._mock_rewrite).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from loguru import logger  # type: ignore
except Exception:
    import logging as logger  # type: ignore

from llm.deepseek_client import get_llm_client, strip_llm_markdown_wrapper  # noqa: E402
from llm.schemas import ExtractedGuide, ProcessedGuide  # noqa: E402


def _build_user_prompt(extracted: ExtractedGuide) -> str:
    kf_lines = "\n".join(
        f"- {kf.field} = {kf.value}{' (' + kf.unit + ')' if kf.unit else ''}"
        for kf in extracted.keyFacts
    ) or "(无)"
    step_lines: list[str] = []
    for s in extracted.steps:
        step_lines.append(f"### 步骤 {s.order}：{s.title}")
        step_lines.append(s.detail or "")
        if s.tip:
            step_lines.append(f"- 💡 {s.tip}")
        step_lines.append("")
    gloss = "\n".join(f"- {g.term_zh_cn}" for g in extracted.glossary) or "(无)"
    return (
        f"请基于以下结构化事实，重写一篇完整的手游攻略 Markdown。\n"
        f"\n"
        f"## 硬性规则\n"
        f"1. 以下 keyFacts 数值禁止任何更改，必须原封不动展示（推荐表格）：\n"
        f"{kf_lines}\n"
        f"2. 结构严格：# 标题 → ## TL;DR → ## 核心要点清单 → ## 操作步骤 → ## 关键数值表 → ## 小编提示\n"
        f"3. 不要广告、二维码、引流话术。\n"
        f"\n"
        f"## 游戏上下文\n"
        f"- 游戏名提示：{extracted.gameNameHint or extracted.title}\n"
        f"- 攻略类型：{extracted.guideType.value}\n"
        f"\n"
        f"## 原始步骤事实\n"
        f"{chr(10).join(step_lines) or '(无)'}\n"
        f"\n"
        f"## 专有名词\n"
        f"{gloss}\n"
        f"\n"
        f"## TL;DR 原始摘要（可重写措辞但不可改事实）\n"
        f"{extracted.tldr}\n"
        f"\n"
        f"只输出 Markdown，不要额外说明文字。\n"
    )


def rewrite_zh_cn(extracted: ExtractedGuide, *, force_mock: bool = False,
                  max_retries: int = 2) -> ProcessedGuide:
    client = get_llm_client(force_mock=force_mock)
    system = (
        "你是手游简体中文攻略作者。严格保持 keyFacts 数值不变，按用户给出的 5 段 Markdown 结构输出，"
        "不要输出额外说明。"
    )
    user = _build_user_prompt(extracted)
    last: Exception | None = None
    for _ in range(max(1, max_retries + 1)):
        try:
            out = client.chat(system, user, model="v2", temperature=0.85)
            if not client.mock_mode:
                out = strip_llm_markdown_wrapper(out)
            if len(out) < 300 and not client.mock_mode:
                raise ValueError(f"Output too short ({len(out)} chars), retry.")
            mins = max(1, round(len(out) / 450))
            return ProcessedGuide(
                locale="zh-CN",
                title=extracted.title,
                tldr=extracted.tldr,
                content=out,
                keyFacts=list(extracted.keyFacts),
                glossary=list(extracted.glossary),
                readMinutes=mins,
                usedMock=client.mock_mode,
            )
        except Exception as e:
            last = e
            try:
                logger.warning(f"Step2 rewrite attempt failed: {e}")
            except Exception:
                pass
    raise RuntimeError(f"Step2 rewrite failed after retries. Last: {last}")


if __name__ == "__main__":
    from step1_extract import extract  # local self-test
    sample = [dict(title="《鸣潮》角色配队攻略", source_url="u1",
                   text="配队推荐：主 C 搭配两个辅助 + 破盾。角色等级 80+。")]
    eg = extract(sample, force_mock=True)
    pg = rewrite_zh_cn(eg, force_mock=True)
    print(f"Step2 mock OK: locale={pg.locale} len(content)={len(pg.content)} mins={pg.readMinutes}")

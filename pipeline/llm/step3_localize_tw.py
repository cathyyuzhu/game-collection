"""Step 3 · zh-TW 本地化 (DeepSeek V2 / mock fallback).

Input : zh-CN markdown + glossary.
Output: ProcessedGuide with locale=zh-TW.

In mock mode we skip LLM calls entirely and use the built-in zh->TW
character map plus a handful of TW-specific term substitutions.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from loguru import logger  # type: ignore
except Exception:
    import logging as logger  # type: ignore

from llm.deepseek_client import get_llm_client, _to_tw_mock, strip_llm_markdown_wrapper  # noqa: E402
from llm.schemas import GlossaryItem, ProcessedGuide  # noqa: E402


def _apply_glossary_tw(text: str, glossary: List[GlossaryItem]) -> str:
    """If glossary explicitly maps zh-CN -> zh-TW, replace those exact terms."""
    out = text
    for g in glossary:
        if g.term_zh_cn and g.term_zh_tw and g.term_zh_cn != g.term_zh_tw:
            out = out.replace(g.term_zh_cn, g.term_zh_tw)
    return out


def _build_user_prompt(markdown_zh_cn: str, glossary: List[GlossaryItem]) -> str:
    g_lines = "\n".join(
        f"- {g.term_zh_cn} → {g.term_zh_tw or '(保留)'}  {g.note or ''}"
        for g in glossary
    ) or "(无)"
    return (
        f"## 专有名词强制替换表\n"
        f"{g_lines}\n"
        f"\n"
        f"## 简体原文（Markdown）\n"
        f"---\n"
        f"{markdown_zh_cn[:20000]}\n"
        f"---\n"
        f"\n"
        f"请转换为繁体中文（台湾用语），严格保持 Markdown 结构、步骤数、表格、数字不变。只输出繁体 Markdown 本体。\n"
    )


def localize_zh_tw(markdown_zh_cn: str, glossary: List[GlossaryItem], *,
                   title_cn: str = "", tldr_cn: str = "",
                   force_mock: bool = False,
                   max_retries: int = 2) -> ProcessedGuide:
    client = get_llm_client(force_mock=force_mock)
    if client.mock_mode:
        text = _apply_glossary_tw(markdown_zh_cn, glossary)
        text = _to_tw_mock(text)
        title = _to_tw_mock(_apply_glossary_tw(title_cn or "攻略標題", glossary))
        tldr = _to_tw_mock(_apply_glossary_tw(tldr_cn or "(無摘要)", glossary))
        # tw_glossary
        tw_glossary = [
            GlossaryItem(
                term_zh_cn=g.term_zh_cn,
                term_zh_tw=g.term_zh_tw or _to_tw_mock(g.term_zh_cn),
                term_en=g.term_en, note=g.note,
            )
            for g in glossary
        ]
        return ProcessedGuide(
            locale="zh-TW", title=title, tldr=tldr, content=text,
            keyFacts=[], glossary=tw_glossary,
            readMinutes=max(1, round(len(text) / 450)),
            usedMock=True,
        )
    system = (
        "你是繁體中文（台灣用語）本地化專家。嚴格保持原文 Markdown 結構、步驟數、表格、數字不變。"
        "只輸出繁體 Markdown 本體，不要前後說明。"
    )
    user = _build_user_prompt(markdown_zh_cn, glossary)
    last: Exception | None = None
    for _ in range(max(1, max_retries + 1)):
        try:
            out = client.chat(system, user, model="v2", temperature=0.4)
            out = strip_llm_markdown_wrapper(out)
            if len(out) < 200:
                raise ValueError(f"TW output too short ({len(out)} chars)")
            # Pull title from first # line
            m = re.search(r"^#\s*(.+)", out, re.M)
            title = m.group(1).strip() if m else _to_tw_mock(title_cn or "攻略標題")
            return ProcessedGuide(
                locale="zh-TW", title=title,
                tldr=_to_tw_mock(tldr_cn) if tldr_cn else title,
                content=out,
                keyFacts=[], glossary=list(glossary),
                readMinutes=max(1, round(len(out) / 450)),
                usedMock=False,
            )
        except Exception as e:
            last = e
            try:
                logger.warning(f"Step3 TW attempt failed: {e}")
            except Exception:
                pass
    raise RuntimeError(f"Step3 TW failed. Last: {last}")


if __name__ == "__main__":
    sample_md = """# 《原神》新手入门完全攻略

## 一、TL;DR 摘要
新手请先升级冒险等阶到 20 级，再抽卡。

## 二、✅ 准备清单
- 角色等级 >= 80 级
- 圣遗物主词条正确

## 三、⚔️ 完整步骤
### 步骤 1：准备
先开辅助 E。
"""
    pg = localize_zh_tw(sample_md, [], title_cn="原神新手攻略",
                         tldr_cn="新手请先升级冒险等阶", force_mock=True)
    print(f"Step3 mock OK: locale={pg.locale}, len(content)={len(pg.content)}")
    assert "體" in pg.content or "級" in pg.content or "聖遺物" in pg.content, "tw conversion missing"
    print("  sample tw:", pg.content[:80].replace("\n", " / "))

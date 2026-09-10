"""Step 4 · English translation + polish (DeepSeek V2 / mock fallback).

Input : zh-CN markdown + glossary + game context + guide type.
Output: ProcessedGuide with locale=en.

In mock mode we produce deterministic, structurally valid English markdown
(no real translation, but enough for E2E smoke tests).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List, Optional

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from loguru import logger  # type: ignore
except Exception:
    import logging as logger  # type: ignore

from llm.deepseek_client import get_llm_client, _mock_en, strip_llm_markdown_wrapper  # noqa: E402
from config import settings  # noqa: E402
from llm.schemas import GlossaryItem, GuideType, ProcessedGuide  # noqa: E402


def _deepl_translate(text: str, target: str = "EN") -> Optional[str]:
    """Lightweight DeepL API call. Returns None on any failure."""
    if not (settings.deepl_api_key and settings.deepl_base_url):
        return None
    try:
        import httpx
        base = settings.deepl_base_url or "https://api-free.deepl.com/v2"
        r = httpx.post(
            base.rstrip("/") + "/translate",
            headers={"Authorization": f"DeepL-Auth-Key {settings.deepl_api_key}"},
            data={"text": [text], "target_lang": target, "tag_handling": "markdown"},
            timeout=30,
        )
        r.raise_for_status()
        trs = r.json().get("translations") or []
        if trs:
            return trs[0].get("text")
    except Exception as e:
        try:
            logger.warning(f"DeepL fallback failed: {e}")
        except Exception:
            pass
    return None


def _build_user_prompt(md: str, glossary: List[GlossaryItem], game_name: str,
                       game_version: str, guide_type: GuideType) -> str:
    g_lines = "\n".join(
        f"- zh-CN: {g.term_zh_cn} -> en: {g.term_en or '(use official game name)'}  {g.note or ''}"
        for g in glossary
    ) or "(none)"
    return (
        f"## Context\n"
        f"- Game: {game_name}\n"
        f"- Patch/Version: {game_version}\n"
        f"- Guide type: {guide_type.value}\n"
        f"\n"
        f"## Glossary (MANDATORY — these terms MUST appear exactly as-is in English)\n"
        f"{g_lines}\n"
        f"\n"
        f"## Source zh-CN markdown to translate\n"
        f"---\n"
        f"{md[:20000]}\n"
        f"---\n"
        f"\n"
        f"Translate into authentic, natural Western gamer English (US tone, mobile/PC gaming jargon).\n"
        f"Preserve EXACT Markdown structure, headings, tables, ordering, and every numeric value.\n"
        f"Output ONLY the final markdown. No explanations.\n"
    )


def translate_en(
    markdown_zh_cn: str,
    glossary: List[GlossaryItem],
    game_name: str = "Mobile Game",
    game_version: str = "v1.0.0",
    guide_type: GuideType = GuideType.OTHER,
    *,
    title_cn: str = "",
    tldr_cn: str = "",
    force_mock: bool = False,
    max_retries: int = 2,
) -> ProcessedGuide:
    client = get_llm_client(force_mock=force_mock)
    if client.mock_mode:
        en_content = _mock_en(markdown_zh_cn)
        m = re.search(r"^#\s*(.+)", en_content, re.M)
        title = m.group(1).strip() if m else f"{game_name} Complete Guide"
        return ProcessedGuide(
            locale="en", title=title,
            tldr=_mock_en(tldr_cn or title).splitlines()[0][:240],
            content=en_content,
            keyFacts=[], glossary=list(glossary),
            readMinutes=max(1, round(len(en_content) / 500)),
            usedMock=True,
        )
    pre = _deepl_translate(markdown_zh_cn, target="EN")
    body = pre or markdown_zh_cn
    system = (
        "You are a professional mobile game translator/localizer writing for "
        "Western (US/SEA) mobile gamers. Preserve EXACT Markdown structure, "
        "headings, tables, and ALL numeric values. Output ONLY Markdown."
    )
    user = _build_user_prompt(body, glossary, game_name, game_version, guide_type)
    last: Exception | None = None
    for _ in range(max(1, max_retries + 1)):
        try:
            out = client.chat(system, user, model="v2", temperature=0.6)
            out = strip_llm_markdown_wrapper(out)
            if len(out) < 200:
                raise ValueError(f"EN output too short ({len(out)} chars)")
            m = re.search(r"^#\s*(.+)", out, re.M)
            title = m.group(1).strip() if m else f"{game_name} Guide"
            return ProcessedGuide(
                locale="en", title=title,
                tldr=title,
                content=out,
                keyFacts=[], glossary=list(glossary),
                readMinutes=max(1, round(len(out) / 500)),
                usedMock=False,
            )
        except Exception as e:
            last = e
            try:
                logger.warning(f"Step4 EN attempt failed: {e}")
            except Exception:
                pass
    raise RuntimeError(f"Step4 EN failed. Last: {last}")


if __name__ == "__main__":
    sample_md = """# 《原神》新手入门完全攻略

## 一、TL;DR 摘要
这篇攻略帮助新手在 90 秒内熟悉操作。包含配装、循环。

## 二、✅ 准备清单
- 角色等级 >= 80 级

## 三、⚔️ 完整步骤
### 步骤 1：准备
先开辅助 E。
"""
    pg = translate_en(sample_md, [], game_name="Genshin Impact",
                      game_version="v5.2.0", guide_type=GuideType.BEGINNER,
                      title_cn="新手攻略", tldr_cn="新手先升级",
                      force_mock=True)
    print(f"Step4 mock OK: locale={pg.locale}, len(content)={len(pg.content)}")
    print("  sample:", pg.content[:80].replace("\n", " / "))

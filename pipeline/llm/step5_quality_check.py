"""Step 5 · Quality check (rule-based + DeepSeek LLM / mock fallback).

Input : key facts, three locales' markdown, source raw texts.
Output: QualityReport (passAll, overallScore, list of checks).

We do rule-based checks FIRST (computed deterministically):
    - source similarity vs raw texts (difflib SequenceMatcher)
    - markdown wellformedness
Then, if LLM is available, we ask for a structured opinion on
fact preservation / structure completeness and merge it with the
rule-based results.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Dict, List, Optional

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from loguru import logger  # type: ignore
except Exception:
    import logging as logger  # type: ignore

from utils import max_similarity_against_sources  # noqa: E402
from llm.deepseek_client import get_llm_client  # noqa: E402
from llm.schemas import KeyFact, QualityCheck, QualityReport  # noqa: E402


# ------------------------- rule-based checks -------------------------
def _check_keyfacts(key_facts: List[KeyFact], zh_cn: str) -> QualityCheck:
    errors: list[str] = []
    for kf in key_facts:
        # Each fact value should appear as-is in zh-CN body (possibly with unit)
        target_vals = [kf.value]
        if kf.unit and f"{kf.value}{kf.unit}" not in zh_cn:
            target_vals.append(f"{kf.value}{kf.unit}")
        if not any(v and v in zh_cn for v in target_vals if v):
            errors.append(f"keyFacts '{kf.field}={kf.value}{kf.unit or ''}' not found in zh-CN body")
    return QualityCheck(name="keyFacts_numeric_match", ok=len(errors) == 0, errors=errors)


def _check_step_count_match(extracted_steps_n: int, zh_cn: str) -> QualityCheck:
    # count ### step headings
    headings = re.findall(r"^###\s*.+步骤", zh_cn, re.M)
    alt1 = re.findall(r"^###\s*Step", zh_cn, re.M)
    alt2 = re.findall(r"步骤\s*\d+", zh_cn, re.M)
    found = max(len(headings), len(alt1), len(alt2))
    errors: list[str] = []
    if extracted_steps_n >= 2 and found < 2:
        errors.append(f"Expected >= 2 steps in guide body but only {found} step markers found")
    return QualityCheck(name="step_count_match", ok=len(errors) == 0, errors=errors)


def _check_structure_complete(md: str) -> QualityCheck:
    required = [r"^#\s+", r"^##\s+", r"\|.+\|.+\|", r"步骤|Step|Checklist|TL;DR"]
    errors: list[str] = []
    for pat in required:
        if not re.search(pat, md, re.M | re.I):
            errors.append(f"Missing structural element matching /{pat}/")
    return QualityCheck(name="structure_complete", ok=len(errors) == 0, errors=errors)


def _check_markdown_wellformed(md: str) -> QualityCheck:
    errors: list[str] = []
    open_b = md.count("**") % 2
    open_i = md.count("*") - md.count("**") * 2
    if open_b % 2 != 0:
        errors.append("Unbalanced bold markers")
    # table rows should be consistent
    tbl_rows = re.findall(r"^\|.*\|$", md, re.M)
    if tbl_rows:
        ncols_first = tbl_rows[0].count("|") - 1
        for row in tbl_rows[1:3]:
            if row.count("|") - 1 != ncols_first:
                errors.append("Table column count inconsistent")
                break
    return QualityCheck(name="markdown_wellformed", ok=len(errors) == 0, errors=errors)


def _check_similarity(zh_cn: str, zh_tw: str, en: str, sources: List[str],
                      threshold: float) -> QualityCheck:
    sim_cn = max_similarity_against_sources(zh_cn, sources)
    sim_tw = max_similarity_against_sources(zh_tw, sources)
    sim_en = max_similarity_against_sources(en, sources)
    errors: list[str] = []
    for name, score in [("zh-CN", sim_cn), ("zh-TW", sim_tw), ("en", sim_en)]:
        if score > threshold:
            errors.append(f"{name} similarity={score:.3f} > threshold={threshold}")
    return QualityCheck(name="source_similarity_ok", ok=len(errors) == 0, errors=errors)


# ------------------------- LLM-enriched prompt (optional) -------------------------
def _llm_user_prompt(key_facts, zh_cn, zh_tw, en, sources, sims):
    kf = "\n".join(f"- {k.field} = {k.value}{' ('+k.unit+')' if k.unit else ''}" for k in key_facts) or "(无)"
    srcs = "\n---\n".join((s or "")[:2000] for s in (sources or [])[:3])
    return (
        f"手游攻略自动化质检。请输出 JSON：passAll(bool), overallScore(0..1), "
        f"checks[]. 每项 check 带 name/ok(bool)/errors[]。\n"
        f"\n"
        f"【keyFacts 必须完整出现在 zh-CN 中，数值不可变】\n{kf}\n"
        f"\n"
        f"【相似度（已算好）】{sims}（超过 0.3 视为过高）\n"
        f"\n"
        f"【zh-CN】\n{zh_cn[:6000]}\n"
        f"\n"
        f"【zh-TW】\n{zh_tw[:6000]}\n"
        f"\n"
        f"【en】\n{en[:6000]}\n"
        f"\n"
        f"【sources raw】\n{srcs[:4000]}\n"
    )


def _score_from_checks(checks: List[QualityCheck]) -> float:
    if not checks:
        return 0.0
    weights = {
        "keyFacts_numeric_match": 0.30,
        "step_count_match": 0.15,
        "structure_complete": 0.20,
        "markdown_wellformed": 0.15,
        "source_similarity_ok": 0.20,
    }
    total_w = 0.0
    total_s = 0.0
    for c in checks:
        w = weights.get(c.name, 0.10)
        total_w += w
        total_s += w if c.ok else (0.0 if "keyFact" in c.name or "similarity" in c.name else w * 0.3)
    return round(total_s / max(total_w, 0.001), 3)


# ------------------------- public API -------------------------
def check_quality(
    key_facts: List[KeyFact],
    zh_cn: str,
    zh_tw: str,
    en: str,
    source_texts: List[str],
    *,
    extracted_steps_n: int = 3,
    threshold: float = 0.30,
    force_mock: bool = False,
    max_retries: int = 2,
) -> QualityReport:
    # Rule-based checks (always run, always authoritative)
    checks: List[QualityCheck] = [
        _check_keyfacts(key_facts, zh_cn),
        _check_step_count_match(extracted_steps_n, zh_cn),
        _check_structure_complete(zh_cn),
        _check_markdown_wellformed(zh_cn),
        _check_similarity(zh_cn, zh_tw, en, source_texts, threshold),
    ]

    sims = {
        "zh-CN": round(max_similarity_against_sources(zh_cn, source_texts), 4),
        "zh-TW": round(max_similarity_against_sources(zh_tw, source_texts), 4),
        "en":    round(max_similarity_against_sources(en, source_texts), 4),
    }

    client = get_llm_client(force_mock=force_mock)
    if not client.mock_mode:
        system = "你是严格的手游攻略自动化质检机器人。只输出 JSON，不要任何其他文字。"
        user = _llm_user_prompt(key_facts, zh_cn, zh_tw, en, source_texts, sims)
        last: Exception | None = None
        for _ in range(max(1, max_retries + 1)):
            try:
                llm_rep = client.chat_json(system, user, QualityReport, model="v2-lite")
                # Merge: keep rule-based checks authoritative, append new LLM-only checks
                rule_names = {c.name for c in checks}
                for lc in llm_rep.checks:
                    if lc.name not in rule_names:
                        checks.append(lc)
                break
            except Exception as e:
                last = e
                try:
                    logger.warning(f"Step5 QC LLM attempt failed: {e}")
                except Exception:
                    pass

    score = _score_from_checks(checks)
    pass_all = all(c.ok for c in checks)
    notes = (
        f"(Rule-based + {'LLM' if not client.mock_mode else 'Mock'} QC) "
        f"score={score:.3f} passAll={pass_all}"
    )
    return QualityReport(
        passAll=pass_all,
        overallScore=score,
        checks=checks,
        sourceSimilarities=sims,
        notes=notes,
    )


def compute_similarities(
    zh_cn: str, zh_tw: str, en: str, source_texts: List[str]
) -> Dict[str, float]:
    return {
        "zh-CN": round(max_similarity_against_sources(zh_cn, source_texts), 4),
        "zh-TW": round(max_similarity_against_sources(zh_tw, source_texts), 4),
        "en":    round(max_similarity_against_sources(en, source_texts), 4),
    }


if __name__ == "__main__":
    from step1_extract import extract
    from step2_rewrite_zh import rewrite_zh_cn
    from step3_localize_tw import localize_zh_tw
    from step4_translate_en import translate_en
    src = [dict(title="《原神》5.2 Boss 攻略", source_url="u",
                text="角色等级 80+，暴击率 >=45%，步骤1 辅助E 步骤2 副CQ 步骤3 主C输出")]
    eg = extract(src, force_mock=True)
    pcn = rewrite_zh_cn(eg, force_mock=True)
    ptw = localize_zh_tw(pcn.content, eg.glossary, title_cn=eg.title, tldr_cn=eg.tldr, force_mock=True)
    pen = translate_en(pcn.content, eg.glossary, guide_type=eg.guideType, force_mock=True)
    qr = check_quality(
        key_facts=list(eg.keyFacts),
        zh_cn=pcn.content, zh_tw=ptw.content, en=pen.content,
        source_texts=[s["text"] for s in src],
        extracted_steps_n=len(eg.steps),
        force_mock=True,
    )
    print(f"Step5 mock OK: passAll={qr.passAll} score={qr.overallScore} checks_n={len(qr.checks)}")
    for c in qr.checks:
        print(f"  - {c.name}: ok={c.ok}" + (f"  errs={c.errors}" if c.errors else ""))
    print(f"  sims={qr.sourceSimilarities}")

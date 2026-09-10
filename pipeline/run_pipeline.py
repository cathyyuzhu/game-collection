#!/usr/bin/env python3
"""CLI entry for the Game Collection pipeline.

Usage examples:

    # 1. Crawl everything with mock data (no real HTTP, no API keys needed),
    #    do NOT write to DB yet:
        python run_pipeline.py crawl --force-mock --dry-run

    # 2. Run both stages, use mock LLM output (no API key), write to SQLite DB:
        python run_pipeline.py all --force-mock

    # 3. Production: real crawlers + real DeepSeek LLM + write DB:
        python run_pipeline.py all --appstore-limit 20 --rawg-limit 20
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import __init__ as _pkg_init  # noqa: F401, ensures sys.path is set

from loguru import logger  # noqa: E402

from config import settings  # noqa: E402
import db  # noqa: E402


def _configure_logger(level: str) -> None:
    logger.remove()
    logger.add(sys.stderr, level=level, enqueue=True,
               format="{time:HH:mm:ss.SSS} | {level: <8} | {message}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="run_pipeline",
        description="Game Collection content pipeline: crawl + LLM processing + DB writes.",
    )
    p.add_argument("stage", choices=["crawl", "llm", "all", "stats"],
                   help="Which stage(s) to run. 'stats' prints DB counts and exits.")
    p.add_argument("--force-mock", action="store_true",
                   help="Force every crawler / LLM step to use deterministic mock data "
                        "(no HTTP / API keys required). Perfect for smoke-testing.")
    p.add_argument("--dry-run", action="store_true",
                   help="Do everything EXCEPT writing rows into the production SQLite DB. "
                        "Prints what WOULD be written.")
    p.add_argument("--appstore-limit", type=int, default=10,
                   help="Max AppStore RSS games to fetch (default 10).")
    p.add_argument("--taptap-limit", type=int, default=10,
                   help="Max TapTap rank games to fetch (default 10).")
    p.add_argument("--rawg-limit", type=int, default=10,
                   help="Max RAWG.io games to fetch (default 10).")
    p.add_argument("--guide-limit-per-source", type=int, default=10,
                   help="Max guides to fetch per guide source (default 10).")
    p.add_argument("--llm-source-limit", type=int, default=5,
                   help="Max unprocessed RawGuide rows to pass through the LLM stage.")
    p.add_argument("--skip-media", action="store_true",
                   help="Skip media download entirely.")
    p.add_argument("--log-level", default=settings.log_level,
                   choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    _configure_logger(args.log_level)

    logger.info("Game Collection Pipeline startup. SQLite file: {}",
                settings.sqlite_file)
    if args.stage == "stats":
        try:
            counts = db.count_all()
        except Exception as e:
            logger.error("Could not read DB: {}", e)
            return 1
        print(json.dumps(counts, indent=2, ensure_ascii=False))
        return 0

    if args.force_mock:
        logger.info("--force-mock active: all crawlers + LLM will emit deterministic mock data.")
    if settings.llm_mock_mode and args.stage in ("llm", "all") and not args.force_mock:
        logger.warning("DEEPSEEK_API_KEY is not set. LLM stage will automatically fall back "
                       "to mock output. Add --force-mock to silence this warning.")

    # Imported lazily so `stats` works even with broken crawler/LLM deps
    from orchestrator import run_pipeline, PipelineOpts, PipelineReport

    opts = PipelineOpts(
        force_mock=args.force_mock,
        dry_run=args.dry_run,
        skip_media_download=args.skip_media,
        appstore_limit=args.appstore_limit,
        taptap_limit=args.taptap_limit,
        rawg_limit=args.rawg_limit,
        guide_limit_per_source=args.guide_limit_per_source,
        llm_source_limit=args.llm_source_limit,
    )
    report: PipelineReport = run_pipeline(args.stage, opts)
    logger.success("Stage '{}' finished. Report:\n{}",
                   args.stage, report.pretty())
    return 0 if report.exit_code == 0 else report.exit_code


if __name__ == "__main__":
    sys.exit(main())

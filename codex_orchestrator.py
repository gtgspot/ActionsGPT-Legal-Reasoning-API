#!/usr/bin/env python3
"""Codex orchestration helper.

Renders prompt templates for common tasks into a file/stdout so you can paste
them into your LLM of choice, or use a separate client.
"""
from __future__ import annotations

import argparse

from codex_client import PromptClient


def run(task: str, out: str | None, **vars: str) -> int:
    client = PromptClient()
    prompt = client.load(task)
    rendered = client.render(prompt, **vars)
    if out:
        path = client.save(rendered, out)
        print(f"Wrote {path}")
    else:
        print(rendered)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Codex Orchestrator")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("generate-tests", help="Render test-generation prompt")
    p1.add_argument("--path", default=".", help="Target path/module")
    p1.add_argument("--out", default=None, help="Write to file instead of stdout")

    p2 = sub.add_parser("refactor-extract", help="Render refactor/extract prompt")
    p2.add_argument("--path", default=".")
    p2.add_argument("--symbol", default="", help="Symbol/function/class to extract")
    p2.add_argument("--out", default=None)

    p3 = sub.add_parser("add-type-annotations", help="Render typing prompt")
    p3.add_argument("--path", default=".")
    p3.add_argument("--out", default=None)

    args = parser.parse_args(argv)
    if args.cmd == "generate-tests":
        return run("generate_tests", args.out, path=args.path)
    if args.cmd == "refactor-extract":
        return run("refactor_extract", args.out, path=args.path, symbol=args.symbol)
    if args.cmd == "add-type-annotations":
        return run("add_type_annotations", args.out, path=args.path)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())


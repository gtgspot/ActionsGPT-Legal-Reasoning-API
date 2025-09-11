"""Lightweight prompt client for local orchestration.

This does not call any external LLM. It loads a template, fills variables,
and prints or writes the rendered prompt so you can use your preferred tool.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional


@dataclass
class Prompt:
    name: str
    path: Path
    text: str


class PromptClient:
    def __init__(self, config_path: str = "codex_config.json") -> None:
        self.root = Path.cwd()
        self.config = json.loads(Path(config_path).read_text())
        # Either explicit mapping or a directory to resolve defaults
        self.templates: Dict[str, str] = self.config.get("templates", {})
        self.templates_dir: Optional[str] = self.config.get("prompt_templates_dir")

    def load(self, name: str) -> Prompt:
        path: Optional[Path] = None
        if name in self.templates:
            path = (self.root / self.templates[name]).resolve()
        elif self.templates_dir:
            # Default file naming convention
            fallback = {
                "generate_tests": "generate_tests.v1.tpl",
                "refactor_extract": "refactor_extract.v1.tpl",
                "add_type_annotations": "add_type_annotations.v1.tpl",
            }.get(name)
            if not fallback:
                raise KeyError(f"unknown template: {name}")
            path = (self.root / self.templates_dir / fallback).resolve()
        else:
            raise KeyError(f"unknown template: {name}")
        p = path
        return Prompt(name=name, path=p, text=p.read_text(encoding="utf-8"))

    def render(self, prompt: Prompt, **vars: str) -> str:
        # Very simple formatter – use {var} placeholders in templates
        return prompt.text.format(**vars)

    def save(self, content: str, out: Optional[str] = None) -> Path:
        path = Path(out) if out else Path("codex_output.txt")
        path.write_text(content, encoding="utf-8")
        return path


__all__ = ["PromptClient", "Prompt"]

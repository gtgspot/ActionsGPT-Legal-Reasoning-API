"""Precedent parsing and ranking utilities.

Encodes simple bindingness and a precedential weight calculation for AU/VIC.
"""

from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..config import PRECEDENT_WEIGHTS
from ..schemas import CaseMeta, CourtLevel

_HIER_CACHE: Optional[Dict[str, Any]] = None


def _load_hierarchy() -> Optional[Dict[str, Any]]:
    global _HIER_CACHE
    if _HIER_CACHE is not None:
        return _HIER_CACHE
    p = Path(__file__).resolve().parents[1] / "config" / "precedent_hierarchy.yml"
    if not p.exists():
        _HIER_CACHE = None
        return None
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(p.read_text())
        _HIER_CACHE = data if isinstance(data, dict) else None
    except Exception:
        _HIER_CACHE = None
    return _HIER_CACHE

NEUTRAL_RE = re.compile(r"\[(?P<year>\d{4})\]\s+(?P<court>[A-Z]{2,6})\s+(?P<num>\d+)")


def is_binding_on_vic(court_level: Optional[str]) -> bool:
    if not court_level:
        return False
    cfg = _load_hierarchy()
    try:
        if cfg and "courts" in cfg and isinstance(cfg["courts"], dict):
            entry = cfg["courts"].get(court_level)
            if isinstance(entry, dict) and "binding_on_vic" in entry:
                return bool(entry["binding_on_vic"])
    except Exception:
        pass
    return court_level in {"HCA", "VSCA"}


def _court_score(court: Optional[str]) -> float:
    if not court:
        return 0.5
    cfg = _load_hierarchy()
    try:
        if cfg and "courts" in cfg and isinstance(cfg["courts"], dict):
            entry = cfg["courts"].get(court)
            if isinstance(entry, dict) and "level" in entry:
                level = int(entry["level"])
                return {5: 1.0, 4: 0.85, 3: 0.7, 2: 0.3, 1: 0.3}.get(level, 0.5)
    except Exception:
        pass
    table = {
        "HCA": 1.0,
        "VSCA": 0.85,
        "VSC": 0.7,
        "FCAFC": 0.65,
        "FCA": 0.6,
        "VCC": 0.3,
        "MCV": 0.3,
        "VCAT": 0.3,
        "OtherAU": 0.5,
    }
    return table.get(court, 0.5)


def compute_precedential_weight(meta: CaseMeta, now_year: int, vic: bool = True) -> float:
    bindingness = 1.0 if is_binding_on_vic(meta.court_level) else 0.0
    court_score = _court_score(meta.court_level)
    ratio_bonus = 0.1 if (meta.ratio_excerpt) else 0.0
    unanimity_bonus = 0.05 if (meta.disposition or "").lower().find("unanimous") >= 0 else 0.0

    t_delta = 0.0
    if meta.subsequent_treatments:
        for tr in meta.subsequent_treatments:
            w = {
                "followed": +0.05,
                "applied": +0.03,
                "considered": 0.0,
                "distinguished": -0.04,
                "not followed": -0.08,
                "overruled": -0.12,
            }.get(tr.treatment, 0.0)
            t_delta += w * min(tr.count, 4)
    t_cap = float(PRECEDENT_WEIGHTS.get("treatment_cap", 0.2))
    t_delta = max(-t_cap, min(t_cap, t_delta))

    j_bonus = 0.05 if (vic and meta.court_level in {"HCA", "VSCA", "VSC", "VCC", "MCV", "VCAT"}) else 0.0
    year = meta.year or now_year
    age_lambda = float(PRECEDENT_WEIGHTS.get("age_lambda", 0.05))
    age = max(0.0, min(1.0, math.exp(-age_lambda * (now_year - year))))
    contrary = 1.0 if (meta.disposition or "").lower().find("overruled") >= 0 else 0.0
    w = (
        float(PRECEDENT_WEIGHTS.get("w_binding", 0.35)) * bindingness
        + float(PRECEDENT_WEIGHTS.get("w_court", 0.25)) * court_score
        + float(PRECEDENT_WEIGHTS.get("w_ratio", 0.10)) * ratio_bonus
        + float(PRECEDENT_WEIGHTS.get("w_unanimity", 0.05)) * unanimity_bonus
        + float(PRECEDENT_WEIGHTS.get("w_treatment", 0.15)) * t_delta
        + float(PRECEDENT_WEIGHTS.get("w_jurisdiction", 0.05)) * j_bonus
        + float(PRECEDENT_WEIGHTS.get("w_age", 0.05)) * age
        - float(PRECEDENT_WEIGHTS.get("contrary_penalty", 0.50)) * contrary
    )
    return max(0.0, min(1.0, w))


def parse_neutral_citation(text: str) -> CaseMeta:
    """Best-effort neutral citation parsing from a result title/line."""
    m = NEUTRAL_RE.search(text or "")
    court: Optional[str] = None
    year = None
    cite = None
    if m:
        year = int(m.group("year"))
        court = m.group("court").upper()
        cite = f"[{year}] {court} {m.group('num')}"
    allowed: set[str] = {"HCA", "HCAFC", "VSCA", "VSC", "VCC", "MCV", "VCAT", "FCA", "FCAFC", "OtherAU"}
    norm: Optional[CourtLevel] = (court if (court in allowed) else ("OtherAU" if court else None))  # type: ignore[assignment]
    meta = CaseMeta(neutral_citation=cite, court_level=norm, year=year)
    meta.binding_on_vic = is_binding_on_vic(meta.court_level)
    return meta


def build_authority_line(precedents: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Partition precedents into governing/supporting/counter deterministically.

    Each precedent item expected to have keys: title, meta (mapping compatible with CaseMeta).
    """
    items: List[Dict[str, Any]] = []
    for p in precedents:
        meta = CaseMeta(**p.get("meta", {}))
        items.append({"title": p.get("title"), "meta": meta})
    # Sort by precedential_weight desc (missing treated as 0)
    items.sort(key=lambda x: (x["meta"].precedential_weight or 0.0), reverse=True)
    governing: List[Dict[str, Any]] = []
    supporting: List[Dict[str, Any]] = []
    counter: List[Dict[str, Any]] = []
    for it in items:
        meta = it["meta"]
        out = {
            "title": it["title"],
            "neutral_citation": meta.neutral_citation,
            "precedential_weight": meta.precedential_weight,
        }
        if meta.binding_on_vic and not governing:
            governing.append(out)
        else:
            supporting.append(out)
        # If negative treatments present, also mark as counter
        if any((t.treatment in {"distinguished", "not followed", "overruled"}) for t in (meta.subsequent_treatments or [])):
            counter.append(out)
    return {"governing": governing[:1], "supporting": supporting[:3], "counter": counter[:2]}


def parse_case_page(html: str) -> Dict[str, Any]:
    """Heuristic extraction of panel and ratio/obiter snippets from case HTML.

    - Panel: look for lines starting with 'Judges:' or 'Coram:' and split names by ',' or ';'.
    - Ratio/Obiter: pick first [nn] paragraph as ratio candidate; later [nn] as obiter candidate.
    """
    out: Dict[str, Any] = {}
    text = html or ""
    # Panel
    m = re.search(r"(?i)(judges|coram)\s*:\s*(.+)", text)
    if m:
        names = re.split(r"[;,]", m.group(2))
        out["panel"] = [n.strip() for n in names if n.strip()]
    # Paragraphs with neutral markers [nn]
    paras = re.findall(r"\[(\d{1,3})\]", text)
    if paras:
        # extract bracketed paragraphs up to the next bracket
        par_texts = re.findall(r"(\[\d{1,3}\][^\[]+)", text)
        if par_texts:
            out["ratio_excerpt"] = par_texts[0][:300]
            if len(par_texts) > 1:
                out["obiter_excerpt"] = par_texts[-1][:300]
    return out

"""Transformer-based legal analysis service."""

from __future__ import annotations

from typing import Any, Optional

from ..config import TRANSFORMER_MODEL
from ..models import LegalQuery, LegalResponse

_analyzer: Optional[Any] = None


def _get_pipeline() -> Optional[Any]:
    """Lazily load a text-generation pipeline."""
    global _analyzer
    if _analyzer is None:
        try:
            from transformers import pipeline

            _analyzer = pipeline("text-generation", model=TRANSFORMER_MODEL)
        except Exception:
            _analyzer = None
    return _analyzer


def generate_legal_analysis(query: LegalQuery) -> LegalResponse:
    """Generate an analysis for the given legal query."""
    analyzer = _get_pipeline()
    if analyzer is None:
        return LegalResponse(analysis="Model unavailable.", confidence_score=0.0, references=[])
    result = analyzer(query.text, max_length=200, num_return_sequences=1)[0]
    analysis_text: str = result.get("generated_text", "").strip()
    return LegalResponse(analysis=analysis_text, confidence_score=0.5, references=[])

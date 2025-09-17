"""Service constructors for quantum legal models."""

from __future__ import annotations

from .quantum_model import LegalQubit, adjust_for_bias, from_probabilities

__all__ = ["LegalQubit", "from_probabilities", "adjust_for_bias"]

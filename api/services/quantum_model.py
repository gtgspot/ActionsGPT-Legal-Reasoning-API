"""Quantum-inspired legal rule modeling.

Provides primitives for representing legal rules as qubits and
helpers to convert classical probability mappings into qubit states.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Literal


@dataclass
class LegalQubit:
    """Simple qubit representation of a legal rule.

    Attributes:
        amplitude: Complex amplitude whose magnitude squared equals the rule's probability.
        phase: Phase angle in radians derived from the interpretive leaning.
        metadata: Arbitrary metadata describing the linked rule or outcome.
        leaning: Interpretive leaning encoded as a phase via :data:`_LEANING_PHASES`.
    """

    amplitude: complex
    phase: float
    metadata: Dict[str, Any]
    leaning: Literal["textual", "purposive", "precedential", "equitable"]

    def __post_init__(self) -> None:
        self.phase = _LEANING_PHASES.get(self.leaning, self.phase)


_LEANING_PHASES: Dict[str, float] = {
    "textual": 0.0,
    "purposive": math.pi / 2,
    "precedential": math.pi,
    "equitable": 3 * math.pi / 2,
}


def from_probabilities(
    rule_probs: Dict[str, float],
    leanings: Dict[str, Literal["textual", "purposive", "precedential", "equitable"]] | None = None,
) -> List[LegalQubit]:
    """Translate classical rule probabilities into qubit states.

    Args:
        rule_probs: Mapping of rule identifier to classical probability.
        leanings: Optional mapping of rule identifier to interpretive leaning. Rules not
            present default to ``"textual"``.

    Returns:
        A list of :class:`LegalQubit` instances normalized so the total probability is 1.
    """

    total = sum(p for p in rule_probs.values() if p > 0)
    if total <= 0:
        return []

    qubits: List[LegalQubit] = []
    for rule, prob in rule_probs.items():
        if prob <= 0:
            continue
        norm_prob = prob / total
        amplitude = complex(math.sqrt(norm_prob), 0.0)
        leaning: Literal["textual", "purposive", "precedential", "equitable"] = "textual"
        if leanings and rule in leanings:
            leaning = leanings[rule]
        qubits.append(
            LegalQubit(
                amplitude=amplitude,
                phase=0.0,
                metadata={"rule": rule, "probability": norm_prob},
                leaning=leaning,
            )
        )
    return qubits


def adjust_for_bias(qubits: List[LegalQubit], court_profile: Dict[str, float]) -> List[LegalQubit]:
    """Adjust qubit phases to reflect court tendencies.

    Args:
        qubits: Sequence of qubits to adjust.
        court_profile: Mapping of leaning to phase shift bias.

    Returns:
        New list of qubits with phase angles shifted by the court profile.

    Example:
        >>> q = LegalQubit(amplitude=1+0j, phase=0.0, metadata={}, leaning="textual")
        >>> adjusted = adjust_for_bias([q], {"textual": 0.3})
        >>> round(adjusted[0].phase, 1)
        0.3
    """

    adjusted: List[LegalQubit] = []
    for q in qubits:
        bias = court_profile.get(q.leaning, 0.0)
        adjusted.append(
            LegalQubit(
                amplitude=q.amplitude,
                phase=q.phase + bias,
                metadata=q.metadata,
                leaning=q.leaning,
            )
        )
    return adjusted

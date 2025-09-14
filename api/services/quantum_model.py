"""Quantum-inspired legal rule modeling.

Provides primitives for representing legal rules as qubits and
helpers to convert classical probability mappings into qubit states.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class LegalQubit:
    """Simple qubit representation of a legal rule.

    Attributes:
        amplitude: Complex amplitude whose magnitude squared equals the rule's probability.
        phase: Phase angle in radians.
        metadata: Arbitrary metadata describing the linked rule or outcome.
    """

    amplitude: complex
    phase: float
    metadata: Dict[str, Any]


def from_probabilities(rule_probs: Dict[str, float]) -> List[LegalQubit]:
    """Translate classical rule probabilities into qubit states.

    Args:
        rule_probs: Mapping of rule identifier to classical probability.

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
        qubits.append(
            LegalQubit(
                amplitude=amplitude, phase=0.0, metadata={"rule": rule, "probability": norm_prob}
            )
        )
    return qubits

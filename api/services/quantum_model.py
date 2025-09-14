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


def calculate_ambiguity(qubits: List[LegalQubit]) -> float:
    r"""Measure mean interpretive entropy across qubits.

    For each qubit with amplitude :math:`\psi`, let
    :math:`p = |\psi|^2` be the probability that the linked rule is
    satisfied. Ambiguity is the average of the binary Shannon entropy:

    .. math::

        \bar H = \frac{1}{N}\sum_i \Big[-p_i\log_2 p_i - (1-p_i)\log_2(1-p_i)\Big]

    Terms with ``p_i`` equal to ``0`` or ``1`` contribute ``0``. The
    function returns ``0.0`` when ``qubits`` is empty. Identical inputs
    always yield the same deterministic result.
    """

    if not qubits:
        return 0.0

    entropy_sum = 0.0
    for q in qubits:
        p = abs(q.amplitude) ** 2
        if p <= 0.0 or p >= 1.0:
            continue
        entropy_sum += -p * math.log(p, 2) - (1 - p) * math.log(1 - p, 2)
    return entropy_sum / len(qubits)


def calculate_intertextuality(a: List[LegalQubit], b: List[LegalQubit]) -> float:
    r"""Compute Bhattacharyya coefficient between two rule distributions.

    Each input list is treated as a probability distribution over rule
    identifiers stored in ``metadata['rule']``. For rule ``i`` present in
    both lists with probabilities :math:`p_i` and :math:`q_i`, the score is

    .. math::

        BC = \sum_{i \in R} \sqrt{p_i q_i},

    where ``R`` is the intersection of rule identifiers. The result lies in
    ``[0, 1]`` with ``1`` denoting identical distributions. Returns ``0.0``
    if no overlap exists or either list is empty. Identical inputs yield
    identical deterministic outputs.
    """

    if not a or not b:
        return 0.0

    def prob_map(qubits: List[LegalQubit]) -> Dict[str, float]:
        mapping: Dict[str, float] = {}
        for q in qubits:
            rule = q.metadata.get("rule")
            if rule is None:
                continue
            mapping[rule] = mapping.get(rule, 0.0) + abs(q.amplitude) ** 2
        total = sum(mapping.values())
        if total > 0:
            for key in list(mapping.keys()):
                mapping[key] /= total
        return mapping

    pa = prob_map(a)
    pb = prob_map(b)
    common = set(pa) & set(pb)
    if not common:
        return 0.0

    return sum(math.sqrt(pa[rule] * pb[rule]) for rule in sorted(common))

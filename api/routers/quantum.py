"""Endpoints for quantum-inspired legal analysis."""

from fastapi import APIRouter, Depends, HTTPException

from ..schemas import (
    QuantumAnalysisResponse,
    QuantumInterpretationRequest,
    QuantumQubit,
)
from ..security import api_key_guard
from ..services.quantum_model import from_probabilities

router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/interpret", response_model=QuantumAnalysisResponse)
def interpret(payload: QuantumInterpretationRequest) -> QuantumAnalysisResponse:
    """Interpret rule probabilities into qubit metrics."""
    rule_probs = payload.rule_probabilities
    if not rule_probs:
        raise HTTPException(400, "rule_probabilities must not be empty")

    qubits = from_probabilities(rule_probs)
    if not qubits:
        raise HTTPException(400, "no positive probabilities provided")

    qubit_models = [
        QuantumQubit(
            rule=q.metadata.get("rule", ""),
            probability=q.metadata.get("probability", 0.0),
            amplitude=abs(q.amplitude),
            phase=q.phase,
        )
        for q in qubits
    ]
    total_prob = sum(q.probability for q in qubit_models)
    return QuantumAnalysisResponse(
        qubits=qubit_models, qubit_count=len(qubit_models), total_probability=total_prob
    )

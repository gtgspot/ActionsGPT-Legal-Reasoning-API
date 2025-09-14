import math

from api.services.quantum_model import (
    calculate_ambiguity,
    calculate_intertextuality,
    from_probabilities,
)


def test_calculate_ambiguity_entropy():
    qubits = from_probabilities({"a": 0.25, "b": 0.75})
    val1 = calculate_ambiguity(qubits)
    val2 = calculate_ambiguity(qubits)
    expected = -0.25 * math.log(0.25, 2) - 0.75 * math.log(0.75, 2)
    assert math.isclose(val1, expected, rel_tol=1e-9)
    assert val1 == val2


def test_calculate_intertextuality_overlap_and_deterministic():
    a = from_probabilities({"x": 0.5, "y": 0.5})
    b = from_probabilities({"x": 0.2, "z": 0.8})
    val1 = calculate_intertextuality(a, b)
    val2 = calculate_intertextuality(a, b)
    expected = math.sqrt(0.5 * 0.2)
    assert math.isclose(val1, expected, rel_tol=1e-9)
    assert val1 == val2
    assert calculate_intertextuality(a, from_probabilities({"z": 1.0})) == 0.0

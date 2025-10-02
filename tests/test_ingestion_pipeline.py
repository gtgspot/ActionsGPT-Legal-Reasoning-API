import math

from api.services.ingestion_pipeline import (
    admissibility_check,
    ambiguity_score,
    analyze_case,
    bias_aware_outcome,
    collect_sources,
    export,
    fact_pattern_embed,
    generate_arguments,
    hybrid_search,
    interpretation_qubits,
    intertextuality_score,
    normalize_docs,
    parse_citations,
    validate_and_score,
)


def test_collect_sources_prioritises_hearsay():
    collection = collect_sources("challenge hearsay conviction in vic courts")
    assert collection.sources, "expected at least one source"
    top = collection.sources[0]
    assert "evidence" in top.title.lower()


def test_normalize_and_parse_citations_extracts_case():
    collection = collect_sources("hearsay appeal discretion")
    docs = normalize_docs(collection)
    assert docs
    cset = parse_citations(docs[0])
    assert any("smith-v-r" in cit.canonical_id for cit in cset.citations)


def test_hybrid_search_ranks_results():
    collection = collect_sources("hearsay relevance appeal")
    docs = normalize_docs(collection)
    results = hybrid_search("hearsay rule", docs)
    assert results.hits
    assert all(results.hits[i].score >= results.hits[i + 1].score for i in range(len(results.hits) - 1))


def test_analysis_pipeline_integration():
    bundle = analyze_case(
        facts="Police relied on an out-of-court statement.",
        issues=["Hearsay objection"],
        stage="appeal",
    )
    assert bundle.sources.sources
    arguments = generate_arguments(bundle)
    assert arguments
    ranked = validate_and_score(arguments, bundle)
    assert ranked.arguments
    argument = ranked.arguments[0]
    # ensure at least one admissibility gate triggered when hearsay present
    admissibility = admissibility_check(arguments[0].irac.application)
    assert any(gate.gate == "hearsay" for gate in admissibility)
    assert argument.irac.conclusion
    assert argument.proposition == argument.irac.conclusion
    assert argument.authorities and isinstance(argument.authorities[0], dict)
    assert argument.ambiguity.score >= 0
    assert argument.intertextuality.score >= 0
    assert argument.phase_vector and all(isinstance(v, float) for v in argument.phase_vector.values())
    assert argument.audit_id.startswith("argument_compiled:")
    exported = export(arguments, template="ILAC_MagCt")
    assert "Template" in exported.content


def test_fact_pattern_embedding_symbolic_slots():
    embedding = fact_pattern_embed("John Smith assaulted a patron on 01/02/2023")
    assert embedding.symbolic_slots["dates"] == ["01/02/2023"]
    assert "John" in embedding.symbolic_slots["actors"][0]


def test_quantum_bias_adjustment():
    qubits = interpretation_qubits("hearsay issue")
    assert qubits
    assert math.isclose(sum(abs(q.amplitude) ** 2 for q in qubits), 1.0, rel_tol=1e-3)
    outcome = bias_aware_outcome("hearsay issue", "VSCA")
    assert 0 < outcome.probability <= 1
    assert 0 <= outcome.inconsistency <= 1


def test_intertextuality_and_ambiguity_scores():
    text = "See Smith v The Queen [2017] HCA 5 for guidance; arguably the ratio is narrow."
    inter = intertextuality_score(text, ["smith-v-the-queen-[2017]-hca-5"])
    amb = ambiguity_score(text)
    assert inter.score > 0
    assert amb.score > 0

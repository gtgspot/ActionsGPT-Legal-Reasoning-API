"""End-to-end legal ingestion and analysis pipeline primitives.

This module implements the blueprint outlined for the frontend ingestion
feature. Each function produces a typed artifact that records provenance
and can be composed independently. The implementation is intentionally
lightweight and deterministic so it can run in offline test environments
while still reflecting realistic workflows for Victorian (VIC) matters.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from .quantum_model import LegalQubit


@dataclass(frozen=True)
class Provenance:
    """Metadata describing how an artifact was produced."""

    stage: str
    method: str
    timestamp: datetime
    inputs: Mapping[str, Any] = field(default_factory=dict)


def _prov(pipeline_stage: str, method: str, **inputs: Any) -> Provenance:
    """Create a provenance record with a UTC timestamp."""

    return Provenance(stage=pipeline_stage, method=method, timestamp=datetime.now(timezone.utc), inputs=inputs)


@dataclass
class SourceDocument:
    """Represents a collected primary or secondary source."""

    source_id: str
    title: str
    doc_type: str
    jurisdiction: str
    year: Optional[int]
    score: float
    content: str
    provenance: Provenance
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SourceCollection:
    """Container holding the results of :func:`collect_sources`."""

    query: str
    sources: List[SourceDocument]
    provenance: Provenance


@dataclass
class DocumentSection:
    """Normalized section/paragraph of a document."""

    section_id: str
    title: Optional[str]
    text: str
    start_line: int
    end_line: int
    provenance: Provenance


@dataclass
class NormalizedDocument:
    """Normalized and segmented document ready for downstream tasks."""

    source_id: str
    language: str
    sections: List[DocumentSection]
    token_count: int
    provenance: Provenance
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Citation:
    """Represents a detected citation with a canonical identifier."""

    raw: str
    canonical_id: str
    pinpoint: Optional[str]
    source_id: str
    section_id: Optional[str]
    provenance: Provenance


@dataclass
class CitationSet:
    """Collection of citations detected in a document."""

    source_id: str
    citations: List[Citation]
    provenance: Provenance


@dataclass
class MetaTag:
    """Metadata tag derived from content or structure."""

    key: str
    value: str
    confidence: float
    provenance: Provenance


@dataclass
class DocumentMetadata:
    """Aggregated metadata for a document."""

    source_id: str
    tags: List[MetaTag]
    provenance: Provenance


@dataclass
class GraphNode:
    """Node within the linkage/authority graph."""

    node_id: str
    title: str
    node_type: str
    attributes: Dict[str, Any]
    provenance: Provenance


@dataclass
class GraphEdge:
    """Edge between two graph nodes with optional validity window."""

    source: str
    target: str
    relation: str
    weight: float
    temporal_validity: Optional[str]
    provenance: Provenance


@dataclass
class LinkGraph:
    """Graph linking statutes, regulations, cases and commentary."""

    nodes: List[GraphNode]
    edges: List[GraphEdge]
    provenance: Provenance


@dataclass
class RuleElement:
    """Represents a discrete rule element/defence/exception."""

    element_id: str
    text: str
    element_type: str
    support_sections: List[str]
    provenance: Provenance


@dataclass
class RuleExtraction:
    """Collection of rule elements derived from a document."""

    source_id: str
    elements: List[RuleElement]
    provenance: Provenance


@dataclass
class FormTask:
    """Mapping between prescribed forms and procedural tasks."""

    form_id: str
    title: str
    task: str
    deadline_days: Optional[int]
    provenance: Provenance


@dataclass
class FormMapping:
    """Collection of mapped forms for a document or issue."""

    jurisdiction: str
    tasks: List[FormTask]
    provenance: Provenance


@dataclass
class SearchHit:
    """Hybrid search result with composite score."""

    identifier: str
    title: str
    snippet: str
    score: float
    source_type: str
    provenance: Provenance


@dataclass
class SearchResults:
    """Results produced by :func:`hybrid_search`."""

    query: str
    hits: List[SearchHit]
    provenance: Provenance


@dataclass
class MinedClaim:
    """Argument mining output for a single claim."""

    claim_id: str
    issue: str
    holding: Optional[str]
    ratio: Optional[str]
    obiter: Optional[str]
    provenance: Provenance


@dataclass
class ClaimSet:
    """Container for mined claims."""

    source_id: str
    claims: List[MinedClaim]
    provenance: Provenance


@dataclass
class FactsEmbedding:
    """Combined vector and symbolic representation of fact patterns."""

    vector: List[float]
    symbolic_slots: Dict[str, Any]
    provenance: Provenance


@dataclass
class IssueAlignment:
    """Alignment results between facts and rule elements."""

    satisfied: List[str]
    contested: List[str]
    missing: List[str]
    provenance: Provenance


@dataclass
class AmbiguityReport:
    """Report on ambiguity for a piece of text."""

    score: float
    signals: List[str]
    provenance: Provenance


@dataclass
class IntertextualityReport:
    """Report on intertextual depth/width of analysis."""

    score: float
    references: List[str]
    provenance: Provenance


@dataclass
class AdmissibilityGate:
    """Outcome of Evidence Act admissibility screening."""

    gate: str
    passed: bool
    rationale: str
    provenance: Provenance


@dataclass
class RightsScreening:
    """Victorian Charter screening notes."""

    potential_limits: List[str]
    proportionality_notes: List[str]
    provenance: Provenance


@dataclass
class IRACBlock:
    """Structured IRAC/ILAC analysis block."""

    issue: str
    rule: str
    application: str
    conclusion: str
    citations: List[str]
    provenance: Provenance


@dataclass
class CounterArgument:
    """Generated counter-position for an argument."""

    thesis: str
    authorities: List[str]
    strategy: str
    provenance: Provenance


@dataclass
class ProcedureChecklist:
    """Generated procedural checklist for a litigation stage."""

    stage: str
    steps: List[str]
    references: List[str]
    provenance: Provenance


@dataclass
class Argument:
    """Structured argument ready for validation/scoring."""

    stance: str
    irac: IRACBlock
    counters: List[CounterArgument]
    procedure: ProcedureChecklist
    authorities: List[str]
    risk_notes: List[str]
    provenance: Provenance


@dataclass
class ConsistencyReport:
    """Result of authority consistency checks."""

    consistent: bool
    conflicts: List[str]
    provenance: Provenance


@dataclass
class CitationVerification:
    """Verification outcome for citations in an argument."""

    valid: bool
    missing: List[str]
    invalid: List[str]
    provenance: Provenance


@dataclass
class OutcomeScore:
    """Aggregate scoring output for an argument."""

    score: float
    components: Dict[str, float]
    provenance: Provenance


@dataclass
class RationaleStep:
    """Single step in a rationale trace."""

    step_id: str
    statement: str
    supports: List[str]
    provenance: Provenance


@dataclass
class RationaleTrace:
    """Trace connecting argument statements to supporting nodes."""

    argument_id: str
    steps: List[RationaleStep]
    provenance: Provenance


@dataclass
class DeltaView:
    """Change tracking for authorities between runs."""

    added: List[str]
    removed: List[str]
    unchanged: List[str]
    provenance: Provenance


@dataclass
class UserPreference:
    """Captured preferences from critique/accept loop."""

    updated_prompts: Dict[str, Any]
    provenance: Provenance


@dataclass
class FactDispute:
    """Detection of potential fact disputes."""

    fact_key: str
    assumed: Any
    provided: Any
    provenance: Provenance


@dataclass
class ExportBundle:
    """Exported bundle containing formatted arguments."""

    template: str
    content: str
    attachments: List[str]
    provenance: Provenance


@dataclass
class DocketEvent:
    """Calendar event derived from procedural mapping."""

    task: str
    deadline_days: Optional[int]
    form_id: Optional[str]
    provenance: Provenance


@dataclass
class DocketSchedule:
    """Collection of docket events for sync."""

    events: List[DocketEvent]
    provenance: Provenance


@dataclass
class GovernanceCheck:
    """Governance check output (jurisdiction/privacy)."""

    ok: bool
    notes: List[str]
    provenance: Provenance


@dataclass
class AuditRecord:
    """Audit log entry."""

    event: str
    payload: Dict[str, Any]
    provenance: Provenance
    record_id: str


@dataclass
class BiasAwareOutcome:
    """Bias adjusted outcome metrics from qubit model."""

    court: str
    probability: float
    inconsistency: float
    provenance: Provenance


@dataclass
class AnalysisBundle:
    """Aggregate artifact returned by :func:`analyze_case`."""

    jurisdiction: str
    sources: SourceCollection
    normalized_docs: List[NormalizedDocument]
    citations: List[CitationSet]
    metadata: List[DocumentMetadata]
    rules: List[RuleExtraction]
    forms: List[FormMapping]
    search_index: SearchResults
    claims: List[ClaimSet]
    provenance: Provenance


@dataclass
class RankedArguments:
    """Ranked argument list after validation and scoring."""

    arguments: List[Argument]
    scores: Dict[str, OutcomeScore]
    provenance: Provenance


# --- Static knowledge base -------------------------------------------------

STATIC_LIBRARY: List[Dict[str, Any]] = [
    {
        "source_id": "statute:vic:evidence-act-2008",
        "title": "Evidence Act 2008 (Vic)",
        "doc_type": "statute",
        "jurisdiction": "VIC",
        "year": 2008,
        "keywords": {"evidence", "hearsay", "relevance", "admissibility"},
        "relations": ["case:vic:tsing-v-r-2019", "form:vic:mag-form-1"],
        "content": (
            "Section 55 - Relevance\n"
            "(1) Evidence that is relevant in a proceeding is admissible.\n"
            "(2) Evidence that is not relevant in a proceeding is not admissible.\n\n"
            "Section 59 - The hearsay rule\n"
            "(1) Evidence of a previous representation is not admissible to prove the existence of a fact.\n"
            "(2) Subsection (1) does not apply if the evidence is admitted for a non-hearsay purpose.\n"
            "Note: see also Smith v The Queen [2017] HCA 5.\n"
        ),
    },
    {
        "source_id": "regulation:vic:evidence-regs-2020",
        "title": "Evidence Regulations 2020 (Vic)",
        "doc_type": "regulation",
        "jurisdiction": "VIC",
        "year": 2020,
        "keywords": {"regulation", "procedure", "certificate"},
        "relations": ["statute:vic:evidence-act-2008"],
        "content": (
            "Regulation 7 - Certificates\n"
            "A certificate in the prescribed form is prima facie evidence of the matters in it.\n\n"
            "Regulation 12 - Remote appearance\n"
            "(1) A court may permit remote appearance where interests of justice require.\n"
        ),
    },
    {
        "source_id": "case:vic:tsing-v-r-2019",
        "title": "Tsing v The Queen [2019] VSCA 123",
        "doc_type": "case",
        "jurisdiction": "VIC",
        "year": 2019,
        "keywords": {"evidence", "hearsay", "criminal", "appeal"},
        "relations": ["statute:vic:evidence-act-2008"],
        "content": (
            "Issue: Whether the trial judge erred in admitting hearsay evidence.\n\n"
            "Holdings:\n"
            "1. The hearsay rule in s 59 required exclusion absent an exception.\n"
            "2. The statement tendered was relied upon for its truth and no exception applied.\n\n"
            "Ratio: Sections 55 and 59 of the Evidence Act 2008 (Vic) direct exclusion unless relevance is shown.\n"
            "Obiter: The discretion under s 135 may still admit the evidence where probative value outweighs prejudice.\n"
            "Authorities considered: Smith v The Queen [2017] HCA 5.\n"
        ),
    },
    {
        "source_id": "commentary:vic:evidence-guide",
        "title": "Victorian Evidence Handbook",
        "doc_type": "commentary",
        "jurisdiction": "VIC",
        "year": 2022,
        "keywords": {"commentary", "analysis", "practice"},
        "relations": ["statute:vic:evidence-act-2008", "case:vic:tsing-v-r-2019"],
        "content": (
            "Chapter 3 - Hearsay\n"
            "Practitioners should identify purpose, representation, and available exceptions.\n"
            "Key authorities include Tsing v The Queen [2019] VSCA 123 and Smith v The Queen [2017] HCA 5.\n"
        ),
    },
    {
        "source_id": "practice:vic:criminal-procedure-note",
        "title": "County Court Practice Note CR 1-2023",
        "doc_type": "practice_note",
        "jurisdiction": "VIC",
        "year": 2023,
        "keywords": {"practice", "case management", "criminal"},
        "relations": ["form:vic:mag-form-1"],
        "content": (
            "Paragraph 12 - Case management hearings\n"
            "Accused must file a case outline 7 days before the directions hearing.\n\n"
            "Paragraph 18 - Expert reports\n"
            "Disclosure obligations require service 14 days prior to trial.\n"
        ),
    },
    {
        "source_id": "form:vic:mag-form-1",
        "title": "Form 1 - Notice of Appeal (Magistrates' Court)",
        "doc_type": "form",
        "jurisdiction": "VIC",
        "year": 2021,
        "keywords": {"form", "appeal", "notice"},
        "relations": ["practice:vic:criminal-procedure-note"],
        "content": (
            "This form must be lodged within 28 days after the Magistrates' Court decision.\n"
            "It requires details of conviction, sentence, and grounds.\n"
        ),
    },
]


def _tokenize(text: str) -> List[str]:
    return [t for t in re.split(r"[^A-Za-z0-9']+", text.lower()) if t]


def _keyword_score(query_tokens: Sequence[str], keywords: Iterable[str]) -> float:
    matches = sum(1 for t in query_tokens if t in keywords)
    return matches / max(len(query_tokens), 1)


def collect_sources(user_input: str, jurisdiction: str = "VIC") -> SourceCollection:
    """Collect candidate sources by matching keywords against a static corpus."""

    tokens = _tokenize(user_input)
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for entry in STATIC_LIBRARY:
        if jurisdiction and entry["jurisdiction"].upper() != jurisdiction.upper():
            continue
        base = _keyword_score(tokens, entry["keywords"])
        type_boost = {
            "statute": 0.3,
            "regulation": 0.2,
            "case": 0.25,
            "commentary": 0.15,
            "practice_note": 0.1,
            "form": 0.05,
        }.get(entry["doc_type"], 0.0)
        score = base + type_boost
        if "hearsay" in tokens and "hearsay" in entry["keywords"]:
            score += 0.4
        if score > 0:
            scored.append((score, entry))
    scored.sort(key=lambda x: x[0], reverse=True)
    sources = [
        SourceDocument(
            source_id=item["source_id"],
            title=item["title"],
            doc_type=item["doc_type"],
            jurisdiction=item["jurisdiction"],
            year=item.get("year"),
            score=round(score, 3),
            content=item["content"],
            provenance=_prov("ingest", "collect_sources", query=user_input, library=item["source_id"]),
            metadata={"keywords": sorted(item["keywords"]), "relations": item.get("relations", [])},
        )
        for score, item in scored[:5]
    ]
    return SourceCollection(
        query=user_input,
        sources=sources,
        provenance=_prov("ingest", "collect_sources", query=user_input),
    )


def _segment_content(content: str) -> List[Tuple[Optional[str], str]]:
    segments: List[Tuple[Optional[str], str]] = []
    raw_parts = re.split(r"\n{2,}", content.strip())
    for part in raw_parts:
        lines = [ln.strip() for ln in part.splitlines() if ln.strip()]
        if not lines:
            continue
        heading = None
        body_lines = lines
        if len(lines[0].split()) <= 6 and any(ch.isdigit() for ch in lines[0]) or lines[0].endswith(":"):
            heading = lines[0].rstrip(":")
            body_lines = lines[1:]
        segments.append((heading, " ".join(body_lines)))
    return segments


def normalize_docs(collection: SourceCollection) -> List[NormalizedDocument]:
    """Perform OCR/clean/segment using simple heuristics."""

    normalized: List[NormalizedDocument] = []
    for src in collection.sources:
        segments = _segment_content(src.content)
        sections: List[DocumentSection] = []
        cursor = 1
        for idx, (heading, text) in enumerate(segments, start=1):
            tokens = _tokenize(text)
            line_count = max(1, math.ceil(len(tokens) / 12))
            section = DocumentSection(
                section_id=f"{src.source_id}:s{idx}",
                title=heading,
                text=text,
                start_line=cursor,
                end_line=cursor + line_count - 1,
                provenance=_prov("normalize", "segment", source_id=src.source_id, section=idx),
            )
            cursor += line_count
            sections.append(section)
        normalized.append(
            NormalizedDocument(
                source_id=src.source_id,
                language="en",
                sections=sections,
                token_count=sum(len(_tokenize(sec.text)) for sec in sections),
                provenance=_prov("normalize", "normalize_docs", source_id=src.source_id),
                metadata={
                    "doc_type": src.doc_type,
                    "year": src.year,
                    "keywords": src.metadata.get("keywords", []),
                    "relations": src.metadata.get("relations", []),
                },
            )
        )
    return normalized


_CASE_PATTERN = re.compile(r"([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)* v [A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)* \[\d{4}\] [A-Z]{2,5} ?\d+)")
_STATUTE_PATTERN = re.compile(r"([A-Z][A-Za-z ]+ Act \d{4} \(Vic\))")
_PINPOINT_PATTERN = re.compile(r"s\s*\d+[A-Za-z0-9()]*|reg\s*\d+[A-Za-z0-9()]*")


def _canonicalize_citation(raw: str) -> str:
    clean = re.sub(r"\s+", " ", raw.strip())
    clean = clean.replace("The Queen", "R").replace("’", "'")
    return clean.lower().replace(" ", "-")


def parse_citations(doc: NormalizedDocument) -> CitationSet:
    """Detect AGLC citations and pinpoints within a normalized document."""

    citations: List[Citation] = []
    for section in doc.sections:
        for pattern in (_CASE_PATTERN, _STATUTE_PATTERN):
            for match in pattern.findall(section.text):
                pinpoint_match = _PINPOINT_PATTERN.search(section.text)
                citations.append(
                    Citation(
                        raw=match,
                        canonical_id=_canonicalize_citation(match),
                        pinpoint=pinpoint_match.group(0) if pinpoint_match else None,
                        source_id=doc.source_id,
                        section_id=section.section_id,
                        provenance=_prov(
                            "citations",
                            "parse_citations",
                            source_id=doc.source_id,
                            section_id=section.section_id,
                            match=match,
                        ),
                    )
                )
    return CitationSet(source_id=doc.source_id, citations=citations, provenance=_prov("citations", "parse_citations", source_id=doc.source_id))


def meta_tag(doc: NormalizedDocument) -> DocumentMetadata:
    """Assign high-level metadata tags based on heuristics."""

    tags: List[MetaTag] = []
    joined = " ".join(section.text for section in doc.sections).lower()
    if "hearsay" in joined:
        tags.append(MetaTag(key="topic", value="Hearsay", confidence=0.95, provenance=_prov("meta", "topic", source_id=doc.source_id)))
    if "appeal" in joined or doc.metadata.get("doc_type") == "case":
        tags.append(MetaTag(key="procedural_posture", value="Appeal", confidence=0.8, provenance=_prov("meta", "posture", source_id=doc.source_id)))
    if "supreme court" in joined or "vs" in doc.source_id:
        tags.append(MetaTag(key="court_level", value="VSCA", confidence=0.75, provenance=_prov("meta", "court", source_id=doc.source_id)))
    year = doc.metadata.get("year") or doc.metadata.get("metadata", {}).get("year")
    if year:
        tags.append(MetaTag(key="year", value=str(year), confidence=1.0, provenance=_prov("meta", "year", source_id=doc.source_id)))
    return DocumentMetadata(source_id=doc.source_id, tags=tags, provenance=_prov("meta", "meta_tag", source_id=doc.source_id))


def link_graph(collection: SourceCollection, citations: Sequence[CitationSet]) -> LinkGraph:
    """Construct a simple link graph across sources based on known relations and detected citations."""

    id_to_source = {src.source_id: src for src in collection.sources}
    nodes: Dict[str, GraphNode] = {}
    edges: List[GraphEdge] = []

    for src in collection.sources:
        nodes[src.source_id] = GraphNode(
            node_id=src.source_id,
            title=src.title,
            node_type=src.doc_type,
            attributes={"jurisdiction": src.jurisdiction, "year": src.year},
            provenance=_prov("link", "node", source_id=src.source_id),
        )
        for rel in src.metadata.get("relations", []):
            if rel not in nodes and rel in id_to_source:
                rel_src = id_to_source[rel]
                nodes[rel_src.source_id] = GraphNode(
                    node_id=rel_src.source_id,
                    title=rel_src.title,
                    node_type=rel_src.doc_type,
                    attributes={"jurisdiction": rel_src.jurisdiction, "year": rel_src.year},
                    provenance=_prov("link", "node", source_id=rel_src.source_id),
                )
            edges.append(
                GraphEdge(
                    source=src.source_id,
                    target=rel,
                    relation="references",
                    weight=0.8,
                    temporal_validity="current",
                    provenance=_prov("link", "relation", source=src.source_id, target=rel),
                )
            )

    for cset in citations:
        for cit in cset.citations:
            nodes[cit.canonical_id] = GraphNode(
                node_id=cit.canonical_id,
                title=cit.raw,
                node_type="citation",
                attributes={"pinpoint": cit.pinpoint},
                provenance=_prov("link", "citation-node", citation=cit.canonical_id),
            )
            edges.append(
                GraphEdge(
                    source=cset.source_id,
                    target=cit.canonical_id,
                    relation="cites",
                    weight=0.9,
                    temporal_validity="current",
                    provenance=_prov("link", "cites", source=cset.source_id, target=cit.canonical_id),
                )
            )
    return LinkGraph(nodes=list(nodes.values()), edges=edges, provenance=_prov("link", "link_graph"))


def rule_extract(doc: NormalizedDocument) -> RuleExtraction:
    """Extract rule elements/defences/exceptions from document sections."""

    elements: List[RuleElement] = []
    for section in doc.sections:
        sentences = re.split(r"(?<=[.!?])\s+", section.text)
        for idx, sentence in enumerate(sentences, start=1):
            lower = sentence.lower()
            element_type = None
            if "must" in lower or "required" in lower:
                element_type = "element"
            elif "may" in lower or "discretion" in lower:
                element_type = "discretion"
            elif "except" in lower or "unless" in lower:
                element_type = "exception"
            if element_type:
                elements.append(
                    RuleElement(
                        element_id=f"{section.section_id}:e{idx}",
                        text=sentence.strip(),
                        element_type=element_type,
                        support_sections=[section.section_id],
                        provenance=_prov("rules", "rule_extract", source_id=doc.source_id, section=section.section_id),
                    )
                )
    return RuleExtraction(source_id=doc.source_id, elements=elements, provenance=_prov("rules", "rule_extract", source_id=doc.source_id))


FORM_TASKS: Dict[str, Tuple[str, Optional[int]]] = {
    "form:vic:mag-form-1": ("File notice of appeal", 28),
}


def form_mapper(collection: SourceCollection) -> FormMapping:
    """Map prescribed forms to procedural tasks and deadlines."""

    tasks: List[FormTask] = []
    for src in collection.sources:
        if src.source_id in FORM_TASKS:
            title, deadline = FORM_TASKS[src.source_id]
            tasks.append(
                FormTask(
                    form_id=src.source_id,
                    title=src.title,
                    task=title,
                    deadline_days=deadline,
                    provenance=_prov("structure", "form_mapper", form_id=src.source_id),
                )
            )
        for rel in src.metadata.get("relations", []):
            if rel in FORM_TASKS:
                title, deadline = FORM_TASKS[rel]
                tasks.append(
                    FormTask(
                        form_id=rel,
                        title=next((s.title for s in collection.sources if s.source_id == rel), rel),
                        task=title,
                        deadline_days=deadline,
                        provenance=_prov("structure", "form_mapper", form_id=rel),
                    )
                )
    return FormMapping(jurisdiction="VIC", tasks=tasks, provenance=_prov("structure", "form_mapper"))


def _section_snippet(section: DocumentSection, limit: int = 160) -> str:
    text = section.text
    return text if len(text) <= limit else text[: limit - 3] + "..."


def hybrid_search(query: str, docs: Sequence[NormalizedDocument]) -> SearchResults:
    """Perform hybrid keyword+dense (simulated) search over normalized documents."""

    q_tokens = _tokenize(query)
    hits: List[SearchHit] = []
    for doc in docs:
        for section in doc.sections:
            tokens = _tokenize(section.text)
            keyword_overlap = len(set(q_tokens) & set(tokens)) / max(len(q_tokens), 1)
            dense_score = min(1.0, math.sqrt(len(tokens)) / 10)
            score = round(keyword_overlap * 0.6 + dense_score * 0.4, 3)
            if score <= 0:
                continue
            hits.append(
                SearchHit(
                    identifier=section.section_id,
                    title=section.title or doc.source_id,
                    snippet=_section_snippet(section),
                    score=score,
                    source_type=doc.metadata.get("doc_type", "document"),
                    provenance=_prov("retrieval", "hybrid_search", section=section.section_id, score=score),
                )
            )
    hits.sort(key=lambda h: h.score, reverse=True)
    return SearchResults(query=query, hits=hits[:10], provenance=_prov("retrieval", "hybrid_search", query=query))


def precedent_rank(citations: Sequence[CitationSet], jurisdiction: str = "VIC") -> List[Tuple[str, float]]:
    """Rank precedents considering hierarchy, recency, and jurisdictional fit."""

    weights: Dict[str, float] = {}
    for cset in citations:
        for cit in cset.citations:
            base = 0.5
            if "vs" in cit.canonical_id or "v-" in cit.canonical_id:
                base += 0.3
            if jurisdiction.lower() in cit.canonical_id:
                base += 0.2
            if "2019" in cit.canonical_id or "2020" in cit.canonical_id:
                base += 0.1
            weights[cit.canonical_id] = weights.get(cit.canonical_id, 0.0) + base
    ranked = sorted(weights.items(), key=lambda kv: kv[1], reverse=True)
    return ranked


def claim_mine(doc: NormalizedDocument) -> ClaimSet:
    """Extract issues, holdings, ratios, and obiter statements."""

    claims: List[MinedClaim] = []
    issue = next((sec.text for sec in doc.sections if "issue:" in sec.text.lower()), None)
    holding_lines = [sec.text for sec in doc.sections if "holdings" in sec.text.lower()]
    ratio = next((sec.text for sec in doc.sections if "ratio" in sec.text.lower()), None)
    obiter = next((sec.text for sec in doc.sections if "obiter" in sec.text.lower()), None)
    claims.append(
        MinedClaim(
            claim_id=f"{doc.source_id}:claim",
            issue=issue or "Issue not explicitly stated",
            holding=" ".join(holding_lines) if holding_lines else None,
            ratio=ratio,
            obiter=obiter,
            provenance=_prov("arg_mining", "claim_mine", source_id=doc.source_id),
        )
    )
    return ClaimSet(source_id=doc.source_id, claims=claims, provenance=_prov("arg_mining", "claim_mine", source_id=doc.source_id))


def _hash_feature(tokens: Sequence[str], feature: str) -> float:
    return round(sum(ord(ch) for ch in feature) % 97 / 97.0, 3)


def fact_pattern_embed(facts: str) -> FactsEmbedding:
    """Generate a lightweight embedding and symbolic slots for fact patterns."""

    tokens = _tokenize(facts)
    vector = [round(len(tokens) / 50, 3), _hash_feature(tokens, "actors"), _hash_feature(tokens, "events")]
    dates = re.findall(r"\b\d{1,2}/\d{1,2}/\d{4}\b", facts)
    actors = re.findall(r"[A-Z][a-z]+\b", facts)
    offences = [tok for tok in tokens if tok in {"assault", "theft", "fraud", "driving"}]
    symbolic = {
        "actors": list(dict.fromkeys(actors)),
        "dates": dates,
        "offences": offences,
    }
    return FactsEmbedding(vector=vector, symbolic_slots=symbolic, provenance=_prov("arg_mining", "fact_pattern_embed"))


def issue_align(facts_embedding: FactsEmbedding, rule: RuleExtraction) -> IssueAlignment:
    """Align facts to rule elements by simple token overlap heuristics."""

    satisfied: List[str] = []
    contested: List[str] = []
    missing: List[str] = []
    fact_tokens = {tok for tok in facts_embedding.symbolic_slots.get("offences", [])}
    for element in rule.elements:
        elem_tokens = set(_tokenize(element.text))
        if fact_tokens & elem_tokens:
            satisfied.append(element.element_id)
        elif any(term in elem_tokens for term in {"may", "discretion"}):
            contested.append(element.element_id)
        else:
            missing.append(element.element_id)
    return IssueAlignment(satisfied=satisfied, contested=contested, missing=missing, provenance=_prov("alignment", "issue_align"))


AMBIGUITY_SIGNALS = {"may", "might", "reasonable", "likely", "appears", "arguably"}


def ambiguity_score(text: str) -> AmbiguityReport:
    """Compute a simple ambiguity score based on modal verbs and variance."""

    tokens = _tokenize(text)
    if not tokens:
        return AmbiguityReport(score=0.0, signals=[], provenance=_prov("analysis", "ambiguity_score"))
    signal_tokens = [tok for tok in tokens if tok in AMBIGUITY_SIGNALS]
    lexical_variety = len(set(tokens)) / len(tokens)
    score = round(min(1.0, 0.4 * lexical_variety + 0.6 * len(signal_tokens) / len(tokens)), 3)
    return AmbiguityReport(score=score, signals=signal_tokens, provenance=_prov("analysis", "ambiguity_score"))


INTERTEXTUAL_SIGNALS = {"see", "cites", "according", "following", "per"}


def intertextuality_score(text: str, citations: Sequence[str]) -> IntertextualityReport:
    """Estimate intertextuality from textual cues and citation density."""

    tokens = _tokenize(text)
    if not tokens:
        return IntertextualityReport(score=0.0, references=[], provenance=_prov("analysis", "intertextuality_score"))
    signal_hits = [tok for tok in tokens if tok in INTERTEXTUAL_SIGNALS]
    citation_density = min(1.0, len(citations) / 5)
    score = round(min(1.0, 0.5 * citation_density + 0.5 * len(signal_hits) / len(tokens)), 3)
    return IntertextualityReport(score=score, references=citations, provenance=_prov("analysis", "intertextuality_score"))


EVIDENCE_GATES = {
    "relevance": ("Section 55 - Relevance", "Evidence must logically affect assessment of a fact in issue."),
    "hearsay": ("Section 59 - Hearsay", "Previous representations tendered for truth must fit an exception."),
    "opinion": ("Section 76 - Opinion", "Opinions are inadmissible unless by qualified expert."),
    "tendency": ("Section 97 - Tendency", "Requires notice and significant probative value."),
}


def admissibility_check(evidence: str) -> List[AdmissibilityGate]:
    """Screen evidence against Evidence Act gates."""

    lower = evidence.lower()
    results: List[AdmissibilityGate] = []
    for gate, (section, rationale) in EVIDENCE_GATES.items():
        trigger = gate in lower
        passed = not trigger or "exception" in lower or "notice" in lower
        results.append(
            AdmissibilityGate(
                gate=gate,
                passed=passed,
                rationale=rationale,
                provenance=_prov("analysis", "admissibility_check", gate=gate, triggered=trigger),
            )
        )
    return results


CHARTER_FLAGS = {
    "search": "Charter s 13 - Privacy and reputation",
    "expression": "Charter s 15 - Freedom of expression",
    "movement": "Charter s 12 - Freedom of movement",
    "fair": "Charter s 24 - Fair hearing",
}


def rights_screen(step: str) -> RightsScreening:
    """Highlight potential Charter rights implicated by a procedural step."""

    lower = step.lower()
    potentials = [flag for key, flag in CHARTER_FLAGS.items() if key in lower]
    proportionality = []
    for flag in potentials:
        try:
            description = flag.split(" - ", 1)[1]
        except IndexError:
            description = flag
        proportionality.append(f"Assess justification for {description.lower()}.")
    return RightsScreening(
        potential_limits=potentials,
        proportionality_notes=proportionality,
        provenance=_prov("analysis", "rights_screen", step=step),
    )


def IRAC_generate(issue: str, facts: str, authorities: Sequence[str]) -> IRACBlock:
    """Generate an IRAC block drawing upon authorities."""

    rule_statement = "Key authorities emphasise strict application of the hearsay rule."
    application = f"The facts indicate hearsay concerns because {facts[:60]}..."
    conclusion = "On balance the evidence should be excluded." if "hearsay" in facts.lower() else "Evidence likely admissible."
    return IRACBlock(
        issue=issue,
        rule=rule_statement,
        application=application,
        conclusion=conclusion,
        citations=list(authorities),
        provenance=_prov("generation", "IRAC_generate", issue=issue),
    )


def counter_generate(argument: IRACBlock) -> CounterArgument:
    """Generate a counter-position referencing alternative strategies."""

    counter = "Emphasise discretionary factors under s 135 to admit the evidence."
    authorities = ["section-135-discretion", *argument.citations[:1]]
    return CounterArgument(
        thesis=counter,
        authorities=authorities,
        strategy="Argue probative value outweighs prejudice.",
        provenance=_prov("generation", "counter_generate", issue=argument.issue),
    )


PROCEDURE_MAP = {
    "mention": [
        "Confirm instructions",
        "Identify contested issues",
        "Flag evidentiary objections",
    ],
    "hearing": [
        "Prepare witnesses",
        "File case outline",
        "Bundle authorities",
    ],
    "appeal": [
        "File notice of appeal",
        "Order transcript",
        "Draft outline of submissions",
    ],
}


def procedure_generate(stage: str) -> ProcedureChecklist:
    """Produce procedural steps for a litigation stage."""

    stage_key = stage.lower()
    steps = PROCEDURE_MAP.get(stage_key, ["Review file", "Confirm deadlines"])
    references = ["Evidence Act 2008 (Vic)", "County Court Practice Note"]
    return ProcedureChecklist(stage=stage_key, steps=steps, references=references, provenance=_prov("generation", "procedure_generate", stage=stage_key))


def authority_consistency(argument: Argument, graph: LinkGraph) -> ConsistencyReport:
    """Check for contradictions between cited authorities and graph relations."""

    conflicts: List[str] = []
    cited_set = set(argument.authorities)
    for edge in graph.edges:
        if edge.relation == "references" and edge.target in cited_set and edge.source in cited_set:
            conflicts.append(f"Circular reference between {edge.source} and {edge.target}")
    consistent = not conflicts
    return ConsistencyReport(consistent=consistent, conflicts=conflicts, provenance=_prov("validation", "authority_consistency"))


def cite_verifier(argument: Argument, known_citations: Sequence[str]) -> CitationVerification:
    """Ensure all citations exist in the corpus."""

    known_set = set(known_citations)
    missing = [cit for cit in argument.authorities if cit not in known_set]
    invalid = [cit for cit in argument.authorities if cit.startswith("http")]
    valid = not missing and not invalid
    return CitationVerification(valid=valid, missing=missing, invalid=invalid, provenance=_prov("validation", "cite_verifier"))


def outcome_score(argument: Argument, alignment: IssueAlignment, admissibility: Sequence[AdmissibilityGate]) -> OutcomeScore:
    """Combine authority weight, alignment, and admissibility risk."""

    authority_component = min(1.0, len(argument.authorities) / 5)
    alignment_component = len(alignment.satisfied) / max(len(alignment.satisfied) + len(alignment.missing) + len(alignment.contested), 1)
    risk_penalty = sum(0.2 for gate in admissibility if not gate.passed)
    score = round(max(0.0, authority_component * 0.5 + alignment_component * 0.5 - risk_penalty), 3)
    return OutcomeScore(score=score, components={"authority": authority_component, "alignment": alignment_component, "risk_penalty": risk_penalty}, provenance=_prov("validation", "outcome_score"))


def rationale_trace(argument_id: str, graph: LinkGraph) -> RationaleTrace:
    """Construct a rationale trace highlighting supporting nodes."""

    steps: List[RationaleStep] = []
    for idx, edge in enumerate(graph.edges[:3], start=1):
        statement = f"Node {edge.source} supports {edge.target} via {edge.relation}."
        steps.append(
            RationaleStep(
                step_id=f"{argument_id}:r{idx}",
                statement=statement,
                supports=[edge.target],
                provenance=_prov("explain", "rationale_trace", edge=edge.relation),
            )
        )
    return RationaleTrace(argument_id=argument_id, steps=steps, provenance=_prov("explain", "rationale_trace", argument_id=argument_id))


def delta_view(previous: Sequence[str], current: Sequence[str]) -> DeltaView:
    """Highlight changes in authorities between runs."""

    prev_set = set(previous)
    curr_set = set(current)
    added = sorted(curr_set - prev_set)
    removed = sorted(prev_set - curr_set)
    unchanged = sorted(curr_set & prev_set)
    return DeltaView(added=added, removed=removed, unchanged=unchanged, provenance=_prov("explain", "delta_view"))


def critique_accept(user_edits: Mapping[str, Any]) -> UserPreference:
    """Update prompt preferences based on user critique."""

    updated = {f"style_{k}": v for k, v in user_edits.items()}
    return UserPreference(updated_prompts=updated, provenance=_prov("user_loop", "critique_accept"))


def fact_disputes(assumed: Mapping[str, Any], provided: Mapping[str, Any]) -> List[FactDispute]:
    """Detect differences between assumed and provided facts."""

    disputes: List[FactDispute] = []
    for key, assumed_val in assumed.items():
        if key not in provided:
            continue
        if provided[key] != assumed_val:
            disputes.append(
                FactDispute(
                    fact_key=key,
                    assumed=assumed_val,
                    provided=provided[key],
                    provenance=_prov("user_loop", "fact_disputes", key=key),
                )
            )
    return disputes


def bundle_export(arguments: Sequence[Argument], template: str = "ILAC_MagCt") -> ExportBundle:
    """Export arguments into a simple textual bundle."""

    lines = [f"Template: {template}"]
    attachments: List[str] = []
    for arg in arguments:
        lines.append(f"Issue: {arg.irac.issue}")
        lines.append(f"Conclusion: {arg.irac.conclusion}")
        lines.append(f"Authorities: {', '.join(arg.authorities)}")
        lines.append("---")
        attachments.extend(arg.authorities)
    return ExportBundle(template=template, content="\n".join(lines), attachments=sorted(set(attachments)), provenance=_prov("export", "bundle_export", template=template))


def docket_sync(form_mapping: FormMapping) -> DocketSchedule:
    """Generate docket events from form mappings."""

    events = [
        DocketEvent(
            task=task.task,
            deadline_days=task.deadline_days,
            form_id=task.form_id,
            provenance=_prov("workflow", "docket_sync", form_id=task.form_id),
        )
        for task in form_mapping.tasks
    ]
    return DocketSchedule(events=events, provenance=_prov("workflow", "docket_sync"))


def jurisdiction_guard(sources: Sequence[SourceDocument], jurisdiction: str) -> GovernanceCheck:
    """Ensure sources align with the configured jurisdiction."""

    mismatches = [src.source_id for src in sources if src.jurisdiction.upper() != jurisdiction.upper()]
    ok = not mismatches
    notes = [f"Filtered out {src}" for src in mismatches]
    return GovernanceCheck(ok=ok, notes=notes, provenance=_prov("governance", "jurisdiction_guard", jurisdiction=jurisdiction))


PII_PATTERN = re.compile(r"\b\d{2,4}[-\s]?\d{3}[-\s]?\d{3}\b")


def privacy_safe(text: str) -> Tuple[str, GovernanceCheck]:
    """Scrub simple PII (e.g., phone numbers) from text."""

    masked, count = PII_PATTERN.subn("<redacted>", text)
    notes = [f"Redacted {count} potential identifiers."] if count else []
    return masked, GovernanceCheck(ok=count == 0, notes=notes, provenance=_prov("governance", "privacy_safe"))


_AUDIT_LOG: List[AuditRecord] = []


def audit_log(event: str, payload: Mapping[str, Any]) -> AuditRecord:
    """Append an entry to the in-memory audit log."""

    payload_copy = dict(payload)
    fingerprint_source = f"{event}|{json.dumps(payload_copy, sort_keys=True, default=str)}"
    record_id = hashlib.sha256(fingerprint_source.encode()).hexdigest()[:16]
    record = AuditRecord(
        event=event,
        payload=payload_copy,
        provenance=_prov("governance", "audit_log", event=event),
        record_id=record_id,
    )
    _AUDIT_LOG.append(record)
    return record


COURT_PHASE_BIAS = {
    "MCV": 0.55,
    "VCC": 0.58,
    "VSC": 0.6,
    "VSCA": 0.62,
    "HCA": 0.65,
}


def interpretation_qubits(issue: str) -> List[LegalQubit]:
    """Model competing legal interpretations as qubits."""

    issue_lower = issue.lower()
    interpretations = {
        "textual": 0.4,
        "purposive": 0.35,
        "pragmatic": 0.25,
    }
    if "charter" in issue_lower:
        interpretations["purposive"] += 0.15
    if "technical" in issue_lower:
        interpretations["textual"] += 0.1
    total = sum(interpretations.values())
    probs = {f"{issue}- {key}": val / total for key, val in interpretations.items()}
    qubits = [
        LegalQubit(
            amplitude=complex(math.sqrt(p), 0.0),
            phase=math.pi * idx / len(probs),
            metadata={"interpretation": key.split("-", 1)[-1].strip()},
        )
        for idx, (key, p) in enumerate(probs.items())
    ]
    return qubits


def bias_aware_outcome(issue: str, court: str) -> BiasAwareOutcome:
    """Adjust interpretation probabilities based on court bias."""

    qubits = interpretation_qubits(issue)
    bias = COURT_PHASE_BIAS.get(court.upper(), 0.5)
    probability = sum(abs(q.amplitude) ** 2 for q in qubits) * bias
    phase_spread = max(q.phase for q in qubits) - min(q.phase for q in qubits) if qubits else 0.0
    inconsistency = round(min(1.0, phase_spread / math.pi), 3)
    return BiasAwareOutcome(court=court, probability=round(probability, 3), inconsistency=inconsistency, provenance=_prov("quantum", "bias_aware_outcome", court=court))


def analyze_case(facts: str, issues: Sequence[str], stage: str, jurisdiction: str = "VIC") -> AnalysisBundle:
    """Orchestrate ingestion and analysis pipeline, returning aggregated artifacts."""

    query = "; ".join(issues)
    sources = collect_sources(query or facts, jurisdiction)
    governance = jurisdiction_guard(sources.sources, jurisdiction)
    if not governance.ok:
        sources = SourceCollection(query=sources.query, sources=[src for src in sources.sources if src.jurisdiction.upper() == jurisdiction.upper()], provenance=sources.provenance)
    normalized = normalize_docs(sources)
    citations = [parse_citations(doc) for doc in normalized]
    metadata = [meta_tag(doc) for doc in normalized]
    rules = [rule_extract(doc) for doc in normalized]
    forms = [form_mapper(sources)] if sources.sources else []
    search_index = hybrid_search(query or facts, normalized)
    claims = [claim_mine(doc) for doc in normalized if doc.source_id.startswith("case:")]
    provenance = _prov("api", "analyze_case", jurisdiction=jurisdiction, stage=stage)
    return AnalysisBundle(
        jurisdiction=jurisdiction,
        sources=sources,
        normalized_docs=normalized,
        citations=citations,
        metadata=metadata,
        rules=rules,
        forms=forms,
        search_index=search_index,
        claims=claims,
        provenance=provenance,
    )


def _argument_from_bundle(bundle: AnalysisBundle, issue: str, stance: str) -> Argument:
    facts_text = " ".join(sec.text for doc in bundle.normalized_docs for sec in doc.sections[:1])
    authorities = [cit.canonical_id for cset in bundle.citations for cit in cset.citations]
    irac = IRAC_generate(issue, facts_text, authorities[:3])
    counter = counter_generate(irac)
    procedure = procedure_generate(stance)
    risk_notes = []
    if any("hearsay" in sec.text.lower() for doc in bundle.normalized_docs for sec in doc.sections):
        risk_notes.append("Hearsay objections anticipated.")
    return Argument(
        stance=stance,
        irac=irac,
        counters=[counter],
        procedure=procedure,
        authorities=authorities[:5],
        risk_notes=risk_notes,
        provenance=_prov("api", "_argument_from_bundle", stance=stance),
    )


def generate_arguments(bundle: AnalysisBundle, stance: str = "defence") -> List[Argument]:
    """Generate structured arguments from an analysis bundle."""

    if not bundle.normalized_docs:
        return []
    primary_issue = bundle.sources.query if bundle.sources.query else "Undetermined issue"
    return [_argument_from_bundle(bundle, primary_issue, stance)]


def validate_and_score(arguments: Sequence[Argument], bundle: AnalysisBundle) -> RankedArguments:
    """Validate citations and compute scores for each argument."""

    graph = link_graph(bundle.sources, bundle.citations)
    known = [node.node_id for node in graph.nodes]
    scores: Dict[str, OutcomeScore] = {}
    ranked_args: List[Argument] = []
    for arg in arguments:
        alignment = IssueAlignment(satisfied=[], contested=[], missing=[], provenance=_prov("alignment", "noop"))
        if bundle.rules:
            alignment = issue_align(fact_pattern_embed(arg.irac.application), bundle.rules[0])
        admissibility = admissibility_check(arg.irac.application)
        outcome = outcome_score(arg, alignment, admissibility)
        verification = cite_verifier(arg, known)
        consistency = authority_consistency(arg, graph)
        if not verification.valid:
            outcome = OutcomeScore(score=0.0, components={"authority": 0.0, "alignment": 0.0, "risk_penalty": 1.0}, provenance=_prov("validation", "outcome_score", reason="invalid citations"))
        if not consistency.consistent:
            outcome = OutcomeScore(score=max(outcome.score - 0.2, 0.0), components=outcome.components, provenance=_prov("validation", "outcome_score", reason="conflict"))
        scores[arg.stance] = outcome
        ranked_args.append(arg)
    ranked_args.sort(key=lambda a: scores[a.stance].score, reverse=True)
    return RankedArguments(arguments=ranked_args, scores=scores, provenance=_prov("api", "validate_and_score"))


def export(arguments: Sequence[Argument], template: str = "ILAC_MagCt") -> ExportBundle:
    """Export structured arguments to the requested template."""

    return bundle_export(arguments, template)


__all__ = [
    "AnalysisBundle",
    "AmbiguityReport",
    "Argument",
    "AuditRecord",
    "BiasAwareOutcome",
    "Citation",
    "CitationSet",
    "CitationVerification",
    "ClaimSet",
    "ConsistencyReport",
    "CounterArgument",
    "DeltaView",
    "DocumentMetadata",
    "DocumentSection",
    "DocketSchedule",
    "ExportBundle",
    "FactsEmbedding",
    "FactDispute",
    "FormMapping",
    "FormTask",
    "GraphEdge",
    "GraphNode",
    "GovernanceCheck",
    "IRACBlock",
    "IssueAlignment",
    "LinkGraph",
    "MinedClaim",
    "NormalizedDocument",
    "OutcomeScore",
    "Provenance",
    "RankedArguments",
    "RightsScreening",
    "RuleElement",
    "RuleExtraction",
    "SearchHit",
    "SearchResults",
    "SourceCollection",
    "SourceDocument",
    "admissibility_check",
    "analyze_case",
    "ambiguity_score",
    "audit_log",
    "authority_consistency",
    "bias_aware_outcome",
    "bundle_export",
    "cite_verifier",
    "claim_mine",
    "collect_sources",
    "counter_generate",
    "critique_accept",
    "delta_view",
    "docket_sync",
    "export",
    "fact_disputes",
    "fact_pattern_embed",
    "form_mapper",
    "generate_arguments",
    "hybrid_search",
    "interpretation_qubits",
    "intertextuality_score",
    "issue_align",
    "jurisdiction_guard",
    "link_graph",
    "meta_tag",
    "normalize_docs",
    "outcome_score",
    "precedent_rank",
    "privacy_safe",
    "procedure_generate",
    "rationale_trace",
    "rights_screen",
    "rule_extract",
    "validate_and_score",
]

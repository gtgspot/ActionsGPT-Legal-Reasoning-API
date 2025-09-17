from typing import Any, Dict, List, Literal, Optional

from pydantic import AnyUrl, BaseModel, Field


class FileItem(BaseModel):
    filename: str
    media_type: str
    content_base64: str


class DocumentIngestRequest(BaseModel):
    title: str
    jurisdiction_hint: Optional[str] = None  # VIC, NSW, etc.
    matter_type: Optional[str] = None  # e.g., "summary traffic"
    raw_text: Optional[str] = None
    files: Optional[List[FileItem]] = None
    urls: Optional[List[AnyUrl]] = None
    ocr_language_hints: Optional[List[str]] = None
    canonicalize: bool = True


class DocumentIngestResponse(BaseModel):
    doc_id: str
    status: str  # queued | processing | ready


class SourceRef(BaseModel):
    source_id: str
    title: str
    uri: Optional[str] = None
    jurisdiction: Optional[str] = None
    type: Optional[str] = None  # statute, regulation, rule, instrument, form, judgment, ...
    date: Optional[str] = None
    pinpoint: Optional[str] = None
    quote_range: Optional[str] = None
    reliability_score: Optional[float] = 0.9


class FetchRequest(BaseModel):
    urls: List[AnyUrl]
    strip_html: bool = True
    extract_text: bool = True


class SourcesSearchRequest(BaseModel):
    query: str
    domains: Optional[List[str]] = None
    content_types: Optional[List[str]] = None  # e.g., ["judgment", "statute", "other"]
    page: Optional[int] = 1
    per_page: Optional[int] = 20
    include_snippets: bool = True
    jurisdiction_hint: Optional[str] = None


# For request validation without reordering the module, define a local alias
CourtLevelType = Literal[
    "HCA",
    "HCAFC",
    "VSCA",
    "VSC",
    "VCC",
    "MCV",
    "VCAT",
    "FCA",
    "FCAFC",
    "OtherAU",
]


class PrecedentsSearchRequest(BaseModel):
    query: str
    court_level: Optional[CourtLevelType] = None
    filters: Optional[Dict[str, Any]] = None  # backward compatibility
    limit: Optional[int] = 25
    jurisdiction_hint: Optional[str] = None


class ArgumentsBuildRequest(BaseModel):
    doc_id: str
    issues_focus: Optional[List[str]] = None
    objective: Optional[str] = None  # withdrawal_request, SCC, contest_mention, voir_dire, trial


class SalienceScoreRequest(BaseModel):
    doc_id: str
    candidate_items: List[str]
    weighting_profile: Optional[Dict[str, Any]] = None


class ComplianceCheckRequest(BaseModel):
    doc_id: str
    frameworks: List[str]


class DraftDisclosureRequest(BaseModel):
    doc_id: str
    items_requested: List[str]
    jurisdiction: Optional[str] = None


class InputSubmitRequest(BaseModel):
    text: str
    doc_id: Optional[str] = None


class InputSubmitResponse(BaseModel):
    doc_id: str
    accepted_bytes: int


class FeedbackItem(BaseModel):
    prompt: str
    expected: str


# ----- Graph / Map Schemas -----


class MapNode(BaseModel):
    id: str
    title: Optional[str] = None
    node_type: Optional[str] = None
    uri: Optional[str] = None
    created_at: Optional[str] = None


class MapEdge(BaseModel):
    from_: str = Field(alias="from")
    to: str
    relation: str
    pinpoint: Optional[str] = None
    provenance: Optional[Dict[str, Any]] = None
    time: Optional[str] = None

    model_config = {
        "populate_by_name": True,  # allow using key 'from' in payload
        "json_schema_extra": {
            "examples": [{"from": "doc:abc", "to": "evidence-act", "relation": "cites"}]
        },
    }


class MapGraphResponse(BaseModel):
    nodes: List[MapNode]
    edges: List[MapEdge]


# ----- Webhooks -----


class WebhookIngestEvent(BaseModel):
    # Accepts arbitrary structure from external systems
    model_config = {"extra": "allow"}


class WebhookAckResponse(BaseModel):
    ok: bool
    ts: str
    received: Dict[str, Any]


# ----- Precedent / Case Law -----

CourtLevel = Literal[
    "HCA",
    "HCAFC",
    "VSCA",
    "VSC",
    "VCC",
    "MCV",
    "VCAT",
    "FCA",
    "FCAFC",
    "OtherAU",
]

Treatment = Literal[
    "followed",
    "applied",
    "considered",
    "distinguished",
    "not followed",
    "overruled",
]


class TreatmentCount(BaseModel):
    treatment: Treatment
    count: int


class CaseMeta(BaseModel):
    neutral_citation: Optional[str] = None
    parallel_citations: Optional[List[str]] = None
    court_level: Optional[CourtLevel] = None
    panel: Optional[List[str]] = None
    year: Optional[int] = None
    disposition: Optional[str] = None
    ratio_excerpt: Optional[str] = None
    obiter_excerpt: Optional[str] = None
    subsequent_treatments: Optional[List[TreatmentCount]] = None
    binding_on_vic: Optional[bool] = None
    persuasive_strength: Optional[Literal["high", "medium", "low"]] = None
    precedential_weight: Optional[float] = None


class ExtractStructureRequest(BaseModel):
    doc_id: str
    focus: Optional[List[str]] = None  # charges, elements, issues, defences, certificates, all


class CitationTarget(BaseModel):
    kind: Optional[str] = None  # statute, regulation, case, rule, instrument
    identifier: Optional[str] = None
    pinpoint: Optional[str] = None
    uri_hint: Optional[str] = None


class CitationRequest(BaseModel):
    style: Optional[str] = "AGLC4"
    targets: List[CitationTarget]


class QARequest(BaseModel):
    doc_id: str
    question: str
    jurisdiction_hint: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # user | assistant | system
    content: str


class ChatRequest(BaseModel):
    doc_id: str
    messages: List[ChatMessage]
    jurisdiction_hint: Optional[str] = None


# ----- Registries -----


class RegistrySearchRequest(BaseModel):
    language: str  # python | node | java | go | rust | ruby | php | dotnet
    name: str  # package/module/crate name (use vendor/name for composer)
    group: Optional[str] = None  # for Maven (groupId)
    artifact: Optional[str] = None  # for Maven (artifactId)
    include_fetch: bool = False  # if true, try to fetch JSON/info where available


class RegistrySearchResponse(BaseModel):
    registry_id: str
    web_url: Optional[str] = None
    api_url: Optional[str] = None
    fetched: Optional[Dict[str, Any]] = None

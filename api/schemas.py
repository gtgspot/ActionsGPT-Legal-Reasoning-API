from typing import Any, Dict, List, Optional
from pydantic import BaseModel, AnyUrl


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


class PrecedentsSearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    limit: Optional[int] = 25


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

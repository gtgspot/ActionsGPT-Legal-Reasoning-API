from typing import Any, List, Optional
from pydantic import BaseModel, AnyUrl


class FileItem(BaseModel):
    filename: str
    media_type: str
    content_base64: str


class DocumentIngestRequest(BaseModel):
    title: str
    jurisdiction_hint: Optional[str] = None
    matter_type: Optional[str] = None
    raw_text: Optional[str] = None
    files: Optional[List[FileItem]] = None
    urls: Optional[List[AnyUrl]] = None
    ocr_language_hints: Optional[List[str]] = None
    canonicalize: bool = True


class DocumentIngestResponse(BaseModel):
    doc_id: str
    status: str


class SourceRef(BaseModel):
    source_id: str
    title: str
    uri: Optional[str] = None
    jurisdiction: Optional[str] = None
    type: Optional[str] = None
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
    limit: Optional[int] = 25


class ArgumentsBuildRequest(BaseModel):
    doc_id: str


class SalienceScoreRequest(BaseModel):
    doc_id: str
    candidate_items: List[str]


class ComplianceCheckRequest(BaseModel):
    doc_id: str
    frameworks: List[str]


class DraftDisclosureRequest(BaseModel):
    doc_id: str
    items_requested: List[str]

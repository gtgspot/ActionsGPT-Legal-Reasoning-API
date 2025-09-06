import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, status, Query, Depends

from ..config import CANON
from ..integrations.http import fetch_url
from ..schemas import DocumentIngestRequest, DocumentIngestResponse
from ..state import DOCS
from ..utils import digest_text, now_iso
from ..security import api_key_guard


router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/documents/ingest", response_model=DocumentIngestResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest(req: DocumentIngestRequest, authorization: Optional[str] = Header(default=None)):
    doc_id = str(uuid.uuid4())
    text_chunks: List[str] = []
    if req.raw_text:
        text_chunks.append(req.raw_text)
    if req.urls:
        for u in req.urls:
            item = await fetch_url(str(u), authorization)
            text_chunks.append(item["content_text"])
    DOCS[doc_id] = {
        "status": "ready",
        "text_chunks": text_chunks,
        "meta": req.model_dump(),
        "created_at": now_iso(),
        "digest": digest_text(text_chunks),
    }
    return DocumentIngestResponse(doc_id=doc_id, status="ready")


@router.get("/documents/{doc_id}/status", response_model=DocumentIngestResponse)
def get_status(doc_id: str):
    if doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    return DocumentIngestResponse(doc_id=doc_id, status=DOCS[doc_id]["status"])


@router.post("/input/submit")
def submit_text(payload: Dict[str, Any]):
    text = payload.get("text")
    if not text or not isinstance(text, str):
        raise HTTPException(400, "text is required")
    doc_id = payload.get("doc_id") or str(uuid.uuid4())
    rec = DOCS.get(doc_id) or {"status": "ready", "text_chunks": [], "meta": {}, "created_at": now_iso()}
    rec["text_chunks"].append(text)
    rec["digest"] = digest_text(rec["text_chunks"])
    DOCS[doc_id] = rec
    return {"doc_id": doc_id, "accepted_bytes": len(text.encode("utf-8"))}


@router.get("/documents/recent")
def recent_documents(limit: int = Query(default=20, ge=1, le=100)):
    items = []
    # DOCS is a dict; sort by created_at desc where available
    def key(d):
        return d.get("created_at") or ""

    for doc_id, rec in sorted(DOCS.items(), key=lambda kv: key(kv[1]), reverse=True)[:limit]:
        items.append(
            {
                "doc_id": doc_id,
                "title": rec.get("meta", {}).get("title") or f"Document {doc_id[:8]}",
                "created_at": rec.get("created_at"),
                "status": rec.get("status"),
            }
        )
    return {"items": items}

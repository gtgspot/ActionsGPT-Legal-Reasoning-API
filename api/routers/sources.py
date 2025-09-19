from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from ..integrations.http import fetch_url, get_async_client
from ..schemas import FetchRequest, SourcesSearchRequest
from ..security import api_key_guard
from ..services.sources import search_sources_service

router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/sources/search")
async def search_sources(body: SourcesSearchRequest):
    q = (body.query or "").strip()
    if not q:
        raise HTTPException(400, "query is required")
    domains: Optional[List[str]] = body.domains
    if domains:
        domains = [d.strip().lower() for d in domains if d]

    results = await search_sources_service(
        q,
        domains=domains,
        content_types=body.content_types,
        include_snippets=body.include_snippets,
        jurisdiction_hint=body.jurisdiction_hint,
    )
    # client-side pagination
    page = max(1, body.page or 1)
    per_page = max(1, min(50, body.per_page or 20))
    start = (page - 1) * per_page
    end = start + per_page
    return {"results": results[start:end], "total": len(results), "page": page, "per_page": per_page}


@router.post("/sources/fetch")
async def fetch_sources(req: FetchRequest, authorization: Optional[str] = Header(default=None)):
    items = []
    for u in req.urls:
        item = await fetch_url(str(u), authorization)
        if not req.strip_html and item["detected_type"] == "html":
            headers = {}
            if authorization:
                headers["Authorization"] = authorization
            async with get_async_client(headers or None) as c:
                r = await c.get(str(u))
                r.raise_for_status()
                item["content_text"] = r.text[:200000]
        items.append(item)
    return {"items": items}

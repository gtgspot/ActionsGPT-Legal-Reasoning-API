import hashlib
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus, urlparse

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Header, HTTPException

from ..config import ALLOWED_DOMAINS, USER_AGENT
from ..integrations.http import fetch_url
from ..schemas import FetchRequest, SourcesSearchRequest
from ..utils import now_iso


router = APIRouter()


@router.post("/sources/search")
async def search_sources(body: SourcesSearchRequest):
    q = (body.query or "").strip()
    if not q:
        raise HTTPException(400, "query is required")
    domains: Optional[List[str]] = body.domains
    if domains:
        domains = [d.strip().lower() for d in domains if d]
    results: List[Dict[str, Any]] = []

    headers = {"User-Agent": USER_AGENT}

    # 1) AustLII search (works without keys)
    try:
        austlii_url = f"https://www8.austlii.edu.au/cgi-bin/sinosrch.cgi?query={quote_plus(q)}&results=20"
        async with httpx.AsyncClient(follow_redirects=True, timeout=30, headers=headers) as c:
            r = await c.get(austlii_url)
            if r.status_code == 200 and ("austlii" in r.text.lower()):
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.select("a"):
                    href = a.get("href") or ""
                    title = a.text.strip()
                    if href.startswith("/cgi-bin") or not href.startswith("http"):
                        continue
                    if "austlii.edu.au" not in urlparse(href).netloc:
                        continue
                    if domains and "www8.austlii.edu.au" not in domains:
                        continue
                    results.append({
                        "source_id": hashlib.md5(href.encode()).hexdigest()[:12],
                        "title": title or "AustLII result",
                        "uri": href,
                        "type": "judgment" if "/cases/" in href else "statute" if "/legis/" in href else "other",
                        "snippet": "",
                        "score": 0.9,
                    })
    except Exception:
        pass

    # 2) DuckDuckGo HTML fallback for each domain (no API key, but best-effort)
    search_domains = domains or [d for d in ALLOWED_DOMAINS if "." in d]
    async with httpx.AsyncClient(follow_redirects=True, timeout=30, headers=headers) as c:
        for dom in search_domains:
            try:
                ddg = f"https://duckduckgo.com/html/?q={quote_plus('site:' + dom + ' ' + q)}"
                r = await c.get(ddg)
                if r.status_code != 200:
                    continue
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.select("a.result__a"):
                    href = a.get("href")
                    title = a.text.strip()
                    if not href:
                        continue
                    results.append({
                        "source_id": hashlib.md5(href.encode()).hexdigest()[:12],
                        "title": title or f"Result on {dom}",
                        "uri": href,
                        "type": "other",
                        "snippet": "",
                        "score": 0.6,
                    })
            except Exception:
                continue

    # De-duplicate by URI
    seen = set()
    deduped = []
    for r in results:
        if r["uri"] in seen:
            continue
        seen.add(r["uri"])
        deduped.append(r)
    return {"results": deduped[: (body.limit or 20)]}


@router.post("/sources/fetch")
async def fetch_sources(req: FetchRequest, authorization: Optional[str] = Header(default=None)):
    items = []
    for u in req.urls:
        item = await fetch_url(str(u), authorization)
        if not req.strip_html and item["detected_type"] == "html":
            async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as c:
                r = await c.get(str(u))
                r.raise_for_status()
                item["content_text"] = r.text[:200000]
        items.append(item)
    return {"items": items}


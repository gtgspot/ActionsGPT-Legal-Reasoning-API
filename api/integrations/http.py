from typing import Any, Dict, Optional

import httpx

from ..config import MAX_TEXT_CHARS, USER_AGENT
from ..utils import domain_allowed, html_to_text, now_iso
from fastapi import HTTPException


def default_headers(auth_header: Optional[str] = None) -> Dict[str, str]:
    headers = {"User-Agent": USER_AGENT}
    if auth_header:
        headers["Authorization"] = auth_header
    return headers


async def fetch_url(url: str, auth_header: Optional[str]) -> Dict[str, Any]:
    if not domain_allowed(url):
        raise HTTPException(400, f"Domain not in allowlist: {url}")
    headers = default_headers(auth_header)
    async with httpx.AsyncClient(timeout=40, follow_redirects=True, headers=headers) as c:
        r = await c.get(url)
        if r.status_code == 401:
            raise HTTPException(401, "Upstream requires authentication")
        r.raise_for_status()
        ctype = r.headers.get("content-type", "")
        body_text = r.text
        detected = (
            "html"
            if "html" in ctype
            else ("json" if "json" in ctype else ("pdf" if "pdf" in ctype else "text"))
        )
        content_text = html_to_text(body_text) if "html" in detected else body_text
        return {
            "uri": url,
            "content_text": (content_text or "")[:MAX_TEXT_CHARS],
            "detected_type": detected,
            "captured_at": now_iso(),
        }

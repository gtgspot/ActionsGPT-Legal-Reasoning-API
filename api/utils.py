import datetime
import hashlib
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

try:
    from bs4 import BeautifulSoup  # type: ignore
except Exception:  # pragma: no cover - optional dep
    BeautifulSoup = None  # type: ignore

from .config import ALLOWED_DOMAINS, CANON
try:
    from .schemas import SourceRef  # type: ignore
except Exception:  # pragma: no cover - optional dep fallback
    from dataclasses import dataclass

    @dataclass
    class SourceRef:  # type: ignore
        source_id: str
        title: str
        uri: Optional[str] = None
        jurisdiction: Optional[str] = None
        type: Optional[str] = None
        date: Optional[str] = None
        pinpoint: Optional[str] = None
        quote_range: Optional[str] = None
        reliability_score: float = 0.9

        def model_dump(self):
            return self.__dict__


def now_iso() -> str:
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def domain_allowed(url: str) -> bool:
    netloc = urlparse(url).netloc.lower()
    return netloc in ALLOWED_DOMAINS


def html_to_text(html: str) -> str:
    if BeautifulSoup is None:
        # Fallback: naive strip of tags when bs4 is unavailable.
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", "\n", text).strip()
        return re.sub(r"\n{3,}", "\n\n", text)
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    return re.sub(r"\n{3,}", "\n\n", text)


def digest_text(parts: List[str]) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8", "ignore"))
    return "sha256-" + h.hexdigest()


def guess_citations(text: str) -> List[SourceRef]:
    refs: List[SourceRef] = []
    for title, uri in CANON.items():
        if title.lower().split(" (vic)")[0] in text.lower():
            sid = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
            refs.append(SourceRef(source_id=sid, title=title, uri=uri, type="statute" if "Act" in title else "rule"))
    pinpoints = re.findall(r"(s\s?\d+[A-Za-z0-9()/. -]*|r\s?\d+[A-Za-z0-9()/. -]*|cl\s?\d+[A-Za-z0-9()/. -]*|\[\d+\])", text)
    if refs and pinpoints:
        r0 = refs[0]
        r0.pinpoint = pinpoints[0].strip()
        refs[0] = r0
    return refs

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


ABBREV = {
    # Common Victorian abbreviations → canonical title keys
    "rsa 1986": "Road Safety Act 1986 (Vic)",
    "evidence act 2008": "Evidence Act 2008 (Vic)",
    "cpa 2009": "Criminal Procedure Act 2009 (Vic)",
    "mccr 2019": "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)",
}


NEUTRAL_CITE_RE = re.compile(
    r"\[(?P<year>\d{4})\]\s+(?P<court>HCA|HCAFC|VSCA|VSC|VSCt|FCA|FCAFC|NSWCA|NSWSC|WASC|SASC|QCA|QSC|TASSC|ACTCA|ACTSC)\s+(?P<number>\d+)",
    re.IGNORECASE,
)


NEUTRAL_COURT_MAP = {
    # code: (jurisdiction path code, court folder)
    "HCA": ("cth", "HCA"),
    "HCAFC": ("cth", "HCAFC"),
    "FCA": ("cth", "FCA"),
    "FCAFC": ("cth", "FCAFC"),
    "VSCA": ("vic", "VSCA"),
    "VSC": ("vic", "VSC"),
    "NSWCA": ("nsw", "NSWCA"),
    "NSWSC": ("nsw", "NSWSC"),
    "QCA": ("qld", "QCA"),
    "QSC": ("qld", "QSC"),
    "WASC": ("wa", "WASC"),
    "SASC": ("sa", "SASC"),
    "TASSC": ("tas", "TASSC"),
    "ACTCA": ("act", "ACTCA"),
    "ACTSC": ("act", "ACTSC"),
}


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def guess_citations(text: str) -> List[SourceRef]:
    refs: List[SourceRef] = []
    low = text.lower()
    # Statutes/Rules from CANON by full/partial match or abbreviation
    for title, uri in CANON.items():
        key = title.lower().split(" (vic)")[0]
        if key in low:
            sid = _slug(title)
            refs.append(
                SourceRef(
                    source_id=sid,
                    title=title,
                    uri=uri,
                    type="statute" if "act" in title.lower() else "rule",
                )
            )
    for abbr, full in ABBREV.items():
        if abbr in low and full in CANON:
            title = full
            uri = CANON[full]
            sid = _slug(title)
            if not any(r.source_id == sid for r in refs):
                refs.append(SourceRef(source_id=sid, title=title, uri=uri, type="statute"))
    # Pinpoints for statute-like references
    pinpoints = re.findall(
        r"(s\s?\d+[A-Za-z0-9()/. -]*|r\s?\d+[A-Za-z0-9()/. -]*|cl\s?\d+[A-Za-z0-9()/. -]*|\[\d+\])",
        text,
    )
    if refs and pinpoints:
        r0 = refs[0]
        r0.pinpoint = pinpoints[0].strip()
        refs[0] = r0
    # Neutral case citations → judgments
    for m in NEUTRAL_CITE_RE.finditer(text):
        court = m.group("court").upper()
        year = m.group("year")
        num = m.group("number")
        ident = f"[{year}] {court} {num}"
        sid = _slug(ident)
        uri: Optional[str] = None
        if court in NEUTRAL_COURT_MAP:
            jur, folder = NEUTRAL_COURT_MAP[court]
            uri = f"https://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/{jur}/{folder}/{year}/{num}.html"
        refs.append(SourceRef(source_id=sid, title=ident, type="judgment", uri=uri))
    return refs

import re
import uuid
import json
import hashlib
import datetime
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse, quote_plus

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, AnyUrl

# ---------- Configuration ----------
ALLOWED_DOMAINS = {
    "legislation.vic.gov.au",
    "www.legislation.vic.gov.au",
    "www8.austlii.edu.au",
    "judicialcollege.vic.edu.au",
    "mcv.vic.gov.au",
    "legislation.gov.au",
    "www.legislation.gov.au",
    "b2find.eudat.eu",
    "researchdata.edu.au",
    "huggingface.co",
    "github.com",
}
USER_AGENT = "ActionsGPT-Legal/1.0 (+https://example.org)"

# Known statute → canonical URI (extend as needed)
CANON = {
    "Road Safety Act 1986 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/road-safety-act-1986",
    "Evidence Act 2008 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/evidence-act-2008",
    "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)": "https://www.legislation.vic.gov.au/in-force/statutory-rules/magistrates-court-criminal-procedure-rules-2019",
    "Road Safety (General) Regulations 2019 (Vic)": "https://www.legislation.vic.gov.au/in-force/statutory-rules/road-safety-general-regulations-2019",
    "Magistrates’ Court Act 1989 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/magistrates-court-act-1989",
    "Sentencing Act 1991 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/sentencing-act-1991",
    "Charter of Human Rights and Responsibilities Act 2006 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/charter-human-rights-and-responsibilities-act-2006",
    "Infringements Act 2006 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/infringements-act-2006",
    "Interpretation of Legislation Act 1984 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/interpretation-legislation-act-1984",
    "Public Administration Act 2004 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/public-administration-act-2004",
    "Victoria Police Act 2013 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/victoria-police-act-2013",
    "Freedom of Information Act 1982 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/freedom-information-act-1982",
    "Drugs, Poisons and Controlled Substances Act 1981 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/drugs-poisons-and-controlled-substances-act-1981",
    "Privacy and Data Protection Act 2014 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/privacy-and-data-protection-act-2014",
    "Surveillance Devices Act 1999 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/surveillance-devices-act-1999",
    "Subordinate Legislation Act 1994 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/subordinate-legislation-act-1994",
    "Occupational Health and Safety Act 2004 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/occupational-health-and-safety-act-2004",
    "Equal Opportunity Act 2010 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/equal-opportunity-act-2010",
    "Australian Constitution": "https://www.legislation.gov.au/constitution",
    "Judicial College of Victoria — Criminal Charge Book": "https://judicialcollege.vic.edu.au/eManuals/CCB/64177.htm",
    "MCV Prescribed Forms": "https://www.mcv.vic.gov.au/form-finder",
    # Frequently cited but not in the earlier list
    "Criminal Procedure Act 2009 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/criminal-procedure-act-2009"
}

# ---------- FastAPI setup ----------
app = FastAPI(
    title="ActionsGPT — Legal Reasoning API",
    version="1.0.0",
    description="Key-less, autonomous retrieval and preprocessing for Victorian/Australian legal materials."
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------- In-memory store ----------
DOCS: Dict[str, Dict[str, Any]] = {}  # doc_id -> {status, text_chunks: List[str], meta: dict}

# ---------- Models ----------
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

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def domain_allowed(url: str) -> bool:
    netloc = urlparse(url).netloc.lower()
    return netloc in ALLOWED_DOMAINS

def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    return re.sub(r"\n{3,}", "\n\n", text)

async def fetch_url(url: str, auth_header: Optional[str]) -> Dict[str, Any]:
    if not domain_allowed(url):
        raise HTTPException(400, f"Domain not in allowlist: {url}")
    headers = {"User-Agent": USER_AGENT}
    if auth_header:
        headers["Authorization"] = auth_header
    async with httpx.AsyncClient(timeout=40, follow_redirects=True, headers=headers) as c:
        r = await c.get(url)
        if r.status_code == 401:
            raise HTTPException(401, "Upstream requires authentication")
        r.raise_for_status()
        ctype = r.headers.get("content-type", "")
        body = r.text
        detected = "html" if "html" in ctype else ("json" if "json" in ctype else ("pdf" if "pdf" in ctype else "text"))
        content_text = html_to_text(body) if "html" in detected else (body if isinstance(body, str) else str(body))
        return {
            "uri": url,
            "content_text": content_text[:200000],
            "detected_type": detected,
            "captured_at": now_iso(),
        }

def digest_text(parts: List[str]) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8", "ignore"))
    return "sha256-" + h.hexdigest()

def guess_citations(text: str) -> List[SourceRef]:
    """Very light regex-based discoverer for common Vic references -> canonical URIs."""
    refs: List[SourceRef] = []
    for title, uri in CANON.items():
        if title.lower().split(" (vic)")[0] in text.lower():
            sid = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
            refs.append(SourceRef(source_id=sid, title=title, uri=uri, type="statute" if "Act" in title else "rule"))
    # pinpoints like s 49(1)(b), r 6.02, [129]
    pinpoints = re.findall(r"(s\s?\d+[A-Za-z0-9()/. -]*|r\s?\d+[A-Za-z0-9()/. -]*|cl\s?\d+[A-Za-z0-9()/. -]*|\[\d+\])", text)
    if refs and pinpoints:
        # attach the first pinpoint to the first ref as a hint; callers still compute precise pinpoints later
        r0 = refs[0]
        r0.pinpoint = pinpoints[0].strip()
        refs[0] = r0
    return refs

# ---------- Endpoints ----------
@app.get("/health")
def health():
    return {
        "ok": True,
        "ts": now_iso(),
        "allowlist": sorted(list(ALLOWED_DOMAINS)),
        "sources_known": len(CANON),
    }

@app.post("/documents/ingest", response_model=DocumentIngestResponse)
async def ingest(req: DocumentIngestRequest, authorization: Optional[str] = Header(default=None)):
    doc_id = str(uuid.uuid4())
    text_chunks: List[str] = []
    if req.raw_text:
        text_chunks.append(req.raw_text)
    if req.urls:
        for u in req.urls:
            item = await fetch_url(str(u), authorization)
            text_chunks.append(item["content_text"])
    # files (base64) omitted for brevity; add OCR in a later iteration if needed
    DOCS[doc_id] = {
        "status": "ready",
        "text_chunks": text_chunks,
        "meta": req.model_dump(),
        "created_at": now_iso(),
        "digest": digest_text(text_chunks),
    }
    return DocumentIngestResponse(doc_id=doc_id, status="ready")

@app.get("/documents/{doc_id}/status", response_model=DocumentIngestResponse)
def get_status(doc_id: str):
    if doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    return DocumentIngestResponse(doc_id=doc_id, status=DOCS[doc_id]["status"])

@app.post("/input/submit")
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

# ---- Retrieval: SEARCH ----
@app.post("/sources/search")
async def search_sources(body: Dict[str, Any]):
    """
    Minimal, no-key meta-search:
      1) AustLII (first-party HTML results)
      2) DuckDuckGo HTML fallback with site:domain filters (no API key)
    """
    q = (body.get("query") or "").strip()
    if not q:
        raise HTTPException(400, "query is required")
    domains: Optional[List[str]] = body.get("domains")
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
                        "score": 0.9
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
                        "score": 0.6
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
    return {"results": deduped[: (body.get("limit") or 20)]}

# ---- Retrieval: FETCH ----
class FetchRequest(BaseModel):
    urls: List[AnyUrl]
    strip_html: bool = True
    extract_text: bool = True

@app.post("/sources/fetch")
async def fetch_sources(req: FetchRequest, authorization: Optional[str] = Header(default=None)):
    items = []
    for u in req.urls:
        item = await fetch_url(str(u), authorization)
        if not req.strip_html and item["detected_type"] == "html":
            # If caller wants raw HTML, refetch quickly and return body (still without binary)
            async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as c:
                r = await c.get(str(u))
                r.raise_for_status()
                item["content_text"] = r.text[:200000]
        items.append(item)
    return {"items": items}

# ---- Analytics (minimal, functional stubs) ----
@app.post("/extract/structure")
def extract_structure(payload: Dict[str, Any]):
    doc_id = payload.get("doc_id")
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    # naive element/charge extraction
    charges = []
    if re.search(r"\b(s\s?49(?:\([^)]+\))?)\b", text, re.I):
        charges.append({
            "label": "Drink/Drug Driving",
            "provision": "Road Safety Act 1986 (Vic) s 49",
            "elements": ["drive/attempt to drive", "presence of alcohol/drug above limit"],
            "max_penalty": "As prescribed by Sentencing Act 1991 (Vic)"
        })
    citations = [c.model_dump() for c in guess_citations(text)]
    issues = []
    if "certificate" in text.lower():
        issues.append("Admissibility of evidentiary certificate (s 84–84B RSA; s 138 Evidence Act)")
    return {
        "parties": [],
        "charges": charges,
        "issues_in_fact": issues,
        "asserted_defences": [],
        "certificates": [],
        "citations": citations
    }

@app.post("/map/legislation")
def map_legislation(payload: Dict[str, Any]):
    doc_id = payload.get("doc_id")
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    nodes = []
    edges = []
    # seed common chain: Regs -> Act
    n_act = {"id": "rsa1986", "title": "Road Safety Act 1986 (Vic)", "node_type": "Act", "uri": CANON["Road Safety Act 1986 (Vic)"], "provision": "s 49", "citation_aglc4": "Road Safety Act 1986 (Vic)"}
    n_regs = {"id": "rsgr2019", "title": "Road Safety (General) Regulations 2019 (Vic)", "node_type": "Regulation", "uri": CANON["Road Safety (General) Regulations 2019 (Vic)"]}
    nodes.extend([n_act, n_regs])
    edges.append({"from": "rsgr2019", "to": "rsa1986", "relation": "implements"})
    # MCCR 2019 -> CPA 2009 (procedural)
    n_rules = {"id": "mccr2019", "title": "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)", "node_type": "Rule", "uri": CANON["Magistrates’ Court Criminal Procedure Rules 2019 (Vic)"]}
    n_cpa = {"id": "cpa2009", "title": "Criminal Procedure Act 2009 (Vic)", "node_type": "Act", "uri": CANON["Criminal Procedure Act 2009 (Vic)"]}
    nodes.extend([n_rules, n_cpa])
    edges.append({"from": "mccr2019", "to": "cpa2009", "relation": "interprets"})
    return {"nodes": nodes, "edges": edges}

@app.post("/cite/aglc4")
def cite_aglc4(payload: Dict[str, Any]):
    targets = (payload or {}).get("targets") or []
    out = []
    for t in targets:
        ident = t.get("identifier") or ""
        pinpoint = t.get("pinpoint")
        uri = CANON.get(ident)
        title = ident or "Unknown"
        aglc = title + (f" {pinpoint}" if pinpoint else "")
        out.append({
            "source_id": hashlib.md5((title + (pinpoint or "")).encode()).hexdigest()[:12],
            "title": title,
            "uri": uri,
            "pinpoint": pinpoint,
            "reliability_score": 0.9,
            "quote_range": None,
        })
    return {"citations": out}

@app.post("/precedents/search")
async def precedents_search(payload: Dict[str, Any]):
    q = (payload or {}).get("query") or ""
    if not q:
        raise HTTPException(400, "query is required")
    # Use AustLII case search as best-effort
    try:
        url = f"https://www8.austlii.edu.au/cgi-bin/sinosrch.cgi?query={quote_plus(q)}&mask_path=au/cases/vic&results=20"
        async with httpx.AsyncClient(follow_redirects=True, timeout=30, headers={"User-Agent": USER_AGENT}) as c:
            r = await c.get(url)
        soup = BeautifulSoup(r.text, "html.parser")
        results = []
        for a in soup.select("a"):
            href = a.get("href") or ""
            title = a.text.strip()
            if not href.startswith("http") or "austlii.edu.au" not in href:
                continue
            results.append({
                "source_id": hashlib.md5(href.encode()).hexdigest()[:12],
                "title": title,
                "uri": href,
                "type": "judgment",
                "ratio": "",
                "obiter": "",
                "treatment": "considered",
                "confidence": 0.6
            })
        return {"results": results[: (payload.get("limit") or 25)]}
    except Exception:
        return {"results": []}

@app.post("/arguments/build")
def arguments_build(payload: Dict[str, Any]):
    doc_id = payload.get("doc_id")
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    # Minimal illustrative atom
    atom = {
        "issue": "Admissibility of evidentiary certificate",
        "rule": "Evidence Act 2008 (Vic) s 138 (exclusion of improperly obtained evidence).",
        "application": "Certificate appears non-compliant with prescribed procedure; probative value outweighed by unfair prejudice.",
        "conclusion": "Seek exclusion; absent certificate, prosecution cannot prove essential element.",
        "admissibility": {"risk": "low", "grounds": ["s 138 Evidence Act (Vic)", "unfairness"]},
        "supporting_citations": [{
            "source_id": "evidence2008",
            "title": "Evidence Act 2008 (Vic)",
            "uri": CANON["Evidence Act 2008 (Vic)"],
            "pinpoint": "s 138",
            "reliability_score": 0.95
        }]
    }
    return {"atoms": [atom]}

@app.post("/salience/score")
def salience_score(payload: Dict[str, Any]):
    doc_id = payload.get("doc_id")
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    items = payload.get("candidate_items") or []
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    scores = []
    for it in items:
        base = 0.5
        # small heuristic: boost if item terms appear in text
        hits = sum([text.lower().count(w.lower()) for w in re.findall(r"[A-Za-z0-9]+", it)])
        score = max(0.0, min(1.0, base + 0.05 * hits))
        scores.append({
            "label": it,
            "score": score,
            "explanation": f"Heuristic boost from {hits} term match(es) in the material.",
            "drivers": ["text-match", "issue centrality"],
            "counterfactors": ["limited corroboration"]
        })
    return {"salience": scores}

@app.post("/compliance/check")
def compliance_check(payload: Dict[str, Any]):
    doc_id = payload.get("doc_id")
    frameworks = payload.get("frameworks") or []
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    issues = []

    if "MCCR_2019_VIC" in frameworks and "form 11a" not in text.lower():
        issues.append({
            "framework": "MCCR_2019_VIC",
            "requirement": "Use and proper service of prescribed forms (e.g., Form 11A).",
            "non_compliance": "No reference to Form 11A detected in materials.",
            "severity": "material",
            "remedy": "Seek adjournment or strike out; require proper service.",
            "citations": [{
                "source_id": "mccr2019",
                "title": "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)",
                "uri": CANON["Magistrates’ Court Criminal Procedure Rules 2019 (Vic)"],
                "pinpoint": "r 6.02",
                "reliability_score": 0.95
            }]
        })

    if "Evidence_2008_VIC" in frameworks and "certificate" in text.lower():
        issues.append({
            "framework": "Evidence_2008_VIC",
            "requirement": "Reliability and legality of evidence; discretionary exclusion.",
            "non_compliance": "Potential improperly obtained/defective certificate.",
            "severity": "material",
            "remedy": "Apply to exclude under s 138.",
            "citations": [{
                "source_id": "evidence2008",
                "title": "Evidence Act 2008 (Vic)",
                "uri": CANON["Evidence Act 2008 (Vic)"],
                "pinpoint": "s 138",
                "reliability_score": 0.95
            }]
        })

    return {"issues": issues}

@app.post("/drafts/disclosure-request")
def disclosure_request(payload: Dict[str, Any]):
    doc_id = payload.get("doc_id")
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    items = payload.get("items_requested") or []
    body_lines = [
        "## Disclosure Request",
        "",
        "Please provide the following materials forthwith:",
    ] + [f"- {it}" for it in items] + [
        "",
        "Legal bases:",
        "- Criminal Procedure Act 2009 (Vic) (general disclosure obligations).",
        "- Magistrates’ Court Criminal Procedure Rules 2019 (Vic) r 23 (procedural requirements) (note: verify current rule number).",
    ]
    return {
        "heading": "Disclosure Request",
        "body_markdown": "\n".join(body_lines),
        "citations": [
            {
                "source_id": "cpa2009",
                "title": "Criminal Procedure Act 2009 (Vic)",
                "uri": CANON["Criminal Procedure Act 2009 (Vic)"],
                "reliability_score": 0.9
            },
            {
                "source_id": "mccr2019",
                "title": "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)",
                "uri": CANON["Magistrates’ Court Criminal Procedure Rules 2019 (Vic)"],
                "reliability_score": 0.9
            }
        ]
    }

# ---- Upload (multipart) ----
@app.post("/upload")
async def upload(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    file_id = str(uuid.uuid4())
    # We avoid persisting content here; integrate your storage/OCR later as needed.
    return {"file_id": file_id, "filename": file.filename, "title": title}

# ---- Webhook ----
@app.post("/webhooks/ingest-complete")
def ingest_complete(payload: Dict[str, Any]):
    return {"ok": True, "received": payload, "ts": now_iso()}

# ---- Convenience: serve the known canon (debug) ----
@app.get("/_canon")
def get_canon():
    return CANON

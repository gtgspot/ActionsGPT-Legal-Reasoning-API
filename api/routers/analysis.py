import hashlib
import re
from datetime import UTC, datetime
from typing import Any, Dict, List
from urllib.parse import quote_plus

from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException

from ..config import CANON, USER_AGENT
from ..integrations.http import get_async_client
from ..schemas import (
    ArgumentsBuildRequest,
    ChatRequest,
    CitationRequest,
    ComplianceCheckRequest,
    ExtractStructureRequest,
    MapEdge,
    MapGraphResponse,
    MapNode,
    PrecedentsSearchRequest,
    QARequest,
    SalienceScoreRequest,
)
from ..security import api_key_guard
from ..services.precedent import (
    build_authority_line,
    compute_precedential_weight,
    parse_case_page,
    parse_neutral_citation,
)
from ..services.sources import get_provider_search_url, select_providers
from ..state import DOCS
from ..utils import guess_citations

router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/extract/structure")
def extract_structure(payload: ExtractStructureRequest):
    doc_id = payload.doc_id
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    charges = []
    if re.search(r"\b(s\s?49(?:\([^)]+\))?)\b", text, re.I):
        charges.append(
            {
                "label": "Drink/Drug Driving",
                "provision": "Road Safety Act 1986 (Vic) s 49",
                "elements": ["drive/attempt to drive", "presence of alcohol/drug above limit"],
                "max_penalty": "As prescribed by Sentencing Act 1991 (Vic)",
            }
        )
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
        "citations": citations,
    }


@router.post("/map/legislation", response_model=MapGraphResponse)
def map_legislation(payload: Dict[str, Any]) -> MapGraphResponse:
    doc_id = payload.get("doc_id")
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    rec = DOCS[doc_id]
    text = "\n\n".join(rec.get("text_chunks", []))
    citations = guess_citations(text)
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    # Document node with time facet
    nodes.append(
        {
            "id": f"doc:{doc_id}",
            "title": rec.get("meta", {}).get("title") or f"Document {doc_id[:8]}",
            "node_type": "Document",
            "created_at": rec.get("created_at"),
        }
    )
    # Canon nodes + edges with provenance and pinpoints
    for ref in citations:
        sid = ref.source_id
        if not any(n.get("id") == sid for n in nodes):
            nodes.append(
                {
                    "id": sid,
                    "title": ref.title,
                    "node_type": "Statute" if "Act" in (ref.title or "") else "Rule",
                    "uri": ref.uri,
                }
            )
        # find a small snippet around pinpoint if present
        snippet = None
        if ref.pinpoint:
            loc = text.lower().find(ref.pinpoint.lower())
            if loc >= 0:
                start = max(0, loc - 60)
                end = min(len(text), loc + 60)
                snippet = text[start:end]
        edges.append(
            {
                "from": f"doc:{doc_id}",
                "to": sid,
                "relation": "cites",
                "pinpoint": ref.pinpoint,
                "provenance": {"doc_id": doc_id, "snippet": snippet},
                "time": rec.get("created_at"),
            }
        )
    # Pydantic models will validate structure
    return MapGraphResponse(
        nodes=[MapNode(**n) for n in nodes], edges=[MapEdge(**e) for e in edges]
    )


@router.get("/map/citations/{doc_id}", response_model=MapGraphResponse)
def map_citations(doc_id: str) -> MapGraphResponse:
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    rec = DOCS[doc_id]
    text = "\n\n".join(rec.get("text_chunks", []))
    citations = guess_citations(text)
    nodes: List[Dict[str, Any]] = [
        {
            "id": f"doc:{doc_id}",
            "title": rec.get("meta", {}).get("title") or f"Document {doc_id[:8]}",
            "node_type": "Document",
            "created_at": rec.get("created_at"),
        }
    ]
    edges: List[Dict[str, Any]] = []
    for ref in citations:
        sid = ref.source_id
        if not any(n.get("id") == sid for n in nodes):
            nodes.append(
                {
                    "id": sid,
                    "title": ref.title,
                    "node_type": "Statute" if "Act" in (ref.title or "") else "Rule",
                    "uri": ref.uri,
                }
            )
        edges.append(
            {
                "from": f"doc:{doc_id}",
                "to": sid,
                "relation": "cites",
                "pinpoint": ref.pinpoint,
                "provenance": {"doc_id": doc_id},
                "time": rec.get("created_at"),
            }
        )
    return MapGraphResponse(
        nodes=[MapNode(**n) for n in nodes], edges=[MapEdge(**e) for e in edges]
    )


@router.post("/cite/aglc4")
def cite_aglc4(payload: CitationRequest):
    targets = payload.targets or []
    out = []
    for t in targets:
        ident = (t.identifier or "").strip()
        pinpoint = t.pinpoint
        uri = CANON.get(ident)
        title = ident or "Unknown"
        out.append(
            {
                "source_id": hashlib.md5((title + (pinpoint or "")).encode()).hexdigest()[:12],
                "title": title,
                "uri": uri,
                "pinpoint": pinpoint,
                "reliability_score": 0.9,
                "quote_range": None,
            }
        )
    return {"citations": out}


@router.post("/precedents/search")
async def precedents_search(payload: PrecedentsSearchRequest):
    q = payload.query or ""
    if not q:
        raise HTTPException(400, "query is required")
    try:
        order = select_providers(payload.jurisdiction_hint)
        url = None
        for pid in order:
            url = get_provider_search_url(pid, q)
            if url:
                break
        if not url:
            mask = "au/cases/vic"
            j = (payload.jurisdiction_hint or "VIC").upper()
            if j == "CTH":
                mask = "au/cases/cth/HCA"
            url = f"https://www8.austlii.edu.au/cgi-bin/sinosrch.cgi?query={quote_plus(q)}&mask_path={mask}&results=20"
        async with get_async_client({"User-Agent": USER_AGENT}) as c:
            r = await c.get(url)
        soup = BeautifulSoup(r.text, "html.parser")
        results = []
        for a in soup.select("a"):
            href = a.get("href") or ""
            title = a.text.strip()
            if not href.startswith("http") or "austlii.edu.au" not in href:
                continue
            meta = parse_neutral_citation(title)
            meta.precedential_weight = compute_precedential_weight(
                meta, now_year=datetime.now(UTC).year
            )
            item = {
                "source_id": hashlib.md5(href.encode()).hexdigest()[:12],
                "title": title,
                "uri": href,
                "type": "judgment",
                "ratio": "",
                "obiter": "",
                "treatment": "considered",
                "confidence": 0.6,
                "meta": meta.model_dump(),
            }
            try:
                case_resp = await c.get(href)
                if case_resp.status_code == 200:
                    details = await parse_case_page(case_resp.text)
                    item["meta"].update(details)
            except Exception:
                pass
            results.append(item)
        # Apply court_level filter (typed) or legacy filters.court_level
        want = (payload.court_level or "").upper() if payload.court_level else None
        if not want and payload.filters and "court_level" in payload.filters:
            want = str(payload.filters["court_level"]).upper()
        if want:
            results = [r for r in results if ((r.get("meta") or {}).get("court_level") == want)]
        return {"results": results[: (payload.limit or 25)]}
    except Exception:
        return {"results": []}


@router.post("/arguments/build")
def arguments_build(payload: ArgumentsBuildRequest):
    doc_id = payload.doc_id
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    # Build authority line from any neutral citations in the doc text
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    precedents = []
    for c in guess_citations(text):
        if (c.type or "").lower() == "judgment":
            meta = parse_neutral_citation(c.title or "")
            meta.precedential_weight = compute_precedential_weight(
                meta, now_year=datetime.now(UTC).year
            )
            precedents.append(
                {"title": meta.neutral_citation or (c.title or ""), "meta": meta.model_dump()}
            )

    atom = {
        "issue": "Admissibility of evidentiary certificate",
        "rule": "Evidence Act 2008 (Vic) s 138 (exclusion of improperly obtained evidence).",
        "application": "Certificate appears non-compliant with prescribed procedure; probative value outweighed by unfair prejudice.",
        "conclusion": "Seek exclusion; absent certificate, prosecution cannot prove essential element.",
        "admissibility": {"risk": "low", "grounds": ["s 138 Evidence Act (Vic)", "unfairness"]},
        "supporting_citations": [
            {
                "source_id": "evidence2008",
                "title": "Evidence Act 2008 (Vic)",
                "uri": CANON["Evidence Act 2008 (Vic)"],
                "pinpoint": "s 138",
                "reliability_score": 0.95,
            }
        ],
        "authority_line": build_authority_line(precedents),
    }
    return {"atoms": [atom]}


@router.post("/salience/score")
def salience_score(payload: SalienceScoreRequest):
    doc_id = payload.doc_id
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    items = payload.candidate_items or []
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    scores = []
    for it in items:
        base = 0.5
        hits = sum([text.lower().count(w.lower()) for w in re.findall(r"[A-Za-z0-9]+", it)])
        score = max(0.0, min(1.0, base + 0.05 * hits))
        scores.append(
            {
                "label": it,
                "score": score,
                "explanation": f"Heuristic boost from {hits} term match(es) in the material.",
                "drivers": ["text-match", "issue centrality"],
                "counterfactors": ["limited corroboration"],
            }
        )
    return {"salience": scores}


@router.post("/compliance/check")
def compliance_check(payload: ComplianceCheckRequest):
    doc_id = payload.doc_id
    frameworks = payload.frameworks or []
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    issues: List[Dict[str, Any]] = []

    if "MCCR_2019_VIC" in frameworks and "form 11a" not in text.lower():
        issues.append(
            {
                "framework": "MCCR_2019_VIC",
                "requirement": "Use and proper service of prescribed forms (e.g., Form 11A).",
                "non_compliance": "No reference to Form 11A detected in materials.",
                "severity": "material",
                "remedy": "Seek adjournment or strike out; require proper service.",
                "citations": [
                    {
                        "source_id": "mccr2019",
                        "title": "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)",
                        "uri": CANON["Magistrates’ Court Criminal Procedure Rules 2019 (Vic)"],
                        "pinpoint": "r 6.02",
                        "reliability_score": 0.95,
                    }
                ],
            }
        )

    if "Evidence_2008_VIC" in frameworks and "certificate" in text.lower():
        issues.append(
            {
                "framework": "Evidence_2008_VIC",
                "requirement": "Reliability and legality of evidence; discretionary exclusion.",
                "non_compliance": "Potential improperly obtained/defective certificate.",
                "severity": "material",
                "remedy": "Apply to exclude under s 138.",
                "citations": [
                    {
                        "source_id": "evidence2008",
                        "title": "Evidence Act 2008 (Vic)",
                        "uri": CANON["Evidence Act 2008 (Vic)"],
                        "pinpoint": "s 138",
                        "reliability_score": 0.95,
                    }
                ],
            }
        )

    return {"issues": issues}


@router.post("/qa")
def qa_answer(payload: QARequest):
    doc_id = payload.doc_id
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    # Minimal offline stub; produce answer shell with citations to known canon
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    cites = [c.model_dump() for c in guess_citations(text)]
    answer = {
        "answer_markdown": f"Based on the materials provided, preliminary analysis suggests focusing on the most salient statutory provisions and ensuring procedural compliance. ({len(cites)} citation(s) attached)",
        "citations": cites,
        "confidence": 0.6,
        "coverage_gaps": ["Limited context for facts-in-issue", "No attachments parsed"],
    }
    return answer


@router.post("/chat")
def chat_answer(payload: ChatRequest):
    doc_id = payload.doc_id
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    # Use last user message as the question
    question = ""
    for m in reversed(payload.messages or []):
        if (m.role or "").lower() == "user":
            question = m.content or ""
            break
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
    cites = [c.model_dump() for c in guess_citations(text)]
    # Minimal heuristic: echo intent and attach citations
    answer_md = (
        f"Q: {question}\n\n"
        "Preliminary perspective based on current materials: consider the most directly applicable provisions and any procedural prerequisites. "
        f"Attached {len(cites)} source reference(s) to ground follow‑up."
    )
    return {
        "messages": [
            {"role": "assistant", "content": answer_md},
        ],
        "citations": cites,
        "confidence": 0.55,
    }

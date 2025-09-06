import hashlib
import re
from typing import Any, Dict, List
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException

from ..config import CANON, USER_AGENT
from ..schemas import (
    ArgumentsBuildRequest,
    ComplianceCheckRequest,
    PrecedentsSearchRequest,
    SalienceScoreRequest,
)
from ..state import DOCS
from ..utils import guess_citations


router = APIRouter()


@router.post("/extract/structure")
def extract_structure(payload: Dict[str, Any]):
    doc_id = payload.get("doc_id")
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


@router.post("/map/legislation")
def map_legislation(payload: Dict[str, Any]):
    doc_id = payload.get("doc_id")
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    nodes = []
    edges = []
    n_act = {
        "id": "rsa1986",
        "title": "Road Safety Act 1986 (Vic)",
        "node_type": "Act",
        "uri": CANON["Road Safety Act 1986 (Vic)"],
        "provision": "s 49",
        "citation_aglc4": "Road Safety Act 1986 (Vic)",
    }
    n_regs = {
        "id": "rsgr2019",
        "title": "Road Safety (General) Regulations 2019 (Vic)",
        "node_type": "Regulation",
        "uri": CANON["Road Safety (General) Regulations 2019 (Vic)"],
    }
    nodes.extend([n_act, n_regs])
    edges.append({"from": "rsgr2019", "to": "rsa1986", "relation": "implements"})
    n_rules = {
        "id": "mccr2019",
        "title": "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)",
        "node_type": "Rule",
        "uri": CANON["Magistrates’ Court Criminal Procedure Rules 2019 (Vic)"],
    }
    n_cpa = {
        "id": "cpa2009",
        "title": "Criminal Procedure Act 2009 (Vic)",
        "node_type": "Act",
        "uri": CANON["Criminal Procedure Act 2009 (Vic)"],
    }
    nodes.extend([n_rules, n_cpa])
    edges.append({"from": "mccr2019", "to": "cpa2009", "relation": "interprets"})
    return {"nodes": nodes, "edges": edges}


@router.post("/cite/aglc4")
def cite_aglc4(payload: Dict[str, Any]):
    targets = (payload or {}).get("targets") or []
    out = []
    for t in targets:
        ident = t.get("identifier") or ""
        pinpoint = t.get("pinpoint")
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
            results.append(
                {
                    "source_id": hashlib.md5(href.encode()).hexdigest()[:12],
                    "title": title,
                    "uri": href,
                    "type": "judgment",
                    "ratio": "",
                    "obiter": "",
                    "treatment": "considered",
                    "confidence": 0.6,
                }
            )
        return {"results": results[: (payload.limit or 25)]}
    except Exception:
        return {"results": []}


@router.post("/arguments/build")
def arguments_build(payload: ArgumentsBuildRequest):
    doc_id = payload.doc_id
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    text = "\n\n".join(DOCS[doc_id].get("text_chunks", []))
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


from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Depends

from ..config import CANON
from ..schemas import DraftDisclosureRequest
from ..security import api_key_guard
from ..state import DOCS


router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/drafts/disclosure-request")
def disclosure_request(payload: DraftDisclosureRequest):
    doc_id = payload.doc_id
    if not doc_id or doc_id not in DOCS:
        raise HTTPException(404, "doc not found")
    items: List[str] = payload.items_requested or []
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
                "reliability_score": 0.9,
            },
            {
                "source_id": "mccr2019",
                "title": "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)",
                "uri": CANON["Magistrates’ Court Criminal Procedure Rules 2019 (Vic)"],
                "reliability_score": 0.9,
            },
        ],
    }

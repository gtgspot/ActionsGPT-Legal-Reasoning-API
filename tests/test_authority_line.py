import uuid

from fastapi.testclient import TestClient

from api.services.ingestion_pipeline import analyze_case, generate_arguments
from api.state import DOCS
from api.utils import now_iso
from app import app

client = TestClient(app, headers={"X-API-Key": "test-key"})


def test_authority_line_assembles_binding_then_supporting():
    doc_id = str(uuid.uuid4())
    # Include a High Court and a VSC citation
    text = "See [2015] HCA 10 and [2022] VSC 50 for guidance."
    DOCS[doc_id] = {
        "status": "ready",
        "text_chunks": [text],
        "meta": {"title": "Precedent Doc"},
        "created_at": now_iso(),
        "digest": "x",
    }
    r = client.post("/arguments/build", json={"doc_id": doc_id})
    assert r.status_code == 200
    atoms = r.json().get("atoms", [])
    assert atoms and atoms[0].get("authority_line")
    line = atoms[0]["authority_line"]
    # Governing should contain HCA first
    gov = line.get("governing", [])
    assert gov and "HCA" in (gov[0].get("neutral_citation") or "")
    # VSC appears as supporting
    supp = line.get("supporting", [])
    assert any("VSC" in (s.get("neutral_citation") or "") for s in supp)
    bundle = analyze_case(facts=text, issues=["precedents"], stage="appeal")
    arguments = generate_arguments(bundle)
    assert arguments and all("canonical_id" in auth for auth in arguments[0].authorities)
    assert arguments[0].audit_id


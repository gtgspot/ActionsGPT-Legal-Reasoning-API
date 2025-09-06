import uuid
from fastapi.testclient import TestClient

from app import app
from api.state import DOCS
from api.utils import now_iso


client = TestClient(app, headers={"X-API-Key": "test-key"})


def _make_doc(text: str) -> str:
    doc_id = str(uuid.uuid4())
    DOCS[doc_id] = {
        "status": "ready",
        "text_chunks": [text],
        "meta": {"title": "Test Document"},
        "created_at": now_iso(),
        "digest": "test",
    }
    return doc_id


def test_map_legislation_builds_citation_edges():
    doc_id = _make_doc("This cites Evidence Act 2008 (Vic) s 138 and related provisions.")
    r = client.post("/map/legislation", json={"doc_id": doc_id})
    assert r.status_code == 200
    data = r.json()
    ids = {n["id"] for n in data.get("nodes", [])}
    assert f"doc:{doc_id}" in ids
    # Should include a node for Evidence Act (id slug contains 'evidence')
    assert any("evidence" in n["id"] for n in data.get("nodes", []))
    # Edge with relation=cites and pinpoint present
    assert any(e.get("relation") == "cites" and e.get("pinpoint") for e in data.get("edges", []))


def test_map_citations_endpoint():
    doc_id = _make_doc("Under the Evidence Act 2008 (Vic) s 138 the court may exclude evidence.")
    r = client.get(f"/map/citations/{doc_id}")
    assert r.status_code == 200
    body = r.json()
    # Expect at least one citation edge
    assert any(e.get("relation") == "cites" for e in body.get("edges", []))


def test_map_citations_missing_doc_404():
    r = client.get("/map/citations/missing-id")
    assert r.status_code == 404

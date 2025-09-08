import uuid

from fastapi.testclient import TestClient

from api.state import DOCS
from api.utils import now_iso
from app import app

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


def test_cite_aglc4_returns_citation():
    body = {
        "style": "AGLC4",
        "targets": [
            {"kind": "statute", "identifier": "Evidence Act 2008 (Vic)", "pinpoint": "s 138"}
        ],
    }
    r = client.post("/cite/aglc4", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data.get("citations") and data["citations"][0]["title"].startswith("Evidence Act")


def test_arguments_build():
    doc_id = _make_doc("Certificate raised under Evidence Act 2008 (Vic) s 138.")
    r = client.post("/arguments/build", json={"doc_id": doc_id})
    assert r.status_code == 200
    atoms = r.json().get("atoms", [])
    assert atoms and "issue" in atoms[0]


def test_qa_stub():
    doc_id = _make_doc("This mentions Evidence Act 2008 (Vic) s 138.")
    r = client.post("/qa", json={"doc_id": doc_id, "question": "What is s 138?"})
    assert r.status_code == 200
    body = r.json()
    assert "answer_markdown" in body and "citations" in body

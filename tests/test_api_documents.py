import uuid

from fastapi.testclient import TestClient

from api.state import DOCS
from api.utils import now_iso
from app import app

client = TestClient(app, headers={"X-API-Key": "test-key"})


def test_recent_documents_lists_created():
    # create two docs
    for i in range(2):
        doc_id = str(uuid.uuid4())
        DOCS[doc_id] = {
            "status": "ready",
            "text_chunks": ["evidence"],
            "meta": {"title": f"Doc {i}"},
            "created_at": now_iso(),
            "digest": "x",
        }
    r = client.get("/documents/recent?limit=2")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and len(data["items"]) >= 2

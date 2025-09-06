from fastapi.testclient import TestClient
import uuid

from app import app
from api.state import DOCS
from api.utils import now_iso


client = TestClient(app, headers={"X-API-Key": "test-key"})


def test_chat_returns_assistant_message():
    doc_id = str(uuid.uuid4())
    DOCS[doc_id] = {
        "status": "ready",
        "text_chunks": ["Evidence Act 2008 (Vic) s 138"],
        "meta": {"title": "Chat Doc"},
        "created_at": now_iso(),
        "digest": "x",
    }
    payload = {
        "doc_id": doc_id,
        "messages": [
            {"role": "user", "content": "What is s 138?"}
        ]
    }
    r = client.post("/chat", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body.get("messages") and body["messages"][0]["role"] == "assistant"


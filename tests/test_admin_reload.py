from fastapi.testclient import TestClient

from app import app
from api.config import CANON


client = TestClient(app, headers={"X-API-Key": "test-key"})


def test_admin_reload_canon_returns_count():
    r = client.post("/_admin/reload-canon")
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True
    assert isinstance(data.get("count"), int) and data["count"] >= len(CANON)


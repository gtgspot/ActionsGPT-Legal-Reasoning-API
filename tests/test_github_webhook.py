import hashlib
import hmac
import json

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def _sig(secret: str, payload: bytes) -> str:
    mac = hmac.new(secret.encode(), msg=payload, digestmod=hashlib.sha256)
    return "sha256=" + mac.hexdigest()


def test_github_webhook_signature_verified(monkeypatch):
    secret = "topsecret"
    monkeypatch.setenv("GITHUB_APP_WEBHOOK_SECRET", secret)
    body = json.dumps({"action": "opened"}).encode()
    headers = {"X-Hub-Signature-256": _sig(secret, body)}
    r = client.post("/github/webhook", data=body, headers=headers)
    assert r.status_code == 204


def test_github_webhook_bad_signature(monkeypatch):
    secret = "topsecret"
    monkeypatch.setenv("GITHUB_APP_WEBHOOK_SECRET", secret)
    body = b"{}"
    headers = {"X-Hub-Signature-256": _sig("wrong", body)}
    r = client.post("/github/webhook", data=body, headers=headers)
    assert r.status_code == 401

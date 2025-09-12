from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ..schemas import WebhookAckResponse, WebhookIngestEvent
from ..security import api_key_guard
from ..utils import now_iso

router = APIRouter()


@router.post("/webhooks/ingest-complete", response_model=WebhookAckResponse)
def ingest_complete(
    payload: WebhookIngestEvent, _=Depends(api_key_guard)
) -> WebhookAckResponse:
    return WebhookAckResponse(ok=True, received=payload.model_dump(), ts=now_iso())


def _get_secret() -> bytes:
    s = os.environ.get("GITHUB_APP_WEBHOOK_SECRET")
    if not s or not s.strip():
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    return s.encode("utf-8")


def verify_sig(raw: bytes, sig_header: Optional[str]) -> None:
    if not sig_header:
        raise HTTPException(status_code=401, detail="Missing signature")
    mac = hmac.new(_get_secret(), msg=raw, digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    if not hmac.compare_digest(expected, sig_header):
        raise HTTPException(status_code=401, detail="Bad signature")


@router.post("/github/webhook", status_code=204)
async def github_webhook(request: Request) -> Response:
    raw = await request.body()
    sig = request.headers.get("X-Hub-Signature-256") or request.headers.get(
        "x-hub-signature-256"
    )
    verify_sig(raw, sig)

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if request.headers.get("X-GitHub-Event") == "security_advisory":
        action = payload.get("action")
        adv = payload.get("security_advisory", {})
        vulns = adv.get("vulnerabilities") or []
        pkg = (vulns[0].get("package", {}) if vulns else {})
        logging.info(
            "advisory delivery=%s action=%s eco=%s name=%s",
            request.headers.get("X-GitHub-Delivery", ""),
            action,
            pkg.get("ecosystem"),
            pkg.get("name"),
        )

    return Response(status_code=204)

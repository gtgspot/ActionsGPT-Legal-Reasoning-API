#!/usr/bin/env python3
"""Drop-in FastAPI handler for GitHub App webhooks.

Verifies X-Hub-Signature-256 using the shared secret and acknowledges quickly.
To run: uvicorn app_webhook:app --host 0.0.0.0 --port 8000

Set environment variable GITHUB_APP_WEBHOOK_SECRET to the exact secret configured
in your GitHub App. Do not commit secrets in code.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from starlette.responses import Response

app = FastAPI()


def _get_secret() -> bytes:
    s = os.environ.get("GITHUB_APP_WEBHOOK_SECRET")
    if not s or not s.strip():
        # Misconfiguration; refuse to accept requests without a secret
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    return s.encode("utf-8")


def verify_sig(raw: bytes, sig_header: Optional[str]) -> None:
    if not sig_header:
        raise HTTPException(status_code=401, detail="Missing signature")
    mac = hmac.new(_get_secret(), msg=raw, digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    if not hmac.compare_digest(expected, sig_header):
        raise HTTPException(status_code=401, detail="Bad signature")


@app.post("/github/webhook")
async def github_webhook(request: Request) -> Response:
    # Verify signature against raw body
    raw = await request.body()
    sig = request.headers.get("X-Hub-Signature-256") or request.headers.get("x-hub-signature-256")
    verify_sig(raw, sig)

    event = request.headers.get("X-GitHub-Event", "")
    delivery = request.headers.get("X-GitHub-Delivery", "")
    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if event == "security_advisory":
        action = payload.get("action")
        adv = payload.get("security_advisory", {})
        vulns = adv.get("vulnerabilities") or []
        pkg = (vulns[0].get("package", {}) if vulns else {})
        logging.info(
            "advisory delivery=%s action=%s eco=%s name=%s",
            delivery,
            action,
            pkg.get("ecosystem"),
            pkg.get("name"),
        )
        # TODO: enqueue background triage job (e.g., put on a queue or log for processing)

    # Always acknowledge quickly
    return Response(status_code=204)


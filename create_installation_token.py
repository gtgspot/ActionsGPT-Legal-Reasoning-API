#!/usr/bin/env python3
# mypy: ignore-errors
"""Create a GitHub App installation access token (helper script).

Requirements:
  pip install pyjwt cryptography requests

Environment variables:
  - GITHUB_APP_ID (int)
  - GITHUB_APP_PRIVATE_KEY (PEM text, or path via GITHUB_APP_PRIVATE_KEY_PATH)
  - GITHUB_INSTALLATION_ID (int)
  - GITHUB_API_URL (optional, default: https://api.github.com)

This script does not store secrets and prints the token JSON to stdout.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Optional


def _load_private_key() -> str:
    key = os.environ.get("GITHUB_APP_PRIVATE_KEY")
    key_path = os.environ.get("GITHUB_APP_PRIVATE_KEY_PATH")
    if key and key.strip():
        return key
    if key_path and os.path.exists(key_path):
        return open(key_path, "r", encoding="utf-8").read()
    raise SystemExit("Missing GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_PATH")


def _jwt_for_app(app_id: str, private_key_pem: str) -> str:
    try:
        import jwt  # pyjwt
    except Exception as e:
        raise SystemExit("pyjwt is required: pip install pyjwt cryptography") from e

    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + 9 * 60,
        "iss": app_id,
    }
    return jwt.encode(payload, private_key_pem, algorithm="RS256")


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Create a GitHub App installation access token")
    parser.add_argument("--installation", dest="installation_id", help="Installation ID (overrides env)")
    args = parser.parse_args(argv)

    app_id = os.environ.get("GITHUB_APP_ID")
    if not app_id:
        print("GITHUB_APP_ID is required", file=sys.stderr)
        return 2
    installation_id = args.installation_id or os.environ.get("GITHUB_INSTALLATION_ID")
    if not installation_id:
        print("GITHUB_INSTALLATION_ID is required (or pass --installation)", file=sys.stderr)
        return 2
    api_url = (os.environ.get("GITHUB_API_URL") or "https://api.github.com").rstrip("/")

    private_key_pem: str = _load_private_key()
    app_jwt: str = _jwt_for_app(app_id, private_key_pem)

    import requests  # type: ignore[import-not-found]  # noqa: PLC0415

    url = f"{api_url}/app/installations/{installation_id}/access_tokens"
    r = requests.post(url, headers={"Authorization": f"Bearer {app_jwt}", "Accept": "application/vnd.github+json"})  # type: ignore[no-any-return]
    r.raise_for_status()
    print(json.dumps(r.json(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

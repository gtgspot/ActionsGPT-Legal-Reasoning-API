"""Utility helpers for minting GitHub App installation tokens."""

from __future__ import annotations

import asyncio
import os
import sys
import time
from dataclasses import dataclass
from typing import Optional

import httpx
import jwt  # PyJWT

GITHUB_API_ACCEPT = "application/vnd.github+json"


def _env(name: str) -> Optional[str]:
    value = os.getenv(name)
    return value if value and value.strip() else None


def build_app_jwt(app_id: str, private_key: str) -> str:
    """Create the short-lived JWT used to authenticate as a GitHub App."""

    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + (9 * 60), "iss": app_id}
    token = jwt.encode(payload, private_key, algorithm="RS256")
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return token


@dataclass
class InstallationToken:
    token: str
    expires_at: Optional[str]


async def create_installation_token(
    app_id: str, private_key: str, installation_id: str
) -> InstallationToken:
    """Request an installation access token for the GitHub App."""

    jwt_token = build_app_jwt(app_id, private_key)
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": GITHUB_API_ACCEPT,
    }
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(url, headers=headers)
    if response.status_code != 201:
        raise RuntimeError(
            f"Failed to create installation token: {response.status_code} {response.text}"
        )
    payload = response.json()
    token = payload.get("token")
    if not token:
        raise RuntimeError("GitHub response missing 'token'")
    return InstallationToken(token=str(token), expires_at=payload.get("expires_at"))


async def _main() -> None:
    app_id = _env("GITHUB_APP_ID")
    private_key = _env("GITHUB_APP_PRIVATE_KEY")
    installation_id = _env("GITHUB_INSTALLATION_ID")
    if not (app_id and private_key and installation_id):
        print(
            "ERROR: Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_INSTALLATION_ID in env",
            file=sys.stderr,
        )
        sys.exit(2)
    token = await create_installation_token(app_id, private_key, installation_id)
    print(token.token)


if __name__ == "__main__":
    asyncio.run(_main())

#!/usr/bin/env python3
# create_installation_token.py
# Usage: export GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (PEM contents), GITHUB_INSTALLATION_ID; python create_installation_token.py
# mypy: ignore-errors
import os
import sys
import time

import jwt  # PyJWT
import requests

APP_ID = os.getenv("GITHUB_APP_ID")
PRIVATE_KEY = os.getenv("GITHUB_APP_PRIVATE_KEY")  # full PEM string
INSTALLATION_ID = os.getenv("GITHUB_INSTALLATION_ID")

if not (APP_ID and PRIVATE_KEY and INSTALLATION_ID):
    print("ERROR: Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_INSTALLATION_ID in env", file=sys.stderr)
    sys.exit(2)

now = int(time.time())
payload = {"iat": now - 60, "exp": now + (9 * 60), "iss": APP_ID}
jwt_token = jwt.encode(payload, PRIVATE_KEY, algorithm="RS256")

headers = {"Authorization": f"Bearer {jwt_token}", "Accept": "application/vnd.github+json"}
url = f"https://api.github.com/app/installations/{INSTALLATION_ID}/access_tokens"
r = requests.post(url, headers=headers)
if r.status_code != 201:
    print("Failed to create installation token:", r.status_code, r.text, file=sys.stderr)
    sys.exit(3)
resp = r.json()
print(resp["token"])

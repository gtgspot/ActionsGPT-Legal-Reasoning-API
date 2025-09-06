import os
from typing import Optional

from fastapi import Header, HTTPException


async def api_key_guard(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> None:
    """Optional API key enforcement.

    If environment variable EXPECT_API_KEY is set (value is the required key),
    require header X-API-Key to match. Otherwise, allow requests.
    """
    expected = os.environ.get("EXPECT_API_KEY")
    if expected is None:
        return
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


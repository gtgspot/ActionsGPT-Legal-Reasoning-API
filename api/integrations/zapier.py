"""Zapier webhook integration helpers."""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Mapping, MutableMapping, Optional

from pydantic import BaseModel, Field, HttpUrl, ValidationError

from .http import get_async_client


class ZapierHookConfig(BaseModel):
    """Configuration describing a Zapier webhook endpoint."""

    name: str
    url: HttpUrl
    secret: Optional[str] = Field(default=None, description="Optional shared secret header")


class ZapierPayload(BaseModel):
    """Validated payload structure for Zapier triggers."""

    event: str = Field(..., description="Logical event name consumed by Zapier workflow")
    data: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary structured data payload")


class ZapierClientError(RuntimeError):
    """Raised when a Zapier webhook call fails."""


class ZapierClient:
    """Lightweight client that manages calls to configured Zapier webhooks."""

    def __init__(self, hooks: Mapping[str, ZapierHookConfig]):
        self._hooks: Dict[str, ZapierHookConfig] = {cfg.name: cfg for cfg in hooks.values()}

    @classmethod
    def from_env(cls, env_value: Optional[str] = None) -> "ZapierClient":
        """Construct a client from ``ZAPIER_HOOKS_JSON`` environment variable."""

        raw = env_value if env_value is not None else os.getenv("ZAPIER_HOOKS_JSON")
        if not raw:
            return cls({})
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:  # pragma: no cover - validation path
            raise ZapierClientError(f"Invalid ZAPIER_HOOKS_JSON: {exc}") from exc
        if not isinstance(payload, MutableMapping):
            raise ZapierClientError("ZAPIER_HOOKS_JSON must be a JSON object")
        hooks: Dict[str, ZapierHookConfig] = {}
        for name, data in payload.items():
            if not isinstance(data, MutableMapping):
                raise ZapierClientError(f"Hook '{name}' must be an object")
            try:
                cfg = ZapierHookConfig(name=name, **data)
            except ValidationError as exc:  # pragma: no cover - validation path
                raise ZapierClientError(f"Invalid hook '{name}': {exc}") from exc
            hooks[name] = cfg
        return cls(hooks)

    def describe(self) -> Mapping[str, ZapierHookConfig]:
        return dict(self._hooks)

    async def trigger(self, hook: str, payload: Mapping[str, Any]) -> Dict[str, Any]:
        if hook not in self._hooks:
            raise ZapierClientError(f"Unknown Zapier hook: {hook}")
        cfg = self._hooks[hook]
        body = dict(payload)
        normalized = ZapierPayload.model_validate(
            {"event": body.get("event", hook), "data": body.get("data", {})}
        )
        body.setdefault("event", normalized.event)
        body.setdefault("data", normalized.data)
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if cfg.secret:
            headers["X-Zapier-Secret"] = cfg.secret
        async with get_async_client(headers=headers) as client:
            response = await client.post(str(cfg.url), json=body)
        if response.status_code >= 400:
            raise ZapierClientError(
                f"Zapier hook '{hook}' failed: {response.status_code} {response.text}"
            )
        try:
            return response.json()
        except json.JSONDecodeError:
            return {"ok": True, "raw": response.text}


__all__ = [
    "ZapierClient",
    "ZapierClientError",
    "ZapierHookConfig",
    "ZapierPayload",
]

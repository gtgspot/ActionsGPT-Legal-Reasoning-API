"""Language package registries helpers.

Resolves web/API URLs for common registries and can optionally fetch metadata.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from ..integrations.http import get_async_client


def _load_registries() -> Dict[str, Any]:
    p = Path(__file__).resolve().parents[1] / "config" / "registries.yml"
    try:
        import importlib

        yaml = importlib.import_module("yaml")
        data = yaml.safe_load(p.read_text()) if p.exists() else {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _fmt(template: Optional[str], **kw: str) -> Optional[str]:
    if not template:
        return None
    try:
        return template.format(**kw)
    except Exception:
        return template


async def resolve_registry(language: str, name: str, group: Optional[str] = None, artifact: Optional[str] = None, include_fetch: bool = False) -> Dict[str, Any]:
    lang = (language or "").strip().lower()
    cfg = _load_registries().get("registries", {})
    entries = cfg.get(lang) or []
    if not entries:
        return {"results": []}

    results = []
    for reg in entries:
        rid = str(reg.get("id"))
        endpoints = reg.get("endpoints") or {}
        web_url: Optional[str] = None
        api_url: Optional[str] = None
        if lang == "python":
            web_url = _fmt(endpoints.get("web"), name=name)
            api_url = _fmt(endpoints.get("api"), name=name)
        elif lang == "node":
            web_url = _fmt(endpoints.get("web"), name=name)
            api_url = _fmt(endpoints.get("api"), name=name)
        elif lang == "java":
            # Maven Central requires group/artifact for a specific artifact page
            if group and artifact:
                web_url = _fmt(endpoints.get("web"), group=group, artifact=artifact)
        elif lang == "go":
            # Go modules typically pass full module path in name
            web_url = _fmt(endpoints.get("web"), module=name)
            api_url = _fmt(endpoints.get("api"), module=name)
        elif lang == "rust":
            web_url = _fmt(endpoints.get("web"), name=name)
            api_url = _fmt(endpoints.get("api"), name=name)
        elif lang == "ruby":
            web_url = _fmt(endpoints.get("web"), name=name)
            api_url = _fmt(endpoints.get("api"), name=name)
        elif lang == "php":
            # name expected as vendor/package; break if possible
            vendor, pkg = (name.split("/", 1) + [""])[:2]
            web_url = _fmt(endpoints.get("web"), vendor=vendor, package=pkg)
            api_url = _fmt(endpoints.get("api"), vendor=vendor, package=pkg)
        elif lang == ".net" or lang == "dotnet":
            web_url = _fmt(endpoints.get("web"), name=name)
            api_url = _fmt(endpoints.get("api"), name=name)

        item: Dict[str, Any] = {"registry_id": rid, "web_url": web_url, "api_url": api_url}
        if include_fetch and api_url and api_url.startswith("http"):
            try:
                async with get_async_client() as c:
                    r = await c.get(api_url)
                    if r.status_code == 200 and ("json" in (r.headers.get("content-type", ""))):
                        item["fetched"] = r.json()
            except Exception:
                # Ignore fetch errors; return URLs only
                pass

        results.append(item)
    return {"results": results}


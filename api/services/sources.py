"""Source discovery and search services.

Centralizes provider configuration and search logic for legislation/judgments.
Uses the shared HTTP client factory to keep networking behavior consistent.
"""

from __future__ import annotations

import asyncio
import hashlib
import importlib
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence
from urllib.parse import quote_plus, urlparse, urlunparse

from bs4 import BeautifulSoup

from ..config import ALLOWED_DOMAINS, THROTTLE_DEFAULT, USER_AGENT
from ..integrations.http import get_async_client
from .cache import cached


@dataclass(frozen=True)
class Provider:
    name: str
    kind: str  # legislation | cases | forms | guidance | search
    domains: Sequence[str]
    jurisdictions: Sequence[str]  # e.g., ["vic"], ["cth"], ["nsw"], ["*"], etc.


PROVIDERS: List[Provider] = [
    Provider(
        name="AustLII",
        kind="search",
        domains=("www8.austlii.edu.au",),
        jurisdictions=("*",),
    ),
    # Official legislation portals (in-force)
    Provider("VIC Legislation", "legislation", ("www.legislation.vic.gov.au",), ("vic",)),
    Provider("Cth Legislation", "legislation", ("www.legislation.gov.au",), ("cth",)),
    Provider(
        "NSW Legislation",
        "legislation",
        ("www.legislation.nsw.gov.au", "legislation.nsw.gov.au"),
        ("nsw",),
    ),
    Provider(
        "QLD Legislation",
        "legislation",
        ("www.legislation.qld.gov.au", "www.legislation.qld.gov.au"),
        ("qld",),
    ),
    Provider("WA Legislation", "legislation", ("www.legislation.wa.gov.au",), ("wa",)),
    Provider("SA Legislation", "legislation", ("www.legislation.sa.gov.au",), ("sa",)),
    Provider("TAS Legislation", "legislation", ("www.legislation.tas.gov.au",), ("tas",)),
    Provider("ACT Legislation", "legislation", ("www.legislation.act.gov.au",), ("act",)),
    Provider("NT Legislation", "legislation", ("legislation.nt.gov.au",), ("nt",)),
]


def _load_providers_config() -> Optional[Dict[str, Any]]:
    cfg = Path(__file__).resolve().parents[1] / "config" / "providers.yml"
    if not cfg.exists():
        return None
    try:
        yaml_mod: Any = importlib.import_module("yaml")
        data = yaml_mod.safe_load(cfg.read_text())
        return data if isinstance(data, dict) else None
    except Exception:
        # Minimal fallback parser for just fallback_order in our simple YAML
        try:
            text = cfg.read_text()
            fo: Dict[str, List[str]] = {}
            in_fb = False
            for raw in text.splitlines():
                line = raw.rstrip()
                if not in_fb and line.strip().startswith("fallback_order:"):
                    in_fb = True
                    continue
                if in_fb:
                    if not line.strip():
                        break
                    if line.strip().startswith("#"):
                        continue
                    if not line.startswith("  "):
                        # out of section
                        break
                    # expected format: "  KEY:   [a, b, c]"
                    try:
                        k, rhs = line.strip().split(":", 1)
                        arr = rhs.strip()
                        if arr.startswith("[") and arr.endswith("]"):
                            items = [s.strip() for s in arr[1:-1].split(",") if s.strip()]
                            fo[k] = items
                    except Exception:
                        continue
            return {"fallback_order": fo} if fo else None
        except Exception:
            return None


def get_provider_search_url(provider_id: str, q: str) -> Optional[str]:
    """Return formatted search URL for a provider if configured, else None."""
    cfg = _load_providers_config() or {}
    try:
        providers = cfg.get("providers") or []
        for p in providers:
            if isinstance(p, dict) and p.get("id") == provider_id:
                search = p.get("search") or {}
                base = search.get("base_url")
                if isinstance(base, str) and "{q}" in base:
                    return base.replace("{q}", quote_plus(q))
    except Exception:
        return None
    return None


_THROTTLE_STATE: Dict[str, Dict[str, float]] = {}


async def enforce_throttle(provider_id: Optional[str]) -> None:
    """Best-effort throttle based on providers.yml, defaults allow immediate requests.

    Enforces a minimum delay between calls for the same provider.
    """
    if not provider_id:
        return
    cfg = _load_providers_config() or {}
    min_delay_ms = THROTTLE_DEFAULT.get("min_delay_ms", 0)
    try:
        for p in cfg.get("providers") or []:
            if isinstance(p, dict) and p.get("id") == provider_id:
                thr = p.get("throttle") or {}
                md = thr.get("min_delay_ms")
                if isinstance(md, int):
                    min_delay_ms = md
                break
    except Exception:
        pass
    if min_delay_ms <= 0:
        return
    state = _THROTTLE_STATE.setdefault(provider_id, {"last": 0.0})
    now = time.time() * 1000.0
    gap = now - float(state.get("last", 0.0))
    wait_ms = max(0.0, float(min_delay_ms) - gap)
    if wait_ms > 0:
        await asyncio.sleep(wait_ms / 1000.0)
    state["last"] = time.time() * 1000.0


def select_providers(jurisdiction_hint: Optional[str]) -> List[str]:
    """Return provider ids in order based on jurisdiction hint and config fallback_order.

    Falls back to a simple default if config is absent.
    """
    cfg = _load_providers_config() or {}
    fb = (cfg.get("fallback_order") or {}) if isinstance(cfg, dict) else {}
    j = (jurisdiction_hint or "VIC").upper()
    ids: List[str] = []
    if fb and j in fb and isinstance(fb[j], list):
        ids = [str(x) for x in fb[j]]
    if not ids:
        # minimal fallback by jurisdiction
        if j == "CTH":
            ids = ["legislation-cth", "austlii-hca"]
        elif j == "VIC":
            ids = ["legislation-vic", "austlii-vic-cases", "austlii-hca", "legislation-cth"]
        else:
            ids = ["austlii-hca"]
    return ids


def normalize_url(url: str) -> str:
    """Normalize URL for dedupe (lower host, strip fragments)."""
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    path = parsed.path or "/"
    return urlunparse((parsed.scheme, netloc, path, "", parsed.query, ""))


def _select_domains(domains: Optional[List[str]]) -> List[str]:
    if domains:
        return [d.strip().lower() for d in domains if d]
    # default to allowed domains that look like real hosts
    return [d for d in ALLOWED_DOMAINS if "." in d]


@cached(ttl=300)
async def austlii_search(query: str) -> List[Dict[str, Any]]:
    """Search AustLII HTML results best-effort (no API)."""
    results: List[Dict[str, Any]] = []
    url = f"https://www8.austlii.edu.au/cgi-bin/sinosrch.cgi?query={quote_plus(query)}&results=20"
    async with get_async_client({"User-Agent": USER_AGENT}) as c:
        r = await c.get(url)
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        for link in soup.select("a"):
            href = link.get("href") or ""
            title = link.text.strip()
            if href.startswith("/cgi-bin") or not href.startswith("http"):
                continue
            if "austlii.edu.au" not in urlparse(href).netloc:
                continue
            typ = "judgment" if "/cases/" in href else ("statute" if "/legis/" in href else "other")
            results.append(
                {
                    "source_id": hashlib.md5(href.encode()).hexdigest()[:12],
                    "title": title or "AustLII result",
                    "uri": href,
                    "type": typ,
                    "snippet": "",
                    "score": 0.9,
                }
            )
    return results


async def ddg_domain_search(
    query: str, domains: Iterable[str], include_snippets: bool
) -> List[Dict[str, Any]]:
    """DuckDuckGo HTML fallback per-domain search (no API keys)."""
    results: List[Dict[str, Any]] = []
    async with get_async_client({"User-Agent": USER_AGENT}) as c:
        for dom in domains:
            try:
                ddg = f"https://duckduckgo.com/html/?q={quote_plus('site:' + dom + ' ' + query)}"
                r = await c.get(ddg)
                if r.status_code != 200:
                    continue
                soup = BeautifulSoup(r.text, "html.parser")
                for res in soup.select("div.result"):
                    a = res.select_one("a.result__a")
                    if not a:
                        continue
                    href = a.get("href")
                    title = a.text.strip()
                    if not href:
                        continue
                    snippet = ""
                    if include_snippets:
                        sn_el = res.select_one("a.result__snippet") or res.select_one(
                            "div.result__snippet"
                        )
                        snippet = sn_el.text.strip() if sn_el and hasattr(sn_el, "text") else ""
                    results.append(
                        {
                            "source_id": hashlib.md5(href.encode()).hexdigest()[:12],
                            "title": title or f"Result on {dom}",
                            "uri": href,
                            "type": "other",
                            "snippet": snippet,
                            "score": 0.6,
                        }
                    )
            except Exception:
                continue
    return results


async def search_sources_service(
    query: str,
    domains: Optional[List[str]] = None,
    content_types: Optional[List[str]] = None,
    include_snippets: bool = True,
    jurisdiction_hint: Optional[str] = None,
) -> List[Dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []

    selected_domains = _select_domains(domains)
    # Provider routing hook (currently advisory; domains still drive DDG search)
    _ = select_providers(jurisdiction_hint)

    out: List[Dict[str, Any]] = []
    try:
        out.extend(await austlii_search(q))
    except Exception:
        pass
    try:
        out.extend(await ddg_domain_search(q, selected_domains, include_snippets))
    except Exception:
        pass

    # Filter by content types if requested
    if content_types:
        types = set(content_types)
        out = [r for r in out if r.get("type") in types]

    # Filter by explicit domain constraint if provided
    if domains:
        domset = set(selected_domains)
        out = [r for r in out if urlparse(r.get("uri", "")).netloc.lower() in domset]

    # Normalize + de-duplicate by URI
    seen = set()
    deduped: List[Dict[str, Any]] = []
    for r in out:
        u = normalize_url(r.get("uri", ""))
        if not u or u in seen:
            continue
        seen.add(u)
        deduped.append(r)
    return deduped

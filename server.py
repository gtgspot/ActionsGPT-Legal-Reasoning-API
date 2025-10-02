"""FastMCP server exposing legal reference tools."""
from __future__ import annotations

import asyncio
import json
import logging
import sys
from dataclasses import asdict, dataclass
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError, constr

from mcp.server.fastmcp import FastMCP

# ---- Logging to STDERR (never stdout on STDIO transport) ----
logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.StreamHandler(stream=sys.stderr)],
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    force=True,
)
log = logging.getLogger("legal-mcp")

# ---- Server ----
mcp = FastMCP("legal-mcp")

# ---- Models ----
class StatuteRef(BaseModel):
    title: constr(strip_whitespace=True, min_length=3) = Field(..., example="Road Safety Act 1986 (Vic)")
    section: constr(strip_whitespace=True, min_length=1) = Field(..., example="s 18(1)(a)")
    as_at: constr(strip_whitespace=True, min_length=4) | None = Field(
        None, description="Optional 'as at' date like '2025-07-01'"
    )


class ProvenanceFields(BaseModel):
    return_fields: list[Literal["sha256", "publisher", "url", "version_uri", "source_excerpt"]] = [
        "sha256",
        "publisher",
        "url",
        "version_uri",
        "source_excerpt",
    ]


class ProvenanceRequest(BaseModel):
    doc_ref: str
    version_hint: str | None = None
    as_at_date: str | None = None
    fields: ProvenanceFields = ProvenanceFields()


@dataclass
class ToolError:
    code: str
    message: str
    hint: str | None = None

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


# ---- Helpers (stub upstreams; replace with your sources) ----
LAWS_LOOKUP = {
    (
        "Road Safety Act 1986 (Vic)",
        "s 18(1)(a)",
    ): "Authorises driving if licensed under the law of another State or Territory, subject to regulations.",
}


async def fetch_statute_text(ref: StatuteRef) -> str | None:
    # Replace with real endpoints (Jade, AustLII, LawLex). Use httpx.AsyncClient with timeouts.
    await asyncio.sleep(0.05)
    return LAWS_LOOKUP.get((ref.title, ref.section))


async def fake_provenance_lookup(req: ProvenanceRequest) -> dict[str, Any]:
    await asyncio.sleep(0.05)
    # Demo payload; wire to real registry in production
    base = {
        "sha256": "deadbeef" * 8,
        "publisher": "AustLII (demo)",
        "url": "https://example.org/statute",
        "version_uri": "urn:lex:au:vic:act:1986-127;2025-07-01",
        "source_excerpt": "…excerpt…",
    }
    return {k: v for k, v in base.items() if k in req.fields.return_fields}


# ---- Tools ----
@mcp.tool()
async def get_statute_text(title: str, section: str, as_at: str | None = None) -> str:
    """
    Retrieve statute text (demo). Args: title, section, as_at (optional ISO date).
    Returns a short excerpt or a structured error JSON.
    """
    try:
        ref = StatuteRef(title=title, section=section, as_at=as_at)
    except ValidationError as ve:
        return ToolError(code="VALIDATION_ERROR", message=str(ve), hint="Check title/section/as_at").to_json()
    text = await fetch_statute_text(ref)
    if not text:
        return ToolError(code="NOT_FOUND", message="Statute/section not found", hint="Verify citation").to_json()
    return text


@mcp.tool()
async def get_provenance(
    doc_ref: str,
    version_hint: str | None = None,
    as_at_date: str | None = None,
    return_fields: list[str] | None = None,
) -> str:
    """
    Return provenance metadata for a document (demo).
    """
    try:
        req = ProvenanceRequest(
            doc_ref=doc_ref,
            version_hint=version_hint,
            as_at_date=as_at_date,
            fields=ProvenanceFields(
                return_fields=return_fields
                or ["sha256", "publisher", "url", "version_uri", "source_excerpt"]
            ),
        )
    except ValidationError as ve:
        return ToolError(code="VALIDATION_ERROR", message=str(ve)).to_json()
    data = await fake_provenance_lookup(req)
    return json.dumps(data, ensure_ascii=False)


@mcp.tool()
async def rsa18a_authorisation(
    interstate_licence_state: str,
    is_ordinary_resident_vic: bool,
    days_since_becoming_resident: int | None = None,
) -> str:
    """
    Simple decision aid for RSA s 18(1)(a) authorisation under Drivers Regs (demo).
    """
    # Sketch of logic; replace with your authoritative rules
    if not interstate_licence_state:
        return ToolError(code="INPUT", message="No interstate licence supplied").to_json()
    if is_ordinary_resident_vic and (days_since_becoming_resident or 0) > 90:
        return json.dumps({"authorised": False, "reason": "Residence > 90 days without conversion (demo)"})
    return json.dumps({"authorised": True, "reason": "Interstate licence within permitted window (demo)"})


def main():
    mcp.run(transport="stdio")  # per tutorial; avoid stdout printing!


if __name__ == "__main__":
    main()

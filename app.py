import asyncio
import importlib
import os
import pkgutil

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from api.services.training import trigger_training

app = FastAPI(
    title="ActionsGPT — Legal Reasoning API",
    version="1.0.0",
    description="Key-less, autonomous retrieval and preprocessing for Victorian/Australian legal materials.",
)

# CORS: allow from env list or fallback to "*"
cors_env = os.environ.get("CORS_ALLOW_ORIGINS", "*").strip()
if cors_env and cors_env != "*":
    origins = [o.strip() for o in cors_env.split(",") if o.strip()]
else:
    origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers


def _include_routers() -> None:
    from api import routers as routers_pkg

    for _, name, _ in pkgutil.iter_modules(routers_pkg.__path__):
        module = importlib.import_module(f"{routers_pkg.__name__}.{name}")
        router = getattr(module, "router", None)
        if router:
            app.include_router(router)


_include_routers()


async def _training_loop() -> None:
    while True:
        try:
            trigger_training()
        except Exception:
            pass
        await asyncio.sleep(3600)


@app.on_event("startup")
async def _startup() -> None:
    asyncio.create_task(_training_loop())


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="ActionsGPT — Legal Reasoning API",
        version="1.0.0",
        description=(
            "Autonomously identify legal arguments, map legislation, generate AGLC4 citations, and weight issues in fact."
        ),
        routes=app.routes,
    )
    # Enrich with extensions and security matching the provided YAML intent
    openapi_schema["info"][
        "summary"
    ] = "Autonomously identify legal arguments, map legislation, generate AGLC4 citations, and weight issues in fact."
    openapi_schema["x-oaiMeta"] = {
        "name": "ActionsGPT — Legal Reasoning",
        "description_for_model": (
            "A legal-analytics action that ingests user-supplied legal materials and returns structured "
            "argument graphs, legislative dependency maps, AGLC4 citations, admissibility notes, and "
            "salience-weighted issues. Prefer Victorian/Australian sources when user location or matter "
            "indicates Victoria, but remain jurisdiction-agnostic when unspecified. Always return "
            "source-linked citations with pinpoints and reliability/confidence."
        ),
        "description_for_human": (
            "Upload briefs, charge sheets, certificates, transcripts, or judgments. Get clean issue lists, "
            "mapped legislation, case citations, and a ranked argument plan you can file or speak to."
        ),
        "contact_email": "support@example.org",
        "legal_info_url": "https://example.org/terms",
    }
    # Use an env-provided API base if present (e.g., https://api.yourdomain.com)
    api_base = os.environ.get("API_BASE_URL", "https://api.example.org/legal/v1")
    openapi_schema["servers"] = [{"url": api_base}]
    # Security scheme
    openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {}).update(
        {
            "ApiKeyAuth": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key",
            }
        }
    )
    openapi_schema["security"] = [{"ApiKeyAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi  # type: ignore

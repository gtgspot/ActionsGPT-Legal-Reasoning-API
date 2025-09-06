from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers.health import router as health_router
from api.routers.documents import router as documents_router
from api.routers.sources import router as sources_router
from api.routers.analysis import router as analysis_router
from api.routers.drafts import router as drafts_router
from api.routers.uploads import router as uploads_router
from api.routers.webhooks import router as webhooks_router
from api.routers.canon import router as canon_router


app = FastAPI(
    title="ActionsGPT — Legal Reasoning API",
    version="1.0.0",
    description="Key-less, autonomous retrieval and preprocessing for Victorian/Australian legal materials.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers
app.include_router(health_router)
app.include_router(documents_router)
app.include_router(sources_router)
app.include_router(analysis_router)
app.include_router(drafts_router)
app.include_router(uploads_router)
app.include_router(webhooks_router)
app.include_router(canon_router)


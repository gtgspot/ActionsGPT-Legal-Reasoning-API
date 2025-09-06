from fastapi import APIRouter

from ..utils import now_iso


router = APIRouter()


@router.post("/webhooks/ingest-complete")
def ingest_complete(payload: dict):
    return {"ok": True, "received": payload, "ts": now_iso()}


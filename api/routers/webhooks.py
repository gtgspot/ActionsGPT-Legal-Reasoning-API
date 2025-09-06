from fastapi import APIRouter, Depends

from ..utils import now_iso
from ..security import api_key_guard


router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/webhooks/ingest-complete")
def ingest_complete(payload: dict):
    return {"ok": True, "received": payload, "ts": now_iso()}

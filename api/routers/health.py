from fastapi import APIRouter

from ..utils import now_iso
from ..config import ALLOWED_DOMAINS, CANON
from ..security import api_key_guard


router = APIRouter()


@router.get("/health")
def health():
    return {
        "ok": True,
        "ts": now_iso(),
        "allowlist": sorted(list(ALLOWED_DOMAINS)),
        "sources_known": len(CANON),
    }

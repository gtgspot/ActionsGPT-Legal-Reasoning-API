from fastapi import APIRouter

from ..config import ALLOWED_DOMAINS, CANON
from ..utils import now_iso

router = APIRouter()


@router.get("/health")
def health():
    return {
        "ok": True,
        "ts": now_iso(),
        "allowlist": sorted(list(ALLOWED_DOMAINS)),
        "sources_known": len(CANON),
    }

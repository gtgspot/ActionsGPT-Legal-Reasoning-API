from fastapi import APIRouter

from ..config import reload_canon, CANON
from ..security import api_key_guard


router = APIRouter(prefix="/_admin", tags=["admin"], dependencies=[api_key_guard])


@router.post("/reload-canon")
def admin_reload_canon():
    count = reload_canon()
    return {"ok": True, "count": count}


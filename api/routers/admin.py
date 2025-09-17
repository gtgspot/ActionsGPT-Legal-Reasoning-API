from typing import Optional

from fastapi import APIRouter, Depends

from ..config import reload_canon
from ..security import api_key_guard
from ..services.cache import flush_cache, invalidate_prefix

router = APIRouter(prefix="/_admin", tags=["admin"], dependencies=[Depends(api_key_guard)])


@router.post("/reload-canon")
def admin_reload_canon():
    count = reload_canon()
    return {"ok": True, "count": count}


@router.post("/cache/clear")
async def admin_cache_clear(prefix: Optional[str] = None):
    if prefix:
        deleted = await invalidate_prefix(prefix)
        return {"ok": True, "deleted": deleted}
    await flush_cache()
    return {"ok": True}

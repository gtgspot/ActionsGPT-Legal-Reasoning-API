from fastapi import APIRouter, Depends, HTTPException

from ..schemas import RegistrySearchRequest
from ..security import api_key_guard
from ..services.registries import resolve_registry

router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/registries/search")
async def registries_search(body: RegistrySearchRequest):
    lang = (body.language or "").strip().lower()
    name = (body.name or "").strip()
    if not lang or not name:
        raise HTTPException(400, "language and name are required")
    return await resolve_registry(lang, name, group=body.group, artifact=body.artifact, include_fetch=body.include_fetch)


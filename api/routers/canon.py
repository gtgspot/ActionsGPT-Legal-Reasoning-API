from fastapi import APIRouter

from ..config import CANON


router = APIRouter()


@router.get("/_canon")
def get_canon():
    return CANON


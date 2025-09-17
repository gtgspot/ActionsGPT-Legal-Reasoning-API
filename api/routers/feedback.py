"""Feedback collection endpoints."""

from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Depends

from ..schemas import FeedbackItem
from ..security import api_key_guard
from ..services.training import queue_feedback

router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/feedback")
def submit_feedback(payload: FeedbackItem) -> Dict[str, bool]:
    """Queue user-provided feedback for training."""
    queue_feedback(payload)
    return {"queued": True}

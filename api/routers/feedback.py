"""Endpoints for user feedback used in incremental training."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel

from ..security import api_key_guard
from ..services import training


class FeedbackItem(BaseModel):
    input_text: str
    expected_output: str
    model_output: str | None = None


router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/feedback")
async def submit_feedback(item: FeedbackItem, background_tasks: BackgroundTasks):
    """Queue feedback and trigger background processing."""
    training.queue_feedback(item.model_dump())
    background_tasks.add_task(training.process_queue)
    return {"queued": True}

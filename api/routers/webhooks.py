from fastapi import APIRouter, Depends

from ..schemas import WebhookAckResponse, WebhookIngestEvent
from ..security import api_key_guard
from ..utils import now_iso

router = APIRouter(dependencies=[Depends(api_key_guard)])


@router.post("/webhooks/ingest-complete", response_model=WebhookAckResponse)
def ingest_complete(payload: WebhookIngestEvent) -> WebhookAckResponse:
    return WebhookAckResponse(ok=True, received=payload.model_dump(), ts=now_iso())

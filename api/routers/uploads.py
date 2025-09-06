import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, status
from ..security import api_key_guard


router = APIRouter(dependencies=[api_key_guard])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    file_id = str(uuid.uuid4())
    return {"file_id": file_id, "filename": file.filename, "title": title}

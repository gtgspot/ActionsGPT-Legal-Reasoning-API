import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile


router = APIRouter()


@router.post("/upload")
async def upload(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    file_id = str(uuid.uuid4())
    return {"file_id": file_id, "filename": file.filename, "title": title}


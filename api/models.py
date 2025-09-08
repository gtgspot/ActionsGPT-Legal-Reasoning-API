from typing import List, Optional

from pydantic import BaseModel


class LegalQuery(BaseModel):
    text: str
    jurisdiction: Optional[str] = None
    case_type: Optional[str] = None
    
class LegalResponse(BaseModel):
    analysis: str
    confidence_score: float
    references: List[str]

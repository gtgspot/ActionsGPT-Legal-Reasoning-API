from pydantic import BaseModel
from typing import List, Optional

class LegalQuery(BaseModel):
    text: str
    jurisdiction: Optional[str] = None
    case_type: Optional[str] = None
    
class LegalResponse(BaseModel):
    analysis: str
    confidence_score: float
    references: List[str]

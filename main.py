import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

from api.models import LegalQuery, LegalResponse

load_dotenv()

app = FastAPI(
    title="ActionsGPT Legal Reasoning API",
    description="AI-powered legal reasoning and analysis API",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "Welcome to ActionsGPT Legal Reasoning API"}

@app.post("/analyze", response_model=LegalResponse)
async def analyze_legal_text(query: LegalQuery):
    try:
        # Implementation of legal analysis logic will go here
        return LegalResponse(
            analysis="Legal analysis result will appear here",
            confidence_score=0.95,
            references=["Case reference 1", "Case reference 2"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

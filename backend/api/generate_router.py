"""FastAPI router for text generation."""
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import enchant

from backend.services.generation_service import generate_text

router = APIRouter()

d_en = enchant.Dict("en_US")

class GenerateRequest(BaseModel):
    prompt: str = ""
    n_chars: int = Field(100, ge=1, le=2000)
    bigram_weight: float = 0.2
    trigram_weight: float = 0.3
    tetragram_weight: float = 0.5
    neural_weight: float = 0.8  # fraction blended toward neural (0-1)
    temperature: float = 1.0
    color_code: bool = False

class GenerateResponse(BaseModel):
    text: str
    valid_mask: List[bool]

@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    text = generate_text(
        n_chars=req.n_chars,
        prompt=req.prompt,
        bigram_weight=req.bigram_weight,
        trigram_weight=req.trigram_weight,
        tetragram_weight=req.tetragram_weight,
        neural_weight=req.neural_weight,
        temperature=req.temperature,
    )
    # Split into words and validate
    words = text.split()
    valid_mask = [d_en.check(w) for w in words]
    return {"text": text, "valid_mask": valid_mask}


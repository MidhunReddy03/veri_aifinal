"""Standalone truth‑check endpoint.
Verifies claims against the local knowledge base using RAG.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from ..services.truth_service import verify_claims, invalidate_cache

router = APIRouter()


class TruthCheckRequest(BaseModel):
    claim: str = Field(..., description="Claim text to verify")


@router.post("/truth-check")
async def truth_check(request: TruthCheckRequest):
    """Verify a single claim against the knowledge base."""
    invalidate_cache()
    result = verify_claims(request.claim)
    return result

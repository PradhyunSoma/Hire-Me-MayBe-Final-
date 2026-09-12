from fastapi import APIRouter
from app.schemas.matching import (
    ProcessingStageName,
    ProcessingStatus,
    ProcessingStageResponse,
)
from app.services.semantic_retriever import SemanticRetriever

router = APIRouter(prefix="/status", tags=["status"])

_semantic_retriever = SemanticRetriever()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "hire-me-maybe-ml",
    }


@router.get("/services")
async def services_status():
    sem_ok = False
    sem_reason = None
    try:
        sem_ok = _semantic_retriever.is_available
        if not sem_ok:
            sem_reason = _semantic_retriever.availability_reason
    except Exception as e:
        sem_ok = False
        sem_reason = str(e)

    return {
        "document_extraction": {
            "status": "available",
            "library": "PyMuPDF",
        },
        "requirement_decomposition": {
            "status": "available",
            "mode": "regex_heuristics",
            "llm_used": False,
        },
        "bm25_retrieval": {
            "status": "available",
            "library": "rank-bm25",
        },
        "semantic_retrieval": {
            "status": "available" if sem_ok else "degraded",
            "model": "all-MiniLM-L6-v2",
            "reason": sem_reason,
            "demo_fallback": not sem_ok,
        },
        "scoring": {
            "status": "available",
            "technical_weights": "55% keyword / 45% semantic",
            "experience_weights": "25% keyword / 75% semantic",
        },
    }


@router.get("/stages", response_model=list[ProcessingStageResponse])
async def processing_stages():
    return [
        ProcessingStageResponse(
            stage=ProcessingStageName.DOCUMENT_EXTRACTION,
            status=ProcessingStatus.COMPLETED,
            progress=1.0,
            message="PDF text extraction with PyMuPDF",
        ),
        ProcessingStageResponse(
            stage=ProcessingStageName.REQUIREMENT_DECOMPOSITION,
            status=ProcessingStatus.COMPLETED,
            progress=1.0,
            message="Regex-based decomposition into typed/importance requirements (no LLM)",
        ),
        ProcessingStageResponse(
            stage=ProcessingStageName.BM25_RETRIEVAL,
            status=ProcessingStatus.COMPLETED,
            progress=1.0,
            message="BM25 keyword search over resume chunks",
        ),
        ProcessingStageResponse(
            stage=ProcessingStageName.SEMANTIC_RETRIEVAL,
            status=ProcessingStatus.COMPLETED,
            progress=1.0,
            message="MiniLM cosine similarity over resume chunks (lazy loaded)",
        ),
        ProcessingStageResponse(
            stage=ProcessingStageName.SCORING,
            status=ProcessingStatus.COMPLETED,
            progress=1.0,
            message="Fusion weighting + must-have penalties + ranking",
        ),
    ]


@router.get("/models")
async def model_status():
    sem_ok = False
    sem_reason = None
    try:
        sem_ok = _semantic_retriever.is_available
        if not sem_ok:
            sem_reason = _semantic_retriever.availability_reason
    except Exception as e:
        sem_ok = False
        sem_reason = str(e)

    return {
        "sentence_transformers": {
            "model": "all-MiniLM-L6-v2",
            "loaded": sem_ok,
            "reason": sem_reason,
        },
        "bm25": {
            "implementation": "rank_bm25.BM25Okapi",
            "k1": 1.5,
            "b": 0.75,
        },
    }

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Optional
import uuid
import os

from app.schemas.matching import MatchingResponse
from app.services.document_extractor import (
    PDFExtractor,
    DocumentExtractionError,
    EmptyDocumentError,
)
from app.services.requirement_decomposer import RequirementDecomposer
from app.services.semantic_retriever import SemanticRetriever
from app.services.scoring import ScoringService

router = APIRouter(prefix="/match", tags=["matching"])

pdf_extractor = PDFExtractor()
requirement_decomposer = RequirementDecomposer()
semantic_retriever = SemanticRetriever()
scoring_service = ScoringService()


def _is_semantic_available() -> bool:
    try:
        return semantic_retriever.is_available
    except Exception:
        return False


def _safe_read(file: UploadFile) -> bytes:
    try:
        content = file.file.read()
        return content
    finally:
        file.file.close()


@router.post("", response_model=MatchingResponse)
async def match_resumes(
    jd: UploadFile = File(..., description="Job description PDF file"),
    resumes: List[UploadFile] = File(..., description="Resume PDF files"),
):
    if not resumes:
        raise HTTPException(status_code=400, detail="At least one resume file must be provided")

    jd_bytes = _safe_read(jd)
    if not jd_bytes:
        raise HTTPException(status_code=400, detail="Job description file is empty")

    try:
        jd_data = pdf_extractor.extract_from_bytes(jd_bytes)
    except EmptyDocumentError as e:
        raise HTTPException(status_code=400, detail=f"Job description error: {str(e)}")
    except DocumentExtractionError as e:
        raise HTTPException(status_code=400, detail=f"Job description extraction failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected JD extraction error: {str(e)}")

    requirements, job_title = requirement_decomposer.decompose(jd_data["full_text"])

    if not requirements:
        raise HTTPException(
            status_code=422,
            detail="Could not extract any requirements from the job description. Please provide a more detailed JD.",
        )

    resume_filenames: List[str] = [r.filename or f"resume_{i}" for i, r in enumerate(resumes)]
    semantic_available = _is_semantic_available()

    use_demo = False
    demo_reason: Optional[str] = None
    if not semantic_available:
        use_demo = True
        demo_reason = semantic_retriever.availability_reason or "Semantic model unavailable"

    candidate_results = []

    for idx, resume_file in enumerate(resumes):
        candidate_id = str(uuid.uuid4())[:12]
        filename = resume_file.filename or f"resume_{idx}"

        resume_bytes = _safe_read(resume_file)

        resume_text = ""
        resume_pages = None

        if resume_bytes:
            try:
                resume_data = pdf_extractor.extract_from_bytes(resume_bytes)
                resume_text = resume_data["full_text"]
                resume_pages = resume_data["pages"]
            except EmptyDocumentError:
                resume_text = ""
                resume_pages = None
            except DocumentExtractionError:
                resume_text = ""
                resume_pages = None
            except Exception:
                resume_text = ""
                resume_pages = None

        if not resume_text:
            resume_text = "(No extractable text)"

        if not use_demo:
            try:
                result = scoring_service.score_candidate(
                    resume_text=resume_text,
                    resume_pages=resume_pages,
                    requirements=requirements,
                    semantic_available=semantic_available,
                )
                result.candidate_id = candidate_id
                result.filename = filename
                candidate_results.append(result)
            except Exception as e:
                use_demo = True
                demo_reason = f"Scoring error: {str(e)}"
                break

    if use_demo:
        response = scoring_service.generate_demo_result(
            resume_filenames=resume_filenames,
            requirements=requirements,
            job_title=job_title,
            reason=demo_reason or "Fallback demo mode",
        )
    else:
        response = scoring_service.build_matching_response(
            candidates=candidate_results,
            requirements=requirements,
            job_title=job_title,
            is_demo=False,
            demo_reason=None,
        )

    return response


@router.post("/text", response_model=MatchingResponse)
async def match_text(
    jd_text: str,
    resume_texts: List[str],
    resume_names: Optional[List[str]] = None,
):
    if not jd_text or not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text is empty")
    if not resume_texts:
        raise HTTPException(status_code=400, detail="At least one resume text must be provided")

    requirements, job_title = requirement_decomposer.decompose(jd_text)
    if not requirements:
        raise HTTPException(
            status_code=422,
            detail="Could not extract any requirements from the job description.",
        )

    semantic_available = _is_semantic_available()
    use_demo = not semantic_available
    demo_reason = semantic_retriever.availability_reason if use_demo else None

    names = resume_names or [f"resume_{i}" for i in range(len(resume_texts))]
    if len(names) != len(resume_texts):
        names = [f"resume_{i}" for i in range(len(resume_texts))]

    candidate_results = []
    for idx, rtext in enumerate(resume_texts):
        candidate_id = str(uuid.uuid4())[:12]
        result = scoring_service.score_candidate(
            resume_text=rtext or "",
            resume_pages=None,
            requirements=requirements,
            semantic_available=semantic_available,
        )
        result.candidate_id = candidate_id
        result.filename = names[idx]
        candidate_results.append(result)

    if use_demo:
        return scoring_service.generate_demo_result(
            resume_filenames=names,
            requirements=requirements,
            job_title=job_title,
            reason=demo_reason or "Fallback demo mode",
        )

    return scoring_service.build_matching_response(
        candidates=candidate_results,
        requirements=requirements,
        job_title=job_title,
        is_demo=False,
        demo_reason=None,
    )

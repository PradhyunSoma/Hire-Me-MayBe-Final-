from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from enum import Enum


class RequirementType(str, Enum):
    TECHNICAL = "technical"
    EXPERIENCE = "experience"
    DOMAIN = "domain"
    SOFT_SKILL = "soft_skill"


class Importance(str, Enum):
    MUST_HAVE = "must_have"
    PREFERRED = "preferred"
    NICE_TO_HAVE = "nice_to_have"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStageName(str, Enum):
    DOCUMENT_EXTRACTION = "document_extraction"
    REQUIREMENT_DECOMPOSITION = "requirement_decomposition"
    BM25_RETRIEVAL = "bm25_retrieval"
    SEMANTIC_RETRIEVAL = "semantic_retrieval"
    SCORING = "scoring"


class RequirementAtom(BaseModel):
    id: str
    text: str
    type: RequirementType
    importance: Importance
    keywords: List[str] = Field(default_factory=list)
    original_section: Optional[str] = None


class RequirementMatchEvidence(BaseModel):
    resume_chunk: str
    chunk_index: int
    page_number: Optional[int] = None
    bm25_score: float = 0.0
    semantic_score: float = 0.0
    matched_keywords: List[str] = Field(default_factory=list)


class RequirementMatchResult(BaseModel):
    requirement: RequirementAtom
    keyword_score: float = 0.0
    semantic_score: float = 0.0
    fused_score: float = 0.0
    is_met: bool = False
    evidence: List[RequirementMatchEvidence] = Field(default_factory=list)


class CandidateResult(BaseModel):
    candidate_id: str
    filename: str
    overall_score: float = 0.0
    technical_score: float = 0.0
    experience_score: float = 0.0
    domain_score: float = 0.0
    soft_skill_score: float = 0.0
    must_have_coverage: float = 0.0
    must_have_met: int = 0
    must_have_total: int = 0
    preference_score: float = 0.0
    requirement_matches: List[RequirementMatchResult] = Field(default_factory=list)
    rank: int = 0


class MatchingResponse(BaseModel):
    job_title: Optional[str] = None
    total_requirements: int = 0
    must_have_total: int = 0
    preferred_total: int = 0
    nice_to_have_total: int = 0
    candidates_count: int = 0
    candidates: List[CandidateResult] = Field(default_factory=list)
    is_demo: bool = False
    demo_reason: Optional[str] = None


class ProcessingStageResponse(BaseModel):
    stage: ProcessingStageName
    status: ProcessingStatus
    progress: float = 0.0
    message: Optional[str] = None
    error: Optional[str] = None

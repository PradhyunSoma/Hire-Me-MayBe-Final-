from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from app.schemas.matching import (
    RequirementAtom,
    RequirementMatchEvidence,
    RequirementMatchResult,
    CandidateResult,
    MatchingResponse,
    RequirementType,
    Importance,
)
from app.services.bm25_retriever import BM25Retriever
from app.services.semantic_retriever import SemanticRetriever
from app.utils.chunking import ResumeChunker
from app.utils.text import normalize_text


class ScoringService:
    def __init__(
        self,
        technical_kw_weight: float = 0.55,
        technical_sem_weight: float = 0.45,
        experience_kw_weight: float = 0.25,
        experience_sem_weight: float = 0.75,
        default_kw_weight: float = 0.40,
        default_sem_weight: float = 0.60,
        must_have_threshold: float = 0.35,
        preferred_threshold: float = 0.30,
        nice_to_have_threshold: float = 0.25,
        top_k_evidence: int = 3,
    ):
        self.type_weights = {
            RequirementType.TECHNICAL: (technical_kw_weight, technical_sem_weight),
            RequirementType.EXPERIENCE: (experience_kw_weight, experience_sem_weight),
            RequirementType.DOMAIN: (default_kw_weight, default_sem_weight),
            RequirementType.SOFT_SKILL: (default_kw_weight, default_sem_weight),
        }
        self.importance_thresholds = {
            Importance.MUST_HAVE: must_have_threshold,
            Importance.PREFERRED: preferred_threshold,
            Importance.NICE_TO_HAVE: nice_to_have_threshold,
        }
        self.importance_scores = {
            Importance.MUST_HAVE: 1.0,
            Importance.PREFERRED: 0.6,
            Importance.NICE_TO_HAVE: 0.3,
        }
        self.top_k_evidence = top_k_evidence
        self.chunker = ResumeChunker(chunk_size=300, overlap=50)

    def score_candidate(
        self,
        resume_text: str,
        resume_pages: Optional[List[Dict]] = None,
        requirements: List[RequirementAtom],
        semantic_available: bool = True,
    ) -> CandidateResult:
        chunks = self.chunker.chunk_text(resume_text)
        if not chunks:
            chunks = [normalize_text(resume_text)[:500]] if resume_text else [""]

        chunk_metadata = []
        for idx, chunk in enumerate(chunks):
            page_num = self._find_chunk_page(chunk, resume_pages)
            chunk_metadata.append({"chunk_id": idx, "page_number": page_num})

        bm25 = BM25Retriever()
        bm25.index_corpus(chunks, chunk_metadata)

        sem = SemanticRetriever()
        sem_indexed = False
        if semantic_available and sem.is_available:
            try:
                sem.index_corpus(chunks, chunk_metadata)
                sem_indexed = True
            except Exception:
                sem_indexed = False

        requirement_matches: List[RequirementMatchResult] = []
        scores_by_type: Dict[RequirementType, List[float]] = defaultdict(list)
        must_have_met = 0
        must_have_total = 0

        for req in requirements:
            match_result = self._score_requirement(
                requirement=req,
                bm25_retriever=bm25,
                sem_retriever=sem,
                sem_indexed=sem_indexed,
                chunk_list=chunks,
                chunk_meta=chunk_metadata,
            )
            requirement_matches.append(match_result)
            scores_by_type[req.type].append(match_result.fused_score)

            if req.importance == Importance.MUST_HAVE:
                must_have_total += 1
                if match_result.is_met:
                    must_have_met += 1

        technical_score = self._avg(scores_by_type[RequirementType.TECHNICAL])
        experience_score = self._avg(scores_by_type[RequirementType.EXPERIENCE])
        domain_score = self._avg(scores_by_type[RequirementType.DOMAIN])
        soft_skill_score = self._avg(scores_by_type[RequirementType.SOFT_SKILL])

        weighted_sum = 0.0
        weight_total = 0.0
        for req, match in zip(requirements, requirement_matches):
            imp_weight = self.importance_scores.get(req.importance, 0.5)
            if req.importance == Importance.MUST_HAVE and not match.is_met:
                imp_weight *= 0.2
            weighted_sum += match.fused_score * imp_weight
            weight_total += imp_weight

        overall_score = weighted_sum / weight_total if weight_total > 0 else 0.0

        must_penalty = 0.0
        if must_have_total > 0:
            coverage = must_have_met / must_have_total
            if coverage < 0.5:
                must_penalty = (0.5 - coverage) * 0.4
            elif coverage < 1.0:
                must_penalty = (1.0 - coverage) * 0.1
        overall_score = max(0.0, overall_score - must_penalty)

        preference_agg = 0.0
        preference_total = 0
        for req, match in zip(requirements, requirement_matches):
            if req.importance in (Importance.PREFERRED, Importance.NICE_TO_HAVE):
                w = 0.6 if req.importance == Importance.PREFERRED else 0.3
                preference_agg += match.fused_score * w
                preference_total += w
        preference_score = preference_agg / preference_total if preference_total > 0 else 0.0

        must_have_coverage = (must_have_met / must_have_total) if must_have_total > 0 else 1.0

        return CandidateResult(
            candidate_id="",
            filename="",
            overall_score=round(overall_score, 4),
            technical_score=round(technical_score, 4),
            experience_score=round(experience_score, 4),
            domain_score=round(domain_score, 4),
            soft_skill_score=round(soft_skill_score, 4),
            must_have_coverage=round(must_have_coverage, 4),
            must_have_met=must_have_met,
            must_have_total=must_have_total,
            preference_score=round(preference_score, 4),
            requirement_matches=requirement_matches,
            rank=0,
        )

    def _score_requirement(
        self,
        requirement: RequirementAtom,
        bm25_retriever: BM25Retriever,
        sem_retriever: SemanticRetriever,
        sem_indexed: bool,
        chunk_list: List[str],
        chunk_meta: List[Dict],
    ) -> RequirementMatchResult:
        kw_weight, sem_weight = self.type_weights.get(
            requirement.type, (0.40, 0.60)
        )

        if not sem_indexed:
            kw_weight = 1.0
            sem_weight = 0.0

        kw_results = bm25_retriever.search_requirement(
            requirement, top_k=self.top_k_evidence
        )

        sem_results: List[Tuple[int, float]] = []
        if sem_indexed:
            sem_results = sem_retriever.search_requirement(
                requirement, top_k=self.top_k_evidence
            )

        kw_by_idx: Dict[int, float] = {}
        kw_keywords_by_idx: Dict[int, List[str]] = {}
        for idx, score, kws in kw_results:
            kw_by_idx[idx] = score
            kw_keywords_by_idx[idx] = kws

        sem_by_idx: Dict[int, float] = {}
        for idx, score in sem_results:
            sem_by_idx[idx] = score

        all_indices = set(kw_by_idx.keys()) | set(sem_by_idx.keys())

        fused_by_idx: Dict[int, float] = {}
        for idx in all_indices:
            kw_s = kw_by_idx.get(idx, 0.0)
            sem_s = sem_by_idx.get(idx, 0.0)
            fused_by_idx[idx] = kw_s * kw_weight + sem_s * sem_weight

        sorted_indices = sorted(fused_by_idx.keys(), key=lambda i: fused_by_idx[i], reverse=True)

        evidence_list: List[RequirementMatchEvidence] = []
        for idx in sorted_indices[: self.top_k_evidence]:
            chunk = chunk_list[idx] if idx < len(chunk_list) else ""
            meta = chunk_meta[idx] if idx < len(chunk_meta) else {}
            evidence_list.append(RequirementMatchEvidence(
                resume_chunk=chunk,
                chunk_index=idx,
                page_number=meta.get("page_number"),
                bm25_score=round(kw_by_idx.get(idx, 0.0), 4),
                semantic_score=round(sem_by_idx.get(idx, 0.0), 4),
                matched_keywords=kw_keywords_by_idx.get(idx, []),
            ))

        top_kw_score = kw_by_idx[sorted_indices[0]] if sorted_indices and sorted_indices[0] in kw_by_idx else 0.0
        top_sem_score = sem_by_idx[sorted_indices[0]] if sorted_indices and sorted_indices[0] in sem_by_idx else 0.0
        top_fused = fused_by_idx[sorted_indices[0]] if sorted_indices else 0.0

        if not kw_results and not sem_results:
            if requirement.keywords:
                resume_big_text = " ".join(chunk_list).lower()
                kw_hits = sum(1 for kw in requirement.keywords if kw in resume_big_text)
                if requirement.keywords:
                    top_kw_score = kw_hits / len(requirement.keywords)
                    top_fused = top_kw_score * kw_weight

        threshold = self.importance_thresholds.get(requirement.importance, 0.30)
        is_met = top_fused >= threshold

        return RequirementMatchResult(
            requirement=requirement,
            keyword_score=round(top_kw_score, 4),
            semantic_score=round(top_sem_score, 4),
            fused_score=round(top_fused, 4),
            is_met=is_met,
            evidence=evidence_list,
        )

    def rank_candidates(self, candidates: List[CandidateResult]) -> List[CandidateResult]:
        def sort_key(c: CandidateResult) -> Tuple[float, float, float, float]:
            return (
                c.must_have_coverage,
                c.overall_score,
                c.preference_score,
                c.technical_score,
            )

        sorted_candidates = sorted(candidates, key=sort_key, reverse=True)
        for rank, cand in enumerate(sorted_candidates, start=1):
            cand.rank = rank
        return sorted_candidates

    def build_matching_response(
        self,
        candidates: List[CandidateResult],
        requirements: List[RequirementAtom],
        job_title: Optional[str] = None,
        is_demo: bool = False,
        demo_reason: Optional[str] = None,
    ) -> MatchingResponse:
        ranked = self.rank_candidates(candidates)

        must_total = sum(1 for r in requirements if r.importance == Importance.MUST_HAVE)
        pref_total = sum(1 for r in requirements if r.importance == Importance.PREFERRED)
        nice_total = sum(1 for r in requirements if r.importance == Importance.NICE_TO_HAVE)

        return MatchingResponse(
            job_title=job_title,
            total_requirements=len(requirements),
            must_have_total=must_total,
            preferred_total=pref_total,
            nice_to_have_total=nice_total,
            candidates_count=len(ranked),
            candidates=ranked,
            is_demo=is_demo,
            demo_reason=demo_reason,
        )

    def generate_demo_result(
        self,
        resume_filenames: List[str],
        requirements: List[RequirementAtom],
        job_title: Optional[str] = None,
        reason: str = "Models not loaded - using fallback demo generator",
    ) -> MatchingResponse:
        import random
        random.seed(42)

        demo_candidates: List[CandidateResult] = []
        for idx, filename in enumerate(resume_filenames):
            base_score = 0.3 + random.random() * 0.65

            req_matches: List[RequirementMatchResult] = []
            must_met = 0
            must_total = 0

            for req in requirements:
                req_score = min(1.0, max(0.0, base_score + (random.random() - 0.5) * 0.4))
                kw_s = min(1.0, req_score * (0.7 + random.random() * 0.3))
                sem_s = min(1.0, req_score * (0.8 + random.random() * 0.2))
                threshold = self.importance_thresholds.get(req.importance, 0.30)
                is_met = req_score >= threshold

                if req.importance == Importance.MUST_HAVE:
                    must_total += 1
                    if is_met:
                        must_met += 1

                req_matches.append(RequirementMatchResult(
                    requirement=req,
                    keyword_score=round(kw_s, 4),
                    semantic_score=round(sem_s, 4),
                    fused_score=round(req_score, 4),
                    is_met=is_met,
                    evidence=[
                        RequirementMatchEvidence(
                            resume_chunk=f"[Demo evidence] Resume section relevant to: {req.text[:80]}...",
                            chunk_index=0,
                            page_number=1,
                            bm25_score=round(kw_s * 0.8, 4),
                            semantic_score=round(sem_s * 0.9, 4),
                            matched_keywords=req.keywords[:3],
                        )
                    ] if is_met else [],
                ))

            must_cov = must_met / must_total if must_total > 0 else 1.0

            type_scores: Dict[RequirementType, List[float]] = defaultdict(list)
            for req, m in zip(requirements, req_matches):
                type_scores[req.type].append(m.fused_score)

            demo_candidates.append(CandidateResult(
                candidate_id=f"demo-{idx}",
                filename=filename,
                overall_score=round(base_score, 4),
                technical_score=round(self._avg(type_scores[RequirementType.TECHNICAL]), 4),
                experience_score=round(self._avg(type_scores[RequirementType.EXPERIENCE]), 4),
                domain_score=round(self._avg(type_scores[RequirementType.DOMAIN]), 4),
                soft_skill_score=round(self._avg(type_scores[RequirementType.SOFT_SKILL]), 4),
                must_have_coverage=round(must_cov, 4),
                must_have_met=must_met,
                must_have_total=must_total,
                preference_score=round(base_score * 0.8, 4),
                requirement_matches=req_matches,
                rank=0,
            ))

        return self.build_matching_response(
            candidates=demo_candidates,
            requirements=requirements,
            job_title=job_title,
            is_demo=True,
            demo_reason=reason,
        )

    def _avg(self, values: List[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

    def _find_chunk_page(self, chunk: str, resume_pages: Optional[List[Dict]]) -> Optional[int]:
        if not resume_pages:
            return None
        chunk_norm = normalize_text(chunk)[:100]
        if not chunk_norm:
            return None
        for page in resume_pages:
            page_text = normalize_text(page.get("text", ""))
            if chunk_norm and chunk_norm in page_text:
                return page.get("page_number")
        return resume_pages[0].get("page_number") if resume_pages else None

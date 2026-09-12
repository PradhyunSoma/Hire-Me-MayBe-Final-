from rank_bm25 import BM25Okapi
from typing import List, Dict, Optional, Tuple
from app.utils.text import tokenize, normalize_text
from app.schemas.matching import RequirementAtom


class BM25Retriever:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.bm25: Optional[BM25Okapi] = None
        self.chunks: List[str] = []
        self.chunk_metadata: List[Dict] = []
        self.tokenized_corpus: List[List[str]] = []

    def index_corpus(self, chunks: List[str], metadata: Optional[List[Dict]] = None) -> None:
        if not chunks:
            raise ValueError("Cannot index empty chunk list")

        self.chunks = chunks
        self.chunk_metadata = metadata or [{} for _ in chunks]

        self.tokenized_corpus = [tokenize(chunk) for chunk in chunks]

        self.tokenized_corpus = [
            tokens if tokens else [""] for tokens in self.tokenized_corpus
        ]

        self.bm25 = BM25Okapi(self.tokenized_corpus, k1=self.k1, b=self.b)

    def search(
        self,
        query: str,
        top_k: int = 10,
        min_score: float = 0.0,
    ) -> List[Tuple[int, float, List[str]]]:
        if self.bm25 is None:
            raise ValueError("BM25 index not initialized. Call index_corpus first.")

        if not query or not query.strip():
            return []

        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        scores = self.bm25.get_scores(query_tokens)

        max_score = max(scores) if len(scores) > 0 and max(scores) > 0 else 1.0
        normalized_scores = [s / max_score for s in scores]

        scored_indices: List[Tuple[int, float]] = []
        for idx, score in enumerate(normalized_scores):
            if score >= min_score:
                scored_indices.append((idx, score))

        scored_indices.sort(key=lambda x: x[1], reverse=True)
        top_results = scored_indices[:top_k]

        results = []
        for idx, score in top_results:
            chunk_tokens = self.tokenized_corpus[idx] if idx < len(self.tokenized_corpus) else []
            matched_keywords = list(set(query_tokens) & set(chunk_tokens))
            results.append((idx, score, matched_keywords))

        return results

    def search_requirement(
        self,
        requirement: RequirementAtom,
        top_k: int = 5,
        boost_keywords: bool = True,
    ) -> List[Tuple[int, float, List[str]]]:
        query_parts = [requirement.text]
        if boost_keywords and requirement.keywords:
            kw_boost = " ".join(requirement.keywords * 2)
            query_parts.append(kw_boost)

        combined_query = " ".join(query_parts)
        return self.search(combined_query, top_k=top_k)

    def get_chunk(self, idx: int) -> Optional[str]:
        if 0 <= idx < len(self.chunks):
            return self.chunks[idx]
        return None

    def get_chunk_metadata(self, idx: int) -> Dict:
        if 0 <= idx < len(self.chunk_metadata):
            return self.chunk_metadata[idx]
        return {}

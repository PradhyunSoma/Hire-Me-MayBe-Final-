from typing import List, Dict, Optional, Tuple
import numpy as np
from app.schemas.matching import RequirementAtom


class SemanticRetriever:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self._model_loaded = False
        self._load_error: Optional[str] = None

        self.chunks: List[str] = []
        self.chunk_metadata: List[Dict] = []
        self.chunk_embeddings: Optional[np.ndarray] = None

    def _lazy_load_model(self) -> bool:
        if self._model_loaded:
            return self.model is not None

        if self._load_error is not None:
            return False

        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
            self._model_loaded = True
            return True
        except Exception as e:
            self._load_error = str(e)
            self._model_loaded = True
            return False

    @property
    def is_available(self) -> bool:
        if not self._model_loaded:
            return self._lazy_load_model()
        return self.model is not None

    @property
    def availability_reason(self) -> Optional[str]:
        if self.is_available:
            return None
        if self._load_error:
            return f"Model failed to load: {self._load_error}"
        return "Model not loaded"

    def index_corpus(self, chunks: List[str], metadata: Optional[List[Dict]] = None) -> bool:
        if not chunks:
            raise ValueError("Cannot index empty chunk list")

        self.chunks = chunks
        self.chunk_metadata = metadata or [{} for _ in chunks]

        if not self._lazy_load_model():
            self.chunk_embeddings = None
            return False

        try:
            self.chunk_embeddings = self.model.encode(
                chunks,
                convert_to_numpy=True,
                show_progress_bar=False,
                normalize_embeddings=True,
            )
            return True
        except Exception:
            self.chunk_embeddings = None
            return False

    def search(
        self,
        query: str,
        top_k: int = 10,
        min_score: float = 0.0,
    ) -> List[Tuple[int, float]]:
        if self.chunk_embeddings is None:
            return []

        if not query or not query.strip():
            return []

        if not self._lazy_load_model():
            return []

        try:
            query_embedding = self.model.encode(
                [query],
                convert_to_numpy=True,
                show_progress_bar=False,
                normalize_embeddings=True,
            )

            similarities = np.dot(self.chunk_embeddings, query_embedding.T).flatten()
            similarities = np.clip(similarities, 0.0, 1.0)

            scored_indices: List[Tuple[int, float]] = []
            for idx, score in enumerate(similarities):
                if float(score) >= min_score:
                    scored_indices.append((idx, float(score)))

            scored_indices.sort(key=lambda x: x[1], reverse=True)
            return scored_indices[:top_k]

        except Exception:
            return []

    def search_requirement(
        self,
        requirement: RequirementAtom,
        top_k: int = 5,
    ) -> List[Tuple[int, float]]:
        query_parts = [requirement.text]
        if requirement.keywords:
            query_parts.append(" ".join(requirement.keywords))

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

    def batch_score_queries_against_corpus(
        self,
        queries: List[str],
    ) -> Optional[np.ndarray]:
        if self.chunk_embeddings is None or not queries:
            return None

        if not self._lazy_load_model():
            return None

        try:
            query_embeddings = self.model.encode(
                queries,
                convert_to_numpy=True,
                show_progress_bar=False,
                normalize_embeddings=True,
            )
            scores = np.dot(query_embeddings, self.chunk_embeddings.T)
            scores = np.clip(scores, 0.0, 1.0)
            return scores
        except Exception:
            return None

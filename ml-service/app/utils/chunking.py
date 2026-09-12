from typing import List
import re


class ResumeChunker:
    def __init__(self, chunk_size: int = 300, overlap: int = 50):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_text(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []

        sections = self._split_sections(text)
        chunks: List[str] = []

        for section in sections:
            section_chunks = self._chunk_section(section)
            chunks.extend(section_chunks)

        return chunks if chunks else [text.strip()]

    def _split_sections(self, text: str) -> List[str]:
        section_pattern = re.compile(
            r'\n\s*(?:EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT|'
            r'EDUCATION|SKILLS|TECHNICAL SKILLS|PROJECTS|CERTIFICATIONS|AWARDS|'
            r'SUMMARY|OBJECTIVE|PROFILE|ABOUT)[\s:：]*\n',
            re.IGNORECASE
        )
        parts = section_pattern.split(text)
        headers = section_pattern.findall(text)

        sections = []
        if parts[0].strip():
            sections.append(parts[0].strip())
        for i, header in enumerate(headers):
            idx = i + 1
            if idx < len(parts):
                combined = header.strip() + "\n" + parts[idx].strip()
                sections.append(combined.strip())

        return sections if sections else [text.strip()]

    def _chunk_section(self, section: str) -> List[str]:
        sentences = re.split(r'(?<=[.!?])\s+|\n+', section)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return [section.strip()]

        chunks: List[str] = []
        current_chunk = ""
        current_len = 0

        for sentence in sentences:
            sentence_len = len(sentence.split())
            if current_len + sentence_len > self.chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                overlap_words = current_chunk.split()[-self.overlap:] if self.overlap > 0 else []
                current_chunk = " ".join(overlap_words) + " " if overlap_words else ""
                current_len = len(current_chunk.split()) if current_chunk.strip() else 0
            current_chunk += sentence + " "
            current_len += sentence_len

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks if chunks else [section.strip()]

    def chunk_with_metadata(self, text: str, source: str = "resume") -> List[dict]:
        chunks = self.chunk_text(text)
        return [
            {"text": chunk, "source": source, "chunk_id": idx}
            for idx, chunk in enumerate(chunks)
        ]

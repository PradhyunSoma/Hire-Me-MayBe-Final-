import fitz
from typing import List, Dict, Optional
import io


class DocumentExtractionError(Exception):
    pass


class EmptyDocumentError(DocumentExtractionError):
    pass


class PDFExtractor:
    def __init__(self):
        pass

    def extract_from_bytes(self, pdf_bytes: bytes) -> Dict:
        try:
            document = fitz.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
        except Exception as e:
            raise DocumentExtractionError(f"Failed to open PDF: {str(e)}")

        try:
            total_pages = len(document)

            if total_pages == 0:
                raise EmptyDocumentError("PDF contains no pages")

            pages: List[Dict] = []
            full_text_parts: List[str] = []

            for page_num in range(total_pages):
                page = document.load_page(page_num)
                text = page.get_text("text")

                blocks = page.get_text("blocks")
                block_texts = []
                for b in blocks:
                    if len(b) >= 4:
                        block_texts.append(b[4])

                cleaned_text = self._clean_text(text)
                pages.append({
                    "page_number": page_num + 1,
                    "text": cleaned_text,
                    "character_count": len(cleaned_text),
                    "block_count": len(block_texts),
                })
                full_text_parts.append(cleaned_text)

            full_text = "\n\n".join(full_text_parts)

            if not full_text.strip():
                raise EmptyDocumentError("PDF contains no extractable text (possibly scanned image)")

            document.close()

            return {
                "total_pages": total_pages,
                "total_characters": len(full_text),
                "total_words": len(full_text.split()),
                "full_text": full_text,
                "pages": pages,
            }
        except EmptyDocumentError:
            document.close()
            raise
        except Exception as e:
            document.close()
            raise DocumentExtractionError(f"Failed to extract text from PDF: {str(e)}")

    def extract_from_file(self, file_path: str) -> Dict:
        with open(file_path, "rb") as f:
            return self.extract_from_bytes(f.read())

    def get_page_text(self, pdf_bytes: bytes, page_number: int) -> Optional[str]:
        try:
            document = fitz.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
            if page_number < 1 or page_number > len(document):
                document.close()
                return None
            page = document.load_page(page_number - 1)
            text = self._clean_text(page.get_text("text"))
            document.close()
            return text
        except Exception:
            return None

    def _clean_text(self, text: str) -> str:
        if not text:
            return ""
        import re
        text = text.replace('\x00', '')
        text = re.sub(r'[ \t]+', ' ', text)
        lines = text.split('\n')
        cleaned_lines = [line.rstrip() for line in lines]
        result = '\n'.join(cleaned_lines)
        result = re.sub(r'\n{3,}', '\n\n', result)
        return result.strip()

    def extract_with_line_mapping(self, pdf_bytes: bytes) -> List[Dict]:
        try:
            document = fitz.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
        except Exception as e:
            raise DocumentExtractionError(f"Failed to open PDF: {str(e)}")

        lines_with_meta = []
        for page_num in range(len(document)):
            page = document.load_page(page_num)
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    line_text = ""
                    for span in line.get("spans", []):
                        line_text += span.get("text", "")
                    cleaned = line_text.strip()
                    if cleaned:
                        lines_with_meta.append({
                            "text": cleaned,
                            "page_number": page_num + 1,
                            "bbox": line.get("bbox", None),
                        })
        document.close()
        return lines_with_meta

import re
import unicodedata
from typing import List


def normalize_text(text: str) -> str:
    if not text:
        return ""

    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")

    text = text.lower()

    text = re.sub(r'[^\w\s]', ' ', text)

    text = re.sub(r'\s+', ' ', text).strip()

    return text


def normalize_whitespace(text: str) -> str:
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()


def remove_extra_newlines(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    lines = [line.strip() for line in text.split('\n')]
    return '\n'.join(line for line in lines if line)


def tokenize(text: str) -> List[str]:
    normalized = normalize_text(text)
    if not normalized:
        return []
    return normalized.split()


def extract_keywords(text: str, min_length: int = 2) -> List[str]:
    tokens = tokenize(text)
    stopwords = {
        'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'of', 'at',
        'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
        'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
        'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'is', 'am',
        'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
        'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
        'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this',
        'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
        'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him',
        'his', 'himself', 'she', 'her', 'hers', 'herself', 'they', 'them', 'their',
        'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose', 'as',
        'until', 'while', 'of', 'all', 'any', 'both', 'each', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
        'so', 'than', 'too', 'very', 'just', 'because', 'also', 'such', 'now',
        'here', 'there', 'when', 'where', 'why', 'how', 's', 't', 'years', 'year',
        'experience', 'work', 'working', 'worked', 'skill', 'skills', 'ability',
        'abilities', 'knowledge', 'required', 'requirement', 'requirements',
        'must', 'should', 'preferred', 'nice', 'have', 'has', 'including'
    }
    return [t for t in tokens if len(t) >= min_length and t not in stopwords]

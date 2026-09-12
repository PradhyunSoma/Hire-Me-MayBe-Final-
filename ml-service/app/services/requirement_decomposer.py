import re
import uuid
from typing import List, Dict, Tuple, Optional
from app.schemas.matching import RequirementAtom, RequirementType, Importance
from app.utils.text import normalize_text, extract_keywords


class RequirementDecomposer:
    def __init__(self):
        self._compile_patterns()

    def _compile_patterns(self):
        self.bullet_pattern = re.compile(
            r'^[\s]*[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25D8\u25D9\u2765\u2767\u29BE\u29BF\*•·\-–—]+\s+',
            re.MULTILINE
        )
        self.numbered_pattern = re.compile(
            r'^[\s]*\(?\d+[\.\)]\s+',
            re.MULTILINE
        )
        self.lettered_pattern = re.compile(
            r'^[\s]*\(?[a-zA-Z][\.\)]\s+',
            re.MULTILINE
        )

        self.tech_keywords = [
            "python", "java", "javascript", "typescript", "c\+\+", "c#", "go", "golang",
            "rust", "ruby", "php", "swift", "kotlin", "scala", "node", "react", "vue",
            "angular", "django", "flask", "fastapi", "spring", "hibernate", "express",
            "next.js", "nuxt", "svelte", "kubernetes", "docker", "aws", "azure", "gcp",
            "sql", "nosql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
            "kafka", "rabbitmq", "git", "ci/cd", "jenkins", "terraform", "ansible",
            "machine learning", "deep learning", "tensorflow", "pytorch", "pandas",
            "numpy", "sklearn", "scikit-learn", "spark", "hadoop", "airflow", "dbt",
            "snowflake", "bigquery", "redshift", "api", "rest", "graphql", "grpc",
            "microservices", "devops", "sre", "linux", "unix", "bash", "shell",
            "agile", "scrum", "jira", "html", "css", "sass", "less", "tailwind",
            "webpack", "vite", "jest", "pytest", "mocha", "cypress", "selenium",
            "oauth", "jwt", "ssl", "tls", "security", "encryption", "hashing"
        ]

        self.experience_phrases = [
            r"\d+\+?\s*(year|yr|years|yrs)\s+(of\s+)?(experience|work\s*experience|professional\s*experience)",
            r"(experience|background|track\s*record)\s+(in|with|working\s+in|building)",
            r"(minimum|at\s*least|min\.?)\s+\d+\+?\s*(year|yr|years|yrs)",
            r"\d+\+?\s*(year|yr|years|yrs)\s+.*?(?:in|using|with)",
            r"(prior|previous)\s+experience",
            r"(hands\s*-?on|practical)\s+experience",
            r"(proven|demonstrated)\s+(track\s+record|experience)",
        ]

        self.domain_keywords = [
            "finance", "fintech", "banking", "trading", "investment", "insurance",
            "healthcare", "medical", "clinical", "pharmaceutical", "biotech",
            "ecommerce", "retail", "logistics", "supply chain", "manufacturing",
            "saas", "b2b", "b2c", "marketplace", "gaming", "entertainment",
            "media", "advertising", "marketing", "sales", "crm", "erp", "hr",
            "education", "edtech", "legal", "regtech", "government", "public sector",
            "telecom", "networking", "cloud", "cybersecurity", "iot", "blockchain",
            "cryptocurrency", "web3", "nlp", "computer vision", "generative ai",
            "llm", "data science", "analytics", "business intelligence",
        ]

        self.soft_skill_keywords = [
            "communication", "verbal", "written", "presentation", "public speaking",
            "teamwork", "collaboration", "interpersonal", "leadership", "management",
            "mentoring", "coaching", "problem solving", "critical thinking", "analytical",
            "creativity", "innovation", "adaptability", "flexibility", "resilience",
            "time management", "organizational", "detail oriented", "self motivated",
            "proactive", "independent", "decision making", "strategic thinking",
            "emotional intelligence", "conflict resolution", "negotiation",
            "customer service", "client facing", "stakeholder management",
            "cross functional", "multitasking", "prioritization",
        ]

        self.must_have_indicators = [
            r"\bmust\b", r"\brequired\b", r"\bmandatory\b", r"\bessential\b",
            r"\bneed(?:s|ed)?\b", r"\bshall\b", r"\bminimum\b", r"\bcan't do without\b",
            r"\bwithout.*(?:it|this|these)\b.*won't\b", r"\bcannot (?:be |)ignore\b",
        ]

        self.preferred_indicators = [
            r"\bpreferred\b", r"\badvantage\b", r"\bplus\b", r"\bbonus\b",
            r"\bideal(?:ly)?\b", r"\bwould be (?:nice|great)\b", r"\bgreat to have\b",
            r"\bits? a plus\b", r"\badded advantage\b",
        ]

        self.nice_to_have_indicators = [
            r"\bnice to have\b", r"\bgood to have\b", r"\bdesirable\b",
            r"\boptional\b", r"\basset\b", r"\bwould be (?:an )?asset\b",
        ]

        self.section_headers = [
            "requirements", "qualifications", "skills", "what you need",
            "what we're looking for", "what you will do", "responsibilities",
            "your profile", "who you are", "what we expect",
            "must have", "must-haves", "required qualifications",
            "preferred qualifications", "nice to have", "nice-to-haves",
            "technical skills", "experience", "education", "certifications",
        ]

    def decompose(self, jd_text: str) -> Tuple[List[RequirementAtom], Optional[str]]:
        if not jd_text or not jd_text.strip():
            return [], None

        job_title = self._extract_job_title(jd_text)

        jd_lines = self._split_into_lines(jd_text)

        sections = self._split_sections(jd_lines)

        requirements: List[RequirementAtom] = []
        seen_texts = set()

        for section_name, section_lines in sections:
            default_importance = self._section_default_importance(section_name)
            for line in section_lines:
                cleaned = line.strip()
                if len(cleaned) < 6:
                    continue

                candidates = self._extract_candidate_requirements(cleaned)
                for candidate in candidates:
                    norm = normalize_text(candidate)
                    if norm in seen_texts or len(norm.split()) < 3:
                        continue
                    seen_texts.add(norm)

                    req_type = self._classify_requirement(candidate)
                    importance = self._classify_importance(candidate, default_importance)
                    keywords = extract_keywords(candidate, min_length=2)

                    requirements.append(RequirementAtom(
                        id=str(uuid.uuid4())[:8],
                        text=candidate.strip(),
                        type=req_type,
                        importance=importance,
                        keywords=keywords,
                        original_section=section_name,
                    ))

        if not requirements:
            fallback = self._fallback_extract(jd_text)
            for item in fallback:
                norm = normalize_text(item)
                if norm in seen_texts or len(norm.split()) < 3:
                    continue
                seen_texts.add(norm)
                requirements.append(RequirementAtom(
                    id=str(uuid.uuid4())[:8],
                    text=item.strip(),
                    type=self._classify_requirement(item),
                    importance=self._classify_importance(item, Importance.MUST_HAVE),
                    keywords=extract_keywords(item, min_length=2),
                    original_section="general",
                ))

        return requirements, job_title

    def _split_into_lines(self, text: str) -> List[str]:
        lines = text.split('\n')
        result = []
        for line in lines:
            stripped = line.strip()
            if stripped:
                result.append(stripped)
        return result

    def _split_sections(self, lines: List[str]) -> List[Tuple[str, List[str]]]:
        sections: List[Tuple[str, List[str]]] = []
        current_section = "general"
        current_lines: List[str] = []

        for line in lines:
            line_lower = line.lower().rstrip(':').rstrip()
            matched_header = None
            for header in self.section_headers:
                if line_lower == header or line_lower.endswith(" " + header):
                    matched_header = header
                    break

            if matched_header:
                if current_lines:
                    sections.append((current_section, current_lines))
                current_section = matched_header
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines:
            sections.append((current_section, current_lines))

        return sections

    def _extract_candidate_requirements(self, line: str) -> List[str]:
        stripped = self.bullet_pattern.sub('', line)
        stripped = self.numbered_pattern.sub('', stripped)
        stripped = self.lettered_pattern.sub('', stripped)
        stripped = stripped.strip()

        if not stripped:
            return []

        sub_items = re.split(r'[;|]|(?:, )(?=and |or |with |experience |knowledge |familiar )', stripped)
        if len(sub_items) <= 1:
            return [stripped]

        results = []
        for item in sub_items:
            item = item.strip()
            if item and len(item.split()) >= 3:
                results.append(item)
        return results if results else [stripped]

    def _classify_requirement(self, text: str) -> RequirementType:
        text_lower = text.lower()

        for pattern in self.experience_phrases:
            if re.search(pattern, text_lower):
                return RequirementType.EXPERIENCE

        tech_hits = sum(1 for kw in self.tech_keywords if kw in text_lower)
        domain_hits = sum(1 for kw in self.domain_keywords if kw in text_lower)
        soft_hits = sum(1 for kw in self.soft_skill_keywords if kw in text_lower)

        scores = {
            RequirementType.TECHNICAL: tech_hits * 2,
            RequirementType.DOMAIN: domain_hits * 1.5,
            RequirementType.SOFT_SKILL: soft_hits * 2,
            RequirementType.EXPERIENCE: 0,
        }

        best_type = max(scores, key=scores.get)
        if scores[best_type] >= 2:
            return best_type
        if scores[RequirementType.TECHNICAL] >= 1:
            return RequirementType.TECHNICAL
        return RequirementType.TECHNICAL

    def _classify_importance(self, text: str, default: Importance = Importance.MUST_HAVE) -> Importance:
        text_lower = text.lower()

        for pattern in self.nice_to_have_indicators:
            if re.search(pattern, text_lower):
                return Importance.NICE_TO_HAVE

        for pattern in self.preferred_indicators:
            if re.search(pattern, text_lower):
                return Importance.PREFERRED

        for pattern in self.must_have_indicators:
            if re.search(pattern, text_lower):
                return Importance.MUST_HAVE

        return default

    def _section_default_importance(self, section_name: str) -> Importance:
        name = section_name.lower()
        if any(w in name for w in ["must have", "must", "required", "mandatory", "essential", "minimum"]):
            return Importance.MUST_HAVE
        if any(w in name for w in ["preferred", "advantage", "plus", "bonus", "ideal"]):
            return Importance.PREFERRED
        if any(w in name for w in ["nice to have", "nice", "optional", "desirable"]):
            return Importance.NICE_TO_HAVE
        if any(w in name for w in ["responsibility", "what you will do", "duties"]):
            return Importance.NICE_TO_HAVE
        return Importance.MUST_HAVE

    def _extract_job_title(self, jd_text: str) -> Optional[str]:
        lines = jd_text.strip().split('\n')
        first_few = [l.strip() for l in lines[:10] if l.strip()]

        for line in first_few:
            if len(line) > 60:
                continue
            line_lower = line.lower()
            if any(w in line_lower for w in ["engineer", "developer", "scientist", "analyst", "manager",
                                               "designer", "architect", "lead", "specialist", "consultant",
                                               "director", "head of", "vp of", "intern"]):
                return line.strip()[:80]

        if first_few:
            title_candidate = first_few[0]
            if len(title_candidate) < 80:
                return title_candidate
        return None

    def _fallback_extract(self, jd_text: str) -> List[str]:
        sentences = re.split(r'(?<=[.!?])\s+|\n+', jd_text)
        results = []
        for s in sentences:
            s = s.strip()
            if 20 <= len(s) <= 300 and len(s.split()) >= 5:
                results.append(s)
        return results[:50]

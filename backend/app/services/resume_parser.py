import re
from datetime import datetime
from pathlib import Path

from pydantic import ValidationError

from app.ai.prompts import RESUME_EXTRACTION_PROMPT
from app.schemas.resume import ResumeExtraction


class ResumeParserService:
    SECTION_HEADINGS = {
        "summary", "professional summary", "profile", "objective", "career objective",
        "skills", "technical skills", "soft skills", "core skills", "key skills",
        "education", "academic background", "qualification", "qualifications",
        "experience", "work experience", "professional experience", "employment",
        "internship", "internships", "training", "industrial training",
        "project", "projects", "academic project", "academic projects",
        "personal project", "personal projects", "major project", "major projects",
        "key project", "key projects", "project work", "project details",
        "certification", "certifications", "certificate", "certificates",
        "license", "licenses", "courses", "coursework", "professional training",
        "achievement", "achievements", "award", "awards", "honors",
        "accomplishment", "accomplishments", "extra curricular", "activities",
        "languages", "hobbies", "interests", "declaration",
    }

    def extract_text_from_pdf(self, file_path: str) -> str:
        try:
            import fitz

            text_chunks = []
            with fitz.open(file_path) as document:
                for page in document:
                    text_chunks.append(page.get_text("text"))
            return "\n".join(text_chunks)
        except ImportError:
            from pypdf import PdfReader

            reader = PdfReader(file_path)
            text_chunks = []
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text_chunks.append(page_text)
            return "\n".join(text_chunks)

    def clean_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    def build_structured_resume(self, raw_text: str) -> dict:
        text = self.clean_text(raw_text)
        skills = self._extract_skill_keywords(text)
        technical_skills = self._extract_skill_keywords(text, technical_only=True)
        candidate = {
            "raw_text": text,
            "name": self._extract_name(text),
            "email": self._extract_email(text),
            "phone": self._extract_phone(text),
            "location": self._extract_location(text),
            "summary": self._extract_summary(raw_text),
            "skills": skills,
            "technical_skills": technical_skills,
            "soft_skills": ["Communication", "Teamwork", "Leadership"],
            "education": self._extract_education(raw_text),
            "experience": self._extract_experience(raw_text),
            "projects": self._extract_projects(raw_text),
            "certifications": self._extract_text_items(raw_text, [
                "certification", "certifications", "certificate", "certificates",
                "license", "licenses", "courses", "coursework", "training",
                "professional training",
            ]),
            "achievements": self._extract_text_items(raw_text, [
                "achievement", "achievements", "award", "awards", "honors",
                "accomplishment", "accomplishments",
            ]),
        }

        try:
            ResumeExtraction.model_validate(candidate)
        except ValidationError:
            pass
        return candidate

    def _extract_name(self, text: str) -> str | None:
        match = re.search(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b", text)
        return match.group(0) if match else None

    def _extract_email(self, text: str) -> str | None:
        match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
        return match.group(0) if match else None

    def _extract_phone(self, text: str) -> str | None:
        match = re.search(r"(?:\+?\d[\d\s\-()]{7,}\d)", text)
        return match.group(0).strip() if match else None

    def _extract_location(self, text: str) -> str | None:
        for term in [
            "Bengaluru", "Bangalore", "Delhi", "Mumbai", "Hyderabad", "Pune",
            "Chennai", "Noida", "Gurugram", "Gurgaon", "Kolkata", "Ahmedabad",
            "Remote", "India",
        ]:
            if term.lower() in text.lower():
                return term
        return None

    def _extract_summary(self, text: str) -> str | None:
        summary = self._extract_section_text(text, ["summary", "professional summary", "profile", "objective"])
        if summary:
            return self.clean_text(summary)[:350]
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", self.clean_text(text)) if s.strip()]
        return sentences[0][:250] if sentences else None

    def _extract_skill_keywords(self, text: str, technical_only: bool = False) -> list[str]:
        skills = [
            "Python", "FastAPI", "SQLAlchemy", "PostgreSQL", "React", "JavaScript",
            "TypeScript", "Node.js", "Docker", "AWS", "Kubernetes", "Redis",
            "Git", "REST API", "SQL", "Machine Learning", "AI", "LLM",
            "Playwright", "CSS", "HTML", "Tailwind", "Django", "Flask",
            "Java", "C++", "C#", "PHP", "Laravel", "Spring Boot", "MongoDB",
            "MySQL", "SQLite", "GraphQL", "Next.js", "Vue", "Angular",
            "TensorFlow", "PyTorch", "Pandas", "NumPy", "Power BI", "Tableau",
            "Excel", "Jupyter", "Scikit-learn", "NLP", "Computer Vision",
            "Azure", "GCP", "CI/CD", "Linux", "Figma",
        ]
        lowered = text.lower()
        matches = []
        for skill in skills:
            if skill.lower() in lowered:
                matches.append(skill)
        if technical_only:
            return matches
        return sorted(set(matches))

    def _extract_education(self, text: str) -> list[dict]:
        items = self._extract_text_items(text, ["education", "academic background", "qualification", "qualifications"])
        return [{"details": item} for item in items]

    def _extract_experience(self, text: str) -> list[dict]:
        section = self._extract_section_text(text, ["experience", "work experience", "professional experience", "employment", "internship", "internships"])
        if not section:
            return []

        entries = self._group_resume_entries(section, title_pattern=re.compile(
            r"\b(developer|engineer|intern|trainee|analyst|designer|manager|associate|consultant|specialist)\b",
            re.IGNORECASE,
        ))
        structured = []
        for entry in entries:
            first_line = entry[0]
            description_lines = entry[1:]
            dates = self._extract_dates(" ".join(entry))
            title, company, location = self._split_role_line(first_line)
            description = self.clean_text(" ".join(description_lines))
            if not description and len(entry) == 1 and first_line != title:
                description = first_line
            structured.append({
                "title": title or first_line,
                "company": company,
                "location": location,
                "start_date": dates.get("start_date"),
                "end_date": dates.get("end_date"),
                "duration_months": dates.get("duration_months"),
                "description": description,
            })
        return structured

    def _extract_projects(self, text: str) -> list[dict]:
        section = self._extract_section_text(text, [
            "project", "projects", "academic project", "academic projects",
            "personal project", "personal projects", "major project", "major projects",
            "key project", "key projects", "project work", "project details",
        ])
        if section:
            entries = self._group_project_entries(section)
            return [self._structure_project_entry(entry) for entry in entries if entry]

        items = self._extract_project_fallback(text)
        return [self._structure_project_entry([item]) for item in items]

    def _extract_descriptive_section(self, text: str, headings: list[str]) -> list[dict]:
        return [{"description": item} for item in self._extract_text_items(text, headings)]

    def _extract_text_items(self, text: str, headings: list[str]) -> list[str]:
        section = self._extract_section_text(text, headings)
        if not section:
            return []

        lines = []
        for line in section.splitlines():
            clean = re.sub(r"^[\s\-*\u2022\u25cf\u25aa\u2013\u2014]+", "", line).strip()
            if clean:
                lines.append(clean)

        if not lines:
            lines = [part.strip() for part in re.split(r"(?<=[.!?])\s+", self.clean_text(section)) if part.strip()]

        return [line[:500] for line in lines[:10] if len(line) > 2]

    def _group_resume_entries(self, section: str, title_pattern: re.Pattern) -> list[list[str]]:
        raw_lines = []
        for line in section.splitlines():
            clean = re.sub(r"^[\s\-*\u2022\u25cf\u25aa\u2013\u2014]+", "", line).strip()
            if clean:
                raw_lines.append(clean)

        if not raw_lines:
            sentence_items = [part.strip() for part in re.split(r"(?<=[.!?])\s+", self.clean_text(section)) if part.strip()]
            return [[item] for item in sentence_items[:8]]

        entries = []
        current = []
        for line in raw_lines:
            is_title = self._looks_like_entry_title(line, title_pattern)
            if is_title and current:
                entries.append(current)
                current = [line]
            else:
                current.append(line)
        if current:
            entries.append(current)
        return entries[:8]

    def _group_project_entries(self, section: str) -> list[list[str]]:
        raw_lines = []
        for line in section.splitlines():
            clean = re.sub(r"^[\s\-*\u2022\u25cf\u25aa\u2013\u2014]+", "", line).strip()
            if clean:
                raw_lines.append(clean)

        if not raw_lines:
            return []

        entries = []
        current = []
        for line in raw_lines:
            is_title = self._looks_like_project_title(line, has_current=bool(current))
            if is_title and current:
                entries.append(current)
                current = [line]
            else:
                current.append(line)
        if current:
            entries.append(current)
        return entries[:10]

    def _looks_like_project_title(self, line: str, has_current: bool = False) -> bool:
        clean = self.clean_text(line)
        lower = clean.lower().strip(":")
        if lower in {"tech", "technology", "technologies", "tech stack", "technology stack", "tools", "description", "features"}:
            return False
        if re.match(r"^\d+[\).]\s+\S+", clean):
            return True
        if not has_current:
            return True
        if len(clean) > 90:
            return False
        if clean.endswith((".", ",")):
            return False
        if re.match(r"^(?:project\s*)?(?:name|title)\s*[:\-]\s*\S+", clean, re.IGNORECASE):
            return True
        if re.search(r"\s+-\s+|\s+\|\s+", clean):
            left = re.split(r"\s+-\s+|\s+\|\s+", clean, maxsplit=1)[0].strip()
            return len(left.split()) <= 8
        words = clean.split()
        project_title_terms = {"portal", "system", "app", "application", "platform", "dashboard", "website", "tracker", "clone", "chatbot", "api"}
        return 1 <= len(words) <= 7 and any(term in lower for term in project_title_terms)

    def _looks_like_entry_title(self, line: str, title_pattern: re.Pattern) -> bool:
        if len(line) > 130:
            return False
        if title_pattern.search(line):
            return True
        if "|" in line and len(line.split("|", 1)[0].split()) <= 8:
            return True
        if re.search(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b", line, re.IGNORECASE):
            return True
        return False

    def _split_role_line(self, line: str) -> tuple[str | None, str | None, str | None]:
        cleaned = self.clean_text(line)
        without_dates = re.sub(
            r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*(?:-|to|–|—)\s*(?:present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip(" -|,")
        parts = [part.strip() for part in re.split(r"\s+\|\s+|\s+-\s+", without_dates, maxsplit=1) if part.strip()]
        if len(parts) >= 2:
            company_parts = [part.strip() for part in parts[1].split(",") if part.strip()]
            return parts[0], company_parts[0] if company_parts else parts[1], ", ".join(company_parts[1:]) or None

        match = re.search(r"(.+?)\s+(?:at|@)\s+(.+)", without_dates, re.IGNORECASE)
        if match:
            company_parts = [part.strip() for part in match.group(2).split(",") if part.strip()]
            return match.group(1).strip(), company_parts[0] if company_parts else match.group(2).strip(), ", ".join(company_parts[1:]) or None
        return without_dates or None, None, None

    def _structure_project_entry(self, entry: list[str]) -> dict:
        first_line = self.clean_text(entry[0])
        first_line = re.sub(r"^\d+[\).]\s*", "", first_line).strip()
        first_line = re.sub(r"^(?:project\s*)?(?:name|title)\s*[:\-]\s*", "", first_line, flags=re.IGNORECASE).strip()
        description_lines = []
        explicit_technologies = []
        capture_tech_line = False
        for line in entry[1:]:
            clean = self.clean_text(line)
            if not clean:
                continue
            tech_match = re.match(r"^(?:tech|technologies|technology stack|tech stack|tools)\s*[:\-]?\s*(.*)$", clean, re.IGNORECASE)
            if tech_match:
                tech_value = tech_match.group(1).strip()
                if tech_value:
                    explicit_technologies.extend(self._split_technologies(tech_value))
                    capture_tech_line = False
                else:
                    capture_tech_line = True
                continue
            if capture_tech_line:
                explicit_technologies.extend(self._split_technologies(clean))
                capture_tech_line = False
                continue
            description_lines.append(clean)

        title = first_line
        inline_description = ""
        split_match = re.match(r"^(.{3,80}?)(?:\s*[:|]\s+|\s+-\s+)(.{8,})$", first_line)
        if split_match:
            title = split_match.group(1).strip()
            inline_description = split_match.group(2).strip()

        if not description_lines and inline_description:
            description_lines = [inline_description]
        elif inline_description:
            description_lines.insert(0, inline_description)

        description = self.clean_text(" ".join(description_lines))
        technologies = explicit_technologies or self._extract_skill_keywords(" ".join(entry), technical_only=True)
        return {
            "title": title[:120],
            "description": description[:1200],
            "technologies": list(dict.fromkeys(technologies))[:16],
        }

    def _split_technologies(self, value: str) -> list[str]:
        return [
            item.strip(" .")
            for item in re.split(r",|/|\||\band\b", value)
            if item.strip(" .")
        ]

    def _extract_dates(self, text: str) -> dict:
        month_pattern = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}"
        match = re.search(rf"({month_pattern})\s*(?:-|to|–|—)\s*(present|current|{month_pattern})", text, re.IGNORECASE)
        if not match:
            return {"start_date": None, "end_date": None, "duration_months": None}

        start_label = match.group(1)
        end_label = match.group(2)
        start_month = self._month_number(start_label)
        start_year = self._year_number(start_label)
        if not start_month or not start_year:
            return {"start_date": start_label, "end_date": end_label, "duration_months": None}

        if re.search(r"present|current", end_label, re.IGNORECASE):
            now = datetime.utcnow()
            end_month = now.month
            end_year = now.year
        else:
            end_month = self._month_number(end_label)
            end_year = self._year_number(end_label)

        duration = None
        if end_month and end_year:
            duration = max(0, (end_year - start_year) * 12 + (end_month - start_month) + 1)
        return {"start_date": start_label, "end_date": end_label, "duration_months": duration}

    def _month_number(self, value: str) -> int | None:
        months = {
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        }
        match = re.search(r"[A-Za-z]{3}", value)
        return months.get(match.group(0).lower()) if match else None

    def _year_number(self, value: str) -> int | None:
        match = re.search(r"\b(20\d{2}|19\d{2})\b", value)
        return int(match.group(1)) if match else None

    def _extract_section_text(self, text: str, headings: list[str]) -> str | None:
        lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        normalized_targets = {heading.lower() for heading in headings}
        start_index = None
        inline_content = None

        for index, line in enumerate(lines):
            heading_part, content_part = self._split_inline_heading(line)
            normalized = self._normalize_heading(heading_part)
            if self._heading_matches(normalized, normalized_targets):
                start_index = index + 1
                inline_content = content_part
                break

        if start_index is None:
            return None

        collected = []
        if inline_content:
            collected.append(inline_content)
        for line in lines[start_index:]:
            heading_part, _ = self._split_inline_heading(line)
            normalized = self._normalize_heading(heading_part)
            if self._heading_matches(normalized, self.SECTION_HEADINGS):
                break
            collected.append(line)

        section_text = "\n".join(collected).strip()
        return section_text or None

    def _extract_project_fallback(self, text: str) -> list[str]:
        lines = [
            re.sub(r"^[\s\-*\u2022\u25cf\u25aa\u2013\u2014]+", "", line).strip()
            for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        ]
        lines = [line for line in lines if len(line) > 2]
        project_items = []
        project_title_pattern = re.compile(
            r"\b(project|portfolio|website|web app|application|app|dashboard|system|"
            r"management system|clone|platform|tracker|prediction|chatbot|api)\b",
            re.IGNORECASE,
        )
        exclude_pattern = re.compile(
            r"\b(certification|certificate|education|grade|college|university|"
            r"experience|developer|internship|soft skills|language)\b",
            re.IGNORECASE,
        )

        for index, line in enumerate(lines):
            normalized = self._normalize_heading(self._split_inline_heading(line)[0])
            if self._heading_matches(normalized, self.SECTION_HEADINGS):
                continue
            if not project_title_pattern.search(line):
                continue
            if exclude_pattern.search(line) and "project" not in line.lower():
                continue

            details = [line]
            for next_line in lines[index + 1:index + 4]:
                next_normalized = self._normalize_heading(self._split_inline_heading(next_line)[0])
                if self._heading_matches(next_normalized, self.SECTION_HEADINGS):
                    break
                if exclude_pattern.search(next_line) and not project_title_pattern.search(next_line):
                    break
                details.append(next_line)
            item = self.clean_text(" ".join(details))
            if item and item not in project_items:
                project_items.append(item[:500])
            if len(project_items) >= 6:
                break

        return project_items

    def _normalize_heading(self, line: str) -> str:
        normalized = re.sub(r"[^A-Za-z\s/&]", "", line).replace("&", "and").strip().lower()
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized

    def _split_inline_heading(self, line: str) -> tuple[str, str | None]:
        match = re.match(r"^\s*([^:\-|]{2,60})\s*[:\-|]\s*(.+)$", line)
        if not match:
            return line, None
        return match.group(1), match.group(2).strip() or None

    def _heading_matches(self, normalized: str, targets: set[str]) -> bool:
        if normalized in targets:
            return True
        return any(
            normalized.startswith(f"{target} ")
            or normalized.endswith(f" {target}")
            or normalized.startswith(f"{target}s ")
            or normalized.endswith(f" {target}s")
            for target in targets
        )


resume_parser_service = ResumeParserService()

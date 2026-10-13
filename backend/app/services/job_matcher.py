import re


class JobMatcherService:
    KNOWN_SKILLS = [
        "python", "fastapi", "django", "flask", "sql", "postgresql", "mysql",
        "mongodb", "redis", "celery", "react", "javascript", "typescript",
        "node.js", "html", "css", "tailwind", "docker", "kubernetes", "aws",
        "azure", "gcp", "playwright", "selenium", "rest api", "graphql",
        "machine learning", "ai", "llm", "openai", "pandas", "numpy",
        "git", "ci/cd", "linux", "microservices", "sqlalchemy",
    ]

    def analyze_match(self, candidate_profile: dict, job_description: str) -> dict:
        candidate_skills = self._candidate_skills(candidate_profile)
        required_skills = self.extract_skills(job_description)
        matched = sorted(candidate_skills & required_skills)
        missing = sorted(required_skills - candidate_skills)
        partial = self._partial_matches(candidate_skills, missing)

        skill_score = self._percent(len(matched), max(1, len(required_skills))) * 0.5
        required_years = self._years_required(job_description)
        resume_years = self._resume_years(candidate_profile)
        experience_fit = self._experience_fit(candidate_profile, job_description, required_years, resume_years)
        education_fit = self._education_fit(candidate_profile, job_description)
        keyword_score = min(10, len(matched) * 2)
        seniority_fit = self._seniority_fit(candidate_profile, job_description)

        match_score = round(
            skill_score
            + (20 if experience_fit else 8)
            + (10 if education_fit else 5)
            + keyword_score
            + 5
            + (5 if seniority_fit else 2)
        )
        match_score = max(0, min(100, match_score))

        explanation = (
            f"Matched {len(matched)} of {len(required_skills)} detected job skills. "
            f"Experience fit is {'strong' if experience_fit else 'not clearly proven'}"
            f"{f' ({resume_years} resume years vs {required_years} required)' if required_years else ''} and "
            f"education fit is {'covered' if education_fit else 'not explicit'} based on the parsed resume."
        )

        return {
            "match_score": match_score,
            "matched_skills": matched,
            "missing_skills": missing,
            "partial_skills": partial,
            "experience_fit": experience_fit,
            "candidate_experience_years": resume_years,
            "required_experience_years": required_years,
            "education_fit": education_fit,
            "seniority_fit": seniority_fit,
            "keyword_matches": matched,
            "explanation": explanation,
            "recommendations": self.learning_order(missing),
        }

    def analyze_job_description(self, job_description: str, candidate_profile: dict) -> dict:
        required_skills = sorted(self.extract_skills(job_description))
        match = self.analyze_match(candidate_profile, job_description)
        responsibilities = self._extract_responsibilities(job_description)
        return {
            "required_skills": required_skills,
            "preferred_skills": self._preferred_skills(job_description),
            "matched_skills": match["matched_skills"],
            "missing_skills": match["missing_skills"],
            "partial_skills": match["partial_skills"],
            "experience_requirement": self._experience_requirement(job_description),
            "education_requirement": self._education_requirement(job_description),
            "keywords": required_skills,
            "responsibilities": responsibilities,
            "recommended_learning_order": match["recommendations"],
        }

    def extract_skills(self, text: str) -> set[str]:
        lowered = f" {text.lower()} "
        found = set()
        for skill in self.KNOWN_SKILLS:
            pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
            if re.search(pattern, lowered):
                found.add(skill)
        return found

    def learning_order(self, missing_skills: list[str]) -> list[str]:
        priority = ["sql", "python", "git", "rest api", "docker", "aws", "kubernetes", "ci/cd"]
        ordered = [skill for skill in priority if skill in missing_skills]
        ordered.extend(skill for skill in missing_skills if skill not in ordered)
        return ordered

    def _candidate_skills(self, candidate_profile: dict) -> set[str]:
        text = " ".join(
            [
                self._flatten(candidate_profile.get("skills")),
                self._flatten(candidate_profile.get("technical_skills")),
                self._flatten(candidate_profile.get("experience")),
                self._flatten(candidate_profile.get("projects")),
            ]
        ).lower()
        skills = {str(skill).lower() for skill in candidate_profile.get("skills", [])}
        skills.update(str(skill).lower() for skill in candidate_profile.get("technical_skills", []))
        skills.update(self.extract_skills(text))
        return skills

    def _partial_matches(self, candidate_skills: set[str], missing_skills: list[str]) -> list[str]:
        equivalents = {
            "postgresql": {"sql", "mysql"},
            "fastapi": {"python", "rest api"},
            "react": {"javascript", "typescript"},
            "aws": {"cloud", "docker"},
            "kubernetes": {"docker"},
        }
        partial = []
        for skill in missing_skills:
            if equivalents.get(skill, set()) & candidate_skills:
                partial.append(skill)
        return partial

    def _experience_fit(self, candidate_profile: dict, job_description: str, required_years: int | None = None, resume_years: float | None = None) -> bool:
        required_years = self._years_required(job_description) if required_years is None else required_years
        if required_years == 0:
            return True
        resume_years = self._resume_years(candidate_profile) if resume_years is None else resume_years
        return resume_years >= required_years

    def _resume_years(self, candidate_profile: dict) -> float:
        resume_text = self._flatten(candidate_profile).lower()
        explicit_years = [float(value) for value in re.findall(r"(\d+(?:\.\d+)?)\+?\s*years?", resume_text)]
        duration_months = []
        for item in candidate_profile.get("experience") or []:
            if isinstance(item, dict) and item.get("duration_months") is not None:
                try:
                    duration_months.append(float(item.get("duration_months")))
                except (TypeError, ValueError):
                    pass
        duration_years = sum(duration_months) / 12 if duration_months else 0
        return round(max(max(explicit_years or [0]), duration_years), 1)

    def _education_fit(self, candidate_profile: dict, job_description: str) -> bool:
        lowered = job_description.lower()
        if not any(term in lowered for term in ["degree", "bachelor", "b.tech", "bca", "mca", "master"]):
            return True
        return bool(candidate_profile.get("education"))

    def _seniority_fit(self, candidate_profile: dict, job_description: str) -> bool:
        text = job_description.lower()
        resume_text = self._flatten(candidate_profile).lower()
        if "senior" in text:
            return any(term in resume_text for term in ["senior", "lead", "5 years", "6 years", "7 years", "8 years"])
        if "intern" in text:
            return True
        return True

    def _years_required(self, text: str) -> int:
        matches = [int(value) for value in re.findall(r"(\d+)\+?\s*(?:-|to)?\s*\d*\s*years?", text.lower())]
        return min(matches) if matches else 0

    def _percent(self, numerator: int, denominator: int) -> float:
        return round((numerator / denominator) * 100, 2)

    def _experience_requirement(self, text: str) -> str:
        match = re.search(r"(\d+\+?\s*(?:-|to)?\s*\d*\s*years?[^.,;\n]*)", text, re.IGNORECASE)
        return match.group(1).strip() if match else ""

    def _education_requirement(self, text: str) -> str:
        match = re.search(r"((?:bachelor|master|degree|b\.tech|mca|bca)[^.,;\n]*)", text, re.IGNORECASE)
        return match.group(1).strip() if match else ""

    def _preferred_skills(self, text: str) -> list[str]:
        preferred_text = " ".join(re.findall(r"(?:preferred|nice to have|good to have)[:\s]+([^.\n]+)", text, re.IGNORECASE))
        return sorted(self.extract_skills(preferred_text))

    def _extract_responsibilities(self, text: str) -> list[str]:
        lines = [line.strip(" -•\t") for line in text.splitlines() if line.strip()]
        action_lines = [line for line in lines if re.search(r"\b(build|develop|design|manage|create|implement|work|own|lead|maintain)\b", line, re.IGNORECASE)]
        return action_lines[:6]

    def _flatten(self, value) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, list):
            return " ".join(self._flatten(item) for item in value)
        if isinstance(value, dict):
            return " ".join(self._flatten(item) for item in value.values())
        return str(value)


job_matcher_service = JobMatcherService()

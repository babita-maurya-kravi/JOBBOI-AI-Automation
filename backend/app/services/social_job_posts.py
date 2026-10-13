from __future__ import annotations

import hashlib
import re
from datetime import datetime
from urllib.parse import urlparse

from app.services.job_matcher import job_matcher_service


OPPORTUNITY_TYPES = {
    "Structured Job Listing",
    "Recruiter / HR Job Post",
    "Company Hiring Announcement",
    "Internship Opportunity",
    "Referral Opportunity",
    "Freelance / Contract Opportunity",
    "Uncertain / Needs Review",
}


class SocialJobPostService:
    hiring_terms = {
        "hiring", "we are hiring", "looking for", "job opening", "opening",
        "vacancy", "apply now", "send your resume", "share your resume",
        "dm your resume", "join our team", "walk-in", "refer", "referral",
        "internship", "interns", "freshers", "candidate", "recruiting",
    }
    negative_terms = {
        "not hiring", "hiring freeze", "article", "tutorial", "webinar",
        "course", "learn", "roadmap", "interview experience",
    }

    def normalize_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").strip().lower())

    def text_hash(self, text: str) -> str:
        return hashlib.sha256(self.normalize_text(text).encode("utf-8")).hexdigest()

    def classify(self, post_text: str, platform: str = "Manual", original_post_url: str | None = None, author_name: str | None = None) -> dict:
        text = (post_text or "").strip()
        normalized = self.normalize_text(text)
        skills = sorted(job_matcher_service.extract_skills(text))
        intent_score = self._hiring_intent_score(normalized)
        classification = self._classification(normalized, intent_score)
        confidence = self._confidence(normalized, intent_score, skills, classification)
        application_url = self._application_url(text, original_post_url)
        recruiter_email = self._email(text)

        title = self._job_title(text, skills)
        company = self._company_name(text)
        employment_type = self._employment_type(normalized)
        experience = self._experience_requirement(text)
        work_mode = self._work_mode(normalized)

        return {
            "platform": platform or self._platform_from_url(original_post_url) or "Manual",
            "source_type": "Manual Import" if original_post_url else "Social Post",
            "external_post_id": self._external_post_id(original_post_url),
            "original_post_url": original_post_url,
            "post_text": text,
            "normalized_text_hash": self.text_hash(text),
            "author_name": author_name,
            "company_name": company,
            "job_title": title,
            "required_skills": skills,
            "experience_requirement": experience,
            "fresher_eligible": self._fresher_eligible(normalized, experience),
            "employment_type": employment_type,
            "work_mode": work_mode,
            "location": self._location(text),
            "salary_or_stipend": self._salary_or_stipend(text),
            "education_requirements": self._education_requirement(text),
            "application_deadline": self._application_deadline(text),
            "application_url": application_url,
            "recruiter_email": recruiter_email,
            "application_instructions": self._application_instructions(text),
            "classification_type": classification,
            "confidence_score": confidence,
            "verification_status": "SOURCE_LINK_PROVIDED" if original_post_url else "UNVERIFIED",
            "status": "ACTIVE" if classification != "Non-Job Post" else "NEEDS_REVIEW",
            "publication_date": None,
        }

    def search_demo_posts(self, query: str = "", location: str | None = None, platforms: list[str] | None = None) -> list[dict]:
        selected_location = location or "India"
        posts = [
            {
                "platform": "LinkedIn",
                "source_type": "Demo Social Feed",
                "author_name": "Priya Sharma",
                "post_text": f"We are hiring freshers for React.js Developer roles at PixelBridge. Skills: React, JavaScript, HTML, CSS, Git. Location {selected_location}. DM your resume.",
            },
            {
                "platform": "LinkedIn",
                "source_type": "Demo Social Feed",
                "author_name": "Northstar Labs Careers",
                "post_text": "Our company is expanding. Looking for junior software developers with Python, FastAPI, SQL, Docker and REST API basics. Remote or Hybrid. Apply through the careers link in the post.",
            },
            {
                "platform": "X",
                "source_type": "Demo Social Feed",
                "author_name": "CampusCode",
                "post_text": "Hiring interns with knowledge of Python, JavaScript, SQL and Git. Freshers can apply. Stipend INR 15-25K. Send your resume to hiring@campuscode.example",
            },
            {
                "platform": "Company Announcement",
                "source_type": "Demo Social Feed",
                "author_name": "CloudNest HR",
                "post_text": f"Backend opening: FastAPI Backend Developer at CloudNest. Need Python, PostgreSQL, Redis, Docker, SQLAlchemy. Experience 1-3 years. Location {selected_location}.",
            },
            {
                "platform": "LinkedIn",
                "source_type": "Demo Social Feed",
                "author_name": "Amit Verma",
                "post_text": "Know someone looking for a job? Refer them to our team for Full Stack Engineer roles. React, TypeScript, Python, SQL and CI/CD experience preferred. Remote.",
            },
            {
                "platform": "Community Post",
                "source_type": "Demo Social Feed",
                "author_name": "Freelance Desk",
                "post_text": "Contract opportunity for a Node.js React Developer. Need MongoDB, REST API, Git and Docker. Part-time freelance, remote.",
            },
            {
                "platform": "LinkedIn",
                "source_type": "Demo Social Feed",
                "author_name": "Tech Notes",
                "post_text": "React and Python are great skills for developers. Here is a learning roadmap for beginners.",
            },
        ]
        requested_platforms = {item.lower() for item in platforms or [] if item}
        query_tokens = self._query_tokens(query)
        results = []
        for post in posts:
            if requested_platforms and post["platform"].lower() not in requested_platforms:
                continue
            haystack = self.normalize_text(" ".join(str(value) for value in post.values()))
            if query_tokens and not any(token in haystack for token in query_tokens):
                continue
            results.append(post)
        return results

    def is_opportunity(self, classification_type: str) -> bool:
        return classification_type in OPPORTUNITY_TYPES and classification_type != "Non-Job Post"

    def job_description(self, extracted: dict) -> str:
        parts = [
            extracted.get("post_text"),
            extracted.get("job_title") and f"Job title: {extracted.get('job_title')}",
            extracted.get("company_name") and f"Company: {extracted.get('company_name')}",
            extracted.get("experience_requirement") and f"Experience: {extracted.get('experience_requirement')}",
            extracted.get("employment_type") and f"Employment type: {extracted.get('employment_type')}",
            extracted.get("work_mode") and f"Work mode: {extracted.get('work_mode')}",
            extracted.get("location") and f"Location: {extracted.get('location')}",
            extracted.get("salary_or_stipend") and f"Salary or stipend: {extracted.get('salary_or_stipend')}",
            extracted.get("application_instructions") and f"Application instructions: {extracted.get('application_instructions')}",
        ]
        return "\n".join(part for part in parts if part)

    def _hiring_intent_score(self, normalized: str) -> int:
        score = 0
        for term in self.hiring_terms:
            if term in normalized:
                score += 2 if " " in term else 1
        for term in self.negative_terms:
            if term in normalized:
                score -= 2
        if re.search(r"\b(dm|send|share|mail|email)\b.{0,30}\b(resume|cv)\b", normalized):
            score += 3
        if re.search(r"\b\d+\+?\s*(?:-|to)?\s*\d*\s*years?\b", normalized):
            score += 1
        return score

    def _classification(self, normalized: str, intent_score: int) -> str:
        if intent_score <= 0:
            return "Non-Job Post"
        if any(term in normalized for term in ["freelance", "contract", "gig"]):
            return "Freelance / Contract Opportunity"
        if any(term in normalized for term in ["internship", "interns", "intern "]):
            return "Internship Opportunity"
        if any(term in normalized for term in ["refer", "referral", "know someone"]):
            return "Referral Opportunity"
        if any(term in normalized for term in ["hr", "recruiter", "dm your resume", "send your resume", "share your resume"]):
            return "Recruiter / HR Job Post"
        if any(term in normalized for term in ["our company", "careers", "join our team", "company is expanding"]):
            return "Company Hiring Announcement"
        if any(term in normalized for term in ["requirements:", "job title:", "opening:"]):
            return "Structured Job Listing"
        return "Uncertain / Needs Review" if intent_score < 3 else "Recruiter / HR Job Post"

    def _confidence(self, normalized: str, intent_score: int, skills: list[str], classification: str) -> float:
        if classification == "Non-Job Post":
            return 0.1 if intent_score <= 0 else 0.25
        score = 0.35 + min(0.35, intent_score * 0.06) + min(0.2, len(skills) * 0.03)
        if any(term in normalized for term in ["resume", "apply", "opening", "hiring"]):
            score += 0.08
        return round(max(0.0, min(0.96, score)), 2)

    def _job_title(self, text: str, skills: list[str]) -> str | None:
        patterns = [
            r"hiring\s+(?:freshers|interns|candidates)?\s*for\s+([^.\n,;]{3,80})\s+(?:roles?|positions?|opening)",
            r"(?:hiring|looking for|opening:|job opening for|vacancy for)\s+(?:a|an|the)?\s*([^.\n,;]{3,80})",
            r"for\s+([^.\n,;]{3,80})\s+(?:roles?|positions?|opening)",
            r"\b([A-Z][A-Za-z0-9+.#\s/-]{2,60}\s+(?:Developer|Engineer|Analyst|Intern|Designer|Manager|Associate))\b",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                title = re.sub(r"\s+", " ", match.group(1)).strip(" -:.")
                title = re.sub(r"\b(at|with|need|skills).*$", "", title, flags=re.IGNORECASE).strip(" -:.")
                if 3 <= len(title) <= 90:
                    return title
        if "intern" in text.lower() and skills:
            return f"{skills[0].title()} Intern"
        return None

    def _company_name(self, text: str) -> str | None:
        match = re.search(r"\bat\s+([A-Z][A-Za-z0-9&.,\-\s]{2,60})", text)
        if match:
            company = re.sub(r"\s+", " ", match.group(1)).strip(" .,-")
            company = re.sub(r"\b(location|skills|need|experience|remote|hybrid).*$", "", company, flags=re.IGNORECASE).strip(" .,-")
            return company or None
        return None

    def _employment_type(self, normalized: str) -> str | None:
        if any(term in normalized for term in ["internship", "interns", "intern "]):
            return "Internship"
        if any(term in normalized for term in ["freelance", "contract", "gig"]):
            return "Contract"
        if any(term in normalized for term in ["part-time", "part time", "half-time"]):
            return "Part-time"
        if any(term in normalized for term in ["full-time", "full time"]):
            return "Full-time"
        return None

    def _work_mode(self, normalized: str) -> str | None:
        if "remote" in normalized:
            return "Remote"
        if "hybrid" in normalized:
            return "Hybrid"
        if any(term in normalized for term in ["on-site", "onsite", "office"]):
            return "On-site"
        return None

    def _experience_requirement(self, text: str) -> str | None:
        match = re.search(r"(\d+\+?\s*(?:-|to)?\s*\d*\s*years?[^.,;\n]*)", text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        if re.search(r"\b(fresher|freshers|entry[-\s]?level)\b", text, re.IGNORECASE):
            return "Fresher"
        return None

    def _fresher_eligible(self, normalized: str, experience: str | None) -> str | None:
        if any(term in normalized for term in ["fresher", "freshers", "entry-level", "entry level"]):
            return "YES"
        if experience and re.search(r"\b0\s*-\s*1\b|\bfresher\b", experience, re.IGNORECASE):
            return "YES"
        if experience and re.search(r"\b[2-9]\+?\s*years?", experience, re.IGNORECASE):
            return "NO"
        return None

    def _location(self, text: str) -> str | None:
        match = re.search(r"\b(?:location|loc)\s*[:\-]?\s*([A-Za-z\s,/-]{2,80})", text, re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,-")
        for term in ["Remote", "Bengaluru", "Bangalore", "Delhi", "Mumbai", "Hyderabad", "Pune", "Chennai", "Noida", "Gurugram", "India"]:
            if re.search(rf"\b{re.escape(term)}\b", text, re.IGNORECASE):
                return term
        return None

    def _salary_or_stipend(self, text: str) -> str | None:
        patterns = [
            r"((?:INR|Rs\.?|₹)\s*[\d,.]+\s*(?:-|to)?\s*(?:INR|Rs\.?|₹)?\s*[\d,.]*\s*(?:LPA|K|k|per month|pm)?)",
            r"((?:salary|stipend)\s*[:\-]?\s*[^.\n,;]{2,80})",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip(" .,-")
        return None

    def _education_requirement(self, text: str) -> str | None:
        match = re.search(r"((?:bachelor|master|degree|b\.tech|mca|bca|graduate)[^.,;\n]*)", text, re.IGNORECASE)
        return match.group(1).strip() if match else None

    def _application_deadline(self, text: str) -> datetime | None:
        match = re.search(r"(?:deadline|apply by|last date)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)
        if not match:
            return None
        try:
            return datetime.fromisoformat(match.group(1))
        except ValueError:
            return None

    def _application_url(self, text: str, original_post_url: str | None) -> str | None:
        urls = re.findall(r"https?://[^\s)]+", text)
        if urls:
            return urls[0].rstrip(".,")
        if original_post_url and any(term in self.normalize_text(text) for term in ["apply", "careers", "resume", "dm"]):
            return original_post_url
        return None

    def _email(self, text: str) -> str | None:
        match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
        return match.group(0) if match else None

    def _application_instructions(self, text: str) -> str | None:
        sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]
        for sentence in sentences:
            if re.search(r"\b(apply|dm|send|share|email|mail|resume|cv|contact)\b", sentence, re.IGNORECASE):
                return sentence[:400]
        return None

    def _external_post_id(self, original_post_url: str | None) -> str | None:
        if not original_post_url:
            return None
        return hashlib.sha256(original_post_url.strip().lower().encode("utf-8")).hexdigest()[:32]

    def _platform_from_url(self, original_post_url: str | None) -> str | None:
        if not original_post_url:
            return None
        hostname = urlparse(original_post_url).hostname or ""
        hostname = hostname.replace("www.", "")
        if "linkedin" in hostname:
            return "LinkedIn"
        if "x.com" in hostname or "twitter" in hostname:
            return "X"
        if hostname:
            return hostname.split(".")[0].title()
        return None

    def _query_tokens(self, query: str | None) -> list[str]:
        return [token for token in re.findall(r"[a-z0-9+#.]+", (query or "").lower()) if len(token) > 1]


social_job_post_service = SocialJobPostService()

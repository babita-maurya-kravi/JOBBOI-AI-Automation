from __future__ import annotations

import re


class ATSScoreService:
    def analyze(self, resume_data: dict) -> dict:
        category_max = {
            "Contact Information": 10,
            "Resume Sections": 10,
            "Keyword Coverage": 25,
            "Action Verbs": 10,
            "Quantified Achievements": 15,
            "Formatting": 10,
            "Experience Relevance": 10,
            "Resume Length": 5,
            "Skills Clarity": 5,
        }

        recommendations = []
        strengths = []
        issues = []
        improvements = []
        text = self._flatten(resume_data)
        words = re.findall(r"\w+", text.lower())
        word_count = len(words)

        contact_score = 0
        if resume_data.get("email"):
            contact_score += 4
        else:
            issues.append("Missing email address")
            recommendations.append("Add a professional email address in the header.")
            improvements.append(self._improvement("Contact Information", "Email is missing", "Add a professional email address near your name."))
        if resume_data.get("phone"):
            contact_score += 3
        else:
            issues.append("Missing phone number")
            improvements.append(self._improvement("Contact Information", "Phone number is missing", "Add a reachable phone number in international or local format."))
        if resume_data.get("location"):
            contact_score += 3
        else:
            improvements.append(self._improvement("Contact Information", "Location is not detected", "Add city, state, or remote-work location preference."))

        sections_present = sum(
            1
            for key in ["summary", "skills", "education", "experience", "projects", "certifications"]
            if resume_data.get(key)
        )
        sections_score = min(10, round(sections_present / 6 * 10))
        if sections_score < 7:
            issues.append("Important resume sections are missing or thin")
            recommendations.append("Add clear sections for summary, skills, education, experience, projects, and certifications where applicable.")
            improvements.append(self._improvement("Resume Sections", "Some expected sections are missing or too thin", "Use clear headings like Summary, Skills, Experience, Projects, Education, and Certifications."))

        skills = set(str(skill).lower() for skill in resume_data.get("skills", []))
        technical_skills = set(str(skill).lower() for skill in resume_data.get("technical_skills", []))
        skill_count = len(skills | technical_skills)
        keyword_score = min(25, skill_count * 3)
        if skill_count == 0:
            issues.append("Skills section is weak or missing")
            recommendations.append("Add a dedicated skills section with technical and soft skills.")
            improvements.append(self._improvement("Keyword Coverage", "No strong skill keywords were detected", "Add role-specific tools, technologies, frameworks, and domain keywords from target job descriptions."))
        elif keyword_score < 18:
            improvements.append(self._improvement("Keyword Coverage", "Keyword coverage is moderate", "Add more exact-match skills from the jobs you are targeting, but only if you can defend them."))
        else:
            strengths.append("Skills section is present and relevant")

        action_verbs = {
            "built", "created", "developed", "designed", "implemented", "improved",
            "optimized", "automated", "led", "managed", "delivered", "reduced",
            "increased", "launched", "integrated", "analyzed", "resolved",
            "deployed", "tested", "collaborated", "architected", "maintained",
        }
        action_hits = sum(1 for word in words if word in action_verbs)
        action_score = min(10, action_hits * 2)
        if action_score < 6:
            issues.append("Few strong action verbs found")
            recommendations.append("Start bullets with verbs such as built, improved, automated, led, delivered, or optimized.")
            improvements.append(self._improvement("Action Verbs", "Bullet points do not use enough strong action verbs", "Start experience and project bullets with verbs like built, improved, automated, delivered, optimized, or led."))

        quantified_hits = len(re.findall(r"(\d+%|\d+\+?|\$|inr|rs\.?|lpa|million|k\b)", text.lower()))
        achievement_score = min(15, quantified_hits * 3)
        if achievement_score < 6:
            issues.append("Achievements are not quantified enough")
            recommendations.append("Add measurable outcomes such as percentage improvements, scale, revenue, users, latency, or cost savings.")
            improvements.append(self._improvement("Quantified Achievements", "Results are not backed by enough numbers", "Add metrics such as %, users, revenue, cost, speed, accuracy, volume, team size, or project scale."))

        formatting_score = 10
        if word_count < 120:
            formatting_score -= 2
        if len(text) > 12000:
            formatting_score -= 2
        if "\t" in text:
            formatting_score -= 1
        if formatting_score < 8:
            improvements.append(self._improvement("Formatting", "Resume text may be hard for parsers to read", "Use a simple text-based PDF with standard headings, minimal tables, and consistent bullet formatting."))

        experience_entries = resume_data.get("experience") or []
        project_entries = resume_data.get("projects") or []
        experience_detail_count = sum(len(re.findall(r"\w+", self._flatten(entry))) for entry in experience_entries)
        project_detail_count = sum(len(re.findall(r"\w+", self._flatten(entry))) for entry in project_entries)
        duration_months = sum(
            float(entry.get("duration_months") or 0)
            for entry in experience_entries
            if isinstance(entry, dict)
        )
        experience_score = min(
            10,
            len(experience_entries) * 3
            + min(3, experience_detail_count // 30)
            + min(2, project_detail_count // 45)
            + (1 if duration_months else 0),
        )
        if not experience_entries and not project_entries:
            issues.append("Experience details are sparse")
            recommendations.append("Add detailed role descriptions with measurable outcomes.")
            improvements.append(self._improvement("Experience Relevance", "Experience section is missing or not detected", "Add role title, company, dates, and 2-4 impact bullets for each relevant role or internship."))
        elif experience_score < 7:
            improvements.append(self._improvement("Experience Relevance", "Experience section needs more role detail", "Mention tools used, business context, and outcomes for each major responsibility."))
        else:
            strengths.append("Experience and project details are relevant")

        if not resume_data.get("summary"):
            issues.append("Professional summary is missing")
            recommendations.append("Include a concise summary tailored to target job roles.")
            improvements.append(self._improvement("Resume Sections", "Professional summary is missing", "Add a 2-3 line summary with target role, core skills, experience level, and strongest outcome."))
        else:
            strengths.append("Professional summary is included")

        length_score = 5
        if word_count < 150:
            length_score = 2
            issues.append("Resume appears short")
            improvements.append(self._improvement("Resume Length", "Resume content is too short for a strong ATS profile", "Add more detail to projects, experience, skills, education, and achievements."))
        elif word_count > 1200:
            length_score = 3
            issues.append("Resume may be too long")
            improvements.append(self._improvement("Resume Length", "Resume may be too long", "Trim older or less relevant details and keep the resume focused on the target role."))

        skills_clarity_score = 5 if skill_count >= 6 else max(1, skill_count)
        if skills_clarity_score < 4:
            improvements.append(self._improvement("Skills Clarity", "Skills are not grouped clearly enough", "Create a dedicated Skills section grouped by languages, frameworks, databases, tools, and platforms."))

        if resume_data.get("certifications"):
            strengths.append("Relevant certifications are present")

        categories_result = {
            "Contact Information": contact_score,
            "Resume Sections": sections_score,
            "Keyword Coverage": keyword_score,
            "Action Verbs": action_score,
            "Quantified Achievements": achievement_score,
            "Formatting": max(0, formatting_score),
            "Experience Relevance": experience_score,
            "Resume Length": length_score,
            "Skills Clarity": skills_clarity_score,
        }
        score = min(100, sum(categories_result.values()))

        if score >= 75:
            strengths.append("Resume has a strong ATS-style foundation")

        category_details = {}
        for name, value in categories_result.items():
            max_score = category_max[name]
            pct = value / max_score if max_score else 0
            category_details[name] = {
                "score": value,
                "max": max_score,
                "status": self._status(pct),
                "feedback": self._category_feedback(name, pct),
            }

        return {
            "score": score,
            "categories": category_details,
            "strengths": strengths,
            "issues": issues,
            "recommendations": recommendations,
            "improvements": improvements[:8],
        }

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

    def _status(self, pct: float) -> str:
        if pct >= 0.75:
            return "Strong"
        if pct >= 0.45:
            return "Needs improvement"
        return "Weak"

    def _category_feedback(self, category: str, pct: float) -> str:
        if pct >= 0.75:
            return "This area is in good shape."
        feedback = {
            "Contact Information": "ATS tools need email, phone, and location to identify the candidate cleanly.",
            "Resume Sections": "Missing or unclear headings can stop parsers from understanding your profile.",
            "Keyword Coverage": "The resume needs more exact role keywords and tool names.",
            "Action Verbs": "Bullets should begin with strong ownership verbs.",
            "Quantified Achievements": "Impact needs more numbers and measurable outcomes.",
            "Formatting": "Keep the PDF simple, text-based, and easy to parse.",
            "Experience Relevance": "Experience should include responsibilities, tools, and outcomes.",
            "Resume Length": "The resume length should fit the candidate level and role.",
            "Skills Clarity": "Skills should be grouped and easy to scan.",
        }
        return feedback.get(category, "This area needs more resume detail.")

    def _improvement(self, category: str, issue: str, action: str) -> dict:
        return {
            "category": category,
            "issue": issue,
            "action": action,
        }


ats_score_service = ATSScoreService()

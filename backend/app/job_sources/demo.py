import re

from app.job_sources.base import JobSourceAdapter


class DemoJobSourceAdapter(JobSourceAdapter):
    source_name = "DEMO"

    def search_jobs(self, query: str, location: str | None = None, page: int = 1):
        jobs = self._platform_jobs(location)
        return [job for job in jobs if self._matches_query(job, query)]

    def get_job_details(self, job_id: str):
        return {"external_id": job_id, "title": "Python Backend Engineer", "company": "Northstar Labs"}

    def normalize_job(self, raw_job: dict):
        return {
            "source": raw_job.get("source", self.source_name),
            "external_id": raw_job.get("external_id", "demo-unknown"),
            "title": raw_job.get("title", "").strip(),
            "company": raw_job.get("company", "").strip(),
            "location": raw_job.get("location", "").strip(),
            "description": raw_job.get("description", "").strip(),
            "salary": raw_job.get("salary", ""),
            "experience_required": raw_job.get("experience_required", ""),
            "employment_type": raw_job.get("employment_type", ""),
            "url": raw_job.get("url", ""),
            "posted_at": raw_job.get("posted_at", ""),
        }

    def _platform_jobs(self, location: str | None = None) -> list[dict]:
        selected_location = location or "India"
        return [
            self._job("Naukri", "naukri-python-1", "Fresher Python Developer", "StarterStack", selected_location, "Entry-level role for freshers with Python, SQL, HTML, CSS, Git, and REST API fundamentals.", "INR 4-7 LPA", "0-1 years", "Full-time", "2026-10-08"),
            self._job("Naukri", "naukri-fastapi-2", "FastAPI Backend Developer", "CloudNest", selected_location, "Requirements: Python, FastAPI, PostgreSQL, REST API, Docker, Git, SQLAlchemy, and Redis.", "INR 8-14 LPA", "1-3 years", "Full-time", "2026-10-07"),
            self._job("Naukri", "naukri-react-3", "React Python Full Stack Engineer", "PixelBridge", selected_location, "Build dashboards with React, JavaScript, Python APIs, PostgreSQL, Tailwind, Docker, and Git.", "INR 10-18 LPA", "1-3 years", "Full-time", "2026-10-06"),
            self._job("LinkedIn", "linkedin-backend-1", "Python Backend Engineer", "Northstar Labs", selected_location, "Build production APIs with Python, FastAPI, PostgreSQL, Docker, AWS, Redis, and cloud deployment automation.", "INR 18-28 LPA", "2-4 years", "Full-time", "2026-10-08"),
            self._job("LinkedIn", "linkedin-fullstack-2", "Full Stack Engineer", "Orbit Foundry", "Remote", "Work across React, TypeScript, Python, SQL, Redis, REST APIs, microservices, and CI/CD.", "INR 20-30 LPA", "3-5 years", "Remote", "2026-10-07"),
            self._job("LinkedIn", "linkedin-ai-3", "AI Application Developer", "PromptWorks", selected_location, "Requirements: Python, OpenAI, LLM, FastAPI, React, PostgreSQL, prompt workflows, and REST API integration.", "INR 14-24 LPA", "1-3 years", "Hybrid", "2026-10-06"),
            self._job("Indeed", "indeed-django-1", "Django Web Developer", "FinEdge Systems", selected_location, "Requirements: Python, Django, PostgreSQL, HTML, CSS, JavaScript, Git, and REST API development.", "INR 7-12 LPA", "1-3 years", "Full-time", "2026-10-08"),
            self._job("Indeed", "indeed-data-2", "Data Analyst", "Times Analytics", selected_location, "Requirements: SQL, Excel, Power BI, dashboards, reporting, data cleaning, stakeholder communication, and basic Python.", "INR 5-9 LPA", "0-2 years", "Full-time", "2026-10-07"),
            self._job("Indeed", "indeed-qa-3", "Automation Test Engineer", "QualityGrid", selected_location, "Requirements: Python, Playwright, Selenium, REST API testing, Git, CI/CD, and SQL.", "INR 8-13 LPA", "1-3 years", "Full-time", "2026-10-06"),
            self._job("Glassdoor", "glassdoor-react-1", "React Frontend Developer", "Glassline Digital", selected_location, "Requirements: React, JavaScript, HTML, CSS, Tailwind, API integration, responsive UI, and Git workflow.", "INR 6-10 LPA", "1-3 years", "Full-time", "2026-10-08"),
            self._job("Glassdoor", "glassdoor-cloud-2", "Cloud Backend Developer", "BluePeak Cloud", selected_location, "Requirements: Python, FastAPI, AWS, Docker, PostgreSQL, Redis, Linux, and REST APIs.", "INR 15-25 LPA", "2-5 years", "Hybrid", "2026-10-07"),
            self._job("Glassdoor", "glassdoor-node-3", "Node.js React Developer", "MetroApps", selected_location, "Requirements: Node.js, React, JavaScript, TypeScript, REST API, MongoDB, Git, and Docker.", "INR 9-16 LPA", "1-3 years", "Full-time", "2026-10-06"),
            self._job("TimesJobs", "timesjobs-sql-1", "SQL Python Developer", "Reportly", selected_location, "Requirements: Python, SQL, PostgreSQL, Pandas, dashboards, REST API basics, and Git.", "INR 6-11 LPA", "0-2 years", "Full-time", "2026-10-08"),
            self._job("TimesJobs", "timesjobs-flask-2", "Flask API Developer", "QuickServe Tech", selected_location, "Requirements: Python, Flask, REST API, MySQL, Docker, Git, and Linux deployment.", "INR 7-13 LPA", "1-3 years", "Full-time", "2026-10-07"),
            self._job("TimesJobs", "timesjobs-ml-3", "Machine Learning Engineer", "ModelCraft", selected_location, "Requirements: Python, machine learning, NumPy, Pandas, Scikit-learn, SQL, and Git.", "INR 10-18 LPA", "1-3 years", "Full-time", "2026-10-06"),
            self._job("Shine.com", "shine-java-1", "Java Spring Boot Developer", "Shine Systems", selected_location, "Requirements: Java, Spring Boot, REST API, MySQL, Git, unit testing, debugging, and production support.", "INR 8-14 LPA", "2-4 years", "Full-time", "2026-10-08"),
            self._job("Shine.com", "shine-python-2", "Junior Python Engineer", "HiringLoop", selected_location, "Requirements: Python, SQL, Git, HTML, CSS, REST API fundamentals, and willingness to learn Docker.", "INR 4-8 LPA", "0-1 years", "Full-time", "2026-10-07"),
            self._job("Shine.com", "shine-devops-3", "DevOps Associate", "DeployMate", selected_location, "Requirements: Linux, Docker, AWS, CI/CD, Git, basic Python scripting, and monitoring.", "INR 6-12 LPA", "1-3 years", "Full-time", "2026-10-06"),
            self._job("Foundit", "foundit-ml-1", "Machine Learning Intern", "Foundit AI Labs", "Remote", "Requirements: Python, NumPy, Pandas, Scikit-learn, Jupyter, machine learning basics, model evaluation, and Git.", "INR 20-35K stipend", "Fresher", "Internship", "2026-10-08"),
            self._job("Foundit", "foundit-api-2", "Backend API Intern", "APIWorks", "Remote", "Requirements: Python, FastAPI, REST API, SQL, Git, Docker basics, and clear documentation.", "INR 18-30K stipend", "Fresher", "Internship", "2026-10-07"),
            self._job("Foundit", "foundit-mern-3", "MERN Stack Developer", "WebSprint", selected_location, "Requirements: React, Node.js, JavaScript, MongoDB, REST API, Git, and deployment basics.", "INR 5-9 LPA", "0-2 years", "Full-time", "2026-10-06"),
            self._job("Internshala", "internshala-web-1", "Web Development Intern", "Internshala Partner Studio", "Remote", "Requirements: HTML, CSS, JavaScript, React basics, Git, responsive pages, forms, and willingness to learn.", "INR 12-20K stipend", "Fresher", "Internship", "2026-10-08"),
            self._job("Internshala", "internshala-python-2", "Python Developer Intern", "CampusCode", "Remote", "Requirements: Python, SQL, Flask or FastAPI basics, REST API, Git, and debugging skills.", "INR 15-25K stipend", "Fresher", "Internship", "2026-10-07"),
            self._job("Internshala", "internshala-data-3", "Data Science Intern", "LearnData", "Remote", "Requirements: Python, Pandas, NumPy, SQL, machine learning basics, dashboards, and communication.", "INR 10-22K stipend", "Fresher", "Internship", "2026-10-06"),
        ]

    def _job(self, source: str, external_id: str, title: str, company: str, location: str, description: str, salary: str, experience: str, employment_type: str, posted_at: str) -> dict:
        return {
            "source": source,
            "external_id": external_id,
            "title": title,
            "company": company,
            "location": location,
            "description": description,
            "salary": salary,
            "experience_required": experience,
            "employment_type": employment_type,
            "url": self._search_url(source, title, location),
            "posted_at": posted_at,
        }

    def _search_url(self, source: str, title: str, location: str) -> str:
        query = title.replace(" ", "+")
        slug = title.lower().replace(" ", "-")
        loc_slug = location.lower().replace(" ", "-")
        if source == "Naukri":
            return f"https://www.naukri.com/{slug}-jobs-in-{loc_slug}"
        if source == "LinkedIn":
            return f"https://www.linkedin.com/jobs/search/?keywords={query}&location={location.replace(' ', '+')}"
        if source == "Indeed":
            return f"https://www.indeed.com/jobs?q={query}&l={location.replace(' ', '+')}"
        if source == "Glassdoor":
            return f"https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword={query}&locKeyword={location.replace(' ', '+')}"
        if source == "TimesJobs":
            return f"https://www.timesjobs.com/candidate/job-search.html?txtKeywords={query}&txtLocation={location.replace(' ', '+')}"
        if source == "Shine.com":
            return f"https://www.shine.com/job-search/{slug}-jobs-in-{loc_slug}"
        if source == "Foundit":
            return f"https://www.foundit.in/srp/results?query={query}&locations={location.replace(' ', '+')}"
        if source == "Internshala":
            return f"https://internshala.com/jobs/keywords-{slug}/location-{loc_slug}/"
        return "https://www.google.com/search?q=" + query

    def supports_application(self, job: dict) -> bool:
        return False

    def start_application(self, job: dict):
        return {"status": "NEEDS_USER_ACTION", "reason": "Demo adapter does not submit applications"}

    def fill_application(self, job: dict, user_profile: dict):
        return {"status": "READY_TO_REVIEW", "fields": []}

    def submit_application(self, job: dict):
        return {"status": "NEEDS_USER_ACTION", "reason": "Manual review required"}

    def _matches_query(self, job: dict, query: str | None) -> bool:
        tokens = self._query_tokens(query)
        if not tokens:
            return True

        generic_terms = {
            "job", "jobs", "role", "opening", "openings", "hiring", "developer",
            "engineer", "intern", "fresher", "full", "time",
        }
        specific_tokens = [token for token in tokens if token not in generic_terms]
        role_tokens = [token for token in tokens if token in generic_terms]
        title = str(job.get("title", "")).lower()
        haystack = " ".join(
            str(job.get(key, ""))
            for key in ["title", "company", "description", "employment_type", "experience_required"]
        ).lower()

        if specific_tokens:
            has_specific_match = any(self._contains_token(haystack, token) for token in specific_tokens)
            if not has_specific_match:
                return False
            if role_tokens:
                return any(self._matches_role(title, token) for token in role_tokens)
            return True
        return any(self._matches_role(title, token) or self._contains_token(haystack, token) for token in tokens)

    def _query_tokens(self, query: str | None) -> list[str]:
        return [
            token
            for token in re.findall(r"[a-z0-9+#.]+", (query or "").lower())
            if len(token) > 1
        ]

    def _contains_token(self, text: str, token: str) -> bool:
        pattern = r"(?<![a-z0-9])" + re.escape(token) + r"(?![a-z0-9])"
        return bool(re.search(pattern, text))

    def _matches_role(self, title: str, token: str) -> bool:
        equivalents = {
            "developer": ["developer", "engineer", "full stack", "frontend", "backend", "web"],
            "engineer": ["engineer", "developer", "full stack", "frontend", "backend"],
            "intern": ["intern", "internship"],
            "fresher": ["fresher", "entry-level", "entry level", "intern"],
        }
        terms = equivalents.get(token, [token])
        return any(term in title for term in terms)


demo_job_source = DemoJobSourceAdapter()

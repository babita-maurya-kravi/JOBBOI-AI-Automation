# JobBot AI

A production-oriented AI job search and application automation platform built with FastAPI, React, PostgreSQL, Redis, and Playwright.

## Features

- Resume upload and parsing
- ATS-style scoring engine
- Job matching and skill-gap analysis
- Saved jobs and applications tracking
- Cover-letter generation
- Browser automation with manual intervention safeguards
- Mock job adapter for local development

## Local Setup

This project is validated on Python 3.13 (compatible with the 3.12+ requirement and required for the PDF extraction package to build reliably on Windows).

### Prerequisites

- Docker Desktop installed and running on Windows/macOS
- WSL 2 enabled if using Docker Desktop on Windows
- Python 3.13 for the local backend fallback

1. Copy `.env.example` to `.env`.
2. Update environment values.
3. Start Docker Desktop, then run from the project root:

```powershell
.\run.bat
```

This starts PostgreSQL, Redis, backend, and frontend in one terminal.

If you prefer running Compose directly, this project uses the legacy
`docker-compose` command on this machine:

```powershell
docker-compose up --build
```

If Docker Desktop is not installed or the Docker engine is unavailable in your environment, use the backend-only local fallback:

```bash
cd jobbot-ai/backend
py -3.13 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

If you want to run the backend locally without Docker:

```bash
py -3.13 -m venv .venv
.venv\Scripts\activate
cd backend
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

The app will be available at:

- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8001/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Database migrations

```bash
cd jobbot-ai/backend
alembic init alembic
# or use SQLModel migration tooling if configured later
```

This project ships with a working local scaffold and the main application flow is implemented in code.

## Notes

- The app purposely stops before submitting when CAPTCHA or MFA appears.
- Demo job sources are included for non-external testing.
- Real job-site adapters are implemented as modular interfaces and can be expanded under the backend job source package.

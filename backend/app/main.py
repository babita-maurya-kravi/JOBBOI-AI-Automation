from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api import auth, resumes, ats, jobs, applications, followups, analytics, cover_letters, social_posts
from app.config import get_settings
from app.database import init_db

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title=settings.app_name, version="0.1.0")
init_db()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(resumes.router, prefix=settings.api_prefix)
app.include_router(ats.router, prefix=settings.api_prefix)
app.include_router(jobs.router, prefix=settings.api_prefix)
app.include_router(applications.router, prefix=settings.api_prefix)
app.include_router(followups.router, prefix=settings.api_prefix)
app.include_router(analytics.router, prefix=settings.api_prefix)
app.include_router(cover_letters.router, prefix=settings.api_prefix)
app.include_router(social_posts.router, prefix=settings.api_prefix)


@app.get("/health")
def health_check():
    return {"success": True, "data": {"status": "ok"}, "message": "Service healthy"}

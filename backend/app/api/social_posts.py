from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.jobs import latest_resume, parse_posted_at, serialize_job
from app.database import get_db
from app.models.job import Job
from app.models.saved_job import SavedJob
from app.models.social_job_post import SocialJobPost
from app.models.user import User
from app.services.cover_letter import cover_letter_service
from app.services.job_matcher import job_matcher_service
from app.services.social_job_posts import social_job_post_service

router = APIRouter(prefix="/social-posts", tags=["social-posts"])


def serialize_social_post(post: SocialJobPost, match: dict | None = None, saved: bool = False) -> dict:
    job_data = serialize_job(post.job, match=match, saved=saved) if post.job else None
    data = {
        "id": post.id,
        "job_id": post.job_id,
        "platform": post.platform,
        "source_type": post.source_type,
        "external_post_id": post.external_post_id,
        "original_post_url": post.original_post_url,
        "post_text": post.post_text,
        "author_name": post.author_name,
        "company_name": post.company_name,
        "job_title": post.job_title,
        "required_skills": post.required_skills or [],
        "experience_requirement": post.experience_requirement,
        "fresher_eligible": post.fresher_eligible,
        "employment_type": post.employment_type,
        "work_mode": post.work_mode,
        "location": post.location,
        "salary_or_stipend": post.salary_or_stipend,
        "education_requirements": post.education_requirements,
        "application_deadline": post.application_deadline.isoformat() if post.application_deadline else None,
        "application_url": post.application_url,
        "recruiter_email": post.recruiter_email,
        "application_instructions": post.application_instructions,
        "classification_type": post.classification_type,
        "confidence_score": post.confidence_score,
        "verification_status": post.verification_status,
        "status": post.status,
        "user_feedback": post.user_feedback,
        "publication_date": post.publication_date.isoformat() if post.publication_date else None,
        "first_discovered_at": post.first_discovered_at.isoformat() if post.first_discovered_at else None,
        "last_checked_at": post.last_checked_at.isoformat() if post.last_checked_at else None,
        "saved": saved,
        "job": job_data,
    }
    if match:
        data.update(match)
    return data


def upsert_social_post(db: Session, user_id: int, extracted: dict) -> SocialJobPost:
    existing = None
    if extracted.get("external_post_id"):
        existing = db.query(SocialJobPost).filter(
            SocialJobPost.user_id == user_id,
            SocialJobPost.platform == extracted["platform"],
            SocialJobPost.external_post_id == extracted["external_post_id"],
        ).first()
    if not existing:
        existing = db.query(SocialJobPost).filter(
            SocialJobPost.user_id == user_id,
            SocialJobPost.normalized_text_hash == extracted["normalized_text_hash"],
        ).first()

    if existing:
        for key, value in extracted.items():
            if key == "user_feedback" and existing.user_feedback:
                continue
            setattr(existing, key, value)
        existing.last_checked_at = datetime.utcnow()
        post = existing
    else:
        post = SocialJobPost(user_id=user_id, **extracted)
        db.add(post)

    db.commit()
    db.refresh(post)
    ensure_linked_job(db, post)
    return post


def ensure_linked_job(db: Session, post: SocialJobPost) -> Job | None:
    if not social_job_post_service.is_opportunity(post.classification_type):
        return None

    description = social_job_post_service.job_description(model_to_extracted(post))
    source = f"Social:{post.platform}"
    external_id = post.external_post_id or post.normalized_text_hash[:32]
    job = post.job or db.query(Job).filter(Job.source == source, Job.external_id == external_id).first()
    payload = {
        "source": source,
        "external_id": external_id,
        "title": post.job_title or "Role unavailable",
        "company": post.company_name or post.author_name or "Company unavailable",
        "location": post.location or post.work_mode,
        "description": description,
        "salary": post.salary_or_stipend,
        "employment_type": post.employment_type,
        "experience_required": post.experience_requirement,
        "url": post.application_url or post.original_post_url,
        "posted_at": post.publication_date,
    }
    if job:
        for key, value in payload.items():
            setattr(job, key, value)
    else:
        job = Job(**payload)
        db.add(job)
    db.commit()
    db.refresh(job)
    if post.job_id != job.id:
        post.job_id = job.id
        db.commit()
        db.refresh(post)
    return job


def model_to_extracted(post: SocialJobPost) -> dict:
    return {
        "post_text": post.post_text,
        "job_title": post.job_title,
        "company_name": post.company_name,
        "experience_requirement": post.experience_requirement,
        "employment_type": post.employment_type,
        "work_mode": post.work_mode,
        "location": post.location,
        "salary_or_stipend": post.salary_or_stipend,
        "application_instructions": post.application_instructions,
    }


def saved_job_ids(db: Session, user_id: int) -> set[int]:
    return {
        item.job_id
        for item in db.query(SavedJob).filter(SavedJob.user_id == user_id).all()
    }


def match_for_post(post: SocialJobPost, candidate_profile: dict) -> dict | None:
    if not candidate_profile:
        return None
    description = post.job.description if post.job else social_job_post_service.job_description(model_to_extracted(post))
    return job_matcher_service.analyze_match(candidate_profile, description or "")


def apply_response_filters(posts: list[SocialJobPost], payload: dict, candidate_profile: dict) -> list[tuple[SocialJobPost, dict | None]]:
    min_match_score = int(payload.get("min_match_score") or 0)
    classification_filter = set(payload.get("classifications") or [])
    source_type_filter = set(payload.get("source_types") or [])
    employment_filter = str(payload.get("employment_type") or "").lower()
    work_mode_filter = str(payload.get("work_mode") or "").lower()
    include_non_jobs = bool(payload.get("include_non_jobs"))
    filtered = []

    for post in posts:
        if not include_non_jobs and post.classification_type == "Non-Job Post":
            continue
        if classification_filter and post.classification_type not in classification_filter:
            continue
        if source_type_filter and post.source_type not in source_type_filter:
            continue
        if employment_filter and employment_filter != "any" and employment_filter not in str(post.employment_type or "").lower():
            continue
        if work_mode_filter and work_mode_filter != "any" and work_mode_filter not in str(post.work_mode or "").lower():
            continue
        match = match_for_post(post, candidate_profile)
        if match and match.get("match_score", 0) < min_match_score:
            continue
        filtered.append((post, match))

    return sorted(filtered, key=lambda item: item[1].get("match_score", 0) if item[1] else 0, reverse=True)


@router.post("/search")
def search_social_posts(payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = payload.get("query") or ""
    location = payload.get("location")
    platforms = payload.get("platforms") or []
    resume = latest_resume(db, user.id)
    candidate_profile = resume.parsed_data if resume and resume.parsed_data else {}

    discovered = social_job_post_service.search_demo_posts(query=query, location=location, platforms=platforms)
    posts = []
    for raw_post in discovered:
        extracted = social_job_post_service.classify(
            post_text=raw_post.get("post_text") or "",
            platform=raw_post.get("platform") or "Demo",
            original_post_url=raw_post.get("original_post_url"),
            author_name=raw_post.get("author_name"),
        )
        extracted["source_type"] = raw_post.get("source_type") or extracted["source_type"]
        if raw_post.get("publication_date"):
            extracted["publication_date"] = parse_posted_at(raw_post["publication_date"])
        posts.append(upsert_social_post(db, user.id, extracted))

    filtered = apply_response_filters(posts, payload, candidate_profile)
    saved_ids = saved_job_ids(db, user.id)
    results = [
        serialize_social_post(post, match=match, saved=bool(post.job_id and post.job_id in saved_ids))
        for post, match in filtered
    ]
    return {
        "success": True,
        "data": {
            "posts": results,
            "unsupported_sources": [
                {
                    "platform": "LinkedIn normal posts",
                    "reason": "Direct feed scraping is not enabled. Use manual post import or an approved platform API integration.",
                }
            ],
            "last_successful_search_at": datetime.utcnow().isoformat(),
        },
        "message": "Social job posts searched",
    }


@router.get("")
def list_social_posts(
    query: str | None = None,
    min_match_score: int = Query(default=0, ge=0, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    resume = latest_resume(db, user.id)
    candidate_profile = resume.parsed_data if resume and resume.parsed_data else {}
    db_query = db.query(SocialJobPost).filter(SocialJobPost.user_id == user.id)
    if query:
        like = f"%{query}%"
        db_query = db_query.filter(
            or_(
                SocialJobPost.post_text.ilike(like),
                SocialJobPost.job_title.ilike(like),
                SocialJobPost.company_name.ilike(like),
                SocialJobPost.author_name.ilike(like),
            )
        )
    posts = db_query.order_by(SocialJobPost.created_at.desc()).all()
    filtered = apply_response_filters(posts, {"min_match_score": min_match_score}, candidate_profile)
    saved_ids = saved_job_ids(db, user.id)
    return {
        "success": True,
        "data": {
            "posts": [
                serialize_social_post(post, match=match, saved=bool(post.job_id and post.job_id in saved_ids))
                for post, match in filtered
            ]
        },
        "message": "Social job posts listed",
    }


@router.get("/filters")
def social_post_filters(user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "platforms": ["LinkedIn", "X", "Company Announcement", "Community Post"],
            "source_types": ["Demo Social Feed", "Manual Import", "Social Post"],
            "classifications": [
                "Structured Job Listing",
                "Recruiter / HR Job Post",
                "Company Hiring Announcement",
                "Internship Opportunity",
                "Referral Opportunity",
                "Freelance / Contract Opportunity",
                "Non-Job Post",
                "Uncertain / Needs Review",
            ],
            "work_modes": ["Remote", "Hybrid", "On-site"],
            "employment_types": ["Full-time", "Part-time", "Internship", "Contract"],
        },
        "message": "Social post filters listed",
    }


@router.get("/{post_id}")
def get_social_post(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(SocialJobPost).filter(SocialJobPost.id == post_id, SocialJobPost.user_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Social post not found")
    resume = latest_resume(db, user.id)
    candidate_profile = resume.parsed_data if resume and resume.parsed_data else {}
    match = match_for_post(post, candidate_profile)
    saved_ids = saved_job_ids(db, user.id)
    return {"success": True, "data": {"post": serialize_social_post(post, match=match, saved=bool(post.job_id and post.job_id in saved_ids))}, "message": "Social post found"}


@router.post("/classify")
def classify_social_post(payload: dict, user: User = Depends(get_current_user)):
    post_text = payload.get("post_text") or ""
    if not post_text.strip():
        raise HTTPException(status_code=400, detail="Post text is required")
    result = social_job_post_service.classify(
        post_text=post_text,
        platform=payload.get("platform") or "Manual",
        original_post_url=payload.get("original_post_url"),
        author_name=payload.get("author_name"),
    )
    return {"success": True, "data": {"classification": result}, "message": "Social post classified"}


@router.post("/import-url")
def import_social_post(payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post_text = payload.get("post_text") or ""
    original_post_url = payload.get("original_post_url") or payload.get("url")
    if not post_text.strip():
        raise HTTPException(status_code=400, detail="Post text is required because direct social feed scraping is not enabled")
    extracted = social_job_post_service.classify(
        post_text=post_text,
        platform=payload.get("platform") or "Manual",
        original_post_url=original_post_url,
        author_name=payload.get("author_name"),
    )
    extracted["source_type"] = "Manual Import"
    if payload.get("publication_date"):
        extracted["publication_date"] = parse_posted_at(payload["publication_date"])
    post = upsert_social_post(db, user.id, extracted)
    resume = latest_resume(db, user.id)
    candidate_profile = resume.parsed_data if resume and resume.parsed_data else {}
    match = match_for_post(post, candidate_profile)
    saved_ids = saved_job_ids(db, user.id)
    return {
        "success": True,
        "data": {"post": serialize_social_post(post, match=match, saved=bool(post.job_id and post.job_id in saved_ids))},
        "message": "Social post imported",
    }


@router.post("/{post_id}/match-resume")
def match_social_post(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(SocialJobPost).filter(SocialJobPost.id == post_id, SocialJobPost.user_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Social post not found")
    resume = latest_resume(db, user.id)
    candidate_profile = resume.parsed_data if resume and resume.parsed_data else {}
    match = match_for_post(post, candidate_profile) or {}
    return {"success": True, "data": match, "message": "Social post resume match complete"}


@router.post("/{post_id}/save")
def save_social_post(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(SocialJobPost).filter(SocialJobPost.id == post_id, SocialJobPost.user_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Social post not found")
    job = ensure_linked_job(db, post)
    if not job:
        raise HTTPException(status_code=400, detail="Only job-related social posts can be saved")
    existing = db.query(SavedJob).filter(SavedJob.user_id == user.id, SavedJob.job_id == job.id).first()
    if not existing:
        db.add(SavedJob(user_id=user.id, job_id=job.id))
        db.commit()
    return {"success": True, "data": {"saved": True, "job_id": job.id}, "message": "Social job post saved"}


@router.post("/{post_id}/feedback")
def feedback_social_post(post_id: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(SocialJobPost).filter(SocialJobPost.id == post_id, SocialJobPost.user_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Social post not found")
    feedback = payload.get("feedback")
    if feedback not in {"NOT_RELEVANT", "SUSPICIOUS", "RELEVANT"}:
        raise HTTPException(status_code=400, detail="Invalid feedback")
    post.user_feedback = feedback
    if feedback == "NOT_RELEVANT":
        post.status = "DISMISSED"
    if feedback == "SUSPICIOUS":
        post.status = "SUSPICIOUS"
        post.verification_status = "NEEDS_REVIEW"
    db.commit()
    db.refresh(post)
    return {"success": True, "data": {"post": serialize_social_post(post)}, "message": "Social post feedback saved"}


@router.post("/{post_id}/cover-letter")
def social_post_cover_letter(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(SocialJobPost).filter(SocialJobPost.id == post_id, SocialJobPost.user_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Social post not found")
    job = ensure_linked_job(db, post)
    if not job:
        raise HTTPException(status_code=400, detail="Only job-related social posts can generate cover letters")
    resume = latest_resume(db, user.id)
    candidate_profile = resume.parsed_data if resume and resume.parsed_data else {"name": user.name}
    match = job_matcher_service.analyze_match(candidate_profile, job.description or "")
    content = cover_letter_service.generate(candidate_profile, job, match)
    return {"success": True, "data": {"content": content}, "message": "Social post cover letter generated"}

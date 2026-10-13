from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SocialJobPost(Base):
    __tablename__ = "social_job_posts"
    __table_args__ = (
        UniqueConstraint("user_id", "platform", "external_post_id", name="uq_social_post_external"),
        UniqueConstraint("user_id", "normalized_text_hash", name="uq_social_post_hash"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)
    platform = Column(String(80), nullable=False, index=True)
    source_type = Column(String(120), nullable=False, default="Manual Import", index=True)
    external_post_id = Column(String(220), nullable=True, index=True)
    original_post_url = Column(String(700), nullable=True)
    post_text = Column(Text, nullable=False)
    normalized_text_hash = Column(String(64), nullable=False, index=True)
    author_name = Column(String(250), nullable=True)
    company_name = Column(String(250), nullable=True)
    job_title = Column(String(250), nullable=True)
    required_skills = Column(JSON, nullable=True)
    experience_requirement = Column(String(160), nullable=True)
    fresher_eligible = Column(String(40), nullable=True)
    employment_type = Column(String(80), nullable=True)
    work_mode = Column(String(80), nullable=True)
    location = Column(String(220), nullable=True)
    salary_or_stipend = Column(String(160), nullable=True)
    education_requirements = Column(String(250), nullable=True)
    application_deadline = Column(DateTime(timezone=True), nullable=True)
    application_url = Column(String(700), nullable=True)
    recruiter_email = Column(String(250), nullable=True)
    application_instructions = Column(Text, nullable=True)
    classification_type = Column(String(120), nullable=False, index=True)
    confidence_score = Column(Float, nullable=False, default=0)
    verification_status = Column(String(80), nullable=False, default="UNVERIFIED", index=True)
    status = Column(String(80), nullable=False, default="ACTIVE", index=True)
    user_feedback = Column(String(80), nullable=True)
    publication_date = Column(DateTime(timezone=True), nullable=True, index=True)
    first_discovered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_checked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User")
    job = relationship("Job")

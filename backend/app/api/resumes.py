from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models.resume import Resume
from app.models.resume_version import ResumeVersion
from app.models.user import User
from app.services.ats_engine import ats_score_service
from app.services.resume_parser import resume_parser_service

router = APIRouter(prefix="/resumes", tags=["resumes"])


def serialize_resume(resume: Resume) -> dict:
    ats_analysis = ats_score_service.analyze(resume.parsed_data or {}) if resume.parsed_data else None
    return {
        "id": resume.id,
        "file_name": resume.file_name,
        "file_path": resume.file_path,
        "parsed_data": resume.parsed_data,
        "ats_score": resume.ats_score or (ats_analysis or {}).get("score"),
        "ats_analysis": ats_analysis,
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
    }


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    file_path = f"/tmp/{user.id}_{file.filename}"
    with open(file_path, "wb") as fh:
        fh.write(await file.read())

    extracted_text = resume_parser_service.extract_text_from_pdf(file_path)
    parsed = resume_parser_service.build_structured_resume(extracted_text)
    ats_result = ats_score_service.analyze(parsed)

    resume = Resume(
        user_id=user.id,
        file_name=file.filename,
        file_path=file_path,
        parsed_data=parsed,
        ats_score=ats_result["score"],
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    return {"success": True, "data": {"resume": serialize_resume(resume)}, "message": "Resume uploaded and parsed"}


@router.get("")
def list_resumes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    resumes = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.created_at.desc()).all()
    return {"success": True, "data": {"resumes": [serialize_resume(resume) for resume in resumes]}, "message": "Resumes retrieved"}


@router.get("/{resume_id}")
def get_resume(resume_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"success": True, "data": {"resume": serialize_resume(resume)}, "message": "Resume found"}


@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    file_path = resume.file_path
    db.query(ResumeVersion).filter(ResumeVersion.resume_id == resume.id).delete()
    db.delete(resume)
    db.commit()

    if file_path:
        try:
            Path(file_path).unlink(missing_ok=True)
        except OSError:
            pass

    return {"success": True, "data": {"deleted": True, "resume_id": resume_id}, "message": "Resume deleted"}

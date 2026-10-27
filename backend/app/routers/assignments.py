from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from ..db.session import get_session
from ..models.schemas import User, Assignment, AssignmentSubmission, Attendance
from .auth import get_current_user

router = APIRouter(tags=["Talaba Vazifalari va Davomat"])

class SubmitAssignmentRequest(BaseModel):
    solution_text: str
    file_attachment: Optional[str] = None

@router.get("/assignments/my")
def get_my_assignments(
    user_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    student_id = current_user.id if (current_user and hasattr(current_user, 'id')) else (user_id or 1)
    student = session.exec(select(User).where(User.id == student_id)).first()
    student_group = student.group_name if student else "210-22"

    assignments = session.exec(
        select(Assignment).order_by(Assignment.deadline.asc(), Assignment.created_at.desc())
    ).all()

    # Filter assignments applicable to student
    applicable = [a for a in assignments if a.target_group in ["all", student_group, None]]

    results = []
    for a in applicable:
        sub = session.exec(
            select(AssignmentSubmission).where(
                AssignmentSubmission.assignment_id == a.id,
                AssignmentSubmission.user_id == student_id
            )
        ).first()

        results.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "lab_number": a.lab_number,
            "target_group": a.target_group,
            "deadline": a.deadline,
            "max_score": a.max_score,
            "is_submitted": sub is not None,
            "submission_id": sub.id if sub else None,
            "solution_text": sub.solution_text if sub else None,
            "grade": sub.grade if sub else None,
            "teacher_feedback": sub.teacher_feedback if sub else None,
            "status": sub.status if sub else "not_submitted",
            "submitted_at": sub.submitted_at.strftime("%Y-%m-%d %H:%M") if sub else None
        })

    return results

@router.post("/assignments/{assignment_id}/submit")
def submit_assignment_solution(
    assignment_id: int,
    req: SubmitAssignmentRequest,
    user_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    student_id = current_user.id if (current_user and hasattr(current_user, 'id')) else (user_id or 1)
    assign = session.exec(select(Assignment).where(Assignment.id == assignment_id)).first()
    if not assign:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")

    sub = session.exec(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.user_id == student_id
        )
    ).first()

    if not sub:
        sub = AssignmentSubmission(
            assignment_id=assignment_id,
            user_id=student_id,
            solution_text=req.solution_text,
            file_attachment=req.file_attachment,
            status="submitted"
        )
    else:
        sub.solution_text = req.solution_text
        sub.file_attachment = req.file_attachment
        sub.submitted_at = datetime.now(timezone.utc)
        sub.status = "submitted"

    session.add(sub)
    session.commit()
    session.refresh(sub)
    return {"message": "Vazifa yechimi topshirildi", "submission_id": sub.id}

@router.get("/attendance/my")
def get_my_attendance(
    user_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    student_id = current_user.id if (current_user and hasattr(current_user, 'id')) else (user_id or 1)
    records = session.exec(
        select(Attendance).where(Attendance.user_id == student_id).order_by(Attendance.lesson_date.desc())
    ).all()

    total = len(records)
    present = len([r for r in records if r.status == "present"])
    absent = len([r for r in records if r.status == "absent"])
    excused = len([r for r in records if r.status == "excused"])
    rate = round((present / total * 100), 1) if total > 0 else 100.0

    return {
        "summary": {
            "total_lessons": total,
            "present_count": present,
            "absent_count": absent,
            "excused_count": excused,
            "attendance_rate": rate
        },
        "records": [
            {
                "id": r.id,
                "lesson_date": r.lesson_date,
                "lab_number": r.lab_number,
                "status": r.status,
                "note": r.note
            }
            for r in records
        ]
    }

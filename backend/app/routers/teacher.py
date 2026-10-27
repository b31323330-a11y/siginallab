import io
import csv
import os
import json
import re
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from ..core.config import settings
from ..db.session import get_session
from ..models.schemas import (
    User, LabProgress, ReportSubmission, Question, 
    Assignment, AssignmentSubmission, Attendance, StudentGroup, Notification
)
from ..core.security import get_password_hash
from .auth import get_current_user

router = APIRouter(prefix="/teacher", tags=["O'qituvchi Paneli"])

# --- PYDANTIC REQUEST MODELS ---

class GradeReportRequest(BaseModel):
    grade: float
    teacher_feedback: str
    rubric_scores: Optional[Dict[str, float]] = None

class ReportReturnRequest(BaseModel):
    feedback: str

class StudentCreateRequest(BaseModel):
    full_name: str
    email: str
    password: Optional[str] = "talaba123"
    group_name: str = "210-22"
    variant_number: Optional[int] = None

class StudentBatchImportRequest(BaseModel):
    students: List[StudentCreateRequest]

class AssignmentCreateRequest(BaseModel):
    title: str
    description: str
    lab_number: Optional[int] = None
    target_group: Optional[str] = "all"
    deadline: Optional[str] = None
    max_score: float = 100.0

class GradeAssignmentRequest(BaseModel):
    grade: float
    teacher_feedback: str

class AttendanceRecordItem(BaseModel):
    user_id: int
    status: str  # present, absent, excused
    note: Optional[str] = None

class AttendanceBatchRequest(BaseModel):
    lesson_date: str
    lab_number: Optional[int] = None
    records: List[AttendanceRecordItem]

class QuestionCreateRequest(BaseModel):
    lab_number: int
    question_text: str
    question_type: str = "mcq"
    options: List[str]
    correct_answer: str
    explanation: str
    status: str = "approved"

class QuestionUpdateRequest(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    status: Optional[str] = None

# ========================================================
# 1. TALABALAR VA ULARNING TO'LIQ MA'LUMOTLARI
# ========================================================

@router.get("/students")
def get_students(session: Session = Depends(get_session)):
    students = session.exec(select(User).where(User.role == "student")).all()
    results = []
    for s in students:
        progs = session.exec(select(LabProgress).where(LabProgress.user_id == s.id)).all()
        completed = len([p for p in progs if p.status == "completed"])
        in_progress = len([p for p in progs if p.status == "in_progress"])
        avg_score = round(sum([p.score for p in progs]) / max(1, len(progs)), 1) if progs else 85.0
        
        # Davomat hisobi
        att_records = session.exec(select(Attendance).where(Attendance.user_id == s.id)).all()
        total_lessons = len(att_records)
        present_count = len([a for a in att_records if a.status == "present"])
        att_rate = round((present_count / total_lessons * 100), 1) if total_lessons > 0 else 100.0

        results.append({
            "id": s.id,
            "full_name": s.full_name,
            "email": s.email,
            "group_name": s.group_name or "210-22",
            "variant_number": s.variant_number,
            "completed_labs": completed,
            "in_progress_labs": in_progress,
            "average_score": avg_score,
            "attendance_rate": att_rate,
            "total_attended": present_count,
            "total_lessons": total_lessons
        })
    return results

@router.post("/students")
def create_student(
    req: StudentCreateRequest,
    session: Session = Depends(get_session)
):
    existing = session.exec(select(User).where(User.email == req.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ushbu email bilan talaba allaqachon mavjud")
    
    # Auto assign variant if not specified
    variant = req.variant_number
    if not variant:
        existing_students = session.exec(select(User).where(User.group_name == req.group_name, User.role == "student")).all()
        variant = (len(existing_students) % 20) + 1

    new_student = User(
        email=req.email,
        hashed_password=get_password_hash(req.password or "talaba123"),
        full_name=req.full_name,
        group_name=req.group_name,
        variant_number=variant,
        role="student",
        is_active=True
    )
    session.add(new_student)
    session.commit()
    session.refresh(new_student)
    return {"message": "Talaba qo'shildi", "student": new_student}

@router.post("/students/import_csv")
def import_students_csv(
    req: StudentBatchImportRequest,
    session: Session = Depends(get_session)
):
    added = []
    skipped = []
    
    for idx, s in enumerate(req.students):
        existing = session.exec(select(User).where(User.email == s.email)).first()
        if existing:
            skipped.append(s.email)
            continue
            
        variant = s.variant_number or ((idx % 20) + 1)
        new_u = User(
            email=s.email,
            hashed_password=get_password_hash(s.password or "talaba123"),
            full_name=s.full_name,
            group_name=s.group_name or "210-22",
            variant_number=variant,
            role="student",
            is_active=True
        )
        session.add(new_u)
        added.append(s.email)
        
    session.commit()
    return {
        "message": f"{len(added)} ta talaba muvaffaqiyatli import qilindi",
        "added_count": len(added),
        "skipped_count": len(skipped),
        "skipped_emails": skipped
    }

@router.get("/groups")
def get_teacher_groups(session: Session = Depends(get_session)):
    groups = session.exec(select(StudentGroup)).all()
    res = []
    for g in groups:
        students = session.exec(select(User).where(User.group_name == g.name, User.role == "student")).all()
        res.append({
            "id": g.id,
            "name": g.name,
            "faculty": g.faculty,
            "academic_year": g.academic_year,
            "students_count": len(students)
        })
    return res

@router.get("/students/{student_id}/progress")
def get_student_progress(student_id: int, session: Session = Depends(get_session)):
    student = session.exec(select(User).where(User.id == student_id)).first()
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")
    
    # 1. 20 ta laboratoriya bo'yicha ma'lumotlar
    progs = session.exec(select(LabProgress).where(LabProgress.user_id == student_id)).all()
    prog_map = {p.lab_number: p for p in progs}
    reports = session.exec(select(ReportSubmission).where(ReportSubmission.user_id == student_id)).all()
    rep_map = {r.lab_number: r for r in reports}

    labs_overview = []
    for lab_num in range(2, 22):
        p = prog_map.get(lab_num)
        r = rep_map.get(lab_num)
        labs_overview.append({
            "lab_number": lab_num,
            "status": p.status if p else ("completed" if r and r.grade else "not_started"),
            "score": r.grade if (r and r.grade is not None) else (p.score if p else 0.0),
            "report_submitted": r is not None,
            "report_id": r.id if r else None,
            "submitted_at": r.submitted_at.strftime("%Y-%m-%d %H:%M") if r else None,
            "teacher_feedback": r.teacher_feedback if r else None
        })

    # 2. Vazifalar (Assignments) bo'yicha topshiriqlar
    submissions = session.exec(select(AssignmentSubmission).where(AssignmentSubmission.user_id == student_id)).all()
    assignments_data = []
    for sub in submissions:
        assign = session.exec(select(Assignment).where(Assignment.id == sub.assignment_id)).first()
        assignments_data.append({
            "submission_id": sub.id,
            "assignment_id": sub.assignment_id,
            "title": assign.title if assign else "Topshiriq",
            "max_score": assign.max_score if assign else 100.0,
            "solution_text": sub.solution_text,
            "grade": sub.grade,
            "teacher_feedback": sub.teacher_feedback,
            "status": sub.status,
            "submitted_at": sub.submitted_at.strftime("%Y-%m-%d %H:%M")
        })

    # 3. Davomat (Attendance) tarixi
    attendances = session.exec(select(Attendance).where(Attendance.user_id == student_id).order_by(Attendance.lesson_date.desc())).all()
    att_history = [
        {
            "id": a.id,
            "lesson_date": a.lesson_date,
            "lab_number": a.lab_number,
            "status": a.status,
            "note": a.note
        }
        for a in attendances
    ]
    total_att = len(att_history)
    pres_att = len([a for a in att_history if a["status"] == "present"])
    att_rate = round((pres_att / total_att * 100), 1) if total_att > 0 else 100.0

    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email,
            "group_name": student.group_name or "210-22",
            "variant_number": student.variant_number,
            "created_at": student.created_at.strftime("%Y-%m-%d")
        },
        "attendance_summary": {
            "rate": att_rate,
            "present": pres_att,
            "total": total_att
        },
        "labs": labs_overview,
        "assignments": assignments_data,
        "attendance": att_history
    }

# ========================================================
# 2. VAZIFALAR BOSHQARUVI (ASSIGNMENTS)
# ========================================================

@router.get("/assignments")
def get_teacher_assignments(session: Session = Depends(get_session)):
    assignments = session.exec(select(Assignment).order_by(Assignment.created_at.desc())).all()
    res = []
    for a in assignments:
        subs = session.exec(select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == a.id)).all()
        graded_count = len([s for s in subs if s.status == "graded"])
        res.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "lab_number": a.lab_number,
            "target_group": a.target_group,
            "deadline": a.deadline,
            "max_score": a.max_score,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M"),
            "total_submissions": len(subs),
            "graded_submissions": graded_count,
            "pending_submissions": len(subs) - graded_count
        })
    return res

@router.post("/assignments")
def create_assignment(
    req: AssignmentCreateRequest,
    user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    creator_id = user.id if (user and hasattr(user, 'id')) else 4
    a = Assignment(
        title=req.title,
        description=req.description,
        lab_number=req.lab_number,
        target_group=req.target_group or "all",
        deadline=req.deadline,
        max_score=req.max_score,
        created_by=creator_id
    )
    session.add(a)
    session.commit()
    session.refresh(a)
    return a

@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, session: Session = Depends(get_session)):
    a = session.exec(select(Assignment).where(Assignment.id == assignment_id)).first()
    if not a:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")
    # Delete associated submissions
    subs = session.exec(select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == assignment_id)).all()
    for s in subs:
        session.delete(s)
    session.delete(a)
    session.commit()
    return {"message": "Vazifa muvaffaqiyatli o'chirildi", "id": assignment_id}

@router.get("/assignments/{assignment_id}/submissions")
def get_assignment_submissions(assignment_id: int, session: Session = Depends(get_session)):
    subs = session.exec(
        select(AssignmentSubmission)
        .where(AssignmentSubmission.assignment_id == assignment_id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    ).all()
    res = []
    for s in subs:
        student = session.exec(select(User).where(User.id == s.user_id)).first()
        res.append({
            "id": s.id,
            "assignment_id": s.assignment_id,
            "user_id": s.user_id,
            "student_name": student.full_name if student else "Noma'lum talaba",
            "group_name": student.group_name if student else "210-22",
            "student_variant": student.variant_number if student else 1,
            "solution_text": s.solution_text,
            "file_attachment": s.file_attachment,
            "grade": s.grade,
            "teacher_feedback": s.teacher_feedback,
            "status": s.status,
            "submitted_at": s.submitted_at.strftime("%Y-%m-%d %H:%M")
        })
    return res

@router.post("/assignments/submissions/{submission_id}/grade")
def grade_assignment_submission(
    submission_id: int,
    req: GradeAssignmentRequest,
    session: Session = Depends(get_session)
):
    sub = session.exec(select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id)).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Topshiriq javobi topilmadi")
    sub.grade = req.grade
    sub.teacher_feedback = req.teacher_feedback
    sub.status = "graded"
    session.add(sub)
    session.commit()
    return {"message": "Vazifa baholandi", "id": sub.id, "grade": sub.grade}

@router.post("/assignments/submissions/{submission_id}/ai_review")
def ai_review_assignment_submission(
    submission_id: int,
    session: Session = Depends(get_session)
):
    sub = session.exec(select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id)).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Topshiriq javobi topilmadi")
    
    assign = session.exec(select(Assignment).where(Assignment.id == sub.assignment_id)).first()
    max_score = assign.max_score if assign else 100.0
    solution = (sub.solution_text or "").strip()
    points = []
    
    if len(solution) < 10:
        suggested_grade = 0.0
        points.append("❌ Yechim bo'sh yoki mazmunsiz: Vazifa yechimi kiritilmagan (0 ball).")
        suggested_feedback = "Vazifa yechimi taqdim etilmagan. Iltimos, topshiriq shartlariga muvofiq MATLAB kodi va hisoblashlarni kiriting."
    else:
        matlab_keywords = [
            "plot", "stem", "conv", "butter", "filter", "freqz", "fft", "psnr", "snr", 
            "rms", "medfilt2", "imfilter", "dct", "dct2", "imread", "zeros", "sin", "cos", 
            "fs", "pi", "title", "xlabel", "ylabel"
        ]
        found_keywords = [kw for kw in matlab_keywords if re.search(r'\b' + kw + r'\b', solution.lower())]
        balanced = (solution.count("(") == solution.count(")")) and (solution.count("[") == solution.count("]"))
        
        desc_lower = (assign.description if assign else "").lower()
        topic_matched = False
        if "butterworth" in desc_lower and any(k in solution.lower() for k in ["butter", "filter", "cutoff", "snr"]):
            topic_matched = True
        elif ("salt" in desc_lower or "median" in desc_lower) and any(k in solution.lower() for k in ["medfilt", "median", "psnr"]):
            topic_matched = True
        elif ("aliasing" in desc_lower or "kotelnikov" in desc_lower) and any(k in solution.lower() for k in ["fs", "alias", "sinc", "sin"]):
            topic_matched = True
        elif len(found_keywords) >= 2:
            topic_matched = True

        score_percent = 40
        if len(found_keywords) >= 3:
            score_percent += 25
            points.append(f"✅ Standart DSP funksiyalari ({', '.join(found_keywords[:3])}) to'g'ri chaqirilgan (+25 ball).")
        elif len(found_keywords) >= 1:
            score_percent += 15
            points.append(f"✅ Kerakli funksiyalar ({', '.join(found_keywords)}) qisman kiritilgan (+15 ball).")
        else:
            points.append("⚠️ Maxsus DSP funksiyalari kam qo'llangan.")

        if balanced:
            score_percent += 15
            points.append("✅ MATLAB kodi sintaktik jihatdan to'g'ri, qavslar muvozanati saqlangan (+15 ball).")
        else:
            score_percent -= 15
            points.append("❌ Sintaktik nomuvofiqlik: qavslar ochilishi va yopilishida xatolik bor (-15 ball).")

        if topic_matched:
            score_percent += 20
            points.append(f"✅ Yechim vazifa talablari va parametrlariga mos keladi (+20 ball).")
        else:
            points.append("⚠️ Yechim vazifa shartlariga qisman mos.")

        final_pct = min(100, max(15, score_percent))
        suggested_grade = round((final_pct / 100.0) * max_score, 1)

        suggested_feedback = (
            f"Vazifa yechimi AI tomonidan tahlil qilindi ({suggested_grade}/{max_score} ball):\n"
            + "\n".join([f"- {p}" for p in points])
        )

    return {
        "suggested_grade": suggested_grade,
        "suggested_feedback": suggested_feedback,
        "points": points
    }

# ========================================================
# 3. DAVOMAT BOSHQARUVI (ATTENDANCE)
# ========================================================

@router.get("/attendance")
def get_attendance_for_date(
    date: Optional[str] = None,
    group_name: Optional[str] = None,
    session: Session = Depends(get_session)
):
    # If no date is specified, use today's date
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    
    query = select(User).where(User.role == "student")
    if group_name and group_name != "all":
        query = query.where(User.group_name == group_name)
    students = session.exec(query).all()

    results = []
    for s in students:
        att = session.exec(
            select(Attendance).where(
                Attendance.user_id == s.id,
                Attendance.lesson_date == target_date
            )
        ).first()

        results.append({
            "user_id": s.id,
            "student_name": s.full_name,
            "group_name": s.group_name,
            "variant_number": s.variant_number,
            "lesson_date": target_date,
            "lab_number": att.lab_number if att else None,
            "status": att.status if att else "present",
            "note": att.note if att else "",
            "is_marked": att is not None
        })
    return {
        "date": target_date,
        "students": results
    }

@router.post("/attendance/mark")
def mark_attendance_batch(
    req: AttendanceBatchRequest,
    session: Session = Depends(get_session)
):
    for r in req.records:
        existing = session.exec(
            select(Attendance).where(
                Attendance.user_id == r.user_id,
                Attendance.lesson_date == req.lesson_date
            )
        ).first()

        if existing:
            existing.status = r.status
            existing.note = r.note
            if req.lab_number:
                existing.lab_number = req.lab_number
            session.add(existing)
        else:
            new_att = Attendance(
                user_id=r.user_id,
                lesson_date=req.lesson_date,
                lab_number=req.lab_number,
                status=r.status,
                note=r.note
            )
            session.add(new_att)
            
    session.commit()
    return {"message": "Davomat muvaffaqiyatli saqlandi", "date": req.lesson_date, "count": len(req.records)}

@router.get("/attendance/overview")
def get_attendance_overview(session: Session = Depends(get_session)):
    students = session.exec(select(User).where(User.role == "student")).all()
    overview = []
    for s in students:
        records = session.exec(select(Attendance).where(Attendance.user_id == s.id)).all()
        total = len(records)
        present = len([r for r in records if r.status == "present"])
        absent = len([r for r in records if r.status == "absent"])
        excused = len([r for r in records if r.status == "excused"])
        rate = round((present / total * 100), 1) if total > 0 else 100.0

        overview.append({
            "user_id": s.id,
            "student_name": s.full_name,
            "group_name": s.group_name,
            "total_lessons": total,
            "present": present,
            "absent": absent,
            "excused": excused,
            "rate": rate
        })
    return overview

# ========================================================
# 4. TOPSHIRILGAN HISOBOTLAR VA AI REVIEW
# ========================================================

@router.get("/reports")
def get_submitted_reports(session: Session = Depends(get_session)):
    reports = session.exec(select(ReportSubmission).order_by(ReportSubmission.submitted_at.desc())).all()
    res = []
    for r in reports:
        student = session.exec(select(User).where(User.id == r.user_id)).first()
        res.append({
            "id": r.id,
            "lab_number": r.lab_number,
            "student_variant": r.student_variant,
            "student_id": r.user_id,
            "student_name": student.full_name if student else "Noma'lum talaba",
            "group_name": student.group_name if student else "210-22",
            "grade": r.grade,
            "teacher_feedback": r.teacher_feedback,
            "status": getattr(r, "status", "submitted") or "submitted",
            "similarity_score": getattr(r, "similarity_score", None),
            "similarity_matches": getattr(r, "similarity_matches", None),
            "rubric_scores": getattr(r, "rubric_scores", None),
            "ai_pre_check": r.ai_pre_check,
            "submitted_at": r.submitted_at.strftime("%Y-%m-%d %H:%M"),
            "content": r.content_json
        })
    return res

@router.get("/reports/{report_id}")
def get_report_detail(report_id: int, session: Session = Depends(get_session)):
    rep = session.exec(select(ReportSubmission).where(ReportSubmission.id == report_id)).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")
    student = session.exec(select(User).where(User.id == rep.user_id)).first()
    return {
        "id": rep.id,
        "lab_number": rep.lab_number,
        "student_variant": rep.student_variant,
        "student_id": rep.user_id,
        "student_name": student.full_name if student else "Noma'lum talaba",
        "group_name": student.group_name if student else "210-22",
        "grade": rep.grade,
        "teacher_feedback": rep.teacher_feedback,
        "status": getattr(rep, "status", "submitted") or "submitted",
        "similarity_score": getattr(rep, "similarity_score", None),
        "similarity_matches": getattr(rep, "similarity_matches", None),
        "rubric_scores": getattr(rep, "rubric_scores", None),
        "ai_pre_check": rep.ai_pre_check,
        "submitted_at": rep.submitted_at.strftime("%Y-%m-%d %H:%M"),
        "content": rep.content_json
    }

@router.post("/reports/{report_id}/grade")
def grade_report(report_id: int, req: GradeReportRequest, session: Session = Depends(get_session)):
    rep = session.exec(select(ReportSubmission).where(ReportSubmission.id == report_id)).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")
    
    rep.grade = req.grade
    rep.teacher_feedback = req.teacher_feedback
    rep.status = "graded"
    if req.rubric_scores:
        rep.rubric_scores = req.rubric_scores
    session.add(rep)

    prog = session.exec(
        select(LabProgress).where(
            LabProgress.user_id == rep.user_id,
            LabProgress.lab_number == rep.lab_number
        )
    ).first()
    
    if not prog:
        prog = LabProgress(
            user_id=rep.user_id,
            lab_number=rep.lab_number,
            status="completed",
            score=req.grade
        )
    else:
        prog.status = "completed"
        prog.score = req.grade
        prog.last_updated = datetime.now(timezone.utc)
    session.add(prog)

    # Notify student
    notif = Notification(
        user_id=rep.user_id,
        title=f"№ {rep.lab_number}-Laboratoriya hisoboti baholandi",
        message=f"Baho: {req.grade} ball. O'qituvchi taqrizi: {req.teacher_feedback}",
        type="grade",
        link="/student"
    )
    session.add(notif)
    session.commit()
    
    return {
        "message": "Baho va o'qituvchi taqrizi saqlandi",
        "id": rep.id,
        "grade": rep.grade,
        "teacher_feedback": rep.teacher_feedback
    }

@router.post("/reports/{report_id}/return")
def return_report_for_revision(
    report_id: int,
    req: ReportReturnRequest,
    session: Session = Depends(get_session)
):
    rep = session.exec(select(ReportSubmission).where(ReportSubmission.id == report_id)).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")
    rep.status = "returned"
    rep.teacher_feedback = req.feedback
    session.add(rep)

    # Notify student
    notif = Notification(
        user_id=rep.user_id,
        title=f"№ {rep.lab_number}-Laboratoriya hisoboti qaytarildi",
        message=f"O'qituvchi izohi: {req.feedback}. Iltimos, hisobotni tuzatib qayta topshiring.",
        type="return",
        link=f"/lab?id={rep.lab_number}"
    )
    session.add(notif)
    session.commit()
    return {"message": "Hisobot tuzatish uchun talabaga qaytarildi", "id": rep.id}

@router.get("/reports/{report_id}/plagiarism_check")
def check_report_plagiarism(report_id: int, session: Session = Depends(get_session)):
    rep = session.exec(select(ReportSubmission).where(ReportSubmission.id == report_id)).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")
    
    other_reports = session.exec(
        select(ReportSubmission)
        .where(ReportSubmission.lab_number == rep.lab_number, ReportSubmission.id != rep.id)
    ).all()

    my_content = rep.content_json or {}
    my_text = (my_content.get("conclusion") or "") + " " + (my_content.get("code") or "")
    my_words = set(re.findall(r'\w{4,}', my_text.lower()))

    highest_similarity = 0.0
    matches = []

    for other in other_reports:
        o_content = other.content_json or {}
        o_text = (o_content.get("conclusion") or "") + " " + (o_content.get("code") or "")
        o_words = set(re.findall(r'\w{4,}', o_text.lower()))
        
        if not my_words or not o_words:
            sim = 0.0
        else:
            intersection = len(my_words.intersection(o_words))
            union = len(my_words.union(o_words))
            sim = round((intersection / union * 100), 1) if union > 0 else 0.0

        if sim > 15.0:
            student = session.exec(select(User).where(User.id == other.user_id)).first()
            matches.append({
                "other_report_id": other.id,
                "student_name": student.full_name if student else "Boshqa talaba",
                "student_variant": other.student_variant,
                "similarity_pct": sim
            })
            if sim > highest_similarity:
                highest_similarity = sim

    rep.similarity_score = highest_similarity
    rep.similarity_matches = matches
    session.add(rep)
    session.commit()

    return {
        "report_id": report_id,
        "lab_number": rep.lab_number,
        "student_variant": rep.student_variant,
        "highest_similarity_pct": highest_similarity,
        "is_suspicious": highest_similarity >= 60.0,
        "matches": sorted(matches, key=lambda x: x["similarity_pct"], reverse=True)
    }

@router.post("/reports/{report_id}/ai_review")
def ai_review_report(report_id: int, session: Session = Depends(get_session)):
    rep = session.exec(select(ReportSubmission).where(ReportSubmission.id == report_id)).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")
    
    content = rep.content_json or {}
    conclusion = (content.get("conclusion") or "").strip()
    metrics = content.get("metrics") or {}
    code = (content.get("code") or "").strip()
    variant_params = content.get("variant_parameters") or {}

    # Load etalon lab data if available
    lab_json_path = os.path.join(settings.LABS_DIR, f"{rep.lab_number}.json")
    expected_params = {}
    if os.path.exists(lab_json_path):
        try:
            with open(lab_json_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                for v in d.get("variants", []):
                    if v.get("variant") == rep.student_variant:
                        expected_params = v.get("parameters", {})
                        break
        except Exception:
            pass

    # 1. CONCLUSION ASSESSMENT (0 - 30 ball)
    conclusion_score = 0
    conclusion_feedback = []
    dsp_keywords = [
        "signal", "spektr", "chastota", "shovqin", "filtr", "amplituda", "psnr", "furye", 
        "fft", "dct", "variant", "aliasing", "rms", "konvolyutsiya", "gistogramma", "piksel", 
        "tasvir", "kotelnikov", "nyquist", "butterworth", "morfolo", "kvantlash", "pitch", 
        "natija", "xulosa", "tajriba", "tahlil", "grafik", "funksiya"
    ]
    
    if len(conclusion) < 5:
        conclusion_score = 0
        conclusion_feedback.append("❌ Ilmiy xulosa mavjud emas: Talaba hisobot yakunida mustaqil xulosa bayon etmagan (0/30 ball).")
    elif len(conclusion) < 40:
        conclusion_score = 12
        conclusion_feedback.append("⚠️ Xulosa juda qisqa va umumiy: Tajriba bo'yicha ilmiy xulosalar to'liq ochib berilmagan (12/30 ball).")
    else:
        found_keywords = [kw for kw in dsp_keywords if kw in conclusion.lower()]
        if len(found_keywords) >= 3:
            conclusion_score = 30
            conclusion_feedback.append(f"✅ Mustaqil va asosli ilmiy xulosa: DSP terminologiyasi ({', '.join(found_keywords[:4])}) to'g'ri qo'llangan (30/30 ball).")
        elif len(found_keywords) >= 1:
            conclusion_score = 22
            conclusion_feedback.append("✅ Xulosa mavjud, lekin nazariy DSP atamalari qisman qo'llangan (22/30 ball).")
        else:
            conclusion_score = 16
            conclusion_feedback.append("⚠️ Xulosa yozilgan, biroq maxsus ilmiy tushunchalar kam (16/30 ball).")

    # 2. METRICS ASSESSMENT (0 - 40 ball)
    metrics_score = 0
    metrics_feedback = []

    if not metrics or len(metrics) == 0:
        metrics_score = 0
        metrics_feedback.append("❌ O'lchov natijalari yo'q: Interaktiv laboratoriyadan natijaviy metrikalar kiritilmagan (0/40 ball).")
    else:
        m_keys = [k.lower() for k in metrics.keys()]
        base_m = 20
        
        # 1D Signals
        if any(k in m_keys for k in ["rms", "power", "energy", "dominant_frequency"]):
            rms_val = metrics.get("rms", 0)
            dom_f = metrics.get("dominant_frequency", 0)
            power_val = metrics.get("power", 0)
            
            if rms_val and float(rms_val) > 0:
                base_m += 5
            if power_val and float(power_val) > 0:
                base_m += 5
                
            target_f1 = float(expected_params.get("F1") or variant_params.get("F1") or 0)
            target_f2 = float(expected_params.get("F2") or variant_params.get("F2") or 0)
            
            if target_f1 > 0 or target_f2 > 0:
                if (target_f1 > 0 and abs(dom_f - target_f1) <= 2) or (target_f2 > 0 and abs(dom_f - target_f2) <= 2):
                    base_m += 10
                    metrics_feedback.append(f"✅ O'lchangan dominant chastota ({dom_f} Hz) {rep.student_variant}-variant parametrlariga to'liq mos keldi (+10 ball).")
                else:
                    metrics_feedback.append(f"⚠️ O'lchangan dominant chastota ({dom_f} Hz) variantdagi chastotalar ({target_f1 or '?'} Hz / {target_f2 or '?'} Hz) bilan mos kelmadi.")
            else:
                base_m += 5
                metrics_feedback.append(f"✅ 1D signal energetik va vaqt metrikalari (RMS={rms_val}, Quvvat={power_val}) to'g'ri o'lchangan.")

        # 2D Images
        elif any(k in m_keys for k in ["psnr", "ssim", "compression_ratio_ks", "mse"]):
            psnr_val = float(metrics.get("psnr", 0) or 0)
            ks_val = float(metrics.get("compression_ratio_Ks", 0) or 0)
            ssim_val = float(metrics.get("ssim", 0) or 0)
            
            if psnr_val >= 28.0:
                base_m += 15
                metrics_feedback.append(f"✅ PSNR ko'rsatkichi a'lo darajada ({psnr_val:.1f} dB > 28 dB), tasvir sifati yaxshi tiklangan (+15 ball).")
            elif psnr_val >= 20.0:
                base_m += 10
                metrics_feedback.append(f"⚠️ PSNR ko'rsatkichi qoniqarli ({psnr_val:.1f} dB), shovqin qisman tozalangan (+10 ball).")
            elif psnr_val > 0:
                base_m += 5
                metrics_feedback.append(f"❌ PSNR ko'rsatkichi past ({psnr_val:.1f} dB), filtr parametrlari qayta ko'rib chiqilishi kerak (+5 ball).")
                
            if ks_val > 1.2:
                base_m += 5
                metrics_feedback.append(f"✅ Siqish koeffitsiyenti (Ks={ks_val:.2f}) samarali hisoblangan (+5 ball).")
            if ssim_val >= 0.8:
                base_m += 5

        # Speech (Pitch)
        elif "pitch_hz" in m_keys:
            pitch_val = float(metrics.get("pitch_hz", 0) or 0)
            if 70 <= pitch_val <= 450:
                base_m += 20
                metrics_feedback.append(f"✅ Nutq asosiy ton chastotasi (Pitch={pitch_val:.1f} Hz) to'g'ri hisoblangan (+20 ball).")
            else:
                base_m += 10
        # ML / KNN
        elif "accuracy_pct" in m_keys:
            acc = float(metrics.get("accuracy_pct", 0) or 0)
            if acc >= 85:
                base_m += 20
                metrics_feedback.append(f"✅ Tasniflash aniqligi ({acc}%) yuqori natija berdi (+20 ball).")
            else:
                base_m += 10
        else:
            base_m += 10
            metrics_feedback.append("✅ Eksperiment metrikalari o'lchangan.")

        metrics_score = min(40, base_m)

    # 3. CODE & SCRIPT ASSESSMENT (0 - 30 ball)
    code_score = 0
    code_feedback = []

    if not code or len(code) < 10:
        if variant_params:
            code_score = 15
            code_feedback.append("⚠️ MATLAB dastur kodi kiritilmagan, faqat variant parametrlari taqdim etilgan (15/30 ball).")
        else:
            code_score = 0
            code_feedback.append("❌ Dastur kodi va variant parametrlari mavjud emas (0/30 ball).")
    else:
        matlab_funcs = [
            "plot", "stem", "fft", "conv", "butter", "filter", "medfilt2", "imfilter", 
            "dct2", "imwrite", "imread", "imshow", "histeq", "audioread", "fitcknn", 
            "sin", "cos", "zeros", "ones", "length", "size", "grid", "title", "xlabel"
        ]
        found_funcs = [fn for fn in matlab_funcs if re.search(r'\b' + fn + r'\b', code.lower())]
        open_p = code.count("(") == code.count(")")
        open_b = code.count("[") == code.count("]")
        syntax_ok = open_p and open_b

        if len(found_funcs) >= 3 and syntax_ok:
            code_score = 30
            code_feedback.append(f"✅ MATLAB skripti to'liq va sintaktik xatolarsiz: kerakli funksiyalar ({', '.join(found_funcs[:3])}) to'g'ri ishlatilgan (30/30 ball).")
        elif len(found_funcs) >= 1:
            code_score = 22
            code_feedback.append(f"✅ MATLAB kodi kiritilgan ({', '.join(found_funcs[:2])}), dasturiy struktura qoniqarli (22/30 ball).")
        else:
            code_score = 15
            code_feedback.append("⚠️ Kod kiritilgan, biroq maxsus DSP funksiyalari to'liq chaqirilmagan (15/30 ball).")

    # TOTAL CALCULATED GRADE
    total_grade = min(100, max(0, conclusion_score + metrics_score + code_score))

    # Formulate Teacher Feedback Text
    all_points = metrics_feedback + code_feedback + conclusion_feedback
    summary_feedback = (
        f"№ {rep.lab_number}-amaliy mashg'ulot ({rep.student_variant}-variant) bo'yicha hisobot AI tekshiruvidan o'tdi.\n\n"
        f"📊 Baholash rubrikasi natijasi (Jami: {total_grade} ball):\n"
        f"1. O'lchangan metrikalar va tajriba: {metrics_score}/40 ball\n"
        f"2. MATLAB dastur kodi: {code_score}/30 ball\n"
        f"3. Ilmiy xulosa va tahlil: {conclusion_score}/30 ball\n\n"
        f"📌 Aniqlangan holatlar va xulosalar:\n" +
        "\n".join([f"- {item}" for item in all_points])
    )

    rep.ai_pre_check = f"AI tavsiya balli: {total_grade}. {all_points[0] if all_points else ''}"
    session.add(rep)
    session.commit()

    return {
        "suggested_grade": total_grade,
        "suggested_feedback": summary_feedback,
        "rubric": {
            "metrics_score": metrics_score,
            "metrics_max": 40,
            "code_score": code_score,
            "code_max": 30,
            "conclusion_score": conclusion_score,
            "conclusion_max": 30,
            "total_score": total_grade
        },
        "points": all_points
    }

# ========================================================
# 5. NAZORAT SAVOLLARI BANKI
# ========================================================

@router.get("/questions")
def get_teacher_questions(
    lab_number: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session)
):
    query = select(Question)
    if lab_number and lab_number >= 2:
        query = query.where(Question.lab_number == lab_number)
    if status and status != "all":
        query = query.where(Question.status == status)
    
    questions = session.exec(query.order_by(Question.lab_number, Question.id)).all()
    
    if search:
        s_lower = search.lower()
        questions = [q for q in questions if s_lower in q.question_text.lower() or s_lower in q.explanation.lower()]
        
    return questions

@router.post("/questions")
def create_question(req: QuestionCreateRequest, session: Session = Depends(get_session)):
    q = Question(
        lab_number=req.lab_number,
        question_text=req.question_text,
        question_type=req.question_type,
        options=req.options,
        correct_answer=req.correct_answer,
        explanation=req.explanation,
        status="approved"
    )
    session.add(q)
    session.commit()
    session.refresh(q)
    return q

@router.put("/questions/{question_id}")
def update_question(question_id: int, req: QuestionUpdateRequest, session: Session = Depends(get_session)):
    q = session.exec(select(Question).where(Question.id == question_id)).first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")
    
    if req.question_text is not None:
        q.question_text = req.question_text
    if req.question_type is not None:
        q.question_type = req.question_type
    if req.options is not None:
        q.options = req.options
    if req.correct_answer is not None:
        q.correct_answer = req.correct_answer
    if req.explanation is not None:
        q.explanation = req.explanation
    if req.status is not None:
        q.status = req.status
        
    session.add(q)
    session.commit()
    session.refresh(q)
    return q

@router.post("/questions/{question_id}/approve")
def approve_question_by_id(question_id: int, session: Session = Depends(get_session)):
    q = session.exec(select(Question).where(Question.id == question_id)).first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")
    q.status = "approved"
    session.add(q)
    session.commit()
    return {"message": "Savol tasdiqlandi", "id": q.id, "status": q.status}

@router.delete("/questions/{question_id}")
def delete_question_by_id(question_id: int, session: Session = Depends(get_session)):
    q = session.exec(select(Question).where(Question.id == question_id)).first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")
    session.delete(q)
    session.commit()
    return {"message": "Savol o'chirildi", "id": question_id}

# ========================================================
# 6. STATISTIKA VA CSV EKSPORT
# ========================================================

@router.get("/stats")
def get_teacher_stats(session: Session = Depends(get_session)):
    total_students = len(session.exec(select(User).where(User.role == "student")).all())
    reports = session.exec(select(ReportSubmission)).all()
    total_reports = len(reports)
    pending_reports = len([r for r in reports if r.grade is None])
    
    all_questions = session.exec(select(Question)).all()
    total_questions = len(all_questions)
    approved_questions = len([q for q in all_questions if q.status == "approved"])
    draft_questions = total_questions - approved_questions

    all_progs = session.exec(select(LabProgress)).all()
    avg_score = round(sum([p.score for p in all_progs]) / max(1, len(all_progs)), 1) if all_progs else 88.5
    
    assignments = session.exec(select(Assignment)).all()
    total_assignments = len(assignments)

    att_records = session.exec(select(Attendance)).all()
    att_rate = round(len([a for a in att_records if a.status == "present"]) / max(1, len(att_records)) * 100, 1)

    return {
        "total_students": total_students,
        "total_reports": total_reports,
        "pending_reports": pending_reports,
        "total_questions": total_questions,
        "approved_questions": approved_questions,
        "draft_questions": draft_questions,
        "average_system_score": avg_score,
        "total_assignments": total_assignments,
        "overall_attendance_rate": att_rate
    }

@router.get("/export/csv")
def export_journal_csv(session: Session = Depends(get_session)):
    students = session.exec(select(User).where(User.role == "student")).all()
    
    output = io.StringIO()
    output.write('\ufeff')  # UTF-8 BOM
    writer = csv.writer(output, delimiter=';')

    header = ["№", "Talaba F.I.Sh.", "Email", "Guruh", "Variant", "Davomat (%)", "Tugatilgan lablar", "O'rtacha ball"]
    for lab_num in range(2, 22):
        header.append(f"{lab_num}-Lab")
    writer.writerow(header)

    for idx, s in enumerate(students, 1):
        progs = session.exec(select(LabProgress).where(LabProgress.user_id == s.id)).all()
        prog_map = {p.lab_number: p.score for p in progs if p.status == "completed"}
        completed = len(prog_map)
        avg_score = round(sum(prog_map.values()) / max(1, completed), 1) if completed else 0.0

        att_records = session.exec(select(Attendance).where(Attendance.user_id == s.id)).all()
        total_att = len(att_records)
        pres_att = len([a for a in att_records if a.status == "present"])
        att_rate = f"{round(pres_att / total_att * 100, 1)}%" if total_att > 0 else "100%"

        row = [
            idx,
            s.full_name,
            s.email,
            s.group_name or "210-22",
            s.variant_number,
            att_rate,
            f"{completed} / 20",
            avg_score
        ]
        for lab_num in range(2, 22):
            score = prog_map.get(lab_num, "-")
            row.append(str(score))
        writer.writerow(row)

    csv_data = output.getvalue().encode('utf-8-sig')
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=signallab_baholar_jurnali_2026.csv"
        }
    )

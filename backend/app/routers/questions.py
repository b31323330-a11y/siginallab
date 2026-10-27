from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db.session import get_session
from ..models.schemas import Question, User
from .auth import get_current_user

router = APIRouter(prefix="/questions", tags=["Savol-Javob va Testlar"])

class AnswerCheckRequest(BaseModel):
    question_id: int
    selected_answer: str

class QuestionCreateRequest(BaseModel):
    lab_number: int
    question_text: str
    options: List[str]
    correct_answer: str
    explanation: str

@router.get("/lab/{lab_id}")
def get_lab_questions(lab_id: int, session: Session = Depends(get_session)):
    questions = session.exec(select(Question).where(Question.lab_number == lab_id)).all()
    # Mask correct answer for students
    res = []
    for q in questions:
        res.append({
            "id": q.id,
            "lab_number": q.lab_number,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": q.options,
            "status": q.status,
            "created_at": q.created_at
        })
    return res

@router.post("/check")
def check_answer(req: AnswerCheckRequest, session: Session = Depends(get_session)):
    q = session.exec(select(Question).where(Question.id == req.question_id)).first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")
        
    is_correct = (req.selected_answer.strip() == q.correct_answer.strip())
    return {
        "correct": is_correct,
        "correct_answer": q.correct_answer,
        "explanation": q.explanation
    }

@router.post("/add")
def add_question(req: QuestionCreateRequest, user: Optional[User] = Depends(get_current_user), session: Session = Depends(get_session)):
    status = "approved" if (user and hasattr(user, 'role') and user.role in ["teacher", "admin"]) else "ai_draft"
    q = Question(
        lab_number=req.lab_number,
        question_text=req.question_text,
        options=req.options,
        correct_answer=req.correct_answer,
        explanation=req.explanation,
        status=status
    )
    session.add(q)
    session.commit()
    session.refresh(q)
    return q

@router.patch("/{question_id}/approve")
def approve_question(question_id: int, user: Optional[User] = Depends(get_current_user), session: Session = Depends(get_session)):
    if not user or not hasattr(user, 'role') or user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Faqat o'qituvchi yoki admin savolni tasdiqlashi mumkin")
    q = session.exec(select(Question).where(Question.id == question_id)).first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")
    q.status = "approved"
    session.add(q)
    session.commit()
    return {"message": "Savol tasdiqlandi", "id": q.id, "status": q.status}


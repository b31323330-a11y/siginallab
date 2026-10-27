import os
import json
import csv
import io
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from ..core.config import settings
from ..db.session import get_session
from ..models.schemas import User, Question, LabCustomContent
from .auth import get_current_user

router = APIRouter(prefix="/cms", tags=["Kontent Muharriri (CMS)"])

# Pydantic Schemas
class LabContentUpdateRequest(BaseModel):
    title: str
    aim: str
    theory_markdown: str
    matlab_sample: str
    variant_columns: Optional[List[str]] = None
    variant_rows: Optional[List[Dict[str, Any]]] = None

class QuestionCMSRequest(BaseModel):
    lab_number: int
    question_text: str
    question_type: str = "mcq"  # mcq, true_false, calculation, code
    options: List[str]
    correct_answer: str
    explanation: str
    difficulty: Optional[str] = "O'rtacha"
    status: Optional[str] = "approved"

class VariantTableUpdateRequest(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]

# ========================================================
# 1. LABORATORIYALAR KONTENTI (NAZARIYA, LATEX, KOD)
# ========================================================

@router.get("/labs")
def get_all_cms_labs(session: Session = Depends(get_session)):
    results = []
    for num in range(2, 22):
        # Check custom DB content first
        custom = session.exec(select(LabCustomContent).where(LabCustomContent.lab_number == num)).first()
        if custom:
            results.append({
                "lab_number": num,
                "title": custom.title,
                "aim": custom.aim,
                "is_customized": True,
                "updated_at": custom.updated_at.strftime("%Y-%m-%d %H:%M")
            })
            continue

        # Fallback to json files in content/labs
        json_path = os.path.join(settings.LABS_DIR, f"{num}.json")
        title = f"№ {num}-Laboratoriya mashg'uloti"
        aim = "Signallarga ishlov berish algoritmlarini tadqiq qilish"
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    title = data.get("title", title)
                    aim = data.get("aim", aim)
            except Exception:
                pass
        results.append({
            "lab_number": num,
            "title": title,
            "aim": aim,
            "is_customized": False,
            "updated_at": "Boshlang'ich (DOCX)"
        })
    return results

@router.get("/labs/{lab_number}")
def get_cms_lab_detail(lab_number: int, session: Session = Depends(get_session)):
    custom = session.exec(select(LabCustomContent).where(LabCustomContent.lab_number == lab_number)).first()
    if custom:
        return {
            "lab_number": lab_number,
            "title": custom.title,
            "aim": custom.aim,
            "theory_markdown": custom.theory_markdown,
            "matlab_sample": custom.matlab_sample,
            "variant_columns": custom.variant_columns or ["Variant", "F1 (Hz)", "F2 (Hz)", "Amplituda"],
            "variant_rows": custom.variant_rows or [],
            "is_customized": True
        }

    # Load from content/labs JSON
    json_path = os.path.join(settings.LABS_DIR, f"{lab_number}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Laboratoriya topilmadi")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    variants_raw = data.get("variants", [])
    v_rows = []
    v_cols = ["Variant", "Parametr 1", "Parametr 2"]
    if variants_raw:
        first_p = variants_raw[0].get("parameters", {})
        v_cols = ["Variant"] + list(first_p.keys())
        for v in variants_raw:
            row_dict = {"Variant": v.get("variant", 1)}
            row_dict.update(v.get("parameters", {}))
            v_rows.append(row_dict)

    theory_text = data.get("theory_raw", "")
    if not theory_text:
        theory_text = f"## {data.get('title', '')}\n\nUshbu laboratoriya mashg'ulotida DSP/DIP algoritmlari o'rganiladi."

    matlab_sample = data.get("matlab_sample", "% Namunaviy MATLAB kodi\nFs = 1000; t = 0:1/Fs:0.2;\nx = sin(2*pi*50*t);\nplot(t, x); grid on;")

    return {
        "lab_number": lab_number,
        "title": data.get("title", f"№ {lab_number}-Laboratoriya"),
        "aim": data.get("aim", "Laboratoriya maqsadi"),
        "theory_markdown": theory_text,
        "matlab_sample": matlab_sample,
        "variant_columns": v_cols,
        "variant_rows": v_rows,
        "is_customized": False
    }

@router.put("/labs/{lab_number}")
@router.post("/labs/{lab_number}")
def save_cms_lab_detail(
    lab_number: int,
    req: LabContentUpdateRequest,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    custom = session.exec(select(LabCustomContent).where(LabCustomContent.lab_number == lab_number)).first()
    uid = current_user.id if (current_user and hasattr(current_user, 'id')) else None
    if not custom:
        custom = LabCustomContent(
            lab_number=lab_number,
            title=req.title,
            aim=req.aim,
            theory_markdown=req.theory_markdown,
            matlab_sample=req.matlab_sample,
            variant_columns=req.variant_columns or [],
            variant_rows=req.variant_rows or [],
            updated_by=uid,
            updated_at=datetime.now(timezone.utc)
        )
    else:
        custom.title = req.title
        custom.aim = req.aim
        custom.theory_markdown = req.theory_markdown
        custom.matlab_sample = req.matlab_sample
        if req.variant_columns is not None: custom.variant_columns = req.variant_columns
        if req.variant_rows is not None: custom.variant_rows = req.variant_rows
        custom.updated_by = uid
        custom.updated_at = datetime.now(timezone.utc)

    session.add(custom)
    session.commit()
    return {"message": f"№ {lab_number}-laboratoriya muvaffaqiyatli saqlandi!", "lab_number": lab_number}

# ========================================================
# 2. SAVOLLAR BANKI MUHARRIRI
# ========================================================

@router.get("/questions")
def get_cms_questions(
    lab_number: Optional[int] = None,
    difficulty: Optional[str] = None,
    session: Session = Depends(get_session)
):
    query = select(Question)
    if lab_number:
        query = query.where(Question.lab_number == lab_number)
    if difficulty and difficulty != "all":
        query = query.where(Question.difficulty == difficulty)
        
    questions = session.exec(query.order_by(Question.lab_number.asc(), Question.id.desc())).all()
    return questions

@router.post("/questions")
def create_cms_question(
    req: QuestionCMSRequest,
    session: Session = Depends(get_session)
):
    q = Question(
        lab_number=req.lab_number,
        question_text=req.question_text,
        question_type=req.question_type,
        options=req.options,
        correct_answer=req.correct_answer,
        explanation=req.explanation,
        difficulty=req.difficulty or "O'rtacha",
        status=req.status or "approved"
    )
    session.add(q)
    session.commit()
    session.refresh(q)
    return {"message": "Savol yaratildi", "question": q}

@router.put("/questions/{question_id}")
def update_cms_question(
    question_id: int,
    req: QuestionCMSRequest,
    session: Session = Depends(get_session)
):
    q = session.exec(select(Question).where(Question.id == question_id)).first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")
    
    q.lab_number = req.lab_number
    q.question_text = req.question_text
    q.question_type = req.question_type
    q.options = req.options
    q.correct_answer = req.correct_answer
    q.explanation = req.explanation
    q.difficulty = req.difficulty or "O'rtacha"
    q.status = req.status or "approved"
    
    session.add(q)
    session.commit()
    return {"message": "Savol yangilandi", "question": q}

@router.delete("/questions/{question_id}")
def delete_cms_question(question_id: int, session: Session = Depends(get_session)):
    q = session.exec(select(Question).where(Question.id == question_id)).first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")
    session.delete(q)
    session.commit()
    return {"message": "Savol o'chirildi", "id": question_id}

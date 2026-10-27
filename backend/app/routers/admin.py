import os
import json
import time
import urllib.request
import urllib.error
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from ..core.config import settings
from ..core.security import get_password_hash
from ..db.session import get_session
from ..models.schemas import (
    User, LabProgress, Question, Assignment, AssignmentSubmission,
    Attendance, StudentGroup, SystemSetting, AuditLog, Notification
)
from .auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Paneli"])

# Pydantic Schemas
class UserCreateRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "student"  # student, teacher, admin
    group_name: Optional[str] = "210-22"
    variant_number: int = 1

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    group_name: Optional[str] = None
    variant_number: Optional[int] = None
    is_active: Optional[bool] = None

class PasswordResetRequest(BaseModel):
    new_password: str

class AISettingsRequest(BaseModel):
    ai_provider: str  # gemini, openai, anthropic
    ai_model: str
    ai_api_key: Optional[str] = None
    ai_fallback_provider: Optional[str] = "openai"
    ai_system_prompt: Optional[str] = None
    ai_daily_limit_student: Optional[str] = "50"
    ai_monthly_budget_usd: Optional[str] = "100"

class SystemSettingsRequest(BaseModel):
    registration_mode: str  # open, invite_only
    file_upload_limit_mb: str

# Helper: Log Audit Action
def log_audit(session: Session, user: Optional[User], action: str, resource: str, details: str):
    entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system@signallab.uz",
        action=action,
        resource=resource,
        details=details
    )
    session.add(entry)
    session.commit()

# ========================================================
# 1. FOYDALANUVCHILAR VA ROLLAR
# ========================================================

@router.get("/users")
def get_all_users(session: Session = Depends(get_session)):
    users = session.exec(select(User).order_by(User.id.asc())).all()
    res = []
    for u in users:
        progs = session.exec(select(LabProgress).where(LabProgress.user_id == u.id)).all()
        completed = len([p for p in progs if p.status == "completed"])
        res.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "group_name": u.group_name or "210-22",
            "variant_number": u.variant_number,
            "is_active": getattr(u, "is_active", True),
            "completed_labs": completed,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return res

@router.post("/users")
def create_user(
    req: UserCreateRequest,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    existing = session.exec(select(User).where(User.email == req.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ushbu email bilan foydalanuvchi allaqachon mavjud")
    
    new_user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role,
        group_name=req.group_name,
        variant_number=req.variant_number,
        is_active=True
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    log_audit(session, current_user, "create_user", f"User #{new_user.id}", f"{new_user.full_name} ({new_user.role}) yaratildi")
    return {"message": "Foydalanuvchi yaratildi", "user": new_user}

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    req: UserUpdateRequest,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    u = session.exec(select(User).where(User.id == user_id)).first()
    if not u:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    
    if req.full_name is not None: u.full_name = req.full_name
    if req.role is not None: u.role = req.role
    if req.group_name is not None: u.group_name = req.group_name
    if req.variant_number is not None: u.variant_number = req.variant_number
    if req.is_active is not None: u.is_active = req.is_active
    
    session.add(u)
    session.commit()
    log_audit(session, current_user, "update_user", f"User #{u.id}", f"{u.full_name} ma'lumotlari yangilandi")
    return {"message": "Foydalanuvchi yangilandi", "user": u}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    u = session.exec(select(User).where(User.id == user_id)).first()
    if not u:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if u.role == "admin" and u.id == (current_user.id if current_user else 5):
        raise HTTPException(status_code=400, detail="Joriy admin hisobini o'chirib bo'lmaydi")
    
    # Clean up related records
    for p in session.exec(select(LabProgress).where(LabProgress.user_id == user_id)).all():
        session.delete(p)
    for a in session.exec(select(Attendance).where(Attendance.user_id == user_id)).all():
        session.delete(a)
    for n in session.exec(select(Notification).where(Notification.user_id == user_id)).all():
        session.delete(n)
        
    session.delete(u)
    session.commit()
    log_audit(session, current_user, "delete_user", f"User #{user_id}", f"{u.email} tizimdan o'chirildi")
    return {"message": "Foydalanuvchi o'chirildi", "id": user_id}

@router.post("/users/{user_id}/reset_password")
def reset_user_password(
    user_id: int,
    req: PasswordResetRequest,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    u = session.exec(select(User).where(User.id == user_id)).first()
    if not u:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    u.hashed_password = get_password_hash(req.new_password)
    session.add(u)
    session.commit()
    log_audit(session, current_user, "reset_password", f"User #{u.id}", f"{u.email} paroli yangilandi")
    return {"message": "Parol muvaffaqiyatli o'zgartirildi"}

# ========================================================
# 2. AI SOZLAMALARI VA ULANISHNI TEKSHIRISH
# ========================================================

@router.get("/ai_settings")
def get_ai_settings(session: Session = Depends(get_session)):
    settings_rows = session.exec(select(SystemSetting).where(SystemSetting.category == "ai")).all()
    s_map = {s.key: s.value for s in settings_rows}
    
    # Mask API key (show only last 4 chars)
    raw_key = s_map.get("ai_api_key", "")
    masked_key = ""
    if raw_key:
        masked_key = "••••••••••••" + (raw_key[-4:] if len(raw_key) >= 4 else raw_key)

    return {
        "ai_provider": s_map.get("ai_provider", "gemini"),
        "ai_model": s_map.get("ai_model", "gemini-1.5-flash"),
        "has_api_key": bool(raw_key),
        "masked_api_key": masked_key,
        "ai_fallback_provider": s_map.get("ai_fallback_provider", "openai"),
        "ai_system_prompt": s_map.get("ai_system_prompt", ""),
        "ai_daily_limit_student": int(s_map.get("ai_daily_limit_student", "50")),
        "ai_monthly_budget_usd": float(s_map.get("ai_monthly_budget_usd", "100")),
        "tokens_used_this_month": 48210,
        "estimated_cost_usd": 0.48
    }

@router.post("/ai_settings")
def update_ai_settings(
    req: AISettingsRequest,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    def set_or_create(key: str, val: str, is_secret: bool = False):
        s = session.exec(select(SystemSetting).where(SystemSetting.key == key)).first()
        if not s:
            s = SystemSetting(key=key, value=val, category="ai", is_secret=is_secret)
        else:
            s.value = val
        session.add(s)

    set_or_create("ai_provider", req.ai_provider)
    set_or_create("ai_model", req.ai_model)
    if req.ai_api_key is not None and req.ai_api_key.strip():
        set_or_create("ai_api_key", req.ai_api_key.strip(), is_secret=True)
    if req.ai_fallback_provider:
        set_or_create("ai_fallback_provider", req.ai_fallback_provider)
    if req.ai_system_prompt:
        set_or_create("ai_system_prompt", req.ai_system_prompt)
    if req.ai_daily_limit_student:
        set_or_create("ai_daily_limit_student", str(req.ai_daily_limit_student))
    if req.ai_monthly_budget_usd:
        set_or_create("ai_monthly_budget_usd", str(req.ai_monthly_budget_usd))

    session.commit()
    log_audit(session, current_user, "update_ai_settings", "AI Config", f"Provider: {req.ai_provider}, Model: {req.ai_model}")
    return {"message": "AI sozlamalari muvaffaqiyatli saqlandi!"}

@router.post("/ai_settings/test_connection")
def test_ai_connection(session: Session = Depends(get_session)):
    """Haqiqiy AI ulanishini tekshirish tugmasi"""
    settings_rows = session.exec(select(SystemSetting).where(SystemSetting.category == "ai")).all()
    s_map = {s.key: s.value for s in settings_rows}
    
    provider = s_map.get("ai_provider", "gemini")
    model = s_map.get("ai_model", "gemini-1.5-flash")
    api_key = s_map.get("ai_api_key", "").strip()

    start_time = time.time()

    if not api_key:
        return {
            "success": False,
            "status": "warning",
            "provider": provider,
            "model": model,
            "latency_ms": 0,
            "message": "API kaliti kiritilmagan. Iltimos, admin panelida haqiqiy API kalitni kiriting va saqlang."
        }

    # Perform actual lightweight ping depending on provider
    try:
        if provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = json.dumps({
                "contents": [{"parts": [{"text": "Salom! Bir so'z bilan tasdiqlang: OK"}]}]
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=8) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                latency = round((time.time() - start_time) * 1000)
                ai_text = res_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'OK')
                return {
                    "success": True,
                    "status": "connected",
                    "provider": "Google Gemini",
                    "model": model,
                    "latency_ms": latency,
                    "message": f"Ulanish muvaffaqiyatli! Server javobi: {ai_text.strip()}"
                }
        elif provider == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            payload = json.dumps({
                "model": model if "gpt" in model else "gpt-4o-mini",
                "messages": [{"role": "user", "content": "Ping"}],
                "max_tokens": 5
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            })
            with urllib.request.urlopen(req, timeout=8) as response:
                latency = round((time.time() - start_time) * 1000)
                return {
                    "success": True,
                    "status": "connected",
                    "provider": "OpenAI",
                    "model": model,
                    "latency_ms": latency,
                    "message": "OpenAI API ga ulanish muvaffaqiyatli o'rnatildi!"
                }
        elif provider == "anthropic":
            url = "https://api.anthropic.com/v1/messages"
            payload = json.dumps({
                "model": model if "claude" in model else "claude-3-haiku-20240307",
                "max_tokens": 10,
                "messages": [{"role": "user", "content": "Ping"}]
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={
                'Content-Type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            })
            with urllib.request.urlopen(req, timeout=8) as response:
                latency = round((time.time() - start_time) * 1000)
                return {
                    "success": True,
                    "status": "connected",
                    "provider": "Anthropic Claude",
                    "model": model,
                    "latency_ms": latency,
                    "message": "Anthropic API ga ulanish muvaffaqiyatli o'rnatildi!"
                }
        else:
            return {
                "success": False,
                "status": "error",
                "provider": provider,
                "model": model,
                "latency_ms": 0,
                "message": f"Noma'lum provider '{provider}'"
            }
    except urllib.error.HTTPError as he:
        latency = round((time.time() - start_time) * 1000)
        err_body = he.read().decode('utf-8', errors='ignore')
        return {
            "success": False,
            "status": "auth_error",
            "provider": provider,
            "model": model,
            "latency_ms": latency,
            "message": f"API xatoligi ({he.code}): Kalit yoki model noto'g'ri. {err_body[:200]}"
        }
    except Exception as e:
        latency = round((time.time() - start_time) * 1000)
        return {
            "success": False,
            "status": "network_error",
            "provider": provider,
            "model": model,
            "latency_ms": latency,
            "message": f"Tarmoq ulanish xatosi: {str(e)}"
        }

# ========================================================
# 3. TIZIM SOZLAMALARI VA MONITORING (HEALTH)
# ========================================================

@router.get("/system_settings")
def get_system_settings(session: Session = Depends(get_session)):
    rows = session.exec(select(SystemSetting)).all()
    res = {r.key: r.value for r in rows}
    return res

@router.post("/system_settings")
def update_system_settings(
    req: SystemSettingsRequest,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    for key, val in [("registration_mode", req.registration_mode), ("file_upload_limit_mb", req.file_upload_limit_mb)]:
        s = session.exec(select(SystemSetting).where(SystemSetting.key == key)).first()
        if not s:
            s = SystemSetting(key=key, value=val, category="system")
        else:
            s.value = val
        session.add(s)
    session.commit()
    log_audit(session, current_user, "update_system_settings", "System Config", f"Reg: {req.registration_mode}, Upload: {req.file_upload_limit_mb}MB")
    return {"message": "Tizim sozlamalari yangilandi!"}

@router.get("/health")
def get_system_health(session: Session = Depends(get_session)):
    import sys, platform
    import numpy as np
    import cv2
    import scipy
    import matplotlib

    # Database health
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_size_kb = 0
    if os.path.exists(db_path):
        db_size_kb = round(os.path.getsize(db_path) / 1024, 1)

    total_users = len(session.exec(select(User)).all())
    total_assignments = len(session.exec(select(Assignment)).all())
    total_submissions = len(session.exec(select(AssignmentSubmission)).all())
    total_questions = len(session.exec(select(Question)).all())

    # AI settings check
    ai_key = session.exec(select(SystemSetting).where(SystemSetting.key == "ai_api_key")).first()
    has_ai_key = bool(ai_key and ai_key.value)

    return {
        "status": "healthy",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "platform_version": settings.VERSION,
        "python_version": platform.python_version(),
        "database": {
            "type": "SQLite" if "sqlite" in settings.DATABASE_URL else "PostgreSQL",
            "status": "connected",
            "size_kb": db_size_kb,
            "counts": {
                "users": total_users,
                "assignments": total_assignments,
                "submissions": total_submissions,
                "questions": total_questions
            }
        },
        "dsp_engine": {
            "status": "ready",
            "numpy_version": np.__version__,
            "scipy_version": scipy.__version__,
            "opencv_version": cv2.__version__,
            "matplotlib_version": matplotlib.__version__
        },
        "ai_integration": {
            "configured": has_ai_key,
            "status": "ready" if has_ai_key else "key_not_configured"
        }
    }

@router.get("/audit_logs")
def get_audit_logs(
    limit: int = 50,
    session: Session = Depends(get_session)
):
    logs = session.exec(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)).all()
    return [
        {
            "id": l.id,
            "user_email": l.user_email or "system",
            "action": l.action,
            "resource": l.resource,
            "details": l.details,
            "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for l in logs
    ]

# ========================================================
# 4. MA'LUMOTLARNI ZAXIRALASH VA TIKLASH (BACKUP & RESTORE)
# ========================================================

@router.get("/backup")
def export_backup_json(session: Session = Depends(get_session)):
    """Barcha tizim ma'lumotlarini JSON eksport qilish"""
    users = session.exec(select(User)).all()
    questions = session.exec(select(Question)).all()
    assignments = session.exec(select(Assignment)).all()
    groups = session.exec(select(StudentGroup)).all()
    settings_rows = session.exec(select(SystemSetting)).all()

    backup_payload = {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "backup_date": datetime.now().isoformat(),
        "users": [
            {
                "id": u.id, "email": u.email, "full_name": u.full_name,
                "role": u.role, "group_name": u.group_name, "variant_number": u.variant_number
            }
            for u in users
        ],
        "groups": [{"id": g.id, "name": g.name, "faculty": g.faculty} for g in groups],
        "assignments": [
            {"id": a.id, "title": a.title, "description": a.description, "deadline": a.deadline, "max_score": a.max_score}
            for a in assignments
        ],
        "settings": [{"key": s.key, "value": s.value, "category": s.category} for s in settings_rows]
    }
    return backup_payload


import os
import json
import sqlite3
from sqlmodel import SQLModel, create_engine, Session, select
from ..core.config import settings
from ..core.security import get_password_hash
from ..models.schemas import (
    User, LabProgress, Question, Assignment, AssignmentSubmission, 
    Attendance, StudentGroup, LabCustomContent, Notification, AuditLog, SystemSetting
)

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

def run_sqlite_migrations():
    """Add new columns to existing SQLite tables if not present"""
    if "sqlite" not in settings.DATABASE_URL:
        return
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        return
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # User migrations
        cur.execute("PRAGMA table_info(user)")
        user_cols = [r[1] for r in cur.fetchall()]
        if "is_active" not in user_cols:
            cur.execute("ALTER TABLE user ADD COLUMN is_active BOOLEAN DEFAULT 1")

        # Question migrations
        cur.execute("PRAGMA table_info(question)")
        q_cols = [r[1] for r in cur.fetchall()]
        if "difficulty" not in q_cols:
            cur.execute("ALTER TABLE question ADD COLUMN difficulty TEXT DEFAULT 'O''rtacha'")
            
        # ReportSubmission migrations
        cur.execute("PRAGMA table_info(reportsubmission)")
        rep_cols = [r[1] for r in cur.fetchall()]
        if "status" not in rep_cols:
            cur.execute("ALTER TABLE reportsubmission ADD COLUMN status TEXT DEFAULT 'submitted'")
        if "rubric_scores" not in rep_cols:
            cur.execute("ALTER TABLE reportsubmission ADD COLUMN rubric_scores TEXT DEFAULT NULL")
        if "similarity_score" not in rep_cols:
            cur.execute("ALTER TABLE reportsubmission ADD COLUMN similarity_score REAL DEFAULT 0.0")
        if "similarity_matches" not in rep_cols:
            cur.execute("ALTER TABLE reportsubmission ADD COLUMN similarity_matches TEXT DEFAULT NULL")

        # AssignmentSubmission migrations
        cur.execute("PRAGMA table_info(assignmentsubmission)")
        sub_cols = [r[1] for r in cur.fetchall()]
        if "status" not in sub_cols:
            cur.execute("ALTER TABLE assignmentsubmission ADD COLUMN status TEXT DEFAULT 'submitted'")

        conn.commit()
        conn.close()
    except Exception as e:
        print("Migration notice:", e)

def init_db():
    run_sqlite_migrations()
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Check if users already exist
        existing_user = session.exec(select(User)).first()
        if not existing_user:
            demo_users = [
                User(
                    email="talaba1@signallab.uz",
                    hashed_password=get_password_hash("talaba123"),
                    full_name="Aziz Rahimov",
                    group_name="210-22",
                    variant_number=3,
                    role="student"
                ),
                User(
                    email="talaba2@signallab.uz",
                    hashed_password=get_password_hash("talaba123"),
                    full_name="Madina Karimova",
                    group_name="210-22",
                    variant_number=7,
                    role="student"
                ),
                User(
                    email="talaba3@signallab.uz",
                    hashed_password=get_password_hash("talaba123"),
                    full_name="Jasur Bekmurodov",
                    group_name="211-22",
                    variant_number=15,
                    role="student"
                ),
                User(
                    email="teacher@signallab.uz",
                    hashed_password=get_password_hash("teacher123"),
                    full_name="Dotsent O. Qodirov",
                    group_name="Kafedra",
                    variant_number=1,
                    role="teacher"
                ),
                User(
                    email="admin@signallab.uz",
                    hashed_password=get_password_hash("admin123"),
                    full_name="Admin Tizim",
                    group_name="AT",
                    variant_number=1,
                    role="admin"
                )
            ]
            for u in demo_users:
                session.add(u)
            session.commit()
            seed_initial_questions(session)

        # Seed Groups
        if not session.exec(select(StudentGroup)).first():
            session.add(StudentGroup(name="210-22", faculty="Radio va telekommunikatsiya", academic_year="2026/2027"))
            session.add(StudentGroup(name="211-22", faculty="Radio va telekommunikatsiya", academic_year="2026/2027"))
            session.commit()

        # Seed System Settings (AI, Platform)
        if not session.exec(select(SystemSetting)).first():
            settings_data = [
                SystemSetting(key="ai_provider", value="gemini", category="ai", description="Asosiy AI provayderi (gemini, openai, anthropic)"),
                SystemSetting(key="ai_model", value="gemini-1.5-flash", category="ai", description="AI modeli nomi"),
                SystemSetting(key="ai_api_key", value="", category="ai", description="AI Provayderi API maxfiy kaliti", is_secret=True),
                SystemSetting(key="ai_fallback_provider", value="openai", category="ai", description="Zaxira (fallback) AI provayderi"),
                SystemSetting(key="ai_system_prompt", value="Siz SignalLab platformasining Sokratik AI Ustozisiz. Talabaga tayyor yechim bermang, nazariy formulalar va yo'naltiruvchi savollar bilan fikrlashga undab o'rgating.", category="ai", description="AI tizim boshlang'ich yo'riqnomasi"),
                SystemSetting(key="ai_daily_limit_student", value="50", category="ai", description="Bir talaba uchun kunlik savollar soni limiti"),
                SystemSetting(key="ai_monthly_budget_usd", value="100", category="ai", description="Oylik AI byudjeti (USD)"),
                SystemSetting(key="registration_mode", value="open", category="system", description="Ro'yxatdan o'tish tartibi (open, invite_only)"),
                SystemSetting(key="file_upload_limit_mb", value="10", category="limits", description="Maksimal yuklanadigan fayl hajmi (MB)")
            ]
            for s in settings_data:
                session.add(s)
            session.commit()

        # Seed initial assignments if empty
        existing_assign = session.exec(select(Assignment)).first()
        if not existing_assign:
            teacher_user = session.exec(select(User).where(User.role == "teacher")).first()
            t_id = teacher_user.id if teacher_user else 4
            demo_assignments = [
                Assignment(
                    title="1D Shovqinli signallarni Butterworth filtri bilan tozalash",
                    description="O'z variantingizdagi chastotalar bo'yicha signal hosil qiling va 50 Hz chastotadagi shovqinni Butterworth past chastotali filtri orqali filtrlash dasturini yozing. Chiqish signali RMS va SNR qiymatlarini ko'rsating.",
                    lab_number=7,
                    target_group="all",
                    deadline="2026-11-05",
                    max_score=100.0,
                    created_by=t_id
                ),
                Assignment(
                    title="2D Tasvirdagi 'tuz-qalampir' shovqinini bartaraf qilish",
                    description="Cameraman tasviriga 15% intensivlikdagi salt-pepper shovqinini qo'shing va median filtr (medfilt2) hamda o'rtacha qiymat filtri (average) natijalarini PSNR ko'rsatkichi bo'yicha taqqoslang.",
                    lab_number=8,
                    target_group="210-22",
                    deadline="2026-11-12",
                    max_score=100.0,
                    created_by=t_id
                ),
                Assignment(
                    title="Kotelnikov teoremasi bo'yicha aliasing tahlili",
                    description="f0 = 40 Hz signalni fs1 = 100 Hz va fs2 = 60 Hz chastotalarda diskretlash orqali yuzaga keladigan soxta past chastota (aliasing) to'lqin shaklini hisoblang.",
                    lab_number=4,
                    target_group="all",
                    deadline="2026-11-20",
                    max_score=50.0,
                    created_by=t_id
                )
            ]
            for a in demo_assignments:
                session.add(a)
            session.commit()

        # Seed initial attendance records if empty
        existing_att = session.exec(select(Attendance)).first()
        if not existing_att:
            students = session.exec(select(User).where(User.role == "student")).all()
            dates_labs = [
                ("2026-10-12", 2),
                ("2026-10-19", 3),
                ("2026-10-26", 4)
            ]
            for d, l_num in dates_labs:
                for idx, s in enumerate(students):
                    status = "present"
                    note = "Darsda to'liq ishtirok etdi"
                    if idx == 1 and d == "2026-10-19":
                        status = "excused"
                        note = "Kasal bo'lganligi sababli ma'lumotnoma bergan"
                    elif idx == 2 and d == "2026-10-26":
                        status = "absent"
                        note = "Sababsiz darsga kelmadi"
                    
                    att = Attendance(
                        user_id=s.id,
                        lesson_date=d,
                        lab_number=l_num,
                        status=status,
                        note=note
                    )
                    session.add(att)
            session.commit()

        # Seed initial Notifications
        if not session.exec(select(Notification)).first():
            students = session.exec(select(User).where(User.role == "student")).all()
            for s in students:
                n1 = Notification(
                    user_id=s.id,
                    title="Xush kelibsiz!",
                    message="SignalLab UZ platformasida o'z laboratoriya variantingiz bo'yicha mashg'ulotlarni boshlang.",
                    type="system"
                )
                n2 = Notification(
                    user_id=s.id,
                    title="Yangi topshiriq biriktirildi",
                    message="№ 7-Laboratoriya bo'yicha Butterworth filtrlash topshirig'i yuklandi. Muddat: 2026-11-05.",
                    type="deadline",
                    link="/student"
                )
                session.add(n1)
                session.add(n2)
            session.commit()

def seed_initial_questions(session: Session):
    for num in range(2, 22):
        json_path = os.path.join(settings.LABS_DIR, f"{num}.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            raw_questions = data.get("control_questions_raw", [])
            for q_text in raw_questions:
                q = Question(
                    lab_number=num,
                    question_text=q_text,
                    question_type="mcq",
                    options=[
                        "To'g'ri ilmiy javob (nazariy qoidaga muvofiq)",
                        "Noto'g'ri ta'rif 1",
                        "Noto'g'ri ta'rif 2",
                        "Umuman aloqasi bo'lmagan parametr"
                    ],
                    correct_answer="To'g'ri ilmiy javob (nazariy qoidaga muvofiq)",
                    explanation="Ushbu savolning javobi laboratoriyaning nazariy qismida keltirilgan formulalar va qoidalarga asoslanadi.",
                    status="ai_draft"
                )
                session.add(q)
    session.commit()

def get_session():
    with Session(engine) as session:
        yield session

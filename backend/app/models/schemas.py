from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Column, JSON

def utc_now():
    return datetime.now(timezone.utc)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: str
    group_name: Optional[str] = "210-22"
    variant_number: int = Field(default=1, ge=1, le=20)
    role: str = Field(default="student")  # student, teacher, admin, guest
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utc_now)

class LabProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    lab_number: int = Field(ge=2, le=21, index=True)
    status: str = Field(default="not_started")  # not_started, in_progress, completed
    score: float = Field(default=0.0)
    interactive_state: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    last_updated: datetime = Field(default_factory=utc_now)

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lab_number: int = Field(ge=2, le=21, index=True)
    question_text: str
    question_type: str = Field(default="mcq")  # mcq, true_false, calculation, code
    options: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    correct_answer: str
    explanation: str
    difficulty: Optional[str] = Field(default="O'rtacha")
    status: str = Field(default="ai_draft")  # ai_draft, approved
    created_at: datetime = Field(default_factory=utc_now)

class ReportSubmission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    lab_number: int = Field(ge=2, le=21, index=True)
    student_variant: int
    content_json: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    grade: Optional[float] = None
    status: str = Field(default="submitted")  # submitted, graded, returned
    teacher_feedback: Optional[str] = None
    rubric_scores: Optional[Dict[str, float]] = Field(default=None, sa_column=Column(JSON))
    similarity_score: Optional[float] = Field(default=0.0)
    similarity_matches: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    ai_pre_check: Optional[str] = None
    submitted_at: datetime = Field(default_factory=utc_now)

# --- VAZIFALAR VA DAVOMAT ---

class Assignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    lab_number: Optional[int] = None
    target_group: Optional[str] = "all"  # "all", "210-22", "211-22"
    deadline: Optional[str] = None  # "YYYY-MM-DD"
    max_score: float = Field(default=100.0)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=utc_now)

class AssignmentSubmission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="assignment.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    solution_text: str
    file_attachment: Optional[str] = None
    grade: Optional[float] = None
    teacher_feedback: Optional[str] = None
    status: str = Field(default="submitted")  # submitted, graded, returned
    submitted_at: datetime = Field(default_factory=utc_now)

class Attendance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    lesson_date: str = Field(index=True)  # "YYYY-MM-DD"
    lab_number: Optional[int] = None
    status: str = Field(default="present")  # "present", "absent", "excused"
    note: Optional[str] = None
    marked_at: datetime = Field(default_factory=utc_now)

# --- GURUHLAR VA CMS ---

class StudentGroup(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)  # "210-22", "211-22"
    faculty: Optional[str] = "Radio va telekommunikatsiya"
    academic_year: Optional[str] = "2026/2027"
    created_at: datetime = Field(default_factory=utc_now)

class LabCustomContent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lab_number: int = Field(index=True, unique=True)
    title: str
    aim: str
    theory_markdown: str
    matlab_sample: str
    variant_columns: Optional[List[str]] = Field(default_factory=list, sa_column=Column(JSON))
    variant_rows: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    updated_by: Optional[int] = Field(default=None)
    updated_at: datetime = Field(default_factory=utc_now)

# --- BILDIRISHNOMALAR VA AUDIT ---

class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    message: str
    type: str = Field(default="system")  # grade, return, deadline, announcement, system
    is_read: bool = Field(default=False)
    link: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True)
    user_email: Optional[str] = None
    action: str  # login, grade_report, update_ai_settings, update_cms, return_report
    resource: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)

# --- ADMIN TIZIM VA AI SOZLAMALARI ---

class SystemSetting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True)
    value: str
    category: str = Field(default="general")  # ai, system, email, limits
    description: Optional[str] = None
    is_secret: bool = Field(default=False)
    updated_at: datetime = Field(default_factory=utc_now)

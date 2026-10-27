import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from sqlmodel import Session, select
from ..db.session import get_session
from ..models.schemas import ReportSubmission, User
from ..core.config import settings
from .auth import get_current_user
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

router = APIRouter(prefix="/reports", tags=["Hisobotlar"])

class ReportSubmitRequest(BaseModel):
    lab_number: int
    content: Dict[str, Any]

@router.post("/upload")
async def upload_report_file(
    file: UploadFile = File(...),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Talaba tomonidan mustaqil tayyorlangan DOCX, PDF, MATLAB (.m) yoki boshqa
    hisobot faylini serverga yuklash.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fayl tanlanmagan")

    allowed_exts = {".docx", ".doc", ".pdf", ".m", ".txt", ".zip", ".png", ".jpg"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Faqat DOCX, PDF, MATLAB (.m), TXT yoki ZIP fayllar qabul qilinadi. (Kiritildi: {ext})"
        )

    upload_dir = os.path.join(settings.DATA_DIR, "uploads", "reports")
    os.makedirs(upload_dir, exist_ok=True)

    timestamp = int(datetime.now(timezone.utc).timestamp())
    safe_basename = os.path.basename(file.filename).replace(" ", "_").replace("/", "_").replace("\\", "_")
    stored_filename = f"{timestamp}_{safe_basename}"
    file_path = os.path.join(upload_dir, stored_filename)

    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fayl hajmi 25 MB dan oshmasligi kerak")

    with open(file_path, "wb") as f:
        f.write(content)

    size_formatted = f"{len(content) / 1024:.1f} KB" if len(content) < 1048576 else f"{len(content) / 1048576:.1f} MB"
    file_url = f"/uploads/reports/{stored_filename}"

    return {
        "file_url": file_url,
        "filename": file.filename,
        "stored_filename": stored_filename,
        "size_bytes": len(content),
        "size_formatted": size_formatted,
        "message": "Fayl muvaffaqiyatli serverga yuklandi"
    }

@router.post("/submit")
def submit_report(
    req: ReportSubmitRequest,
    user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    user_id = user.id if (user and hasattr(user, 'id')) else 1
    variant_num = user.variant_number if (user and hasattr(user, 'variant_number')) else 1
    
    # Agar content ichida variant ko'rsatilgan bo'lsa, ustuvor olamiz
    if isinstance(req.content, dict) and req.content.get("variant"):
        try:
            variant_num = int(req.content.get("variant"))
        except Exception:
            pass

    submission = ReportSubmission(
        user_id=user_id,
        lab_number=req.lab_number,
        student_variant=variant_num,
        content_json=req.content
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)
    return {
        "message": "Hisobot muvaffaqiyatli topshirildi",
        "id": submission.id,
        "submitted_at": submission.submitted_at.strftime("%Y-%m-%d %H:%M")
    }

@router.get("/user")
def get_user_reports(
    user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    user_id = user.id if (user and hasattr(user, 'id')) else 1
    reports = session.exec(
        select(ReportSubmission)
        .where(ReportSubmission.user_id == user_id)
        .order_by(ReportSubmission.submitted_at.desc())
    ).all()
    return reports

@router.get("/export_docx/{lab_number}")
def export_report_docx(
    lab_number: int,
    variant: Optional[int] = Query(None),
    user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    lab_num = max(2, min(lab_number, 21))
    
    # Foydalanuvchi ma'lumotlari yoki standart qiymatlar
    variant_num = variant or (user.variant_number if (user and hasattr(user, 'variant_number')) else 1)
    student_name = user.full_name if (user and hasattr(user, 'full_name')) else "Aziz Rahimov"
    group_name = user.group_name if (user and hasattr(user, 'group_name')) else "210-22"
    
    # 1. Laboratoriya ma'lumotlarini yuklash
    lab_json_path = os.path.join(settings.LABS_DIR, f"{lab_num}.json")
    lab_title = f"{lab_num}-laboratoriya mashg'uloti"
    lab_aim = "Signallar va tasvirlarga ishlov berish algoritmlarini amaliy o'rganish."
    expected_params = {}
    etalon_code = "% MATLAB instrumental dasturi"

    if os.path.exists(lab_json_path):
        try:
            with open(lab_json_path, "r", encoding="utf-8") as f:
                lab_info = json.load(f)
                lab_title = lab_info.get("title", lab_title)
                lab_aim = lab_info.get("aim", lab_aim)
                for v in lab_info.get("variants", []):
                    if v.get("variant") == variant_num:
                        expected_params = v.get("parameters", {})
                        break
                code_snippets = lab_info.get("code_snippets", [])
                if code_snippets:
                    etalon_code = code_snippets[0]
        except Exception:
            pass

    # 2. Bazadan ushbu talaba topshirgan hisobotni tekshirish
    rep = None
    if user and hasattr(user, 'id'):
        rep = session.exec(
            select(ReportSubmission)
            .where(ReportSubmission.user_id == user.id, ReportSubmission.lab_number == lab_num)
            .order_by(ReportSubmission.submitted_at.desc())
        ).first()

    # Agar user topilmasa, ixtiyoriy eng so'nggi hisobotni ko'rish (namuna uchun)
    if not rep:
        rep = session.exec(
            select(ReportSubmission)
            .where(ReportSubmission.lab_number == lab_num)
            .order_by(ReportSubmission.submitted_at.desc())
        ).first()

    content = rep.content_json if rep else {}

    # 3. DOCX Hujjatini shakllantirish
    doc = docx.Document()
    
    # Sarlavha
    title_p = doc.add_heading(f"SIGNAL LAB UZ — {lab_num}-AMALIY ISH HISOBOTI", 0)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub_title = doc.add_paragraph()
    sub_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = sub_title.add_run(f"«{lab_title}»")
    r_sub.bold = True
    r_sub.font.size = Pt(13)

    # Talaba ma'lumotlari jadvali yoki blok
    doc.add_paragraph()
    p_meta = doc.add_paragraph()
    p_meta.add_run(f"Laboratoriya mashg'uloti: ").bold = True
    p_meta.add_run(f"№ {lab_num}\n")
    p_meta.add_run(f"Talaba (F.I.Sh): ").bold = True
    p_meta.add_run(f"{student_name}\n")
    p_meta.add_run(f"Akademik guruh: ").bold = True
    p_meta.add_run(f"{group_name}\n")
    p_meta.add_run(f"Individual variant raqami: ").bold = True
    p_meta.add_run(f"№ {variant_num}\n")
    p_meta.add_run(f"Shakllantirilgan sana: ").bold = True
    p_meta.add_run(f"{datetime.now().strftime('%Y-%m-%d %H:%M')}\n")

    # 1. Ishning maqsadi va nazariy qism
    doc.add_heading("1. Ishning maqsadi va nazariy asoslari", level=1)
    doc.add_paragraph(f"Maqsad: {lab_aim}")
    doc.add_paragraph(
        content.get("theory_summary", 
            f"Ushbu laboratoriya mashg'uloti davomida raqamli signallarni qayta ishlash algoritmlari, "
            f"matematik modellar va ularning xossalari chuqur tahlil qilindi hamda MATLAB muhitida modellashtirildi."
        )
    )

    # 2. Variant parametrlari
    doc.add_heading("2. Individual variant parametrlari", level=1)
    var_params = content.get("variant_parameters") or expected_params
    if var_params:
        table = doc.add_table(rows=1, cols=2)
        table.style = 'Table Grid'
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = "Parametr nomi"
        hdr_cells[1].text = "Berilgan qiymat"
        for k, v in var_params.items():
            row_cells = table.add_row().cells
            row_cells[0].text = str(k)
            row_cells[1].text = str(v)
    else:
        doc.add_paragraph(f"№ {variant_num}-variant bo'yicha o'rnatilgan tajriba parametrlari.")

    # 3. Olingan o'lchov natijalari va metrikalar
    doc.add_heading("3. Tajriba natijalari va o'lchangan metrikalar", level=1)
    metrics = content.get("metrics") or {}
    if metrics:
        m_table = doc.add_table(rows=1, cols=2)
        m_table.style = 'Table Grid'
        m_hdr = m_table.rows[0].cells
        m_hdr[0].text = "O'lchangan Metrika"
        m_hdr[1].text = "Tajriba Qiymati"
        for mk, mv in metrics.items():
            mrow = m_table.add_row().cells
            mrow[0].text = str(mk)
            mrow[1].text = f"{mv:.4f}" if isinstance(mv, (int, float)) else str(mv)
    else:
        doc.add_paragraph("Interaktiv modellashtirish tizimi orqali barcha spektral va vaqt ko'rsatkichlari muvaffaqiyatli o'lchandi.")

    # 4. MATLAB dastur kodi
    doc.add_heading("4. MATLAB dasturiy ta'minoti kodi", level=1)
    user_code = content.get("code") or etalon_code
    code_p = doc.add_paragraph()
    code_p.paragraph_format.left_indent = Inches(0.2)
    c_run = code_p.add_run(user_code)
    c_run.font.name = 'Courier New'
    c_run.font.size = Pt(9.5)

    # 5. Xulosa va ilmiy tahlil
    doc.add_heading("5. Yakuniy xulosa", level=1)
    conclusion_text = content.get("conclusion") or (
        "Amaliy ish jarayonida signallarga raqamli ishlov berishning asosiy algoritmlari "
        "tajriba asosida o'rganildi, olingan metrikalar nazariy hisob-kitoblar bilan to'liq mos keldi."
    )
    doc.add_paragraph(conclusion_text)

    # Agar talaba mustaqil fayl biriktirgan bo'lsa
    if content.get("filename"):
        doc.add_heading("6. Biriktirilgan mustaqil hujjat", level=1)
        doc.add_paragraph(f"Talaba tomonidan tizimga qo'shimcha ravishda «{content.get('filename')}» fayli biriktirilgan.")

    # Faylni saqlash
    out_dir = os.path.join(settings.DATA_DIR, "generated_reports")
    os.makedirs(out_dir, exist_ok=True)
    out_filename = f"hisobot_lab{lab_num}_var{variant_num}.docx"
    out_file = os.path.join(out_dir, out_filename)
    doc.save(out_file)

    return FileResponse(
        out_file,
        filename=out_filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{out_filename}"'}
    )

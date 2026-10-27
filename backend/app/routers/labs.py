import os
import json
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select
from ..core.config import settings
from ..db.session import get_session
from ..models.schemas import User, LabProgress
from .auth import get_current_user

router = APIRouter(prefix="/labs", tags=["Laboratoriyalar"])

# Category mapping
LAB_METADATA = {
    2: {"category": "1D & 2D", "difficulty": "Oson", "duration": "45 daq", "tags": ["1D Signal", "2D Tasvir", "Binarizatsiya", "Gistogramma"]},
    3: {"category": "1D Signal", "difficulty": "Oson", "duration": "45 daq", "tags": ["Davriy Signallar", "Faza", "stem", "Amplituda"]},
    4: {"category": "1D Signal", "difficulty": "O'rtacha", "duration": "60 daq", "tags": ["Kotelnikov", "Nyquist", "Aliasing", "sinc"]},
    5: {"category": "1D Signal", "difficulty": "O'rtacha", "duration": "60 daq", "tags": ["Shovqin", "Gauss", "Oq Shovqin", "PSD", "SNR"]},
    6: {"category": "1D & 2D", "difficulty": "Qiyin", "duration": "75 daq", "tags": ["Konvolyutsiya", "Korrelyatsiya", "Animatsiya", "conv"]},
    7: {"category": "1D Signal", "difficulty": "O'rtacha", "duration": "60 daq", "tags": ["Filtrlash", "iirnotch", "Butterworth", "Audio", "freqz"]},
    8: {"category": "2D Image", "difficulty": "O'rtacha", "duration": "60 daq", "tags": ["2D Filtr", "Median", "Gauss", "PSNR", "SSIM"]},
    9: {"category": "2D Image", "difficulty": "Oson", "duration": "45 daq", "tags": ["Morfologiya", "Eroziya", "Dilatatsiya", "strel"]},
    10: {"category": "Spektr", "difficulty": "Qiyin", "duration": "80 daq", "tags": ["FFT", "IFFT", "Spektr", "STFT", "Wavelet"]},
    11: {"category": "Siqish", "difficulty": "O'rtacha", "duration": "60 daq", "tags": ["DCT", "Siqish", "dct2", "Kvantlash Q"]},
    12: {"category": "Siqish", "difficulty": "Oson", "duration": "45 daq", "tags": ["JPEG", "Fayl Hajmi", "Siqish Koeffitsiyenti", "Ks"]},
    13: {"category": "Audio & Nutq", "difficulty": "Qiyin", "duration": "90 daq", "tags": ["Nutq Tahlili", "Pitch", "LPC", "MFCC", "VAD"]},
    14: {"category": "1D Signal", "difficulty": "O'rtacha", "duration": "50 daq", "tags": ["Belgilar", "RMS", "Energiya", "Quvvat", "Dominant Chastota"]},
    15: {"category": "AI & Deteksiya", "difficulty": "Qiyin", "duration": "90 daq", "tags": ["Obyekt Deteksiyasi", "IoU", "NMS", "mAP", "Bounding Box"]},
    16: {"category": "Interpolatsiya", "difficulty": "O'rtacha", "duration": "50 daq", "tags": ["Interpolatsiya", "Spline", "Linear", "Bicubic", "MSE"]},
    17: {"category": "Rang Modellari", "difficulty": "Oson", "duration": "45 daq", "tags": ["RGB", "HSV", "YCbCr", "Rang Ajratish"]},
    18: {"category": "AI & Mashinali", "difficulty": "Qiyin", "duration": "80 daq", "tags": ["KNN Klassifikatsiya", "Sun'iy Intellekt", "Accuracy", "Confusion Matrix"]},
    19: {"category": "Sifat & Audio", "difficulty": "O'rtacha", "duration": "60 daq", "tags": ["Tasvir Sifati", "medfilt2", "Audio LP", "Butterworth"]},
    20: {"category": "Sifat & Audio", "difficulty": "O'rtacha", "duration": "60 daq", "tags": ["imadjust", "histeq", "imsharpen", "Bandpass"]},
    21: {"category": "Restavratsiya", "difficulty": "Qiyin", "duration": "75 daq", "tags": ["Restavratsiya", "Wiener", "Motion Blur", "deconvwnr"]}
}

@router.get("")
def list_labs(user: Optional[User] = Depends(get_current_user), session: Session = Depends(get_session)):
    labs = []
    
    # User progress map
    progress_map = {}
    if user and hasattr(user, 'id'):
        progs = session.exec(select(LabProgress).where(LabProgress.user_id == user.id)).all()
        for p in progs:
            progress_map[p.lab_number] = {"status": p.status, "score": p.score}
            
    for num in range(2, 22):
        json_path = os.path.join(settings.LABS_DIR, f"{num}.json")
        title = f"{num}-amaliy mashg'ulot"
        objective = ""
        variants_count = 20
        questions_count = 0
        
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    d = json.load(f)
                    title = d.get("title") or title
                    objective = d.get("objective") or objective
                    variants_count = len(d.get("variants", []))
                    questions_count = len(d.get("control_questions_raw", []))
            except Exception:
                pass
                
        meta = LAB_METADATA.get(num, {"category": "Umumiy", "difficulty": "O'rtacha", "duration": "60 daq", "tags": []})
        user_prog = progress_map.get(num, {"status": "not_started", "score": 0.0})
        
        labs.append({
            "id": num,
            "title": title,
            "objective": objective,
            "category": meta["category"],
            "difficulty": meta["difficulty"],
            "duration": meta["duration"],
            "tags": meta["tags"],
            "variants_count": variants_count,
            "questions_count": questions_count,
            "status": user_prog["status"],
            "score": user_prog["score"]
        })
        
    return labs

@router.get("/{lab_id}")
def get_lab_detail(lab_id: int):
    if lab_id < 2 or lab_id > 21:
        raise HTTPException(status_code=404, detail="Laboratoriya topilmadi")
        
    json_path = os.path.join(settings.LABS_DIR, f"{lab_id}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Laboratoriya fayli mavjud emas")
        
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    meta = LAB_METADATA.get(lab_id, {"category": "Umumiy", "difficulty": "O'rtacha", "duration": "60 daq", "tags": []})
    data["meta"] = meta
    return data

PARAM_META = {
    "window_ms": {"name": "Oyna uzunligi", "unit": "ms", "desc": "STFT tahlil oynasining (frame) vaqt davomiyligi"},
    "overlap_pct": {"name": "Kadrlar qoplamasi", "unit": "%", "desc": "Ketma-ket tahlil oynalarining ustma-ust tushish foizi"},
    "lpc_order": {"name": "LPC filtri tartibi", "unit": "tartib", "desc": "Chiziqli bashorat filtri qutblari soni (formantlar modeli)"},
    "F": {"name": "Asosiy chastota", "unit": "Hz", "desc": "Garmonik signalning tebranish chastotasi"},
    "F1": {"name": "1-chastota", "unit": "Hz", "desc": "Birinchi tebranish signali chastotasi"},
    "F2": {"name": "2-chastota", "unit": "Hz", "desc": "Ikkinchi tebranish signali chastotasi"},
    "A": {"name": "Amplituda", "unit": "V", "desc": "Signalning eng yuqori tebranish qulochi"},
    "A1": {"name": "1-amplituda", "unit": "V", "desc": "Birinchi signal amplitudasi"},
    "A2": {"name": "2-amplituda", "unit": "V", "desc": "Ikkinchi signal amplitudasi"},
    "phi": {"name": "Boshlang'ich faza", "unit": "rad", "desc": "Boshlang'ich fazaviy siljish burchagi"},
    "x_n": {"name": "Kirish signali x[n]", "unit": "vektor", "desc": "Tizimga kiruvchi diskret signallar ketma-ketligi"},
    "h_n": {"name": "Impulsli reaksiya h[n]", "unit": "vektor", "desc": "Filtr yoki tizimning birlik impulsli javobi"},
    "noise_type": {"name": "Shovqin turi", "unit": "", "desc": "Tasvirga qo'shiladigan sun'iy buzilish turi"},
    "noise_param": {"name": "Shovqin parametri", "unit": "", "desc": "Shovqin zichligi yoki dispersiyasi"},
    "filter_size": {"name": "Filtr oynasi o'lchami", "unit": "px", "desc": "Fazoviy filtr matritsasi o'lchami (NxN)"},
    "se_shape": {"name": "Strukturaviy element shakli", "unit": "", "desc": "Morfologik o'zgartirish yadrosi geometriyasi"},
    "se_radius": {"name": "Strukturaviy element radiusi", "unit": "px", "desc": "Morfologik filtr ta'sir radiusi"},
    "operation": {"name": "Morfologik operatsiya", "unit": "", "desc": "Bajariladigan morfologik amal (ochish, yopish, eroziya)"},
    "Q": {"name": "Kvantlash ko'paytuvchisi Q", "unit": "", "desc": "DCT kvantlash matritsasi koeffitsiyenti"},
    "keep_coeffs": {"name": "Saqlanadigan koeffitsiyentlar", "unit": "ta", "desc": "Har bir 8x8 DCT blokidan qoldiriladigan koeffitsiyentlar soni"},
    "quality": {"name": "Siqish sifati", "unit": "%", "desc": "JPEG formatida siqish sifati koeffitsiyenti"},
    "target_format": {"name": "Saqlash formati", "unit": "", "desc": "Siqilgan fayl formati"},
    "Amplituda_A": {"name": "Signal amplitudasi A", "unit": "V", "desc": "Garmonik signal amplitudasi"},
    "Chastota_f": {"name": "Signal chastotasi f", "unit": "Hz", "desc": "Garmonik tebranish chastotasi"},
    "iou_threshold": {"name": "IoU chegarasi", "unit": "", "desc": "Obyekt chegaralari kesishish mezoni (Intersection over Union)"},
    "score_threshold": {"name": "Ishonch chegarasi", "unit": "", "desc": "Obyekt aniqlanishi uchun minimal ehtimollik"},
    "upscale_factor": {"name": "Kattalashtirish karraliligi", "unit": "x", "desc": "Tasvir ruxsatini oshirish koeffitsiyenti"},
    "sample_rate_sparse": {"name": "Siyraklashtirish qadami", "unit": "namuna", "desc": "Signal piksellarini tanlab olish qadami"},
    "target_model": {"name": "Rang fazosi", "unit": "", "desc": "Tasvir o'tkaziladigan rang modeli (RGB, HSV, Lab)"},
    "target_channel": {"name": "Rang kanali", "unit": "", "desc": "Alohida ajratib tahlil qilinadigan kanal"},
    "k_neighbors": {"name": "Eng yaqin qo'shnilar (K)", "unit": "ta", "desc": "KNN tasniflashda ovoz beruvchi qo'shnilar soni"},
    "train_split": {"name": "Trening to'plam ulushi", "unit": "", "desc": "Modelni o'qitish uchun ajratilgan ma'lumotlar ulushi"},
    "cutoff_hz": {"name": "Kesish chastotasi", "unit": "Hz", "desc": "Filtrning -3 dB susayish chastotasi"},
    "filter_order": {"name": "Filtr tartibi", "unit": "tartib", "desc": "Filtrning chastota xarakteristikasi keskinligi"},
    "bp_low_hz": {"name": "Pastki kesish chastotasi", "unit": "Hz", "desc": "Polosali filtrning boshlang'ich o'tkazish chegarasi"},
    "bp_high_hz": {"name": "Yuqori kesish chastotasi", "unit": "Hz", "desc": "Polosali filtrning yakuniy o'tkazish chegarasi"},
    "sharpen_radius": {"name": "Charxlash radiusi", "unit": "px", "desc": "Tasvir konturlarini kuchaytirish radiusi"},
    "motion_len": {"name": "Harakatlanish masofasi", "unit": "px", "desc": "Harakatlanish tufayli xiralashish masofasi"},
    "motion_theta": {"name": "Harakatlanish burchagi", "unit": "gradus", "desc": "Harakatlanish burchagi yo'nalishi"},
    "nsr": {"name": "Shovqin/signal nisbati (NSR)", "unit": "", "desc": "Viner filtri parametrlar nisbati"}
}

def compute_variant_intelligence(lab_id: int, variant_num: int, params: Dict[str, Any]) -> Dict[str, Any]:
    import math

    param_table = []
    for k, v in params.items():
        meta = PARAM_META.get(k, {
            "name": k,
            "unit": "",
            "desc": "Variant jadvalidan belgilangan o'quv parametri"
        })
        param_table.append({
            "key": k,
            "name": meta["name"],
            "value": str(v),
            "unit": meta["unit"],
            "description": meta["desc"]
        })

    formulas = []
    step_explanations = []
    teacher_notes = ""
    matlab_code = ""
    suggested_hint = "Hisoblangan qiymatni kiriting..."
    expected_values = {}

    if lab_id == 13:  # Speech & LPC (User screenshot lab)
        win_ms = float(params.get("window_ms", 30))
        overlap_pct = float(params.get("overlap_pct", 50))
        lpc_order = int(params.get("lpc_order", 12))
        Fs = 16000
        N_win = round(Fs * win_ms / 1000.0)
        N_overlap = round(N_win * overlap_pct / 100.0)
        N_hop = N_win - N_overlap
        formants = lpc_order // 2

        expected_values = {
            "N_win (kadr namunalari)": N_win,
            "N_overlap (qoplash namunalari)": N_overlap,
            "N_hop (kadr siljishi)": N_hop,
            "LPC tartibi": lpc_order,
            "Formantlar jufti": formants
        }
        suggested_hint = f"Masalan: Kadr uzunligi N_win ({N_win}), overlap ({N_overlap}) yoki formantlar soni ({formants})..."
        formulas = [
            r"N_{\text{win}} = F_s \times \frac{\text{window\_ms}}{1000} = 16000 \times \frac{" + f"{win_ms:g}" + r"}{1000} = " + f"{N_win}",
            r"N_{\text{overlap}} = N_{\text{win}} \times \frac{\text{overlap\_pct}}{100} = " + f"{N_win} \\times {overlap_pct:g}\\% = {N_overlap}",
            r"N_{\text{hop}} = N_{\text{win}} - N_{\text{overlap}} = " + f"{N_win} - {N_overlap} = {N_hop}",
            r"\text{Rezonans formantlar jufti} = \left\lfloor \frac{\text{lpc\_order}}{2} \right\rfloor = \left\lfloor \frac{" + f"{lpc_order}" + r"}{2} \right\rfloor = " + f"{formants}"
        ]
        step_explanations = [
            f"1. Diskretlash chastotasi standart nutq signali uchun Fs = {Fs} Hz deb olinadi.",
            f"2. Tahlil oynasi uzunligi (namunada): N_win = Fs * (window_ms / 1000) = {Fs} * {win_ms/1000:g} = {N_win} ta namuna.",
            f"3. Kadrlarning ustma-ust tushish uzunligi: N_overlap = N_win * ({overlap_pct}%) = {N_overlap} ta namuna.",
            f"4. Kadr siljish qadami (hop size): N_hop = N_win - N_overlap = {N_hop} ta namuna ({round(N_hop/Fs*1000, 1)} ms).",
            f"5. LPC tartibi p = {lpc_order}. Har bir rezonans formant 2 ta qutb talab qiladi, shuning uchun maksimal {formants} ta vokal formant chastotasini aniqlash mumkin."
        ]
        teacher_notes = f"Inson nutq apparati unli tovushlar davomida o'rtacha 10-30 ms oralig'ida kvazistatsionar bo'ladi. Ushbu {win_ms:g} ms oyna nutqning chastotaviy xususiyatlarini yuqori aniqlikda ifodalash imkonini beradi. 50% overlap esa oynalar chegarasidagi ma'lumot yo'qolishini bartaraf etadi."
        matlab_code = f"""% {variant_num}-variant: Nutq signali tahlili va LPC (Lab 13)
Fs = 16000;
win_len = round(Fs * {win_ms}/1000);   % {N_win} ta namuna ({win_ms} ms)
overlap = round(win_len * {overlap_pct}/100); % {N_overlap} ta namuna
p = {lpc_order}; % LPC filtri tartibi

% Spektrogramma hisoblash:
[S, F, T] = spectrogram(signal, win_len, overlap, 1024, Fs);

% 1-kadr uchun LPC va formantlar:
frame = signal(1:win_len) .* hamming(win_len);
[a, g] = lpc(frame, p);
r = roots(a);
r = r(imag(r) > 0);
formants = sort(atan2(imag(r), real(r)) * (Fs / (2*pi)));
disp('Aniqlangan vokal formantlar (Hz):');
disp(formants);"""

    elif lab_id == 3:  # Harmonic phase & sum
        F_val = float(params.get("F", 10.0))
        phi_str = str(params.get("phi", "pi/4")).replace('π', 'pi')
        phi_val = math.pi / 4.0
        if "pi/8" in phi_str: phi_val = math.pi / 8.0
        elif "pi/6" in phi_str: phi_val = math.pi / 6.0
        elif "pi/4" in phi_str: phi_val = math.pi / 4.0
        elif "pi/2" in phi_str: phi_val = math.pi / 2.0
        elif phi_str.strip() == "pi": phi_val = math.pi

        expected_T = round(1.0 / F_val, 4)
        expected_Amp = round(2.0 * math.cos(phi_val / 2.0), 3)
        expected_RMS = round(expected_Amp / math.sqrt(2.0), 3)

        expected_values = {
            "Tebranish davri T (s)": expected_T,
            "Yig'indi amplituda Ay": expected_Amp,
            "RMS samarali qiymat": expected_RMS
        }
        suggested_hint = f"Masalan: Davr T ({expected_T} s), Amplituda Ay ({expected_Amp}) yoki RMS ({expected_RMS})..."
        formulas = [
            r"T = \frac{1}{F} = \frac{1}{" + f"{F_val:g}" + r"} = " + f"{expected_T} \\text{{ s}}",
            r"A_y = 2 A \cos\left(\frac{\varphi}{2}\right) = 2 \times 1 \times \cos\left(" + f"{round(math.degrees(phi_val/2), 1)}^\\circ" + r"\right) \approx " + f"{expected_Amp}",
            r"\text{RMS} = \frac{A_y}{\sqrt{2}} \approx " + f"{expected_RMS}"
        ]
        step_explanations = [
            f"1. Tebranish davri (T): T = 1 / F = 1 / {F_val:g} = {expected_T} s ({expected_T * 1000} ms).",
            f"2. Faza siljishi: φ = {params.get('phi', 'π/4')} rad ({round(math.degrees(phi_val), 1)}°).",
            f"3. Yig'indi signal amplitudasi: Ay = 2 * A * cos(φ/2) = 2 * 1 * cos({round(math.degrees(phi_val/2), 1)}°) ≈ {expected_Amp}.",
            f"4. Samarali (RMS) qiymat: RMS = Ay / √2 ≈ {expected_RMS}."
        ]
        teacher_notes = "Bir xil chastotali ikkita garmonika qo'shilganda yangi garmonik signal hosil bo'ladi. Uning amplitudasi fazalar farqi φ ga bog'liq bo'lib, interferensiya qonuniyatiga bo'ysunadi."
        matlab_code = f"""% {variant_num}-variant bo'yicha Garmonik Signallar (Lab 3)
F = {F_val}; % Hz
phi = {phi_val:.4f}; % rad
t = 0:0.001:1;
s1 = sin(2*pi*F*t);
s2 = sin(2*pi*F*t + phi);
s_sum = s1 + s2;
Ay_calc = 2 * cos(phi / 2);
rms_calc = rms(s_sum);
fprintf('Nazariy Ay: %.3f, RMS: %.3f\\n', Ay_calc, rms_calc);"""

    elif lab_id == 6:  # Convolution
        expected_values = {
            "Konvolyutsiya uzunligi L": 5,
            "Natija vektori": "[0, 1, 2.5, 4, 1.5]"
        }
        suggested_hint = "Masalan: konvolyutsiya uzunligi (5) yoki [0, 1, 2.5, 4, 1.5]..."
        formulas = [
            r"y[n] = x[n] * h[n] = \sum_{k=-\infty}^{\infty} x[k] h[n-k]",
            r"L_y = L_x + L_h - 1 = 3 + 3 - 1 = 5"
        ]
        step_explanations = [
            "1. h(n) signali teskari aylantiriladi: h(-k) = [0.5, 1, 0].",
            "2. Har bir k siljishi uchun x(k) va h(n-k) ko'paytirilib yig'iladi.",
            "3. Natijaviy vektor: conv([1,2,3], [0,1,0.5]) = [0, 1, 2.5, 4, 1.5], uzunligi 5 ta namuna."
        ]
        teacher_notes = "Diskret konvolyutsiya chiziqli statsionar (LTI) tizimning asosiy matematik operatoridir. Chiqish signali uzunligi har doim kirish va impulsli reaksiya uzunliklari yig'indisidan 1 ga kam bo'ladi."
        matlab_code = f"""% {variant_num}-variant bo'yicha Konvolyutsiya (Lab 6)
x = [1, 2, 3];
h = [0, 1, 0.5];
y = conv(x, h);
disp('Konvolyutsiya natijasi:'); disp(y);"""

    elif lab_id == 14:  # Signal Energy & RMS
        A_val = 1.0 if variant_num == 1 else float(variant_num * 0.5)
        expected_RMS = round(A_val / math.sqrt(2.0), 3)
        expected_P = round(A_val**2 / 2.0, 3)
        expected_E = round(expected_P * 1000, 1)

        expected_values = {
            "RMS qiymati": expected_RMS,
            "O'rtacha quvvat P": expected_P,
            "Signal energiyasi E": expected_E
        }
        suggested_hint = f"Masalan: RMS ({expected_RMS}), Quvvat ({expected_P}) yoki Energiya ({expected_E})..."
        formulas = [
            r"\text{RMS} = \frac{A}{\sqrt{2}} = \frac{" + f"{A_val:g}" + r"}{1.414} \approx " + f"{expected_RMS}",
            r"P = \frac{A^2}{2} = \frac{" + f"{A_val:g}^2" + r"}{2} = " + f"{expected_P}",
            r"E = P \times N = " + f"{expected_E}"
        ]
        step_explanations = [
            f"1. Amplituda A = {A_val:g} V.",
            f"2. Nazariy RMS = A / √2 = {A_val:g} / 1.414 ≈ {expected_RMS} V.",
            f"3. O'rtacha quvvat P = A² / 2 = {expected_P} Vt.",
            f"4. N=1000 namunali diskret energiya E = P * N ≈ {expected_E} J."
        ]
        teacher_notes = "Periodik signallar quvvat signallari sinfiga kiradi. Parseval teoremasiga binoan, signalning vaqt sohasidagi energiyasi uning chastota sohasidagi spektral energiyasiga tengdir."
        matlab_code = f"""% {variant_num}-variant: Energiya va RMS (Lab 14)
A = {A_val};
Fs = 1000;
t = 0:1/Fs:1;
x = A * sin(2*pi*20*t);
rms_val = rms(x);
P_val = mean(x.^2);
fprintf('RMS: %.3f, Quvvat: %.3f\\n', rms_val, P_val);"""

    elif lab_id in [2, 4, 5, 7, 10]:  # Sampling & Frequency
        f1_val = float(params.get("F1", params.get("F", 10.0)))
        f2_val = float(params.get("F2", f1_val * 2.0))
        f_max = max(f1_val, f2_val)
        nyquist_f = 2.0 * f_max
        T_period = round(1.0 / f_max, 4)
        expected_values = {
            "Nyquist chastotasi (Hz)": nyquist_f,
            "Tebranish davri T (s)": T_period,
            "Maksimal chastota": f_max
        }
        suggested_hint = f"Masalan: Naykvist chastotasi ({nyquist_f} Hz) yoki tebranish davri ({T_period} s)..."
        formulas = [
            r"F_{\text{Nyquist}} = 2 \times F_{\max} = 2 \times " + f"{f_max:g} = {nyquist_f:g} \\text{{ Hz}}",
            r"T_{\min} = \frac{1}{F_{\max}} = " + f"{T_period} \\text{{ s}}"
        ]
        step_explanations = [
            f"1. Signalning eng yuqori chastota komponenti: F_max = {f_max:g} Hz.",
            f"2. Kotelnikov-Shennon (Nyquist) teoremasi: F_s >= 2 * F_max = {nyquist_f:g} Hz.",
            f"3. Diskretlash chastotasi {nyquist_f:g} Hz dan past bo'lsa, spektral aliasing (yolg'on chastotalar) yuzaga keladi."
        ]
        teacher_notes = "Kotelnikov-Nyquist teoremasiga asosan, uzluksiz analog signalni axborot yo'qotmasdan tiklash uchun diskretlash chastotasi signalning eng yuqori chastotali garmonikasidan kamida 2 barobar katta bo'lishi shart."
        matlab_code = f"""% {variant_num}-variant: Diskretlash va Naykvist mezoni
F_max = {f_max};
Fs_nyq = 2 * F_max; % {nyquist_f} Hz
t = 0:1/(10*F_max):3*(1/F_max);
x = sin(2*pi*{f1_val}*t);
plot(t, x, '-o'); grid on;"""

    elif lab_id in [8, 9]:  # Filters & Morphology
        if "se_radius" in params:
            radius = int(params.get("se_radius", 4))
            diameter = 2 * radius + 1
            expected_values = {"Radius": radius, "Diametr": diameter}
            suggested_hint = f"Masalan: strukturaviy element diametri ({diameter} px) yoki radiusi ({radius})..."
            formulas = [r"\text{Diametr} = 2 \times r + 1 = 2 \times " + f"{radius} + 1 = {diameter} \\text{{ px}}"]
            step_explanations = [
                f"1. Strukturaviy element radiusi r = {radius} piksel.",
                f"2. Yadro umumiy diametri: 2*r + 1 = {diameter} piksel.",
                f"3. Tanlangan shakl: {params.get('se_shape', 'disk')} bo'yicha morfologik operatsiya."
            ]
            teacher_notes = "Morfologik ochish (opening) operatsiyasi dastlab eroziya va keyin dilatatsiyani qo'llaydi, bu esa mayda oq shovqinlarni yo'qotib obyekt o'lchamini saqlab qoladi."
            matlab_code = f"""% {variant_num}-variant: Morfologik ishlov berish
se = strel('{params.get("se_shape", "disk")}', {radius});
I_out = imopen(I_gray, se);
imshowpair(I_gray, I_out, 'montage');"""
        else:
            fsize = int(params.get("filter_size", 3))
            n_pixels = fsize * fsize
            expected_values = {"Filtr o'lchami": fsize, "Piksellar soni": n_pixels}
            suggested_hint = f"Masalan: Filtr yadrosi o'lchami ({fsize}x{fsize}) yoki piksellar soni ({n_pixels})..."
            formulas = [r"N_{\text{yadrosi}} = " + f"{fsize} \\times {fsize} = {n_pixels} \\text{{ piksel}}"]
            step_explanations = [
                f"1. Fazoviy filtr yadrosi o'lchami: {fsize}x{fsize}.",
                f"2. Bitta pikselni hisoblashda qatnashadigan qo'shnilar soni: {n_pixels} ta piksel.",
                f"3. Median filtri impulsli (tuz-qalampir) shovqinlarni yo'qotishda eng samarali chiziqsiz filtr hisoblanadi."
            ]
            teacher_notes = f"Median filtrida har bir piksel o'zining {fsize}x{fsize} atrofidagi tartiblangan piksellarning o'rtadagi (median) qiymati bilan almashtiriladi, natijada qirralar yuvilib ketmaydi."
            matlab_code = f"""% {variant_num}-variant: Median filtri
I_filtered = medfilt2(I_noisy, [{fsize} {fsize}]);
imshowpair(I_noisy, I_filtered, 'montage');"""

    elif lab_id in [11, 12]:  # DCT & JPEG
        q = int(params.get("Q", params.get("quality", 50)))
        keep = int(params.get("keep_coeffs", 10))
        comp_ratio = round((64 - keep) / 64.0 * 100.0, 1)
        expected_values = {"Q parametri": q, "Saqlanadigan koeffitsiyentlar": keep, "Siqish foizi (%)": comp_ratio}
        suggested_hint = f"Masalan: Saqlangan koeffitsiyentlar ({keep}) yoki siqish ulushi ({comp_ratio}%)..."
        formulas = [
            r"\text{Blok o'lchami} = 8 \times 8 = 64 \text{ DCT koeffitsiyenti}",
            r"\text{Nollangan koeffitsiyentlar ulushi} = \frac{64 - " + f"{keep}" + r"}{64} \times 100\% = " + f"{comp_ratio}\\%"
        ]
        step_explanations = [
            f"1. Har bir 8x8 piksel blokida 64 ta DCT chastota koeffitsiyenti olinadi.",
            f"2. Zig-zag tartibida eng past chastotali {keep} ta koeffitsiyent saqlanadi.",
            f"3. Yuqori chastotali {64 - keep} ta koeffitsiyent nolga tenglashtirilib, {comp_ratio}% siqishga erishiladi."
        ]
        teacher_notes = "Inson ko'zi yuqori chastotali mayda fazoviy detallarga nisbatan past chastotali yorug'lik o'zgarishlariga ancha sezgir. DCT aynan energiyani pastki burchakka to'plab beradi."
        matlab_code = f"""% {variant_num}-variant: 2D DCT siqish (Q = {q})
I = imread('cameraman.png');
D = dct2(rgb2gray(I));
D_q = round(D / {q}) * {q};
I_rec = idct2(D_q);
imshowpair(rgb2gray(I), uint8(I_rec), 'montage');"""

    elif lab_id == 16:  # Interpolation
        scale = float(params.get("scale", 2.0 if variant_num % 2 == 0 else 1.5))
        expected_values = {"Kattalashtirish koeffitsiyenti": scale}
        suggested_hint = f"Masalan: Masshtab koeffitsiyenti ({scale}) yoki piksel o'lchami..."
        formulas = [
            r"M_{\text{yangi}} = M_{\text{asl}} \times " + f"{scale:g}",
            r"N_{\text{yangi}} = N_{\text{asl}} \times " + f"{scale:g}"
        ]
        step_explanations = [
            f"1. Asl tasvir masshtabi {scale:g} barobarga kattalashtiriladi.",
            "2. Bikubik interpolatsiyada har bir yangi piksel atrofdagi 16 ta qo'shni pikselning kubik vaznli yig'indisi sifatida hisoblanadi.",
            "3. Chiziqli usulga qaraganda bikubik usulda zinasimon piksellashish sezilarli kamayadi."
        ]
        teacher_notes = "Interpolatsiya yangi axborot yaratmaydi, balki mavjud diskret nuqtalar orasidagi ehtimoliy qiymatlarni silliq aproksimatsiya qiladi."
        matlab_code = f"""% {variant_num}-variant: Signal va tasvirlarda interpolatsiya
I = imread('cameraman.png');
I_resized = imresize(I, {scale}, 'bicubic');
imshow(I_resized);"""

    elif lab_id == 17:  # Color models
        weight_r = float(params.get("w_r", 0.299))
        weight_g = float(params.get("w_g", 0.587))
        weight_b = float(params.get("w_b", 0.114))
        expected_values = {"Yashil (G) vazni": weight_g, "Qizil (R) vazni": weight_r, "Ko'k (B) vazni": weight_b}
        suggested_hint = f"Masalan: Yashil kanal ulushi ({weight_g}) yoki qizil kanal ({weight_r})..."
        formulas = [
            r"I_{\text{gray}} = " + f"{weight_r:g} R + {weight_g:g} G + {weight_b:g} B"
        ]
        step_explanations = [
            f"1. Inson ko'zining spektral sezgirligi: Yashil (G) = {weight_g:g}, Qizil (R) = {weight_r:g}, Ko'k (B) = {weight_b:g}.",
            "2. Kulrang darajaga o'tkazishda eng katta hissa yashil kanalga to'g'ri keladi.",
            "3. HSV rang maydonida esa yorug'likdan mustaqil Hue (rang tusi) ajratiladi."
        ]
        teacher_notes = "NTSC va ITU-R BT.601 standartlarida belgilangan ushbu koeffitsientlar inson ko'zidagi kolbachalar (cones) sezgirligini aniq modellashtiradi."
        matlab_code = f"""% {variant_num}-variant: Rang modellarini tahlil qilish
I = imread('peppers.png');
Igray = {weight_r:g}*double(I(:,:,1)) + {weight_g:g}*double(I(:,:,2)) + {weight_b:g}*double(I(:,:,3));
imshow(uint8(Igray));"""

    elif lab_id in [15, 18]:  # Object Detection & KNN
        k_val = int(params.get("k", 3 if variant_num % 2 != 0 else 5))
        expected_values = {"K qo'shnilar soni": k_val, "Metrika": "Euclidean"}
        suggested_hint = f"Masalan: K qo'shnilar soni ({k_val}) yoki aniqlik darajasi..."
        formulas = [
            r"d(\mathbf{x}, \mathbf{y}) = \sqrt{\sum_{i=1}^n (x_i - y_i)^2}",
            f"K = {k_val} \\text{{ ta eng yaqin qo'shni}}"
        ]
        step_explanations = [
            f"1. O'rganish fazosida K={k_val} ta eng yaqin etalon namuna tanlanadi.",
            "2. Har bir obyekt uchun rang va tekstura vektorlari bo'yicha Yevklid masofasi hisoblanadi.",
            "3. Ko'pchilik ovozi (majority vote) qoidasi asosida sinf belgilanadi."
        ]
        teacher_notes = "K ning toq son qilib tanlanishi (masalan 3 yoki 5) ikki sinfli tasniflashda teng ovozlar kelib chiqishining oldini oladi."
        matlab_code = f"""% {variant_num}-variant: KNN O'rganish modeli (K = {k_val})
X_train = [120, 45; 135, 50; 40, 20; 55, 25];
y_train = [1; 1; 2; 2];
X_test = [125, 48; 50, 22];
mdl = fitcknn(X_train, y_train, 'NumNeighbors', {k_val});
y_pred = predict(mdl, X_test);
disp('Aniqlangan sinflar:'); disp(y_pred);"""

    elif lab_id in [19, 20]:  # Enhancement & Gamma
        gamma = float(params.get("gamma", 0.6 if variant_num <= 10 else 1.4))
        expected_values = {"Gamma parametri": gamma}
        suggested_hint = f"Masalan: Gamma ko'rsatkichi ({gamma})..."
        formulas = [
            r"s = c \cdot r^\gamma = r^{" + f"{gamma:g}" + r"}"
        ]
        step_explanations = [
            f"1. Darajali (Power-law) o'zgartirish gamma ko'rsatkichi: γ = {gamma:g}.",
            f"2. {'γ < 1 bo\'lgani uchun qorong\'i sohalar yoritiladi va detallar ochiladi.' if gamma < 1 else 'γ > 1 bo\'lgani uchun kontrast kuchaytirilib, o\'ta yorug\' sohalar me\'yorlashtiriladi.'}",
            "3. Gistogramma tenglashtirish (histeq) orqali barcha intensivlik darajalariga tekis taqsimot beriladi."
        ]
        teacher_notes = "Inson ko'zining yorug'likka bo'lgan reaksiyasi chiziqsiz logarifmik xarakterga ega, shuning uchun gamma korreksiyasi monitorlar va kameralarda standart qo'llaniladi."
        matlab_code = f"""% {variant_num}-variant: Tasvir sifatini oshirish (Gamma = {gamma:g})
I = imread('cameraman.png');
I_adj = imadjust(rgb2gray(I), [], [], {gamma:g});
imshowpair(rgb2gray(I), I_adj, 'montage');"""

    elif lab_id == 21:  # Restoration & Wiener
        nsr = float(params.get("nsr", 0.01 * (variant_num % 5 + 1)))
        expected_values = {"NSR (Shovqin/Signal nisbati)": nsr}
        suggested_hint = f"Masalan: Viner filtri NSR koeffitsiyenti ({nsr:.3f})..."
        formulas = [
            r"W(u,v) = \frac{H^*(u,v)}{|H(u,v)|^2 + \text{NSR}} = \frac{H^*(u,v)}{|H(u,v)|^2 + " + f"{nsr:.3f}" + r"}"
        ]
        step_explanations = [
            f"1. Viner filtrlash parametri: NSR = Shovqin_quvvati / Signal_quvvati = {nsr:.3f}.",
            "2. Oddiy teskari filtr shovqinni cheksiz kuchaytirib yuborgan bo'lsa, Viner filtri uni regulyarizatsiya qiladi.",
            "3. O'rtacha kvadratik xatolik (MSE) minimallashtirilgan holda etalon tasvir tiklanadi."
        ]
        teacher_notes = "Norbert Viner tomonidan taklif qilingan optimal chiziqli filtrlash mezoni stoxastik jarayonlar nazariyasining klassik yutug'idir."
        matlab_code = f"""% {variant_num}-variant: Viner filtri bilan tiklash (NSR = {nsr:.3f})
I = imread('cameraman.png');
Igray = rgb2gray(I);
PSF = fspecial('gaussian', [5 5], 1.0);
I_blurred = imfilter(Igray, PSF, 'conv', 'circular');
I_restored = deconvwnr(I_blurred, PSF, {nsr:.3f});
imshowpair(I_blurred, I_restored, 'montage');"""

    else:
        for k, v in params.items():
            try:
                expected_values[k] = float(v)
            except:
                expected_values[k] = str(v)
        suggested_hint = "Variant jadvalidagi parametrlardan birini yoki hisob-kitobingizni kiriting..."
        formulas = [
            r"\text{Variant parametrlari} = " + f"{json.dumps(params, ensure_ascii=False)}"
        ]
        step_explanations = [
            f"1. Ushbu {variant_num}-variant uchun o'quv dasturidan barcha parametrlar yuklandi.",
            f"2. Belgilangan parametrlar: {', '.join([f'{k} = {v}' for k, v in params.items()])}.",
            f"3. Parametrlarni MATLAB laboratoriya skriptingizda qo'llang va natijalarni solishtiring."
        ]
        teacher_notes = "Har bir talaba o'z varianti bo'yicha olingan grafik va raqamli natijalarni nazariya bilan solishtirib, hisobotga xulosalar yozishi lozim."
        matlab_code = f"""% {variant_num}-variant parametrlari:
""" + "\n".join([f"{k} = {v};" for k, v in params.items()])

    return {
        "variant": variant_num,
        "parameters": params,
        "param_table": param_table,
        "formulas": formulas,
        "step_explanations": step_explanations,
        "teacher_notes": teacher_notes,
        "matlab_code": matlab_code,
        "suggested_hint": suggested_hint,
        "expected_values": expected_values
    }

@router.get("/{lab_id}/variant/{variant_num}")
def get_lab_variant(lab_id: int, variant_num: int):
    if lab_id < 2 or lab_id > 21:
        raise HTTPException(status_code=404, detail="Laboratoriya topilmadi")
    if variant_num < 1 or variant_num > 20:
        raise HTTPException(status_code=400, detail="Variant raqami 1 dan 20 gacha bo'lishi kerak")
        
    json_path = os.path.join(settings.LABS_DIR, f"{lab_id}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Laboratoriya fayli mavjud emas")
        
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    variants = data.get("variants", [])
    matching = next((v for v in variants if v["variant"] == variant_num), None)
    if not matching:
        raise HTTPException(status_code=404, detail=f"{variant_num}-variant topilmadi")
        
    intelligence = compute_variant_intelligence(lab_id, variant_num, matching.get("parameters", {}))
    return {
        **matching,
        **intelligence
    }

@router.post("/{lab_id}/verify")
def verify_student_solution(lab_id: int, payload: Dict[str, Any]):
    """
    Compares student calculated answers against analytical ground-truth
    with detailed step-by-step mathematical explanation.
    """
    variant = payload.get("variant", 1)
    student_input = str(payload.get("answers", {}).get("student_value", "")).strip()
    
    # Load lab variant data
    json_path = os.path.join(settings.LABS_DIR, f"{lab_id}.json")
    params = {}
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                v_list = d.get("variants", [])
                matching = next((v for v in v_list if v["variant"] == variant), None)
                if matching:
                    params = matching.get("parameters", {})
        except Exception:
            pass
            
    intelligence = compute_variant_intelligence(lab_id, variant, params)
    expected_values = intelligence["expected_values"]
    
    matched_key = None
    matched_target = None
    passed = False
    
    if student_input:
        # Check numeric match
        try:
            student_num = float(student_input.replace(",", "."))
            for k, exp in expected_values.items():
                if isinstance(exp, (int, float)):
                    if abs(student_num - float(exp)) < max(0.05 * abs(float(exp)), 0.05):
                        passed = True
                        matched_key = k
                        matched_target = exp
                        break
        except ValueError:
            # Check string/vector match
            for k, exp in expected_values.items():
                if str(exp).strip() == student_input or student_input in str(exp):
                    passed = True
                    matched_key = k
                    matched_target = exp
                    break
    else:
        # Empty input: treat as requesting analytical solution
        passed = True
        matched_key = "Etalon tahlil"

    message = ""
    if passed:
        if matched_key and matched_key != "Etalon tahlil":
            message = f"✅ Ajoyib! Siz kiritgan hisob-kitob natijasi ({matched_key} = {matched_target}) etalon qiymatga to'liq mos keldi."
        else:
            message = "✅ Ushbu variant uchun barcha etalon hisob-kitoblar va formulalar muvaffaqiyatli taqdim etildi."
    else:
        message = f"❌ Kiritilgan qiymat ({student_input}) etalon natijalar bilan mos kelmadi. Quyidagi qadam-baqadam yechimni o'rganib, qayta tekshirib ko'ring."

    return {
        "passed": passed,
        "variant": variant,
        "matched_param": matched_key,
        "message": message,
        "student_value": student_input,
        "checks": expected_values,
        "step_explanations": intelligence["step_explanations"],
        "teacher_notes": intelligence["teacher_notes"],
        "formulas": intelligence["formulas"],
        "matlab_code": intelligence["matlab_code"],
        "param_table": intelligence["param_table"]
    }



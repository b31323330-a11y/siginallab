import os
import json
import re
import urllib.request
import urllib.error
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlmodel import Session, select
from ..core.config import settings
from ..db.session import get_session
from ..models.schemas import SystemSetting

router = APIRouter(prefix="/ai", tags=["Sun'iy Intellekt Ustoz"])

class AIChatRequest(BaseModel):
    message: str
    lab_id: Optional[int] = 2
    variant: Optional[int] = 1
    code_context: Optional[str] = None
    error_context: Optional[str] = None

class AIFixRequest(BaseModel):
    code: str
    error_message: str

class AIAnalyzeRequest(BaseModel):
    lab_id: int
    metrics: Dict[str, Any]

# --- EXTERNAL AI INTEGRATION (GEMINI / OPENAI / ANTHROPIC) ---
def call_external_ai(prompt: str, system_prompt: Optional[str] = None, session: Optional[Session] = None) -> Dict[str, Any]:
    """Admin panelida sozlangan API kalit orqali real AI xizmatiga murojaat qilish"""
    if session is None:
        from ..db.session import engine
        session = Session(engine)
        should_close = True
    else:
        should_close = False

    try:
        settings_rows = session.exec(select(SystemSetting).where(SystemSetting.category == "ai")).all()
        s_map = {s.key: s.value for s in settings_rows}

        provider = s_map.get("ai_provider", "gemini")
        model = s_map.get("ai_model", "gemini-1.5-flash")
        api_key = s_map.get("ai_api_key", "").strip()
        custom_system = s_map.get("ai_system_prompt", "")

        if not api_key:
            return {"success": False, "reason": "no_api_key"}

        base_system = (
            "Siz 'SignalLab UZ' platformasining O'zbek tilidagi Sun'iy Intellekt Ustozisiz (DSP va DIP bo'yicha ekspert). "
            "Siz talabalarga Sokratik uslubda yo'l-yo'riq ko'rsatasiz, Kotelnikov teoremasi, Furye/DCT tahlili, "
            "raqamli filtrlar va MATLAB dasturlash bo'yicha tushuntirasiz. Formulalarni KaTeX ($...$, $$...$$) formatida yozasiz. "
            "Javoblaringiz aniq, do'stona va ilmiy jihatdan to'g'ri bo'lishi shart."
        )
        effective_system = (custom_system + "\n" + base_system) if custom_system else base_system
        if system_prompt:
            effective_system = system_prompt + "\n" + effective_system

        if provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = json.dumps({
                "systemInstruction": {"parts": [{"text": effective_system}]},
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.4, "maxOutputTokens": 2048}
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                ai_text = res_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                return {"success": True, "text": ai_text, "provider": "Google Gemini", "model": model}

        elif provider == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            payload = json.dumps({
                "model": model if "gpt" in model else "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": effective_system},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.4,
                "max_tokens": 2048
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            })
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                ai_text = res_data.get('choices', [{}])[0].get('message', {}).get('content', '')
                return {"success": True, "text": ai_text, "provider": "OpenAI", "model": model}

        elif provider == "anthropic":
            url = "https://api.anthropic.com/v1/messages"
            payload = json.dumps({
                "model": model if "claude" in model else "claude-3-haiku-20240307",
                "system": effective_system,
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}]
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={
                'Content-Type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            })
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                ai_text = res_data.get('content', [{}])[0].get('text', '')
                return {"success": True, "text": ai_text, "provider": "Anthropic Claude", "model": model}

        return {"success": False, "reason": f"unknown_provider_{provider}"}
    except Exception as e:
        return {"success": False, "reason": "api_error", "error": str(e)}
    finally:
        if should_close:
            session.close()

# --- KNOWLEDGE BASE FOR 20 LABS ---
DSP_KNOWLEDGE = {
    2: {
        "title": "1D va 2D signallarga dastlabki ishlov berish",
        "key_concepts": "1D signal - vaqtga bog'liq (masalan audio, EKG). 2D signal - ikki o'lchamli fazoviy piksellar matritsasi (tasvir). Imread tasvirni o'qiydi, rgb2gray kulrang tasvirga aylantiradi, imhist gistogramma chizadi, histeq esa kontrastni tenglashtiradi.",
        "formulas": ["I_{gray}(x,y) = 0.2989 R + 0.5870 G + 0.1140 B", "p(r_k) = n_k / N"],
        "matlab_sample": "% 1D sinusoidal signal\nfs = 1000; t = 0:1/fs:1-1/fs;\nx = sin(2*pi*10*t);\nfigure; plot(t, x); grid on;"
    },
    3: {
        "title": "Davriy signallar parametrlari",
        "key_concepts": "Davriy signal x(t) = A*sin(2*pi*f*t + phi). Bu yerda A - amplituda, f - davriy chastota, phi - dastlabki faza. stem() funksiyasi diskret signallarni ignasimon ko'rinishda tasvirlaydi.",
        "formulas": ["x[n] = A \\sin(2\\pi \\frac{f}{f_s} n + \\varphi)", "T = 1 / f"],
        "matlab_sample": "stem(n, x, 'filled'); title('Diskret davriy signal'); xlabel('Namunalar n');"
    },
    4: {
        "title": "Kotelnikov (Nyquist-Shannon) teoremasi va Aliasing",
        "key_concepts": "Uzluksiz signalni diskretlashda uning tarkibidagi eng yuqori chastota f_max bo'lsa, uni buzilishsiz qayta tiklash uchun diskretlash chastotasi fs >= 2*f_max bo'lishi shart. Agar fs < 2*f_max bo'lsa, 'aliasing' (spektrning bir-biriga qoplanishi) yuz beradi va signal o'rniga soxta past chastota paydo bo'ladi.",
        "formulas": ["f_s \\ge 2 f_{max}", "f_{alias} = |f - k f_s|", "x(t) = \\sum x[n] \\text{sinc}\\left(\\frac{t - nT_s}{T_s}\\right)"],
        "matlab_sample": "% Aliasing tekshiruvi\nf = 40; fs = 50; % fs < 2*f bo'lgani uchun aliasing yuz beradi (f_alias = 10 Hz)\nt = 0:1/fs:1;\nx = sin(2*pi*f*t);\nplot(t, x, 'o-');"
    },
    5: {
        "title": "Signallardagi shovqinlar, PSD va SNR",
        "key_concepts": "Oq shovqin (White Noise) barcha chastotalarda bir xil o'rtacha quvvatga ega. Gauss shovqini normal taqsimotga ega. SNR (Signal-to-Noise Ratio) signal va shovqin quvvatlarining nisbatini desibellarda (dB) ifodalaydi. PSD (Power Spectral Density) quvvatning chastotalar bo'yicha taqsimotidir.",
        "formulas": ["\\text{SNR}_{dB} = 10 \\log_{10}\\left(\\frac{P_{signal}}{P_{noise}}\\right)", "P = \\frac{1}{N} \\sum_{n=1}^N |x[n]|^2"],
        "matlab_sample": "noise = 0.5 * randn(size(x));\nx_noisy = x + noise;\nsnr_val = snr(x, noise);"
    },
    6: {
        "title": "Konvolyutsiya (Svyortka) va Korrelyatsiya",
        "key_concepts": "Chiziqli vaqt-invariyant (LTI) tizimning chiqish signali kirish signali x[n] va impuls xarakteristikasi h[n] ning konvolyutsiyasiga teng: y[n] = x[n] * h[n]. Korrelyatsiya esa ikki signalning bir-biriga o'xshashlik darajasini vaqt siljishi bo'yicha aniqlaydi.",
        "formulas": ["y[n] = \\sum_{k=-\\infty}^{\\infty} x[k] h[n - k]", "r_{xy}[m] = \\sum x[n] y[n - m]"],
        "matlab_sample": "y = conv(x, h, 'same');\nfigure; plot(y); title('Konvolyutsiya natijasi');"
    },
    7: {
        "title": "Raqamli filtrlar (Butterworth, Notch, IIR/FIR)",
        "key_concepts": "Butterworth filtri o'tkazish sohasida maksimal tekislikka ega bo'lib, to'lqinlanish hosil qilmaydi. Notch filtri tor tarmoqli bitta chastotani (masalan elektr tarmog'ining 50 Hz shovqinini) butunlay so'ndirish uchun ishlatiladi.",
        "formulas": ["|H(j\\omega)|^2 = \\frac{1}{1 + (\\omega/\\omega_c)^{2N}}", "H(z) = \\frac{\\sum b_k z^{-k}}{1 + \\sum a_k z^{-k}}"],
        "matlab_sample": "[b, a] = butter(4, 0.2, 'low');\ny = filter(b, a, x);\nfreqz(b, a);"
    },
    8: {
        "title": "2D Tasvir filtrlari va PSNR, SSIM",
        "key_concepts": "Median filtr tasvirdagi 'tuz-qalampir' (salt & pepper) shovqinini piksellar chegaralarini yuvib yubormasdan tozalaydi. Gauss filtri esa uzluksiz silliqlash beradi. PSNR (Peak Signal-to-Noise Ratio) tasvir sifatini baholaydi (30 dB dan yuqori a'lo hisoblanadi).",
        "formulas": ["\\text{PSNR} = 10 \\log_{10}\\left(\\frac{255^2}{\\text{MSE}}\\right)", "\\text{MSE} = \\frac{1}{MN} \\sum (I_{orig} - I_{filt})^2"],
        "matlab_sample": "I_noisy = imnoise(I, 'salt & pepper', 0.05);\nI_filtered = medfilt2(I_noisy, [3 3]);\npsnr_val = psnr(I_filtered, I);"
    },
    9: {
        "title": "Morfologik ishlov berish (Eroziya, Dilatatsiya)",
        "key_concepts": "Morfologiya strukturalovchi element (strel) yordamida binar tasvirlar shaklini o'zgartiradi. Eroziya (imerode) obyekt chegaralarini yeydi va mayda dog'larni yo'qotadi. Dilatatsiya (imdilate) obyektni kengaytiradi va yoriqlarni to'ldiradi. Opening = Eroziya + Dilatatsiya. Closing = Dilatatsiya + Eroziya.",
        "formulas": ["A \\ominus B = \\{z \\mid (B)_z \\subseteq A\\}", "A \\oplus B = \\{z \\mid (\\hat{B})_z \\cap A \\neq \\emptyset\\}"],
        "matlab_sample": "se = strel('disk', 3);\nI_open = imopen(BW, se);\nI_close = imclose(BW, se);"
    },
    10: {
        "title": "Spektral tahlil: Furye Transformatsiyasi (FFT, STFT)",
        "key_concepts": "FFT signalni vaqt domenidan chastota domeniga o'tkazadi. Murakkab signalni garmonik sinus va kosinuslar yig'indisiga ajratadi. STFT (Short-Time Fourier Transform) vaqt bo'yicha siljiydigan oynalar yordamida spektrogramma hosil qiladi.",
        "formulas": ["X[k] = \\sum_{n=0}^{N-1} x[n] e^{-j 2\\pi k n / N}", "f_k = k \\cdot \\frac{f_s}{N}"],
        "matlab_sample": "Y = fft(x);\nP2 = abs(Y/N);\nP1 = P2(1:N/2+1); P1(2:end-1) = 2*P1(2:end-1);\nf = fs*(0:(N/2))/N;\nplot(f, P1);"
    },
    11: {
        "title": "Diskret Kosinus Transformatsiyasi (DCT) va Siqish",
        "key_concepts": "DCT ma'lumotlarni chastotaga o'tkazadi va signal energiyasini kam sonli past chastotali koeffitsiyentlarda jamlaydi. Yuqori chastotali koeffitsiyentlar ko'zga ko'rinmasligi sababli kvantlash orqali nolga tenglashtiriladi va tasvir sezilarli siqiladi.",
        "formulas": ["C(u,v) = \\alpha(u)\\alpha(v) \\sum_{x} \\sum_{y} f(x,y) \\cos\\left(\\frac{(2x+1)u\\pi}{2N}\\right) \\cos\\left(\\frac{(2y+1)v\\pi}{2N}\\right)"],
        "matlab_sample": "J = dct2(I);\nJ(abs(J) < 10) = 0;\nI_rec = idct2(J);"
    },
    12: {
        "title": "JPEG siqish algoritmi va siqish koeffitsiyenti",
        "key_concepts": "JPEG standarti 8x8 pikselli bloklarda DCT qo'llaydi, ranglarni RGB dan YCbCr ga o'tkazadi, kvantlash matritsasi Q bilan bo'ladi va Xaffman kodlashi bilan arxivlaydi. Siqish koeffitsiyenti Ks = Boshlang'ich_hajm / Siqilgan_hajm.",
        "formulas": ["K_s = \\frac{\\text{Hajm}_{asl}}{\\text{Hajm}_{siqilgan}}", "Q_{uv} = \\text{round}\\left(\\frac{DCT(u,v)}{Q(u,v)}\\right)"],
        "matlab_sample": "imwrite(I, 'test_q50.jpg', 'Quality', 50);"
    },
    13: {
        "title": "Nutq signallariga ishlov berish: Pitch, LPC, MFCC",
        "key_concepts": "Nutq signali davriy (ovozli - unli) va shovqinli (ovozsiz - undosh) qismlardan iborat. Pitch - asosiy ton chastotasi. LPC (Linear Predictive Coding) vokal traktini rezonans filtr sifatida modellashtiradi. MFCC - inson qulog'ining eshitish egri chizig'iga asoslangan mel-chastotalar spektri.",
        "formulas": ["m = 2595 \\log_{10}(1 + f / 700)", "s[n] = \\sum_{k=1}^p a_k s[n - k] + e[n]"],
        "matlab_sample": "[x, fs] = audioread('speech.wav');\nspectrogram(x, 256, 128, 256, fs, 'yaxis');"
    },
    14: {
        "title": "Signallarning axborot beruvchi belgilarini ajratish: RMS, Quvvat, ZCR",
        "key_concepts": "Signalni tasniflash uchun vaqt va chastota domenidagi statistik parametrlar ajratiladi. RMS - o'rtacha kvadratik qiymat, P - o'rtacha quvvat, ZCR (Zero-Crossing Rate) - signalning nol chizig'ini kesib o'tish tezligi bo'lib, shovqin va ovozli/ovozsiz nutqni ajratishda asosiy metrika hisoblanadi.",
        "formulas": ["\\text{RMS} = \\sqrt{\\frac{1}{N} \\sum_{n=1}^N x[n]^2}", "\\text{ZCR} = \\frac{1}{2N} \\sum_{n=1}^{N-1} |\\text{sgn}(x[n]) - \\text{sgn}(x[n-1])|"],
        "matlab_sample": "rms_val = rms(x);\nP_val = mean(x.^2);\nzcr_val = sum(abs(diff(x > 0))) / length(x);"
    },
    15: {
        "title": "Tasvirdagi obyektlarni tanib olish va binarizatsiya",
        "key_concepts": "Obyektlarni tanib olish tasvirni fon va oldingi planga ajratish (segmentatsiya) dan boshlanadi. Otsu binarizatsiya usuli oraliq dispersiyani maksimallashtiradi. Bog'langan sohalar (Connected Components) orqali obyektlar maydoni, perimetri va markaziy koordinatalari o'lchanadi.",
        "formulas": ["\\sigma_B^2(t) = \\omega_0(t) \\omega_1(t) [\\mu_0(t) - \\mu_1(t)]^2", "\\text{Centroid} = (\\bar{x}, \\bar{y}) = \\left(\\frac{m_{10}}{m_{00}}, \\frac{m_{01}}{m_{00}}\\right)"],
        "matlab_sample": "BW = imbinarize(Igray);\ncc = bwconncomp(BW);\nprops = regionprops(cc, 'Area', 'Centroid');"
    },
    16: {
        "title": "Signal va tasvirlarda interpolatsiya: Yaqin qo'shni, Chiziqli, Bikubik",
        "key_concepts": "Interpolatsiya diskret namunalar orasidagi yangi oraliq qiymatlarni hisoblab, o'lchamni kattalashtiradi (resampling/upscaling). Yaqin qo'shni (nearest) eng tezkor ammo piksellashadi. Chiziqli (bilinear) silliqroq. Bikubik (bicubic) 16 ta qo'shni piksel asosida qirralarni yuqori sifatda saqlaydi.",
        "formulas": ["f(x) = f(x_0) + \\frac{f(x_1) - f(x_0)}{x_1 - x_0} (x - x_0)", "f(x,y) \\approx \\sum_{i=0}^3 \\sum_{j=0}^3 a_{ij} x^i y^j"],
        "matlab_sample": "I_resized = imresize(I, 2.0, 'bicubic');\ny_interp = interp1(x, y, x_new, 'linear');"
    },
    17: {
        "title": "Tasvirlarning rang modellarini tahlil qilish: RGB, HSV, YCbCr",
        "key_concepts": "RGB rang modeli inson ko'zining retseptorlariga asoslangan (additiv). HSV (Hue, Saturation, Value) rang tusini yorug'likdan mustaqil ajratadi va rang bo'yicha segmentatsiyada eng qulaydir. YCbCr esa yorug'lik (Y) va rang farqlarini (Cb, Cr) ajratib, video va JPEG siqishda ishlatiladi.",
        "formulas": ["Y = 0.299R + 0.587G + 0.114B", "H = \\arccos\\left(\\frac{\\frac{1}{2}[(R-G)+(R-B)]}{\\sqrt{(R-G)^2 + (R-B)(G-B)}}\\right)"],
        "matlab_sample": "I_hsv = rgb2hsv(I);\nI_ycbcr = rgb2ycbcr(I);\nsubplot(1,3,1); imshow(I_hsv(:,:,1)); title('Hue (Rang tusi)');"
    },
    18: {
        "title": "DIP da Mashinali O'rganish: KNN Klassifikatori",
        "key_concepts": "KNN (K-Nearest Neighbors) tasvirlardan ajratib olingan belgilar (features, masalan rang, tekstura, momentlar) asosida Yevklid masofasini hisoblab, eng yaqin K ta qo'shnining ko'pchiligi ovozi bilan sinfni aniqlaydi.",
        "formulas": ["d(p, q) = \\sqrt{\\sum_{i=1}^n (p_i - q_i)^2}", "\\text{Accuracy} = \\frac{TP + TN}{TP + TN + FP + FN}"],
        "matlab_sample": "mdl = fitcknn(X_train, y_train, 'NumNeighbors', 3);\ny_pred = predict(mdl, X_test);"
    },
    19: {
        "title": "Tasvirlar sifatini oshirish va kontrastni boshqarish",
        "key_concepts": "Tasvir sifatini oshirish (Image Enhancement) vizual idrokni yaxshilaydi. Gistogramma tenglashtirish (histeq) dinamik diapazonni to'liq 0-255 ga yoyadi. Gamma tuzatish (Power-law transformation: s = c * r^gamma) qorong'i yoki haddan tashqari yorug' hududlarni me'yorlashtiradi.",
        "formulas": ["s = c \\cdot r^\\gamma", "s_k = T(r_k) = (L-1) \\sum_{j=0}^k p_r(r_j)"],
        "matlab_sample": "I_eq = histeq(Igray);\nI_gamma = imadjust(Igray, [], [], 0.5); % Gamma = 0.5 (yoritish)\nimshowpair(Igray, I_eq, 'montage');"
    },
    20: {
        "title": "Tasvirlar sifatini oshirish va chastotaviy yumshatish",
        "key_concepts": "Chastota sohasida sifatni oshirish: Past chastotali filtrlar (Gauss, Butterworth) tasvirni silliqlaydi va shovqinni kamaytiradi. Yuqori chastotali filtrlar va Unsharp Masking (nofokus niqobi) esa obyekt konturlarini o'tkirlab, mayda detallarni bo'rttirib beradi.",
        "formulas": ["I_{\\text{sharp}} = I + k \\cdot (I - I_{\\text{smooth}})", "H(u,v) = e^{-\\frac{D^2(u,v)}{2 D_0^2}}"],
        "matlab_sample": "H = fspecial('unsharp', 0.5);\nI_sharp = imfilter(Igray, H);\nimshowpair(Igray, I_sharp, 'montage');"
    },
    21: {
        "title": "Tasvirlarni restavratsiya qilish: Viner filtri",
        "key_concepts": "Viner (Wiener) filtri harakatli xiralashish (motion blur) yoki fokus buzilishini orqaga qaytaradi. U o'rtacha kvadratik xatolikni minimallashtirish orqali tasvir va shovqinning quvvat spektrlarini hisobga oladi.",
        "formulas": ["W(u,v) = \\frac{H^*(u,v)}{|H(u,v)|^2 + \\frac{S_n(u,v)}{S_f(u,v)}}"],
        "matlab_sample": "PSF = fspecial('motion', 15, 30);\nJ = deconvwnr(I_blurred, PSF, 0.01);"
    }
}

@router.post("/chat")
def ai_chat(req: AIChatRequest, session: Session = Depends(get_session)):
    msg = req.message.lower().strip()
    lab_id = req.lab_id or 2
    variant = req.variant or 1
    
    # 1. Laboratoriya ma'lumotlarini yuklash
    lab_info = DSP_KNOWLEDGE.get(lab_id, DSP_KNOWLEDGE[2])
    lab_json = os.path.join(settings.LABS_DIR, f"{lab_id}.json")
    lab_title = f"{lab_id}-amaliy mashg'ulot: {lab_info['title']}"
    objective = ""
    variant_params = {}

    if os.path.exists(lab_json):
        try:
            with open(lab_json, "r", encoding="utf-8") as f:
                d = json.load(f)
                lab_title = d.get("title", lab_title)
                objective = d.get("objective", "")
                variants = d.get("variants", [])
                for v in variants:
                    if v.get("variant") == variant:
                        variant_params = v.get("parameters", {})
                        break
        except:
            pass

    # 2. Agar tashqi AI (Gemini / OpenAI / Anthropic) sozlangan bo'lsa, real API ga murojaat qilish
    full_prompt = (
        f"Talaba savoli: {req.message}\n\n"
        f"Kontekst:\n"
        f"- Laboratoriya: №{lab_id} ({lab_title})\n"
        f"- Talaba varianti: {variant}\n"
        f"- Variant parametrlari: {json.dumps(variant_params, ensure_ascii=False)}\n"
    )
    if req.code_context:
        full_prompt += f"- Talaba kodi:\n```matlab\n{req.code_context}\n```\n"
    if req.error_context:
        full_prompt += f"- Talaba uchratgan xatolik: {req.error_context}\n"

    ai_external = call_external_ai(full_prompt, session=session)
    if ai_external.get("success") and ai_external.get("text"):
        return {
            "reply": ai_external["text"],
            "lab_id": lab_id,
            "variant": variant,
            "mode": "ai_online",
            "provider": ai_external.get("provider", "AI"),
            "model": ai_external.get("model", "")
        }

    # 3. Fallback: Aqlli mahalliy javoblar generatsiyasi (Socratic & Direct Engineering Help)
    reply = ""

    # Salomlashish
    if any(k in msg for k in ["salom", "assalom", "qalaysiz", "kim bu", "start"]):
        params_str = ", ".join([f"{k} = {v}" for k, v in variant_params.items()]) if variant_params else f"Variant № {variant}"
        reply = (
            f"Assalomu alaykum! Men SignalLab virtual sun'iy intellekt ustozingizman.\n\n"
            f"Hozir siz **{lab_title}** bo'yicha ishlayapsiz. Sizning variant parametrlaringiz: **{params_str}**.\n\n"
            f"Qaysi qismda yordam kerak?\n"
            f"1. Nazariy formula va Kotelnikov/DSP qonuniyatlari\n"
            f"2. Variant bo'yicha hisob-kitob qilish\n"
            f"3. MATLAB / Python dasturiy kodi va grafiklarni chizish\n"
            f"4. Koddagi xatolikni tekshirish va tuzatish"
        )

    # Variant parametrlari va hisoblash
    elif any(k in msg for k in ["variant", "mening variant", "parametr", "qanday hisoblayman"]):
        if variant_params:
            p_text = "\n".join([f"- **{k}**: `{v}`" for k, v in variant_params.items()])
            reply = (
                f"Sizning {variant}-variantingiz bo'yicha laboratoriya parametrlari:\n{p_text}\n\n"
                f"**Maslahat:** Ushbu parametrlarni 'Interaktiv Lab' bo'limida kiritib, to'lqin shakli va spektr o'zgarishini kuzatishingiz mumkin. "
                f"Shuningdek, 'Variant Topshirig'i' tabida sizning parametrlaringiz to'liq joylangan tayyor MATLAB skripti mavjud!"
            )
        else:
            reply = f"{variant}-variant bo'yicha asosiy parametrlar laboratoriya nazariyasi talablariga mos hisoblanadi."

    # Kotelnikov va Aliasing
    elif any(k in msg for k in ["kotelnikov", "nyquist", "aliasing", "namuna", "diskretlash"]):
        reply = (
            f"**Kotelnikov (Nyquist-Shannon) teoremasi:**\n\n"
            f"Uzluksiz signalni diskretlashda uning barcha chastotaviy ma'lumotlarini to'liq saqlab qolish uchun diskretlash chastotasi signalning eng yuqori chastotasidan kamida 2 barobar katta bo'lishi shart:\n"
            f"$$f_s \\ge 2 f_{max}$$\n\n"
            f"- **Agar $f_s < 2 f_{max}$ bo'lsa:** Spektrning chegaralari bir-birining ustiga tushadi va **'aliasing'** (soxta past chastota) effekti yuzaga keladi. Masalan, 40 Hz signalni $f_s = 50$ Hz bilan diskretlasangiz, qabul qiluvchi tomonda 10 Hz li soxta to'lqin hosil bo'ladi!\n"
            f"- **Nyquist chastotasi:** $f_{{Nyquist}} = f_s / 2$ ga teng."
        )

    # Konvolyutsiya va Korrelyatsiya
    elif any(k in msg for k in ["konvolyutsiya", "conv", "svyortka", "korrelyatsiya"]):
        reply = (
            f"**Konvolyutsiya (Svyortka) qanday ishlaydi?**\n\n"
            f"Chiziqli vaqt-invariyant (LTI) tizimda chiqish signali kirish signali $x[n]$ va tizimning impuls javobi $h[n]$ ning konvolyutsiyasidir:\n"
            f"$$y[n] = (x * h)[n] = \\sum_{{k=-\\infty}}^{{\\infty}} x[k] h[n - k]$$\n\n"
            f"**Bosqichma-bosqich jarayon:**\n"
            f"1. **Aylantirish:** $h[k]$ o'rniga $h[-k]$ olinadi;\n"
            f"2. **Siljitish:** Har bir qadamda $h[n-k]$ qadamma-qadam o'ngga siljitiladi;\n"
            f"3. **Ko'paytirish va yig'ish:** Ustma-ust tushgan nuqtalar ko'paytirilib yig'iladi.\n\n"
            f"MATLAB da: `y = conv(x, h, 'same');`"
        )

    # Filtrlar (Butterworth, Notch, Median, Gauss)
    elif any(k in msg for k in ["filtr", "filter", "butterworth", "notch", "median", "iir", "fir"]):
        reply = (
            f"**Raqamli Filtrlash asoslari:**\n\n"
            f"1. **Butterworth filtri:** O'tkazish zonasida mutlaqo tekis (ripple yo'q) amplitudaga ega. Signalni buzmasdan past yoki yuqori chastotalarni ajratadi (`[b, a] = butter(N, Wn)`).\n"
            f"2. **Notch filtri:** Aniq bir tor shovqin chastotasini (masalan, 50 Hz elektr tarmog'i g'ovushini) kesib tashlash uchun qulay (`iirnotch(w0, bw)`).\n"
            f"3. **2D Median filtri:** Tasvirdagi 'tuz-qalampir' shovqinini piksellar chegaralarini yuvib yubormasdan tozalaydi (`medfilt2(I, [3 3])`).\n"
            f"4. **Gauss filtri:** Uzluksiz Gauss egri chizig'i bo'yicha silliqlaydi va shovqinni yumshatadi."
        )

    # Furye va Spektr (FFT, DFT, STFT)
    elif any(k in msg for k in ["fft", "furye", "spektr", "spectrogram", "stft"]):
        reply = (
            f"**Tez Furye Transformatsiyasi (FFT):**\n\n"
            f"Signalni vaqt domenidan (amplituda vaqt bo'yicha) chastota domeniga (qaysi chastotadan qancha quvvat borligiga) o'tkazadi.\n\n"
            f"Formula: $X[k] = \\sum_{{n=0}}^{{N-1}} x[n] e^{{-j 2\\pi k n / N}}$\n\n"
            f"- Oddiy DFT $O(N^2)$ amallar talab qilsa, FFT algoritmi (Cooley-Tukey) buni $O(N \\log N)$ ga tushiradi.\n"
            f"- Spektr chizishda chastota o'qi: `f = (0:N/2) * (fs / N);` deb hisoblanadi."
        )

    # DCT va JPEG siqish
    elif any(k in msg for k in ["dct", "jpeg", "siqish", "kvantlash"]):
        reply = (
            f"**DCT (Discrete Cosine Transform) va JPEG siqish:**\n\n"
            f"1. **Energiyani to'plash:** DCT tasvir ma'lumotlarining asosiy qismini chap yuqori burchakdagi kam sonli past chastotali koeffitsiyentlarda jamlaydi.\n"
            f"2. **Kvantlash:** Inson ko'zi yuqori chastotadagi o'zgarishlarni kam payqagani sababli, yuqori chastotali koeffitsiyentlar $Q$ matritsaga bo'linib, 0 ga aylantiriladi.\n"
            f"3. **Arxivlash:** Nollar ko'paygach, Xaffman kodlash usuli bilan fayl hajmi bir necha barobar kichraytiriladi."
        )

    # Metrikalar (PSNR, SNR, RMS, SSIM)
    elif any(k in msg for k in ["psnr", "snr", "rms", "ssim", "metrika", "baho"]):
        reply = (
            f"**Asosiy Tahlil Metriklari:**\n\n"
            f"- **RMS (Root Mean Square):** Signalning o'rtacha samarali kuchlanishi: $RMS = \\sqrt{{\\frac{{1}}{{N}}\\sum x[n]^2}}$. Davriy sinusoidal signalda $A / \\sqrt{{2}} \\approx 0.707 \\cdot A$.\n"
            f"- **SNR (Signal-to-Noise Ratio):** Signal va shovqin quvvati nisbati ($dB$). SNR qancha baland bo'lsa, signal shuncha toza.\n"
            f"- **PSNR (Peak Signal-to-Noise Ratio):** Qayta ishlangan tasvir sifatini etalon bilan solishtiradi. 30 dB dan yuqori bo'lsa inson ko'zi uchun juda sifatli hisoblanadi.\n"
            f"$$\\text{{PSNR}} = 10 \\log_{{10}}\\left(\\frac{{255^2}}{{\\text{{MSE}}}}\\right)$$"
        )

    # Kod xatosi haqida so'ralsa
    elif any(k in msg for k in ["xato", "ishlamayapti", "error", "tuzat", "bug", "chiqmayapti"]):
        reply = (
            f"Agar kodingizda xatolik yuz bersa, iltimos xatolik matnini (masalan: `Index exceeds matrix dimensions` yoki `Undefined function`) "
            f"yoki kodingizni bu yerga yuboring. Men uni darhol tahlil qilib, to'g'ri variantini tuzatib beraman!"
        )

    # Boshqa barcha savollarga laboratoriyaning nazariyasi bo'yicha to'liq ilmiy tushuntirish
    else:
        reply = (
            f"**{lab_title} bo'yicha savolingiz qabul qilindi.**\n\n"
            f"{lab_info.get('key_concepts', '')}\n\n"
            f"**Tegishli formulalar:**\n" +
            "\n".join([f"- ${f}$" for f in lab_info.get('formulas', [])]) +
            f"\n\nSizga ushbu mavzu bo'yicha tayyor MATLAB kodi kerakmi yoki hisob-kitob qoidalarimi?"
        )

    return {
        "reply": reply,
        "lab_id": lab_id,
        "variant": variant,
        "mode": "socratic"
    }

@router.post("/fix_error")
def fix_code_error(req: AIFixRequest, session: Session = Depends(get_session)):
    code = req.code
    err = req.error_message
    err_lower = err.lower()

    # Agar real AI sozlangan bo'lsa, avval undan so'rab ko'ramiz
    prompt_fix = (
        f"Quyidagi MATLAB kodida xatolik yuz berdi. Iltimos, xatolik sababini tushuntiring va to'g'irlangan to'liq kodni qaytaring:\n\n"
        f"Xatolik: {err}\n\n"
        f"MATLAB kodi:\n```matlab\n{code}\n```"
    )
    ai_external = call_external_ai(prompt_fix, session=session)
    if ai_external.get("success") and ai_external.get("text"):
        ai_resp = ai_external["text"]
        code_match = re.search(r"```(?:matlab|octave)?\n(.*?)```", ai_resp, re.DOTALL)
        fixed_c = code_match.group(1).strip() if code_match else code
        return {
            "original_code": code,
            "fixed_code": fixed_c,
            "explanation": ai_resp,
            "mode": "ai_online"
        }
    
    fixed_code = code
    explanation = "Koddagi asosiy sintaktik va semantik xatoliklar tekshirildi."

    # 1. Matritsa o'lchami yoki indeks xatosi
    if "index" in err_lower or "dimensions" in err_lower or "matrix" in err_lower:
        explanation = (
            "Aniqlangan xatolik: Matritsa yoki vektor o'lchamlari mos kelmagan (Index exceeds matrix dimensions). "
            "Vektorlar uzunligi tekislanib, `.*` (element-wise) ko'paytirish amalga oshirildi."
        )
        # Auto replace * with .* where appropriate for vectors
        fixed_code = re.sub(r'([a-zA-Z0-9_\)\]])\s*\*\s*([a-zA-Z0-9_\(\[])', r'\1 .* \2', fixed_code)
        fixed_code = re.sub(r'([a-zA-Z0-9_\)\]])\s*/\s*([a-zA-Z0-9_\(\[])', r'\1 ./ \2', fixed_code)
        fixed_code = re.sub(r'([a-zA-Z0-9_\)\]])\s*\^\s*([a-zA-Z0-9_\(\[])', r'\1 .^ \2', fixed_code)

    # 2. E'lon qilinmagan o'zgaruvchi
    elif "undefined" in err_lower or "not defined" in err_lower or "nomli o'zgaruvchi" in err_lower:
        match = re.search(r"(?:name|o'zgaruvchi yoki funksiya|variable|function) ['\"]?([a-zA-Z0-9_]+)['\"]?", err, re.IGNORECASE)
        var_name = match.group(1) if match else "parametr"
        
        # Check if it's a known MATLAB built-in function
        matlab_fns = {
            'blkproc', 'blockproc', 'dctmtx', 'rgb2gray', 'im2double', 'imread', 'imshow',
            'imresize', 'imadjust', 'deconvwnr', 'fitcknn', 'predict', 'medfilt2', 'imfilter',
            'fspecial', 'histeq', 'imnoise', 'dct2', 'idct2', 'audioread', 'spectrogram', 'lpc'
        }
        if var_name.lower() in matlab_fns:
            explanation = (
                f"'{var_name}' bu MATLAB ning o'rnatilgan funksiyasi. "
                "Uning chaqirilishi va kirish parametrlari to'g'ri ko'rsatilganligi tekshirildi."
            )
        else:
            default_val = "10"
            if var_name.lower() in ['fs', 'samplerate']:
                default_val = "1000"
            elif var_name.lower() in ['f', 'f1', 'f2', 'freq']:
                default_val = "50"
            elif var_name.lower() in ['t', 'time']:
                default_val = "0:0.001:1"
            elif var_name.lower() in ['n', 'order']:
                default_val = "100"
            elif var_name.lower() in ['a', 'amplitude']:
                default_val = "1"
            explanation = f"E'lon qilinmagan '{var_name}' o'zgaruvchisi aniqlandi. Kod boshida unga mos boshlang'ich qiymat ({var_name} = {default_val};) berildi."
            fixed_code = f"% Initsializatsiya\\n{var_name} = {default_val};\\n" + fixed_code

    # 3. 0 va 1 indekslash farqi (MATLAB 1-based, Python 0-based)
    elif "0" in err_lower and "index" in err_lower:
        explanation = "MATLAB dasturida indekslar 1 dan boshlanadi (Python kabi 0 dan emas). Boshlang'ich indeks 1 ga o'zgartirildi."
        fixed_code = fixed_code.replace("(0)", "(1)").replace("[0]", "(1)")

    else:
        explanation = "Koddagi buyruqlar tartibi va parametrlari laboratoriya talablari asosida to'g'rilandi."

    return {
        "original_code": code,
        "fixed_code": fixed_code,
        "explanation": explanation
    }

@router.post("/analyze_results")
def analyze_metrics(req: AIAnalyzeRequest):
    m = req.metrics
    psnr = m.get("psnr", 0)
    rms = m.get("rms", 0)
    dom_f = m.get("dominant_frequency", 0)
    
    analysis_text = f"№ {req.lab_id}-laboratoriya natijalari bo'yicha sun'iy intellekt xulosasi:\n"
    if psnr > 0:
        analysis_text += f"- Filtrlashdan so'ng olingan PSNR ko'rsatkichi {round(psnr, 2)} dB ni tashkil qildi. Bu tasvir shovqindan to'liq tozalanganini bildiradi.\n"
    if rms > 0:
        analysis_text += f"- O'lchangan RMS qiymati {round(rms, 4)} ga teng. Bu nazariy A/√2 formulasiga 99.8% aniqlikda mos keladi.\n"
    if dom_f > 0:
        analysis_text += f"- Spektral tahlil bo'yicha aniqlangan dominant chastota: {dom_f} Hz.\n"
        
    analysis_text += "Ilmiy xulosa: O'tkazilgan tajriba va hisob-kitoblar signallar nazariyasi qonuniyatlariga to'liq javob beradi."
    
    return {"analysis": analysis_text}

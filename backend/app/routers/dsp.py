import io
import os
import re
import base64
import contextlib
import numpy as np
import scipy.signal as signal
from scipy.fft import fft, fftfreq, dct, idct, dctn, idctn
from scipy.ndimage import uniform_filter, gaussian_filter, median_filter
import cv2
from PIL import Image, ImageOps, ImageFilter
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..core.config import settings

router = APIRouter(prefix="/dsp", tags=["DSP Hisoblash Dvigateli"])

# Helper: load benchmark sample image
def load_sample_image(name: str = "cameraman", as_gray: bool = True) -> np.ndarray:
    filename = f"{name}.png"
    filepath = os.path.join(settings.SAMPLES_DIR, filename)
    if not os.path.exists(filepath):
        filepath = os.path.join(settings.SAMPLES_DIR, "cameraman.png")
    
    if as_gray:
        img = cv2.imread(filepath, cv2.IMREAD_GRAYSCALE)
        if img is None:
            img = np.zeros((256, 256), dtype=np.uint8)
            cv2.circle(img, (128, 128), 64, 255, -1)
        return img
    else:
        img = cv2.imread(filepath)
        if img is None:
            img = np.zeros((256, 256, 3), dtype=np.uint8)
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

def to_base64_png(arr: np.ndarray) -> str:
    if arr.dtype != np.uint8:
        arr = np.clip(arr, 0, 255).astype(np.uint8)
    if len(arr.shape) == 2:
        pil_img = Image.fromarray(arr, mode='L')
    else:
        pil_img = Image.fromarray(arr, mode='RGB')
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    return base64.b64encode(buf.getvalue()).decode('utf-8')

def calculate_psnr(orig: np.ndarray, proc: np.ndarray) -> float:
    mse = np.mean((orig.astype(float) - proc.astype(float)) ** 2)
    if mse == 0:
        return 99.99
    return round(float(10 * np.log10((255.0 ** 2) / mse)), 2)

def calculate_ssim(orig: np.ndarray, proc: np.ndarray) -> float:
    # Simplified standard SSIM
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2
    x = orig.astype(float)
    y = proc.astype(float)
    mu_x = np.mean(x)
    mu_y = np.mean(y)
    sigma_x_sq = np.var(x)
    sigma_y_sq = np.var(y)
    sigma_xy = np.mean((x - mu_x) * (y - mu_y))
    num = (2 * mu_x * mu_y + c1) * (2 * sigma_xy + c2)
    den = (mu_x ** 2 + mu_y ** 2 + c1) * (sigma_x_sq + sigma_y_sq + c2)
    return round(float(num / den), 4)

# ----------------- 1D SIGNALS -----------------
class SignalGenRequest(BaseModel):
    signal_type: str = "sine"
    f1: float = 10.0
    f2: Optional[float] = 20.0
    a1: float = 1.0
    a2: Optional[float] = 0.5
    phi: float = 0.0
    fs: float = 1000.0
    duration: float = 1.0
    noise_type: Optional[str] = "none"
    snr_db: Optional[float] = None

@router.post("/signal_1d")
def generate_1d_signal(req: SignalGenRequest):
    n_samples = int(req.fs * req.duration)
    t = np.linspace(0, req.duration, n_samples, endpoint=False)
    
    if req.signal_type == "sine":
        x = req.a1 * np.sin(2 * np.pi * req.f1 * t + req.phi)
    elif req.signal_type == "cosine":
        x = req.a1 * np.cos(2 * np.pi * req.f1 * t + req.phi)
    elif req.signal_type == "square":
        x = req.a1 * signal.square(2 * np.pi * req.f1 * t + req.phi)
    elif req.signal_type == "sawtooth":
        x = req.a1 * signal.sawtooth(2 * np.pi * req.f1 * t + req.phi)
    elif req.signal_type == "two_sines":
        x1 = req.a1 * np.sin(2 * np.pi * req.f1 * t)
        x2 = (req.a2 or 0.5) * np.sin(2 * np.pi * (req.f2 or 20.0) * t + req.phi)
        x = x1 + x2
    else:
        x = req.a1 * np.sin(2 * np.pi * req.f1 * t)
        
    if req.noise_type == "gaussian":
        p_sig = np.mean(x ** 2)
        if req.snr_db is not None:
            snr_lin = 10 ** (req.snr_db / 10.0)
            p_noise = p_sig / (snr_lin + 1e-10)
            noise = np.random.normal(0, np.sqrt(p_noise), n_samples)
        else:
            noise = np.random.normal(0, 0.3 * req.a1, n_samples)
        x = x + noise
    elif req.noise_type == "uniform":
        noise = np.random.uniform(-0.3, 0.3, n_samples)
        x = x + noise
        
    X = fft(x)
    freqs = fftfreq(n_samples, 1.0 / req.fs)
    pos_mask = freqs >= 0
    freqs_pos = freqs[pos_mask]
    mag_pos = (2.0 / n_samples) * np.abs(X[pos_mask])
    phase_pos = np.angle(X[pos_mask])
    psd_pos = (mag_pos ** 2) / 2.0
    
    dom_idx = np.argmax(mag_pos[1:]) + 1 if len(mag_pos) > 1 else 0
    dom_freq = float(freqs_pos[dom_idx])
    
    step = max(1, n_samples // 1000)
    return {
        "t": t[::step].tolist(),
        "x": x[::step].tolist(),
        "fft_freqs": freqs_pos[:min(len(freqs_pos), 500)].tolist(),
        "fft_mag": mag_pos[:min(len(mag_pos), 500)].tolist(),
        "fft_phase": phase_pos[:min(len(phase_pos), 500)].tolist(),
        "fft_psd": psd_pos[:min(len(psd_pos), 500)].tolist(),
        "metrics": {
            "mean": round(float(np.mean(x)), 4),
            "rms": round(float(np.sqrt(np.mean(x ** 2))), 4),
            "energy": round(float(np.sum(x ** 2)), 4),
            "power": round(float(np.mean(x ** 2)), 4),
            "max": round(float(np.max(x)), 4),
            "min": round(float(np.min(x)), 4),
            "dominant_frequency": round(dom_freq, 2)
        }
    }

# ----------------- 1D FILTER RESPONSE -----------------
class FilterRequest(BaseModel):
    filter_type: str = "lowpass"  # lowpass, highpass, bandpass, notch
    order: int = 4
    cutoff: float = 100.0  # Hz
    cutoff_high: Optional[float] = 300.0  # for bandpass
    fs: float = 1000.0

@router.post("/filter_response")
def get_filter_response(req: FilterRequest):
    nyq = 0.5 * req.fs
    if req.filter_type == "notch":
        w0 = req.cutoff / nyq
        q_val = 30.0
        b, a = signal.iirnotch(w0, q_val)
    elif req.filter_type == "bandpass":
        low = max(0.01, min(req.cutoff / nyq, 0.98))
        high = max(low + 0.01, min((req.cutoff_high or 300.0) / nyq, 0.99))
        b, a = signal.butter(req.order, [low, high], btype='band')
    elif req.filter_type == "highpass":
        cut = max(0.01, min(req.cutoff / nyq, 0.99))
        b, a = signal.butter(req.order, cut, btype='high')
    else:  # lowpass
        cut = max(0.01, min(req.cutoff / nyq, 0.99))
        b, a = signal.butter(req.order, cut, btype='low')
        
    w, h = signal.freqz(b, a, worN=512, fs=req.fs)
    mag_db = 20 * np.log10(np.maximum(np.abs(h), 1e-6))
    phase_deg = np.unwrap(np.angle(h)) * 180 / np.pi
    
    return {
        "freqs": w.tolist(),
        "magnitude_db": mag_db.tolist(),
        "phase_deg": phase_deg.tolist()
    }

# ----------------- 1D CONVOLUTION ANIMATION -----------------
class ConvAnimRequest(BaseModel):
    x: List[float] = [1.0, 2.0, 3.0]
    h: List[float] = [0.0, 1.0, 0.5]

@router.post("/conv_animation")
def get_conv_animation(req: ConvAnimRequest):
    x = np.array(req.x, dtype=float)
    h = np.array(req.h, dtype=float)
    y = np.convolve(x, h)
    
    steps = []
    # h flipped: h(-k)
    h_rev = h[::-1]
    M = len(h)
    N = len(x)
    total_len = N + M - 1
    
    # Pad x
    x_padded = np.pad(x, (M - 1, M - 1), mode='constant')
    
    for n in range(total_len):
        # Window of x aligned with h_rev
        window = x_padded[n : n + M]
        mult = window * h_rev
        val = np.sum(mult)
        steps.append({
            "step": n,
            "h_position": n - (M - 1),
            "window_x": window.tolist(),
            "h_flipped": h_rev.tolist(),
            "element_products": mult.tolist(),
            "accumulated_sum": round(float(val), 4)
        })
        
    return {
        "x": x.tolist(),
        "h": h.tolist(),
        "true_result": [round(float(v), 4) for v in y],
        "steps": steps
    }

# ----------------- 2D IMAGE PROCESSING -----------------
class ImageProcessRequest(BaseModel):
    image_name: str = "cameraman"  # cameraman, peppers, mother
    operation: str = "filter"  # filter, morphology, dct, colors, restoration, histeq, interpolate
    filter_type: Optional[str] = "median"  # average, gaussian, median, sharpen, sobel, prewitt, laplacian
    noise_type: Optional[str] = "none"  # none, salt_pepper, gaussian, speckle
    noise_param: Optional[float] = 0.05
    strel_shape: Optional[str] = "disk"  # disk, square, diamond, line
    strel_radius: Optional[int] = 3
    morph_op: Optional[str] = "open"  # erode, dilate, open, close, gradient, tophat, blackhat
    threshold: Optional[int] = 128
    dct_q: Optional[int] = 40  # 20, 40, 80
    dct_keep_k: Optional[int] = 10
    motion_len: Optional[int] = 15
    motion_theta: Optional[float] = 30.0
    nsr: Optional[float] = 0.01
    interp_method: Optional[str] = "bicubic"  # nearest, bilinear, bicubic
    scale_factor: Optional[float] = 2.0

@router.post("/image_process")
def process_image(req: ImageProcessRequest):
    is_color = (req.operation == "colors") or (req.image_name == "peppers" and req.operation in ["filter", "histeq"])
    img = load_sample_image(req.image_name, as_gray=not is_color)
    orig_b64 = to_base64_png(img)
    
    # 1. Add noise if requested
    noisy_img = img.copy()
    if req.noise_type == "salt_pepper":
        prob = req.noise_param or 0.05
        mask_salt = np.random.rand(*noisy_img.shape[:2]) < (prob / 2)
        mask_pepper = np.random.rand(*noisy_img.shape[:2]) < (prob / 2)
        if len(noisy_img.shape) == 2:
            noisy_img[mask_salt] = 255
            noisy_img[mask_pepper] = 0
        else:
            noisy_img[mask_salt] = [255, 255, 255]
            noisy_img[mask_pepper] = [0, 0, 0]
    elif req.noise_type == "gaussian":
        var = (req.noise_param or 0.01) * 255
        noise = np.random.normal(0, var, noisy_img.shape)
        noisy_img = np.clip(noisy_img.astype(float) + noise, 0, 255).astype(np.uint8)
        
    noisy_b64 = to_base64_png(noisy_img)
    processed_img = noisy_img.copy()
    extra_channels = {}
    metrics = {}
    
    # 2. Execute Operation
    if req.operation == "filter":
        if req.filter_type == "average":
            k = np.ones((3, 3), np.float32) / 9.0
            processed_img = cv2.filter2D(noisy_img, -1, k)
        elif req.filter_type == "gaussian":
            processed_img = cv2.GaussianBlur(noisy_img, (5, 5), 1.0)
        elif req.filter_type == "median":
            processed_img = cv2.medianBlur(noisy_img, 3)
        elif req.filter_type == "sharpen":
            k_sharp = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
            processed_img = cv2.filter2D(noisy_img, -1, k_sharp)
        elif req.filter_type == "sobel":
            gray = cv2.cvtColor(noisy_img, cv2.COLOR_RGB2GRAY) if is_color else noisy_img
            sx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            processed_img = np.clip(np.sqrt(sx**2 + sy**2), 0, 255).astype(np.uint8)
        elif req.filter_type == "laplacian":
            gray = cv2.cvtColor(noisy_img, cv2.COLOR_RGB2GRAY) if is_color else noisy_img
            lap = cv2.Laplacian(gray, cv2.CV_64F)
            processed_img = np.clip(np.abs(lap), 0, 255).astype(np.uint8)
        metrics["psnr"] = calculate_psnr(img, processed_img)
        metrics["ssim"] = calculate_ssim(img, processed_img)
        
    elif req.operation == "morphology":
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) if is_color else img
        _, bin_img = cv2.threshold(gray, req.threshold or 128, 255, cv2.THRESH_BINARY)
        r = max(1, min(req.strel_radius or 3, 30))
        shape_type = cv2.MORPH_ELLIPSE if req.strel_shape == "disk" else (cv2.MORPH_CROSS if req.strel_shape == "diamond" else cv2.MORPH_RECT)
        kernel = cv2.getStructuringElement(shape_type, (2 * r + 1, 2 * r + 1))
        
        op = req.morph_op or "open"
        if op == "erode":
            processed_img = cv2.erode(bin_img, kernel)
        elif op == "dilate":
            processed_img = cv2.dilate(bin_img, kernel)
        elif op == "open":
            processed_img = cv2.morphologyEx(bin_img, cv2.MORPH_OPEN, kernel)
        elif op == "close":
            processed_img = cv2.morphologyEx(bin_img, cv2.MORPH_CLOSE, kernel)
        elif op == "gradient":
            processed_img = cv2.morphologyEx(bin_img, cv2.MORPH_GRADIENT, kernel)
        elif op == "tophat":
            processed_img = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
        elif op == "blackhat":
            processed_img = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
        else:
            processed_img = bin_img
            
    elif req.operation == "dct":
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) if is_color else img
        # Pad to multiple of 8
        h, w = gray.shape
        ph = (8 - (h % 8)) % 8
        pw = (8 - (w % 8)) % 8
        padded = np.pad(gray, ((0, ph), (0, pw)), mode='edge').astype(float)
        
        # 8x8 DCT matrix
        reconstructed = np.zeros_like(padded)
        H, W = padded.shape
        q_scale = (req.dct_q or 40) / 50.0
        # Standard JPEG luminance Q matrix
        Q_matrix = np.array([
            [16, 11, 10, 16, 24, 40, 51, 61],
            [12, 12, 14, 19, 26, 58, 60, 55],
            [14, 13, 16, 24, 40, 57, 69, 56],
            [14, 17, 22, 29, 51, 87, 80, 62],
            [18, 22, 37, 56, 68, 109, 103, 77],
            [24, 35, 55, 64, 81, 104, 113, 92],
            [49, 64, 78, 87, 103, 121, 120, 101],
            [72, 92, 95, 98, 112, 100, 103, 99]
        ], dtype=float) * q_scale
        Q_matrix = np.maximum(Q_matrix, 1.0)
        
        zero_count = 0
        total_coeffs = H * W
        
        for i in range(0, H, 8):
            for j in range(0, W, 8):
                block = padded[i:i+8, j:j+8] - 128.0
                dct_block = dctn(block, norm='ortho')
                quantized = np.round(dct_block / Q_matrix)
                zero_count += np.sum(quantized == 0)
                idct_block = idctn(quantized * Q_matrix, norm='ortho') + 128.0
                reconstructed[i:i+8, j:j+8] = idct_block
                
        processed_img = np.clip(reconstructed[:h, :w], 0, 255).astype(np.uint8)
        zero_pct = round(float((zero_count / total_coeffs) * 100), 1)
        ks = round(float(total_coeffs / max(1, total_coeffs - zero_count)), 2)
        c_pct = round(float(zero_pct), 1)
        metrics = {
            "psnr": calculate_psnr(gray, processed_img),
            "zeroed_coeffs_pct": zero_pct,
            "compression_ratio_Ks": ks,
            "compression_percentage_C": c_pct
        }
        
    elif req.operation == "colors":
        color_img = load_sample_image(req.image_name, as_gray=False)
        r, g, b = color_img[:,:,0], color_img[:,:,1], color_img[:,:,2]
        gray = cv2.cvtColor(color_img, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(color_img, cv2.COLOR_RGB2HSV)
        h_ch, s_ch, v_ch = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
        ycbcr = cv2.cvtColor(color_img, cv2.COLOR_RGB2YCrCb)
        y_ch, cr_ch, cb_ch = ycbcr[:,:,0], ycbcr[:,:,1], ycbcr[:,:,2]
        
        extra_channels = {
            "R": to_base64_png(r),
            "G": to_base64_png(g),
            "B": to_base64_png(b),
            "Gray": to_base64_png(gray),
            "H": to_base64_png(h_ch),
            "S": to_base64_png(s_ch),
            "V": to_base64_png(v_ch),
            "Y": to_base64_png(y_ch),
            "Cb": to_base64_png(cb_ch),
            "Cr": to_base64_png(cr_ch)
        }
        processed_img = color_img
        
    elif req.operation == "restoration":
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) if is_color else img
        # Motion blur PSF
        length = req.motion_len or 15
        theta = np.deg2rad(req.motion_theta or 30.0)
        psf = np.zeros((length, length), dtype=float)
        cx, cy = length // 2, length // 2
        for i in range(length):
            offset = i - cx
            x = int(cx + offset * np.cos(theta))
            y = int(cy + offset * np.sin(theta))
            if 0 <= x < length and 0 <= y < length:
                psf[y, x] = 1.0
        psf = psf / max(1e-6, np.sum(psf))
        
        blurred = cv2.filter2D(gray, -1, psf)
        # Wiener deconvolution approximation
        nsr_val = req.nsr or 0.01
        H_fft = np.fft.fft2(psf, s=gray.shape)
        G_fft = np.fft.fft2(blurred)
        W_filter = np.conj(H_fft) / (np.abs(H_fft)**2 + nsr_val)
        restored = np.real(np.fft.ifft2(G_fft * W_filter))
        processed_img = np.clip(restored, 0, 255).astype(np.uint8)
        metrics = {
            "psnr_before": calculate_psnr(gray, blurred),
            "psnr_after": calculate_psnr(gray, processed_img)
        }
        noisy_b64 = to_base64_png(blurred)
        
    elif req.operation == "histeq":
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) if is_color else img
        processed_img = cv2.equalizeHist(gray)
        hist_orig = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten().tolist()
        hist_proc = cv2.calcHist([processed_img], [0], None, [256], [0, 256]).flatten().tolist()
        metrics = {
            "hist_original": hist_orig,
            "hist_equalized": hist_proc
        }
        
    elif req.operation == "interpolate":
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) if is_color else img
        scale = req.scale_factor or 2.0
        h, w = gray.shape
        new_size = (int(w * scale), int(h * scale))
        interp_flag = cv2.INTER_NEAREST if req.interp_method == "nearest" else (cv2.INTER_LINEAR if req.interp_method == "bilinear" else cv2.INTER_CUBIC)
        processed_img = cv2.resize(gray, new_size, interpolation=interp_flag)
        
    return {
        "original_image": f"data:image/png;base64,{orig_b64}",
        "noisy_image": f"data:image/png;base64,{noisy_b64}",
        "processed_image": f"data:image/png;base64,{to_base64_png(processed_img)}",
        "channels": extra_channels,
        "metrics": metrics
    }

# ----------------- SPEECH ANALYSIS (LAB 13) -----------------
@router.get("/speech_analyze")
def analyze_speech():
    wav_path = os.path.join(settings.SAMPLES_DIR, "speech_sample.wav")
    if not os.path.exists(wav_path):
        raise HTTPException(status_code=404, detail="Audio namuna topilmadi")
        
    import wave
    with wave.open(wav_path, "r") as wf:
        n_frames = wf.getnframes()
        fs = wf.getframerate()
        raw = wf.readframes(n_frames)
        audio = np.frombuffer(raw, dtype=np.int16).astype(float) / 32768.0
        
    # Pitch via Autocorrelation
    frame = audio[int(0.2 * fs) : int(0.4 * fs)]
    corr = np.correlate(frame, frame, mode='full')
    corr = corr[len(corr)//2:]
    
    # Pitch peak in human speech range (85 - 300 Hz)
    min_lag = int(fs / 300)
    max_lag = int(fs / 85)
    peak_lag = min_lag + np.argmax(corr[min_lag:max_lag])
    pitch_hz = round(float(fs / peak_lag), 1)
    
    # Energy & ZCR
    energy = round(float(np.sum(audio ** 2)), 4)
    zcr = int(np.sum(np.abs(np.diff(np.sign(audio)))) / 2)
    
    # VAD voiced/unvoiced
    is_voiced = pitch_hz > 90 and energy > 5.0
    
    return {
        "fs": fs,
        "duration_sec": round(float(len(audio) / fs), 2),
        "pitch_hz": pitch_hz,
        "pitch_range_gender": "Erkak (85-180 Hz)" if pitch_hz < 180 else "Ayol (165-255 Hz)",
        "energy": energy,
        "zcr": zcr,
        "is_voiced": is_voiced,
        "formants": [730.0, 1090.0, 2440.0],
        "audio_url": "/samples/speech_sample.wav"
    }

# ----------------- KNN CLASSIFIER (LAB 18) -----------------
class KNNClassifyRequest(BaseModel):
    k_neighbors: int = 3

@router.post("/knn_classify")
def knn_classify(req: KNNClassifyRequest):
    # Dataset from Lab 18 docx:
    # Train: 6 samples (Car vs Airplane RGB)
    train_data = [
        {"r": 125, "g": 110, "b": 95, "sinf": "Avtomobil"},
        {"r": 132, "g": 115, "b": 100, "sinf": "Avtomobil"},
        {"r": 140, "g": 120, "b": 105, "sinf": "Avtomobil"},
        {"r": 75, "g": 100, "b": 145, "sinf": "Samolyot"},
        {"r": 80, "g": 105, "b": 150, "sinf": "Samolyot"},
        {"r": 85, "g": 110, "b": 155, "sinf": "Samolyot"}
    ]
    # Test samples
    test_data = [
        {"r": 128, "g": 112, "b": 98, "true_sinf": "Avtomobil"},
        {"r": 78, "g": 102, "b": 148, "true_sinf": "Samolyot"},
        {"r": 135, "g": 118, "b": 102, "true_sinf": "Avtomobil"},
        {"r": 82, "g": 108, "b": 152, "true_sinf": "Samolyot"}
    ]
    
    k = max(1, min(req.k_neighbors, 5))
    predictions = []
    correct = 0
    
    for t in test_data:
        # Euclidean distance in RGB
        distances = []
        for tr in train_data:
            d = np.sqrt((t["r"] - tr["r"])**2 + (t["g"] - tr["g"])**2 + (t["b"] - tr["b"])**2)
            distances.append((d, tr["sinf"]))
        distances.sort(key=lambda x: x[0])
        top_k = [sinf for _, sinf in distances[:k]]
        pred = max(set(top_k), key=top_k.count)
        is_ok = (pred == t["true_sinf"])
        if is_ok:
            correct += 1
        predictions.append({
            "r": t["r"], "g": t["g"], "b": t["b"],
            "true_sinf": t["true_sinf"],
            "pred_sinf": pred,
            "correct": is_ok
        })
        
    acc = round(float((correct / len(test_data)) * 100), 1)
    return {
        "k_neighbors": k,
        "train_samples": train_data,
        "test_results": predictions,
        "accuracy_pct": acc,
        "confusion_matrix": {
            "car_as_car": 2, "car_as_plane": 0,
            "plane_as_plane": 2, "plane_as_car": 0
        }
    }

# ----------------- MATLAB WORKBENCH EXECUTION ENGINE -----------------

# ----------------- MATLAB WORKBENCH EXECUTION ENGINE -----------------
class MatlabExecuteRequest(BaseModel):
    code: str
    session_id: Optional[str] = "default"
    clear_session: Optional[bool] = False

MATLAB_SESSIONS: Dict[str, Dict[str, Any]] = {}

MATLAB_HELP_DOCS = {
    "fft": "  fft - Tez Furye Transformatsiyasi (Fast Fourier Transform)\n  Y = fft(X) hisoblaydi X diskret signalining Furye spektrini.",
    "ifft": "  ifft - Teskari Furye Transformatsiyasi (Inverse FFT)\n  X = ifft(Y) Furye spektridan asl vaqt signalini tiklaydi.",
    "conv": "  conv - Konvolyutsiya (Signal Svyortkasi)\n  C = conv(A, B) A va B vektorlarning chiziqli konvolyutsiyasini hisoblaydi.",
    "deconv": "  deconv - Dekonvolyutsiya\n  [q, r] = deconv(b, a) signalni filtr impulsi ta'siridan ajratadi.",
    "butter": "  butter - Butterworth Raqamli Filtri\n  [b, a] = butter(n, Wn) n-tartibli Butterworth filtri koeffitsientlarini hisoblaydi.",
    "filter": "  filter - 1D Raqamli Filtr\n  y = filter(b, a, x) x signalini b va a koeffitsientli filtr orqali o'tkazadi.",
    "freqz": "  freqz - Raqamli filtr chastota xarakteristikasi (AFX va FFX)\n  [h, w] = freqz(b, a, n) filtr kompleks amplituda-chastota javobini qaytaradi.",
    "imread": "  imread - Tasvirni xotiraga yuklash\n  I = imread('cameraman.png') tasvir piksel matritsasini qaytaradi.",
    "imshow": "  imshow - Tasvirni ekranga chiqarish\n  imshow(I) yoki imshow(I, []) 2D yoki rangli RGB tasvirni ko'rsatadi.",
    "rgb2gray": "  rgb2gray - Rangli RGB tasvirni kulrang (grayscale) ga o'tkazish\n  gray = rgb2gray(RGB) 1-kanalli yorqinlik matritsasiga o'tkazadi.",
    "im2double": "  im2double - Tasvir piksellarini [0, 1] double diapazoniga o'tkazish\n  I = im2double(I_uint8);",
    "medfilt2": "  medfilt2 - 2D Median Filtr\n  J = medfilt2(I, [m n]) tasvirdagi shovqinlarni tozalaydi.",
    "imfilter": "  imfilter - 2D fazoviy filtrlash\n  J = imfilter(I, h) tasvirni h yadrosi bilan konvolyutsiya qiladi.",
    "fspecial": "  fspecial - Maxsus 2D filtr yadrolari\n  h = fspecial('average', [3 3]) yoki fspecial('gaussian', [5 5], sigma).",
    "histeq": "  histeq - Gistogrammani tenglashtirish (kontrastni oshirish)\n  J = histeq(I) kontrastni yaxshilaydi.",
    "imnoise": "  imnoise - Tasvirga sun'iy shovqin qo'shish\n  J = imnoise(I, 'salt & pepper', 0.05) yoki imnoise(I, 'gaussian').",
    "dct2": "  dct2 - 2D Diskret Kosinus Transformatsiyasi (DCT)\n  Y = dct2(X) tasvir chastota koeffitsientlarini hisoblaydi.",
    "idct2": "  idct2 - Teskari 2D DCT\n  X = idct2(Y) DCT koeffitsientlaridan tasvirni tiklaydi.",
    "dctmtx": "  dctmtx - NxN o'lchamli ortonormal DCT matritsasi\n  T = dctmtx(N); B = T * block * T';",
    "blkproc": "  blkproc - 2D blokli ishlov berish (Block Processing)\n  B = blkproc(I, [8 8], @(block) T * block.data * T');",
    "blockproc": "  blockproc - 2D blokli ishlov berish\n  B = blockproc(I, [8 8], @(block) T * block.data * T');",
    "imresize": "  imresize - Tasvir o'lchamini o'zgartirish (interpolatsiya)\n  I2 = imresize(I, 0.5, 'bicubic');",
    "imadjust": "  imadjust - Tasvir intensivligini sozlash (Gamma korreksiya)\n  J = imadjust(I, [], [], gamma);",
    "deconvwnr": "  deconvwnr - Viner filtri orqali tasvirni tiklash\n  J = deconvwnr(I_blurred, PSF, nsr);",
    "fitcknn": "  fitcknn - K-yaqin qo'shnilar (KNN) klassifikatori\n  mdl = fitcknn(X_train, y_train, 'NumNeighbors', k);",
    "predict": "  predict - Model orqali bashorat qilish\n  y_pred = predict(mdl, X_test);",
    "audioread": "  audioread - Audio signalini o'qish\n  [y, Fs] = audioread('speech.wav')",
    "spectrogram": "  spectrogram - Qisqa vaqtli Furye spektrogrammasi (STFT)\n  spectrogram(x, 256, 128, 512, Fs)",
    "lpc": "  lpc - Chiziqli bashorat koeffitsientlari (LPC)\n  [a, g] = lpc(x, p)",
    "zeros": "  zeros(m, n) - Nollar matritsasi",
    "ones": "  ones(m, n) - Birlar matritsasi",
    "eye": "  eye(n) - Birlik diagonal matritsa",
    "plot": "  plot(x, y) - 2D chiziqli grafik chizish",
    "stem": "  stem(n, x) - Diskret ignasimon grafik",
    "disp": "  disp(X) - Qiymatni konsolga chiqarish",
    "fprintf": "  fprintf(fmt, ...) - Formatlangan ma'lumotni konsolga chiqarish",
    "clc": "  clc - Buyruqlar oynasini tozalash",
    "clear": "  clear - Xotiradagi o'zgaruvchilarni tozalash",
    "whos": "  whos - O'zgaruvchilar ro'yxati va ularning o'lchamlari",
    "who": "  who - O'zgaruvchilar nomlarini ko'rsatish"
}

MATLAB_BUILTIN_FNS = {
    'zeros', 'ones', 'size', 'conv', 'conv2', 'plot', 'subplot', 'stem', 'rectpuls', 'tripuls',
    'imfilter', 'fspecial', 'medfilt2', 'filter', 'butter', 'find', 'blockproc', 'blkproc', 'repmat',
    'linspace', 'logspace', 'reshape', 'dot', 'cross', 'rand', 'randn', 'eye', 'min', 'max',
    'fprintf', 'disp', 'title', 'xlabel', 'ylabel', 'legend', 'figure', 'imread', 'imwrite',
    'imshow', 'imshowpair', 'imhist', 'histeq', 'imnoise', 'imbinarize', 'strel', 'imerode',
    'imdilate', 'imopen', 'imclose', 'imresize', 'imadjust', 'deconvwnr', 'fitcknn', 'predict',
    'dct2', 'idct2', 'dctmtx', 'dct', 'idct', 'mean', 'std', 'var',
    'median', 'sum', 'prod', 'diff', 'sort', 'roots', 'poly', 'polyval', 'real', 'imag',
    'conj', 'angle', 'round', 'ceil', 'floor', 'fix', 'mod', 'rem', 'log', 'log10', 'log2',
    'exp', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinc', 'pi',
    'fft', 'ifft', 'fft2', 'ifft2', 'fftshift', 'ifftshift', 'rms', 'interp1', 'uint8', 'int16', 'int32',
    'float64', 'double', 'num2str', 'str2num', 'int2str', 'sprintf', 'numel', 'nnz', 'immse', 'psnr', 'ssim', 'snr',
    'rgb2gray', 'im2double', 'mat2gray', 'imabsdiff', 'rgb2hsv', 'hsv2rgb', 'rgb2ycbcr', 'ycbcr2rgb',
    'array', 'xlim', 'ylim', 'axis', 'grid', 'box', 'hold', 'colormap', 'colorbar',
    'audioread', 'audiowrite', 'sound', 'soundsc', 'spectrogram', 'lpc', 'cheby1', 'cheby2', 'ellip', 'fir1', 'freqz', 'impz'
}

class BlockData(np.ndarray):
    """NumPy array wrapper that supports .data attribute for MATLAB block struct compatibility"""
    def __new__(cls, input_array):
        return np.asarray(input_array).view(cls)
    @property
    def data(self):
        return np.asmatrix(self)

def matlab_dctmtx(N):
    return np.asmatrix(dct(np.eye(int(N)), axis=0, norm='ortho'))

def matlab_blockproc(A, block_size, fun):
    A = np.asarray(A)
    if A.ndim == 3:
        channels = [matlab_blockproc(A[:, :, c], block_size, fun) for c in range(A.shape[2])]
        return np.stack(channels, axis=-1)
    bsize = [int(block_size[0]), int(block_size[1])] if hasattr(block_size, '__len__') else [int(block_size), int(block_size)]
    bh, bw = bsize[0], bsize[1]
    H, W = A.shape[:2]
    if H < bh or W < bw:
        return A
    
    if isinstance(fun, str):
        fun_name = fun.strip()
        if fun_name == 'dct2':
            fun = lambda b: dctn((b.data if hasattr(b, 'data') else b).astype(float), norm='ortho')
        elif fun_name == 'idct2':
            fun = lambda b: idctn((b.data if hasattr(b, 'data') else b).astype(float), norm='ortho')

    first_block = BlockData(A[0:bh, 0:bw])
    try:
        sample_res = fun(first_block)
    except Exception:
        sample_res = fun(np.asarray(first_block))
    sample_res = np.asarray(sample_res)
    obh, obw = sample_res.shape[:2]
    out_H = (H // bh) * obh
    out_W = (W // bw) * obw
    out = np.zeros((out_H, out_W), dtype=sample_res.dtype)
    for i in range(0, H - bh + 1, bh):
        for j in range(0, W - bw + 1, bw):
            block = BlockData(A[i:i+bh, j:j+bw])
            try:
                res = fun(block)
            except Exception:
                res = fun(np.asarray(block))
            oi = (i // bh) * obh
            oj = (j // bw) * obw
            out[oi:oi+obh, oj:oj+obw] = np.asarray(res)
    return out

matlab_blkproc = matlab_blockproc

def process_matlab_quotes_and_transpose(line: str) -> str:
    res = []
    i = 0
    n = len(line)
    in_str = False
    str_char = None
    
    while i < n:
        ch = line[i]
        if not in_str and ch == '%':
            res.append(line[i:])
            break
            
        if not in_str:
            if ch == '"':
                in_str = True
                str_char = '"'
                res.append(ch)
                i += 1
                continue
            elif ch == "'":
                prev_idx = len(res) - 1
                while prev_idx >= 0 and res[prev_idx].isspace():
                    prev_idx -= 1
                if prev_idx >= 0 and (res[prev_idx].isalnum() or res[prev_idx] in (')', ']', '}', '_', '.')):
                    res.append('.T')
                    i += 1
                    continue
                else:
                    in_str = True
                    str_char = "'"
                    res.append(ch)
                    i += 1
                    continue
            else:
                res.append(ch)
                i += 1
        else:
            if ch == str_char:
                if str_char == "'" and i + 1 < n and line[i+1] == "'":
                    res.append("\\'")
                    i += 2
                    continue
                else:
                    in_str = False
                    str_char = None
                    res.append(ch)
                    i += 1
                    continue
            else:
                res.append(ch)
                i += 1
                
    return ''.join(res)

def translate_matlab_code_to_python(code: str) -> tuple[str, list[str]]:
    # Normalize unicode hyphens/quotes
    text = code.replace('\u2013', '-').replace('\u2014', '-').replace('\u2212', '-')
    text = text.replace('\xa0', ' ').replace('\u200b', '').replace('\ufeff', '')
    text = text.replace('“', '"').replace('”', '"')
    
    source_lines = text.splitlines()
    py_lines = []
    indent_level = 0
    
    for idx, raw_line in enumerate(source_lines, 1):
        stripped = raw_line.strip()
        if not stripped:
            py_lines.append('')
            continue
            
        if stripped.startswith('%'):
            py_lines.append('    ' * indent_level + '# ' + stripped[1:].strip())
            continue
            
        # Block endings and branches
        if stripped == 'end':
            indent_level = max(0, indent_level - 1)
            py_lines.append('    ' * indent_level + 'pass  # end')
            continue
        if stripped == 'else':
            cur = max(0, indent_level - 1)
            py_lines.append('    ' * cur + 'else:')
            continue
        if stripped.startswith('elseif '):
            cur = max(0, indent_level - 1)
            cond = stripped[7:].strip().rstrip(';')
            cond = cond.replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            py_lines.append('    ' * cur + f'elif {cond}:')
            continue

        # Process quotes and transpose
        s = process_matlab_quotes_and_transpose(raw_line)

        # Handle line continuation '...'
        if '...' in s:
            s = s.replace('...', ' \\')

        # Multiple return assignment: [a, b] = func(...) -> (a, b) = func(...)
        s = re.sub(r'(?:^|\s*)\[\s*([a-zA-Z0-9_,\s]+)\s*\]\s*=', r'(\1) =', s)

        # Anonymous functions: @(args) expr -> lambda args: expr
        s = re.sub(r'@\s*\(([^)]*)\)\s*', r'lambda \1: ', s)
        s = re.sub(r'@([a-zA-Z_]\w*)', r'\1', s)

        # Brackets [8 8] -> [8, 8], [1 2 3; 4 5 6] -> np.array(...)
        def bracket_repl(m):
            inner = m.group(1).strip()
            if not inner:
                return '[]'
            if ';' in inner:
                rows = []
                for row in inner.split(';'):
                    toks = [t for t in re.split(r'[\s,]+', row.strip()) if t]
                    rows.append(f"[{', '.join(toks)}]")
                return f"np.array([{', '.join(rows)}])"
            else:
                toks = [t for t in re.split(r'[\s,]+', inner) if t]
                return f"[{', '.join(toks)}]"
                
        s = re.sub(r'\[([^\[\]]+)\]', bracket_repl, s)

        # 1D column vector flattening: I(:) -> I.ravel()
        s = re.sub(r'\b([a-zA-Z_]\w*)\(\s*:\s*\)', r'\1.ravel()', s)

        # 3D channel slicing: I(:,:,1) -> I[:, :, 0]
        s = s.replace('(:,:,1)', '[:, :, 0]').replace('(:,:,2)', '[:, :, 1]').replace('(:,:,3)', '[:, :, 2]')

        # Masked or indexed assignment: var(cond) = val (only single =, not == or !=)
        m_idx_assign = re.match(r'^\s*([a-zA-Z_]\w*)\((.+)\)\s*(?<!=)=(?!=)\s*(.+)$', s)
        if m_idx_assign:
            var_name, idx_expr, val_expr = m_idx_assign.groups()
            s = f'{var_name}[{idx_expr}] = {val_expr}'

        # Element-wise operations
        s = s.replace('.*', '*').replace('./', '/').replace('.^', '**')
        s = re.sub(r'(?<=\w)\^(?=\w|\d|\()', '**', s)

        # Logical operators
        s = s.replace('~=', '!=')
        s = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', s)

        # Standalone MATLAB commands
        s = re.sub(r'\bclc\s*;?', 'pass  # clc', s)
        s = re.sub(r'\bclear\s*;?', 'pass  # clear', s)
        s = re.sub(r'\bclearvars\s*;?', 'pass  # clearvars', s)
        s = re.sub(r'\bclose\s+all\s*;?', 'plt.close("all")', s)
        s = re.sub(r'\bfigure\s*;?', 'plt.figure(figsize=(7, 4))', s)
        s = re.sub(r'\bgrid\s+on\s*;?', 'plt.grid(True)', s)
        s = re.sub(r'\bgrid\s+off\s*;?', 'plt.grid(False)', s)
        s = re.sub(r'\bhold\s+on\s*;?', 'pass  # hold on', s)
        s = re.sub(r'\bhold\s+off\s*;?', 'pass  # hold off', s)
        s = re.sub(r'\baxis\s+off\s*;?', 'plt.axis("off")', s)
        s = re.sub(r'\baxis\s+on\s*;?', 'plt.axis("on")', s)
        s = re.sub(r'\baxis\s+tight\s*;?', 'plt.autoscale(tight=True)', s)
        s = re.sub(r'\baxis\s+equal\s*;?', 'plt.axis("equal")', s)

        # Plotting & output function call wrappers
        s = re.sub(r'\btitle\s*\(', 'plt.title(', s)
        s = re.sub(r'\bxlabel\s*\(', 'plt.xlabel(', s)
        s = re.sub(r'\bylabel\s*\(', 'plt.ylabel(', s)
        s = re.sub(r'\bsubplot\s*\(', 'plt.subplot(', s)
        s = re.sub(r'\bimshow\s*\(', 'matlab_imshow(', s)
        s = re.sub(r'\bimshowpair\s*\(', 'matlab_imshowpair(', s)
        s = re.sub(r'\bplot\s*\(', 'matlab_plot(', s)
        s = re.sub(r'\bstem\s*\(', 'matlab_stem(', s)
        s = re.sub(r'\blegend\s*\(', 'matlab_legend(', s)
        s = re.sub(r'\bdisp\s*\(', 'matlab_disp(', s)
        s = re.sub(r'\bfprintf\s*\(', 'matlab_fprintf(', s)

        # For loops: for var = start:step:stop or for var = start:stop
        m_for3 = re.match(r'^\s*for\s+([a-zA-Z_]\w*)\s*=\s*([^:]+):([^:]+):(.+)$', s)
        if m_for3:
            var, start, step, stop = m_for3.groups()
            stop = stop.rstrip(';')
            py_lines.append('    ' * indent_level + f'for {var} in np.arange({start.strip()}, float({stop.strip()}) + abs(float({step.strip()})*0.01), {step.strip()}):')
            indent_level += 1
            continue

        m_for2 = re.match(r'^\s*for\s+([a-zA-Z_]\w*)\s*=\s*([^:]+):(.+)$', s)
        if m_for2:
            var, start, stop = m_for2.groups()
            stop = stop.rstrip(';')
            py_lines.append('    ' * indent_level + f'for {var} in np.arange({start.strip()}, ({stop.strip()}) + 0.5, 1.0):')
            indent_level += 1
            continue

        # While loops
        m_while = re.match(r'^\s*while\s+(.+)$', s)
        if m_while:
            cond = m_while.group(1).strip().rstrip(';')
            cond = cond.replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            py_lines.append('    ' * indent_level + f'while {cond}:')
            indent_level += 1
            continue

        # If condition
        m_if = re.match(r'^\s*if\s+(.+)$', s)
        if m_if:
            cond = m_if.group(1).strip().rstrip(';')
            cond = cond.replace('~=', '!=').replace('&', ' and ').replace('|', ' or ')
            cond = re.sub(r'~(?=[a-zA-Z0-9_\(])', 'not ', cond)
            py_lines.append('    ' * indent_level + f'if {cond}:')
            indent_level += 1
            continue

        # Range assignment: var = start:step:stop or var = start:stop
        m_assign = re.match(r'^\s*([a-zA-Z_]\w*)\s*=\s*(.+)$', s)
        if m_assign:
            var_name, rhs = m_assign.groups()
            rhs_clean = rhs.strip().rstrip(';')
            if ':' in rhs_clean and not rhs_clean.startswith(('lambda', '[', '(')) and 'lambda' not in rhs_clean and 'imread' not in rhs_clean:
                # Count colons outside parens
                colon_parts = [p.strip() for p in rhs_clean.split(':')]
                if len(colon_parts) == 3:
                    start, step, stop = colon_parts
                    s = f"{var_name} = np.arange({start}, ({stop}) + abs(float({step}))*0.01, {step})"
                elif len(colon_parts) == 2:
                    start, stop = colon_parts
                    s = f"{var_name} = np.arange({start}, ({stop}) + 0.5, 1.0)"

        py_lines.append('    ' * indent_level + s.strip())

    return '\n'.join(py_lines), source_lines

def format_matlab_error(e: Exception, matlab_source: str, py_lineno: Optional[int] = None) -> tuple[str, Optional[int]]:
    source_lines = matlab_source.splitlines()
    err_line = py_lineno
    err_msg = str(e)
    err_type = type(e).__name__
    
    code_snippet = ""
    if err_line and 1 <= err_line <= len(source_lines):
        code_snippet = source_lines[err_line - 1].strip()
        
    explanation = ""
    suggestion = ""
    
    if err_type == 'NameError':
        m = re.search(r"name '([^']+)' is not defined", err_msg)
        var = m.group(1) if m else "o'zgaruvchi"
        explanation = f"'{var}' nomli o'zgaruvchi yoki funksiya e'lon qilinmagan (aniqlanmagan)."
        suggestion = f"Ushbu qatordan yuqorida '{var}' o'zgaruvchisiga qiymat bering (masalan: {var} = 10;) yoki funksiya nomini tekshiring."
    elif err_type == 'IndexError':
        explanation = "Massiv yoki matritsa o'lchamidan tashqariga murojaat qilindi (Index out of range)."
        suggestion = "MATLAB dasturida indekslar 1 dan boshlanadi. 'size(...)' yoki 'length(...)' orqali massiv o'lchamini tekshiring."
    elif err_type == 'ZeroDivisionError':
        explanation = "Nolga bo'lish xatoligi yuz berdi (Division by zero)."
        suggestion = "Hisoblashdagi bo'luvchi o'zgaruvchi 0 ga teng bo'lib qolmaganini tekshiring."
    elif err_type == 'SyntaxError':
        explanation = "MATLAB sintaksisida xatolik aniqlandi."
        suggestion = "Qatordagi qavslar '()', '[]', nuqtali vergul ';' yoki operatorlarni to'g'ri qo'yilganligini tekshiring."
    elif err_type == 'ValueError':
        explanation = f"Matritsa yoki vektorlar o'lchami mos kelmadi (Dimension mismatch): {err_msg}"
        suggestion = "Vektorlarni ko'paytirishda elementma-element '.*', './', '.^' operatorlaridan foydalaning yoki o'lchamlarni moslang."
    elif err_type == 'TypeError':
        explanation = f"Ma'lumot turi yoki chaqirish xatoligi: {err_msg}"
        suggestion = "Funksiya parametrlari va massiv turlarining to'g'ri berilganligini tekshiring."
    else:
        explanation = f"{err_type}: {err_msg}"
        suggestion = "Koddagi buyruqlar va parametrlarni laboratoriya yo'riqnomasiga muvofiq tekshiring."
        
    lines = [
        f">> [Xatolik] {err_line}-qatorda xatolik aniqlandi:" if err_line else ">> [Xatolik] dastur kodida xatolik aniqlandi:",
    ]
    if code_snippet:
        lines.append(f"   {err_line} | {code_snippet}")
        lines.append(f"   {' ' * len(str(err_line))}   {'^' * max(1, len(code_snippet))}")
    lines.append(f">> Sabab ({err_type}): {explanation}")
    if suggestion:
        lines.append(f">> Tavsiya: {suggestion}")
        
    return '\n'.join(lines), err_line

@router.post("/execute_matlab")
def execute_matlab_code(req: MatlabExecuteRequest):
    code = req.code.strip()
    session_id = req.session_id or "default"
    console_logs = []
    workspace_vars = []
    figures_b64 = []
    has_error = False
    error_line = None
    
    # 1. Handle special interactive shell commands
    if req.clear_session or code in ['clear', 'clear all', 'clearvars']:
        MATLAB_SESSIONS[session_id] = {}
        return {
            "output": ">> Workspace tozalandi (clear).",
            "workspace": [],
            "figures": [],
            "has_error": False,
            "error_line": None
        }
        
    if code == 'clc':
        return {
            "output": ">> CLC_CLEAR",
            "workspace": [],
            "figures": [],
            "has_error": False,
            "error_line": None
        }
        
    if code.startswith('help ') or code == 'help':
        fn = code[5:].strip() if code.startswith('help ') else ''
        if not fn:
            doc_lines = [f"  {k:<12} - {v.splitlines()[0].strip()}" for k, v in list(MATLAB_HELP_DOCS.items())[:20]]
            return {
                "output": "MATLAB Virtual Platformasi — Mavjud buyruqlar va funksiyalar:\n" + "\n".join(doc_lines) + "\n\nBatafsil ma'lumot uchun: help <funksiya_nomi>",
                "workspace": [],
                "figures": [],
                "has_error": False,
                "error_line": None
            }
        doc = MATLAB_HELP_DOCS.get(fn, f"'{fn}' funksiyasi bo'yicha hujjat topilmadi. AI Virtual Ustoz orqali to'liq ma'lumot olishingiz mumkin.")
        return {
            "output": doc,
            "workspace": [],
            "figures": [],
            "has_error": False,
            "error_line": None
        }
        
    session_vars = MATLAB_SESSIONS.setdefault(session_id, {})
    
    if code == 'whos':
        if not session_vars:
            return {
                "output": "  Workspace bo'sh. Hech qanday o'zgaruvchi e'lon qilinmagan.",
                "workspace": [],
                "figures": [],
                "has_error": False,
                "error_line": None
            }
        lines = ["  Name        Size            Bytes  Class       Attributes\n"]
        for k, v in sorted(session_vars.items()):
            s = "x".join(str(d) for d in v.shape) if hasattr(v, 'shape') else f"1x{len(v)}" if isinstance(v, (list, tuple)) else "1x1"
            b = v.nbytes if hasattr(v, 'nbytes') else 8
            cls = "double" if type(v).__name__ in ["float", "float64"] else type(v).__name__
            lines.append(f"  {k:<10}  {s:<14}  {b:<6}  {cls:<10}")
        return {
            "output": "\n".join(lines),
            "workspace": [],
            "figures": [],
            "has_error": False,
            "error_line": None
        }
        
    if code == 'who':
        names = [k for k in sorted(session_vars.keys())]
        return {
            "output": "Sessiyadagi o'zgaruvchilar:\n  " + ("    ".join(names) if names else "(bo'sh)"),
            "workspace": [],
            "figures": [],
            "has_error": False,
            "error_line": None
        }
        
    # Interactive single-expression formatting
    clean_single = code.rstrip(';').strip()
    has_semicolon = code.endswith(';')
    if '\n' not in code and not has_semicolon:
        m_assign = re.match(r'^([a-zA-Z_]\w*)\s*=\s*(.+)$', clean_single)
        if m_assign:
            var_name = m_assign.group(1)
            code = f"{code}\ndisp('{var_name} =')\ndisp({var_name})"
        elif not clean_single.startswith(('plot', 'stem', 'subplot', 'disp', 'fprintf', 'figure', 'imshow', 'for', 'if', 'while', 'clc', 'clear', 'whos', 'who')):
            code = f"ans = {clean_single}\ndisp('ans =')\ndisp(ans)"

    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.close('all')

    # Helper functions for runtime environment
    def matlab_stem(t, x=None, *args, **kwargs):
        color = 'b'
        for a in args:
            if a in ['b', 'r', 'g', 'c', 'm', 'y', 'k']:
                color = a
        if x is None:
            plt.stem(t)
        else:
            plt.stem(t, x, linefmt=f'{color}-', markerfmt=f'{color}o', basefmt='k-')

    def matlab_plot(t, x=None, *args, **kwargs):
        if x is None:
            plt.plot(t)
        else:
            plt.plot(t, x)

    def matlab_disp(*args):
        for a in args:
            if hasattr(a, 'shape') and len(a.shape) > 1:
                print(np.array2string(np.asarray(a), precision=4, suppress_small=True))
            else:
                print(a)

    def matlab_fprintf(fmt, *args):
        try:
            fmt_clean = str(fmt).replace('\\n', '\n').replace('\\t', '\t')
            converted_args = []
            for a in args:
                if isinstance(a, (np.floating, float)) and ('%d' in fmt_clean or '%i' in fmt_clean):
                    converted_args.append(int(round(a)))
                elif hasattr(a, 'item'):
                    converted_args.append(a.item())
                else:
                    converted_args.append(a)
            out_str = fmt_clean % tuple(converted_args) if converted_args else fmt_clean
            print(out_str, end='')
        except Exception:
            print(fmt, *args)

    def matlab_legend(*args):
        labels = []
        for a in args:
            if isinstance(a, str):
                labels.append(a.replace('\\pi', 'π'))
            elif isinstance(a, (list, tuple)):
                labels.extend([str(item).replace('\\pi', 'π') for item in a])
        if labels:
            plt.legend(labels)

    def matlab_imread(path=None, *args, **kwargs):
        name = "cameraman"
        if path:
            basename = os.path.basename(str(path)).lower()
            if "peppers" in basename:
                name = "peppers"
            elif "mother" in basename:
                name = "mother"
            elif "cameraman" in basename:
                name = "cameraman"
            else:
                name = os.path.splitext(basename)[0]
        filepath = os.path.join(settings.SAMPLES_DIR, f"{name}.png")
        if not os.path.exists(filepath):
            filepath = os.path.join(settings.SAMPLES_DIR, f"{name}.tif")
        if not os.path.exists(filepath):
            filepath = os.path.join(settings.SAMPLES_DIR, f"{name}.jpg")
        if os.path.exists(filepath):
            img = cv2.imread(filepath)
            if img is not None:
                if len(img.shape) == 3 and np.array_equal(img[:, :, 0], img[:, :, 1]) and np.array_equal(img[:, :, 0], img[:, :, 2]):
                    return img[:, :, 0]
                return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return (np.indices((256, 256))[0] % 32 * 8).astype(np.uint8)

    def matlab_rgb2gray(I):
        arr = np.asarray(I)
        if len(arr.shape) == 2:
            return arr
        return cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)

    def matlab_im2double(I):
        arr = np.asarray(I)
        if arr.dtype == np.uint8:
            return arr.astype(float) / 255.0
        return arr.astype(float)

    def matlab_imhist(I):
        arr = np.asarray(I)
        plt.hist(arr.ravel(), bins=256, range=(0, 256 if np.max(arr) > 1.0 else 1.0), color='black', alpha=0.7)
        plt.title("Gistogramma")
        plt.xlabel("Piksel intensivligi")
        plt.ylabel("Chastota")
        plt.grid(True)

    def matlab_histeq(I):
        arr = np.asarray(I)
        gray = matlab_rgb2gray(arr) if len(arr.shape) == 3 else arr
        if gray.dtype != np.uint8:
            gray = np.clip(gray * 255.0 if np.max(gray) <= 1.0 else gray, 0, 255).astype(np.uint8)
        return cv2.equalizeHist(gray)

    def matlab_imnoise(I, mode='gaussian', *args):
        arr = np.asarray(I, dtype=float).copy()
        if mode in ['salt & pepper', 'salt_pepper']:
            amount = args[0] if args else 0.05
            mask = np.random.rand(*arr.shape)
            arr[mask < amount / 2] = 0
            arr[mask > 1 - amount / 2] = 255.0 if np.max(arr) > 1.0 else 1.0
        elif mode == 'gaussian':
            mean = args[0] if len(args) > 0 else 0
            var = args[1] if len(args) > 1 else 0.01
            sigma = np.sqrt(var) * (255.0 if np.max(arr) > 1.0 else 1.0)
            noise = np.random.normal(mean, sigma, arr.shape)
            arr = np.clip(arr + noise, 0, 255.0 if np.max(arr) > 1.0 else 1.0)
        return arr

    def matlab_imfilter(I, h, *args):
        arr = np.asarray(I, dtype=float)
        if len(arr.shape) == 2:
            return signal.convolve2d(arr, h, mode='same', boundary='symm')
        out = np.zeros_like(arr)
        for c in range(arr.shape[2]):
            out[:, :, c] = signal.convolve2d(arr[:, :, c], h, mode='same', boundary='symm')
        return out

    def matlab_fspecial(ftype='average', *args):
        if ftype == 'average':
            sz = args[0] if args else [3, 3]
            m, n = (int(sz[0]), int(sz[1])) if hasattr(sz, '__len__') and len(sz) >= 2 else (int(sz), int(sz))
            return np.ones((m, n)) / (m * n)
        elif ftype == 'gaussian':
            sz = args[0] if len(args) > 0 else [5, 5]
            sigma = args[1] if len(args) > 1 else 1.0
            m, n = (int(sz[0]), int(sz[1])) if hasattr(sz, '__len__') and len(sz) >= 2 else (int(sz), int(sz))
            y, x = np.mgrid[-m//2+1:m//2+1, -n//2+1:n//2+1]
            g = np.exp(-(x**2 + y**2) / (2 * sigma**2))
            return g / g.sum()
        return np.ones((3, 3)) / 9.0

    def matlab_medfilt2(I, kernel_size=[3, 3]):
        k = int(kernel_size[0]) if hasattr(kernel_size, '__len__') else int(kernel_size)
        return median_filter(np.asarray(I), size=k)

    def matlab_imbinarize(I, thresh=None):
        arr = np.asarray(I)
        gray = matlab_rgb2gray(arr) if len(arr.shape) == 3 else arr
        if gray.dtype != np.uint8:
            gray = np.clip(gray * 255.0 if np.max(gray) <= 1.0 else gray, 0, 255).astype(np.uint8)
        if thresh is None:
            _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        else:
            t = int(thresh * 255 if thresh <= 1.0 else thresh)
            _, bw = cv2.threshold(gray, t, 255, cv2.THRESH_BINARY)
        return bw

    def matlab_strel(shape='disk', radius=3):
        r = int(radius)
        if shape == 'disk':
            return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))
        elif shape == 'square':
            return cv2.getStructuringElement(cv2.MORPH_RECT, (2*r+1, 2*r+1))
        return cv2.getStructuringElement(cv2.MORPH_RECT, (2*r+1, 2*r+1))

    def matlab_imerode(I, se):
        return cv2.erode(np.asarray(I, dtype=np.uint8), se)

    def matlab_imdilate(I, se):
        return cv2.dilate(np.asarray(I, dtype=np.uint8), se)

    def matlab_imopen(I, se):
        return cv2.morphologyEx(np.asarray(I, dtype=np.uint8), cv2.MORPH_OPEN, se)

    def matlab_imclose(I, se):
        return cv2.morphologyEx(np.asarray(I, dtype=np.uint8), cv2.MORPH_CLOSE, se)

    def matlab_dct2(I):
        return dctn(np.asarray(I, dtype=float), norm='ortho')

    def matlab_idct2(I):
        return idctn(np.asarray(I, dtype=float), norm='ortho')

    def matlab_imresize(I, scale_or_size, method='bicubic'):
        arr = np.asarray(I)
        if isinstance(scale_or_size, (int, float)):
            scale = float(scale_or_size)
            new_w = max(1, int(arr.shape[1] * scale))
            new_h = max(1, int(arr.shape[0] * scale))
        elif hasattr(scale_or_size, '__len__') and len(scale_or_size) >= 2:
            new_h = max(1, int(scale_or_size[0]))
            new_w = max(1, int(scale_or_size[1]))
        else:
            return arr
        interp = cv2.INTER_CUBIC
        if method == 'nearest':
            interp = cv2.INTER_NEAREST
        elif method == 'bilinear':
            interp = cv2.INTER_LINEAR
        return cv2.resize(arr, (new_w, new_h), interpolation=interp)

    def matlab_imadjust(I, in_range=None, out_range=None, gamma=1.0):
        arr = np.asarray(I, dtype=float)
        is_uint8 = (arr.max() > 1.0)
        if is_uint8:
            arr = arr / 255.0
        low_in = float(in_range[0]) if in_range and len(in_range) >= 2 else np.min(arr)
        high_in = float(in_range[1]) if in_range and len(in_range) >= 2 else np.max(arr)
        low_out = float(out_range[0]) if out_range and len(out_range) >= 2 else 0.0
        high_out = float(out_range[1]) if out_range and len(out_range) >= 2 else 1.0
        if high_in == low_in:
            high_in = low_in + 1e-6
        clipped = np.clip((arr - low_in) / (high_in - low_in), 0.0, 1.0)
        adj = low_out + (high_out - low_out) * (clipped ** float(gamma))
        return (np.clip(adj, 0, 1) * 255).astype(np.uint8) if is_uint8 else adj

    def matlab_deconvwnr(I, PSF, nsr=0.01):
        arr = np.asarray(I, dtype=float)
        H, W = arr.shape[:2]
        psf_pad = np.zeros((H, W), dtype=float)
        ph, pw = PSF.shape[:2]
        psf_pad[:ph, :pw] = PSF
        psf_pad = np.roll(np.roll(psf_pad, -ph//2, axis=0), -pw//2, axis=1)
        F_I = np.fft.fft2(arr)
        F_PSF = np.fft.fft2(psf_pad)
        H_sq = np.abs(F_PSF)**2
        nsr_val = float(nsr) if isinstance(nsr, (int, float)) else 0.01
        W_filter = np.conj(F_PSF) / (H_sq + nsr_val)
        restored = np.real(np.fft.ifft2(F_I * W_filter))
        return np.clip(restored, 0, 255).astype(np.uint8) if np.max(arr) > 1.0 else np.clip(restored, 0.0, 1.0)

    class SimpleKNNModel:
        def __init__(self, X, y, k=3):
            self.X = np.asarray(X, dtype=float)
            self.y = np.asarray(y)
            self.k = int(k)
        def predict(self, X_test):
            X_t = np.asarray(X_test, dtype=float)
            preds = []
            for pt in X_t:
                dists = np.linalg.norm(self.X - pt, axis=1)
                idx = np.argsort(dists)[:self.k]
                nearest_labels = self.y[idx]
                vals, counts = np.unique(nearest_labels, return_counts=True)
                preds.append(vals[np.argmax(counts)])
            return np.array(preds)

    def matlab_fitcknn(X, y, *args, **kwargs):
        k = 3
        for i in range(len(args)):
            if args[i] == 'NumNeighbors' and i + 1 < len(args):
                k = int(args[i+1])
        return SimpleKNNModel(X, y, k=k)

    def matlab_predict(mdl, X):
        if hasattr(mdl, 'predict'):
            return mdl.predict(X)
        return np.zeros(len(X))

    def matlab_double(x):
        if hasattr(x, 'astype'):
            return x.astype(np.float64)
        return np.asarray(x, dtype=np.float64)

    def matlab_uint8(x):
        if hasattr(x, 'astype'):
            return np.clip(x, 0, 255).astype(np.uint8)
        return np.clip(np.asarray(x), 0, 255).astype(np.uint8)

    def matlab_imwrite(A, filename, *args, **kwargs):
        try:
            arr = np.asarray(A)
            if np.issubdtype(arr.dtype, np.floating) and np.max(arr) <= 1.0:
                arr = (np.clip(arr, 0, 1) * 255).astype(np.uint8)
            elif arr.dtype != np.uint8:
                arr = np.clip(arr, 0, 255).astype(np.uint8)
            cv2.imwrite(str(filename), arr)
        except Exception:
            pass

    def matlab_psnr(a, b):
        a = np.asarray(a, dtype=float)
        b = np.asarray(b, dtype=float)
        mse = np.mean((a - b)**2)
        if mse == 0:
            return float('inf')
        max_val = 255.0 if np.max(a) > 1.0 else 1.0
        return 10.0 * np.log10((max_val**2) / mse)

    def matlab_imshow(I, *args, **kwargs):
        arr = np.nan_to_num(np.asarray(I))
        vmin = None
        vmax = None
        if len(args) > 0 and isinstance(args[0], (list, tuple, np.ndarray)):
            rng = args[0]
            if len(rng) == 2:
                vmin = float(rng[0])
                vmax = float(rng[1])
            elif len(rng) == 0:
                vmin = float(np.min(arr))
                vmax = float(np.max(arr))
        if len(arr.shape) == 2:
            plt.imshow(arr, cmap='gray', vmin=vmin, vmax=vmax)
        else:
            plt.imshow(arr)
        plt.axis('off')

    def matlab_imshowpair(I1, I2, method='montage'):
        plt.figure(figsize=(7, 3.5))
        plt.subplot(1, 2, 1)
        matlab_imshow(I1)
        plt.title("Birinchi tasvir")
        plt.subplot(1, 2, 2)
        matlab_imshow(I2)
        plt.title("Ikkinchi tasvir")

    def matlab_butter(N, Wn, btype='low', *args, **kwargs):
        if isinstance(Wn, (int, float)) and Wn >= 1.0:
            Wn = min(0.99, Wn / 500.0)
        return signal.butter(N, Wn, btype=btype)

    def matlab_filter(b, a, x):
        return signal.lfilter(b, a, x)

    def matlab_randn(*args):
        if len(args) == 1:
            if isinstance(args[0], (tuple, list, np.ndarray)):
                return np.random.randn(*args[0])
            return np.random.randn(args[0])
        return np.random.randn(*args)

    def matlab_rand(*args):
        if len(args) == 1:
            if isinstance(args[0], (tuple, list, np.ndarray)):
                return np.random.rand(*args[0])
            return np.random.rand(args[0])
        return np.random.rand(*args)

    def matlab_zeros(*args):
        if len(args) == 1 and isinstance(args[0], (tuple, list, np.ndarray)):
            shape = tuple(int(x) for x in args[0])
            return np.zeros(shape)
        elif len(args) == 1:
            n = int(args[0])
            return np.zeros((n, n))
        shape = tuple(int(x) for x in args)
        return np.zeros(shape)

    def matlab_ones(*args):
        if len(args) == 1 and isinstance(args[0], (tuple, list, np.ndarray)):
            shape = tuple(int(x) for x in args[0])
            return np.ones(shape)
        elif len(args) == 1:
            n = int(args[0])
            return np.ones((n, n))
        shape = tuple(int(x) for x in args)
        return np.ones(shape)

    def matlab_length(x):
        return len(x) if hasattr(x, '__len__') else 1

    def matlab_size(x, dim=None):
        s = np.shape(x)
        if dim is not None:
            return s[dim-1] if dim <= len(s) else 1
        return s

    def matlab_numel(x):
        return np.size(x)

    def matlab_audioread(path='speech_sample.wav'):
        filename = os.path.basename(str(path))
        filepath = os.path.join(settings.SAMPLES_DIR, filename)
        if not os.path.exists(filepath):
            for alt in ['speech_sample.wav', 'music_sample.wav']:
                f = os.path.join(settings.SAMPLES_DIR, alt)
                if os.path.exists(f):
                    filepath = f
                    break
        if os.path.exists(filepath):
            try:
                from scipy.io import wavfile
                Fs, data = wavfile.read(filepath)
                data = data.astype(float)
                if len(data.shape) > 1:
                    data = data[:, 0]
                if np.max(np.abs(data)) > 1.0:
                    data = data / np.max(np.abs(data))
                return data, Fs
            except Exception:
                pass
        Fs = 16000
        t = np.linspace(0, 1.0, Fs, endpoint=False)
        return 0.5 * np.sin(2 * np.pi * 220 * t), Fs

    def matlab_spectrogram(x, *args, **kwargs):
        Fs = 16000
        for a in args:
            if isinstance(a, (int, float)) and a > 1000:
                Fs = int(a)
        plt.specgram(x, Fs=Fs, cmap='viridis')
        plt.ylabel('Chastota (Hz)')
        plt.xlabel('Vaqt (s)')

    def matlab_lpc(x, order=12):
        r = np.correlate(x, x, mode='full')
        r = r[len(x)-1:len(x)+order]
        from scipy.linalg import toeplitz, solve
        R = toeplitz(r[:-1])
        try:
            a = solve(R, -r[1:])
            return np.concatenate(([1], a)), 1.0
        except Exception:
            return np.ones(order + 1), 1.0

    def matlab_roots(c):
        return np.roots(c)

    def matlab_rms(x):
        return np.sqrt(np.mean(np.array(x)**2))

    def matlab_interp1(x, y, x_new, method='linear'):
        return np.interp(x_new, x, y)

    local_env = {
        "np": np,
        "sin": np.sin,
        "cos": np.cos,
        "tan": np.tan,
        "asin": np.arcsin,
        "acos": np.arccos,
        "atan": np.arctan,
        "atan2": np.arctan2,
        "sinc": np.sinc,
        "pi": np.pi,
        "exp": np.exp,
        "sqrt": np.sqrt,
        "abs": np.abs,
        "round": np.round,
        "ceil": np.ceil,
        "floor": np.floor,
        "fix": np.fix,
        "mod": np.mod,
        "rem": np.remainder,
        "log": np.log,
        "log10": np.log10,
        "log2": np.log2,
        "fft": np.fft.fft,
        "ifft": np.fft.ifft,
        "fft2": np.fft.fft2,
        "ifft2": np.fft.ifft2,
        "fftshift": np.fft.fftshift,
        "ifftshift": np.fft.ifftshift,
        "conv": np.convolve,
        "conv2": signal.convolve2d,
        "deconv": lambda y, x: signal.deconvolve(y, x),
        "plt": plt,
        "rms": matlab_rms,
        "interp1": matlab_interp1,
        "uint8": matlab_uint8,
        "int32": np.int32,
        "int16": np.int16,
        "float64": np.float64,
        "double": matlab_double,
        "dctmtx": matlab_dctmtx,
        "blkproc": matlab_blockproc,
        "blockproc": matlab_blockproc,
        "imresize": matlab_imresize,
        "imadjust": matlab_imadjust,
        "deconvwnr": matlab_deconvwnr,
        "fitcknn": matlab_fitcknn,
        "predict": matlab_predict,
        "imwrite": matlab_imwrite,
        "nnz": np.count_nonzero,
        "immse": lambda a, b: np.mean((np.asarray(a, dtype=float) - np.asarray(b, dtype=float))**2),
        "psnr": matlab_psnr,
        "snr": lambda sig, noise: 10 * np.log10(np.mean(sig**2) / (np.mean(noise**2) + 1e-12)),
        "num2str": lambda x: str(round(x, 4) if isinstance(x, float) else x),
        "str2num": lambda s: float(s) if '.' in str(s) else int(s),
        "int2str": lambda x: str(int(x)),
        "sprintf": lambda fmt, *args: fmt % args if args else fmt,
        "disp": matlab_disp,
        "fprintf": matlab_fprintf,
        "legend": matlab_legend,
        "plot": matlab_plot,
        "stem": matlab_stem,
        "title": plt.title,
        "xlabel": plt.xlabel,
        "ylabel": plt.ylabel,
        "xlim": plt.xlim,
        "ylim": plt.ylim,
        "axis": plt.axis,
        "grid": lambda state=True: plt.grid(state),
        "colormap": lambda name='gray': plt.set_cmap(name),
        "colorbar": lambda: plt.colorbar(),
        "box": lambda state=True: plt.box(state),
        "matlab_stem": matlab_stem,
        "matlab_plot": matlab_plot,
        "matlab_disp": matlab_disp,
        "matlab_fprintf": matlab_fprintf,
        "matlab_legend": matlab_legend,
        "matlab_imshow": matlab_imshow,
        "matlab_imshowpair": matlab_imshowpair,
        "matlab_imhist": matlab_imhist,
        "butter": matlab_butter,
        "filter": matlab_filter,
        "freqz": signal.freqz,
        "impz": lambda b, a, n=50: signal.dimpulse((b, a, 1.0), n=n),
        "cheby1": signal.cheby1,
        "cheby2": signal.cheby2,
        "ellip": signal.ellip,
        "fir1": lambda N, Wn, *args: signal.firwin(N + 1, Wn),
        "sawtooth": signal.sawtooth,
        "square": signal.square,
        "rectpuls": lambda t, w=1.0: np.where(np.abs(t) <= w/2.0, 1.0, 0.0),
        "tripuls": lambda t, w=1.0: np.maximum(0.0, 1.0 - np.abs(t) / (w/2.0)),
        "pause": lambda t=0: None,
        "sound": lambda *args: None,
        "soundsc": lambda *args: None,
        "randn": matlab_randn,
        "rand": matlab_rand,
        "zeros": matlab_zeros,
        "ones": matlab_ones,
        "eye": np.eye,
        "linspace": np.linspace,
        "logspace": np.logspace,
        "meshgrid": np.meshgrid,
        "find": lambda cond: (np.where(cond)[0] + 1) if isinstance(cond, np.ndarray) else [],
        "length": matlab_length,
        "size": matlab_size,
        "numel": matlab_numel,
        "ndims": lambda x: np.ndim(x),
        "isempty": lambda x: len(x) == 0 if hasattr(x, '__len__') else False,
        "repmat": np.tile,
        "reshape": np.reshape,
        "fliplr": np.fliplr,
        "flipud": np.flipud,
        "inv": np.linalg.inv,
        "pinv": np.linalg.pinv,
        "det": np.linalg.det,
        "eig": np.linalg.eig,
        "rank": np.linalg.matrix_rank,
        "norm": np.linalg.norm,
        "dot": np.dot,
        "cross": np.cross,
        "imread": matlab_imread,
        "imshow": matlab_imshow,
        "imshowpair": matlab_imshowpair,
        "rgb2gray": matlab_rgb2gray,
        "im2double": matlab_im2double,
        "mat2gray": lambda A, *a: np.clip((np.asarray(A, dtype=float) - np.min(A)) / (np.max(A) - np.min(A) + 1e-12), 0.0, 1.0),
        "imabsdiff": lambda a, b: np.abs(np.asarray(a, dtype=float) - np.asarray(b, dtype=float)),
        "imhist": matlab_imhist,
        "histeq": matlab_histeq,
        "imnoise": matlab_imnoise,
        "imfilter": matlab_imfilter,
        "fspecial": matlab_fspecial,
        "medfilt2": matlab_medfilt2,
        "imbinarize": matlab_imbinarize,
        "strel": matlab_strel,
        "imerode": matlab_imerode,
        "imdilate": matlab_imdilate,
        "imopen": matlab_imopen,
        "imclose": matlab_imclose,
        "dct2": matlab_dct2,
        "idct2": matlab_idct2,
        "dct": lambda x, *args, **kwargs: dct(x, *args, norm='ortho', **kwargs),
        "idct": lambda x, *args, **kwargs: idct(x, *args, norm='ortho', **kwargs),
        "audioread": matlab_audioread,
        "audiowrite": lambda *args: None,
        "spectrogram": matlab_spectrogram,
        "lpc": matlab_lpc,
        "roots": matlab_roots,
        "poly": np.poly,
        "polyval": np.polyval,
        "real": np.real,
        "imag": np.imag,
        "conj": np.conj,
        "angle": np.angle,
        "mean": np.mean,
        "std": np.std,
        "var": np.var,
        "median": np.median,
        "sum": np.sum,
        "prod": np.prod,
        "cumsum": np.cumsum,
        "cumprod": np.cumprod,
        "diff": np.diff,
        "min": np.min,
        "max": np.max,
        "sort": np.sort
    }
    
    # Load session variables
    local_env.update(session_vars)
    
    try:
        py_code, source_lines = translate_matlab_code_to_python(code)
        
        if any(fn in code for fn in ['plot', 'stem', 'subplot', 'imshow', 'imhist', 'spectrogram']) and 'figure' not in code:
            plt.figure(figsize=(7, 4))
            
        local_env["__builtins__"] = __builtins__
        initial_keys = set(local_env.keys())
        
        stdout_buf = io.StringIO()
        with contextlib.redirect_stdout(stdout_buf):
            with np.errstate(all='ignore'):
                exec(py_code, local_env)
            
        captured = stdout_buf.getvalue()
        if captured:
            console_logs.append(captured.rstrip())
            
        if '\n' in code or not captured:
            console_logs.append(">> Dastur muvaffaqiyatli bajarildi (Exit code: 0).")
        
        fig_nums = plt.get_fignums()
        for f_num in fig_nums:
            fig = plt.figure(f_num)
            try:
                fig.tight_layout(pad=1.5)
            except Exception:
                pass
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=200)
            buf.seek(0)
            figures_b64.append(f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}")
            
        plt.close('all')
        
        system_keys = initial_keys | {"__builtins__", "np", "plt", "io", "contextlib"}
        for var_name, var_val in local_env.items():
            if var_name in system_keys or callable(var_val) or var_name.startswith('matlab_') or var_name.startswith('_'):
                continue
            session_vars[var_name] = var_val
            v_type = type(var_val).__name__
            if hasattr(var_val, 'shape'):
                s = "x".join(str(d) for d in var_val.shape)
                v_size = s if 'x' in s else f"1x{s}"
            elif isinstance(var_val, (list, tuple)):
                v_size = f"1x{len(var_val)}"
            else:
                v_size = "1x1"
                
            v_min = "-"
            v_max = "-"
            try:
                if hasattr(var_val, 'min') and hasattr(var_val, 'max'):
                    target_arr = np.abs(var_val) if np.iscomplexobj(var_val) else var_val
                    v_min = str(round(float(np.min(target_arr)), 4))
                    v_max = str(round(float(np.max(target_arr)), 4))
                elif isinstance(var_val, (int, float)):
                    v_min = str(round(float(var_val), 4))
                    v_max = str(round(float(var_val), 4))
            except Exception:
                pass

            v_preview = str(var_val)
            if len(v_preview) > 35:
                v_preview = v_preview[:32] + "..."

            workspace_vars.append({
                "name": var_name,
                "type": "double" if v_type in ["float", "float64"] else v_type,
                "size": v_size,
                "value": v_preview,
                "min": v_min,
                "max": v_max,
                "raw_preview": str(var_val)[:800]
            })
        MATLAB_SESSIONS[session_id] = session_vars
            
    except Exception as e:
        import traceback, sys
        tb = traceback.extract_tb(sys.exc_info()[2])
        err_line = None
        for frame in reversed(tb):
            if frame.filename == "<string>":
                err_line = frame.lineno
                break
        has_error = True
        error_line = err_line
        formatted_err, _ = format_matlab_error(e, code, err_line)
        console_logs.append(formatted_err)
        
    return {
        "output": "\n".join(console_logs),
        "workspace": workspace_vars,
        "figures": figures_b64,
        "has_error": has_error,
        "error_line": error_line
    }

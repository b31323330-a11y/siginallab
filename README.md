# 📡 SignalLab UZ — Virtual O'quv va Tadqiqot Platformasi

**"Signallar va tasvirlarga ishlov berish" (DSP & DIP)** fani uchun brauzerda ishlaydigan, MATLAB instrumental vositasiga o'xshash interaktiv ta'limiy platforma.

---

## 🌟 Asosiy Imkoniyatlar

1. **20 ta To'liq Laboratoriya Mashg'uloti (2–21):**
   - Nazariya va KaTeX matematik formulalari;
   - Jonli interaktiv parametrlar (1D signal generatori, FFT spektri, 2D kanvas);
   - MATLAB kod namunalari va avtoto'ldirish;
   - Variant jadvallari (har bir talaba uchun 1–20 variant parametrlarini avtomatik to'ldirish);
   - Nazorat savollari va avtomatik test baholash;
   - Avtomatik DOCX hisobot generatsiyasi.
2. **MATLAB Workbench:**
   - Monaco Editor, Command Window, Workspace (o'zgaruvchilar jadvali) va Figure panellari.
3. **Vizual Pipeline:**
   - Kodsiz blokli ishlov berish (react-flow) va MATLAB kodiga eksport.
4. **Sokratik AI Ustoz:**
   - Formulalar, kod xatoliklari va grafik natijalarini tahlil qiluvchi aqlli yordamchi.
5. **O'qituvchi Paneli:**
   - Talabalar progressi, topshirilgan hisobotlarni baholash va savollarni tasdiqlash.

---

## 🚀 Tezkor Ishga Tushirish

### 1-usul: Docker Compose bilan (Tavsiya etiladi)

```bash
docker compose up -d
```
Brauzerda oching: `http://localhost`

### 2-usul: Mahalliy (Local) Ishga Tushirish

1. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Yoki Windows'da `ishga-tushirish.bat` faylini ikki marta bosing.

---

## 👤 Demo Foydalanuvchilar

| Rol | Email | Parol | Variant |
| :--- | :--- | :--- | :--- |
| **Talaba 1** | `talaba1@signallab.uz` | `talaba123` | № 3 |
| **Talaba 2** | `talaba2@signallab.uz` | `talaba123` | № 7 |
| **Talaba 3** | `talaba3@signallab.uz` | `talaba123` | № 15 |
| **O'qituvchi** | `teacher@signallab.uz` | `teacher123` | - |
| **Admin** | `admin@signallab.uz` | `admin123` | - |

---

## 🧪 Avtomatlashtirilgan Testlarni Ishga Tushirish

```bash
# 1. Barcha 20 ta DOCX fayllarning to'g'ri parse qilinganini tekshirish:
python tests/test_docx_parsing.py

# 2. Backend API va DSP hisoblash dvigatelini tekshirish:
python tests/test_backend_api.py

# 3. Frontend TypeScript va Vite yig'ilishini tekshirish:
cd frontend && npm run build
```


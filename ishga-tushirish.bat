@echo off
chcp 65001 > nul
echo ===================================================
echo [*] SignalLab UZ platformasini ishga tushirish
echo ===================================================

echo [1/2] Backend serverini ishga tushirish (port 8000)...
start "SignalLab Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Frontend ilovasini ishga tushirish (port 5173)...
start "SignalLab Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Platforma muvaffaqiyatli ishga tushirildi!
echo Brauzerda oching: http://localhost:5173
echo API hujjatlari: http://127.0.0.1:8000/docs
echo ===================================================
pause


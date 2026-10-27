# -*- coding: utf-8 -*-
"""
SignalLab UZ — Boyitilgan nazorat savollari bazasini yaratish skripti.
Barcha 20 ta laboratoriya uchun 5 tadan aniq, ilmiy va tushunarli test savollari.
"""
import os
import json
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "signallab.db")

QUESTIONS_DATA = {
    2: [
        {
            "q": "Kotelnikov-Nyquist teoremasiga ko'ra, analog signalni yo'qotishsiz diskretlash uchun diskretlash chastotasi Fs qanday bo'lishi kerak?",
            "options": [
                "Fs >= 2 * Fmax (Signalning eng yuqori chastotasidan kamida 2 barobar katta)",
                "Fs <= Fmax / 2 (Eng yuqori chastotadan 2 barobar kichik)",
                "Fs doimiy ravishda 1000 Hz ga teng bo'lishi shart",
                "Fs signalning amplitudasiga mutanosib ravishda tanlanadi"
            ],
            "correct": "Fs >= 2 * Fmax (Signalning eng yuqori chastotasidan kamida 2 barobar katta)",
            "explanation": "Kotelnikov-Shennon teoremasiga ko'ra, agar Fs < 2*Fmax bo'lsa, spektrlar bir-birini qoplab oladi (aliasing yuzaga keladi) va asl signalni tiklab bo'lmaydi."
        },
        {
            "q": "Diskretlash jarayonida yuz beradigan 'Aliasing' (yolg'on chastotalar) effekti nima sababdan kelib chiqadi?",
            "options": [
                "Diskretlash chastotasi Naykvist chegarasidan past bo'lganda yuqori chastotalar past chastotadek ko'rinishi",
                "Signal amplitudasi juda katta bo'lganda kuchaytirgichning to'yinishi",
                "Analog-raqamli o'zgartirgichda bitlar sonining yetishmasligi",
                "Signalga Gaus shovqini qo'shilganda faza siljishi yuz berishi"
            ],
            "correct": "Diskretlash chastotasi Naykvist chegarasidan past bo'lganda yuqori chastotalar past chastotadek ko'rinishi",
            "explanation": "Yetarli tezlikda o'lchanmagan yuqori chastotali tebranishlar diskret namunalar orasida past chastotali to'lqin sifatida namoyon bo'ladi."
        },
        {
            "q": "Kvantlash (Quantization) jarayoni deganda nimani tushunasiz?",
            "options": [
                "Signalning uzluksiz amplituda qiymatlarini chekli sonli diskret sathlarga yaxlitlash",
                "Vaqt o'qini teng intervallarga bo'lib chiqish",
                "Signal spektridagi barcha garmonikalarni nolga tenglashtirish",
                "Ikki signalni o'zaro ko'paytirish amali"
            ],
            "correct": "Signalning uzluksiz amplituda qiymatlarini chekli sonli diskret sathlarga yaxlitlash",
            "explanation": "Diskretlash vaqt bo'yicha uzilish hosil qilsa, kvantlash amplituda sathlari bo'yicha yaxlitlash (masalan, 8-bitda 256 ta sath)ni anglatadi."
        },
        {
            "q": "Signalning eng yuqori chastotasi Fmax = 4 kHz bo'lsa, uni yo'qotishsiz tiklash uchun eng kichik diskretlash chastotasi qancha bo'lishi lozim?",
            "options": [
                "8 kHz (8000 Hz)",
                "4 kHz (4000 Hz)",
                "2 kHz (2000 Hz)",
                "16 kHz (16000 Hz)"
            ],
            "correct": "8 kHz (8000 Hz)",
            "explanation": "Naykvist sharti: Fs_min = 2 * Fmax = 2 * 4000 Hz = 8000 Hz (8 kHz)."
        },
        {
            "q": "Kvantlash shovqini (shovqin quvvati)ni kamaytirishning eng samarali yo'li nima?",
            "options": [
                "Kvantlash razryadlari (bitlar soni N)ni oshirish",
                "Diskretlash vaqt qadamini kattalashtirish",
                "Signalning boshlang'ich fazasini 180 gradusga burish",
                "Signalni to'g'ri to'rtburchakli deraza bilan kesib olish"
            ],
            "correct": "Kvantlash razryadlari (bitlar soni N)ni oshirish",
            "explanation": "Har bir qo'shimcha 1 bit kvantlash sathlari sonini 2 barobar oshirib, SNR (signal/shovqin) nisbatini taxminan 6 dB ga yaxshilaydi."
        }
    ],
    3: [
        {
            "q": "Garmonik signalning to'liq matematik ifodasi s(t) = A * sin(2*pi*F*t + phi) da 'phi' nimani ifodalaydi?",
            "options": [
                "Boshlang'ich faza burchagi (t=0 vaqtdagi holat)",
                "Signalning tebranish davri (sekundda)",
                "Signalning so'nish koeffitsiyenti",
                "Spektral chiziqlar soni"
            ],
            "correct": "Boshlang'ich faza burchagi (t=0 vaqtdagi holat)",
            "explanation": "Phi (faza) tebranishning t=0 vaqt momentidagi burchakli siljishini ifodalaydi va to'lqin qayerdan boshlanishini belgilaydi."
        },
        {
            "q": "Bir xil amplituda va chastotali ikkita garmonika fazalar farqi phi = pi (180°) bo'lganda o'zaro qo'shilsa (interferensiya), natijaviy amplituda nima bo'ladi?",
            "options": [
                "0 ga teng bo'ladi (tebranishlar bir-birini butunlay so'ndiradi)",
                "2 barobar ortadi (2 * A bo'ladi)",
                "O'zgarmasdan A darajasida qoladi",
                "Kvadrat ildiz ostida 2 barobar ortadi"
            ],
            "correct": "0 ga teng bo'ladi (tebranishlar bir-birini butunlay so'ndiradi)",
            "explanation": "sin(wt) + sin(wt + pi) = sin(wt) - sin(wt) = 0. Qarama-qarshi fazadagi signallar bir-birini destruktiv interferensiya tufayli so'ndiradi."
        },
        {
            "q": "Amplitudasi A = 2 V bo'lgan sinusoidal garmonik signalning samarali (RMS) qiymati qanchaga teng?",
            "options": [
                "A / sqrt(2) ≈ 1.414 V",
                "A * 2 = 4 V",
                "A / 2 = 1 V",
                "A^2 = 4 V"
            ],
            "correct": "A / sqrt(2) ≈ 1.414 V",
            "explanation": "Sinusoidal signalning Root Mean Square (RMS) qiymati eng yuqori amplitudasining ildiz ostida 2 ga bo'linganiga teng: 2 / 1.414 ≈ 1.414 V."
        },
        {
            "q": "Chastotasi F = 50 Hz bo'lgan sanoat tarmog'i elektr tebranishining bir to'liq davri T qancha vaqt davom etadi?",
            "options": [
                "0.02 sekund (20 millisekund)",
                "0.05 sekund (50 millisekund)",
                "0.2 sekund (200 millisekund)",
                "0.002 sekund (2 millisekund)"
            ],
            "correct": "0.02 sekund (20 millisekund)",
            "explanation": "Tebranish davri: T = 1 / F = 1 / 50 = 0.02 s = 20 ms."
        },
        {
            "q": "MATLAB dasturida 0 dan 1 sekundgacha 1000 ta nuqtadan iborat vaqt vektori qanday to'g'ri yaratiladi?",
            "options": [
                "t = linspace(0, 1, 1000); yoki t = 0:0.001:1;",
                "t = [0, 1000, 1];",
                "t = time(0, 1);",
                "t = rand(1000);"
            ],
            "correct": "t = linspace(0, 1, 1000); yoki t = 0:0.001:1;",
            "explanation": "MATLAB da linspace(bosh, oxir, soni) funksiyasi yoki 'bosh:qadam:oxir' operatori teng oraliqli vaqt vektorini shakllantiradi."
        }
    ],
    4: [
        {
            "q": "Furye qatori (Fourier Series) ning asosiy fizik mohiyati nimadan iborat?",
            "options": [
                "Ixtiyoriy davriy signalni cheksiz sinus va kosinus garmonikalari yig'indisi ko'rinishida tasvirlash",
                "Signalni faqat tasodifiy oq shovqinga aylantirish",
                "Tasvir o'lchamini piksellar bo'yicha siqish",
                "Signalning barcha amplituda qiymatlarini manfiy songa aylantirish"
            ],
            "correct": "Ixtiyoriy davriy signalni cheksiz sinus va kosinus garmonikalari yig'indisi ko'rinishida tasvirlash",
            "explanation": "Jozef Furye kashfiyotiga binoan, har qanday davriy signal asosiy chastota va unga karrali garmonik tebranishlar yig'indisidan iborat."
        },
        {
            "q": "Simmetrik to'g'ri to'rtburchakli (meandr) impulsli signal Furye qatoriga yoyilganda spektrida qanday garmonikalar mavjud bo'ladi?",
            "options": [
                "Faqat toq garmonikalar (1, 3, 5, 7...)",
                "Faqat juft garmonikalar (2, 4, 6...)",
                "Barcha garmonikalar bir xil amplituda bilan mavjud bo'ladi",
                "Hech qanday garmonika bo'lmaydi, faqat o'zgarmas doimiy tashkil etuvchi qoladi"
            ],
            "correct": "Faqat toq garmonikalar (1, 3, 5, 7...)",
            "explanation": "Simmetrik to'rtburchak signal yarim to'lqinli antisimmetriyaga ega bo'lgani sababli barcha juft garmonikalar nollashadi va faqat toq garmonikalar qoladi."
        },
        {
            "q": "Chekli miqdordagi Furye garmonikalari yig'indisi orqali to'g'ri to'rtburchak signal tiklanganda uzilish nuqtalaridagi tebranish qulochi (Gibbs fenomeni) qancha foizni tashkil etadi?",
            "options": [
                "Taxminan 9% (aniqrog'i 8.95%) ortiqcha sakrash",
                "0% (umuman sakrash bo'lmaydi)",
                "50% sakrash",
                "100% (ikki barobar kattalashadi)"
            ],
            "correct": "Taxminan 9% (aniqrog'i 8.95%) ortiqcha sakrash",
            "explanation": "Gibbs fenomeni uzilish nuqtalarida chekli qator yig'indisi uzluksiz to'lqinlar bilan tiklanganda sakrash balandligining ~9% ga oshishini ifodalaydi."
        },
        {
            "q": "Signalning spektridagi 'asosiy garmonika' (1-garmonika) deganda nimani tushunasiz?",
            "options": [
                "Signalning asosiy takrorlanish davriga teng bo'lgan eng past chastotali tebranish",
                "Spektrdagi eng yuqori chastotali komponent",
                "Signaldagi tasodifiy shovqin komponenti",
                "Signalning o'zgarmas doimiy toki (DC offset)"
            ],
            "correct": "Signalning asosiy takrorlanish davriga teng bo'lgan eng past chastotali tebranish",
            "explanation": "1-garmonika (fundamental frequency) davriy signalning takrorlanish davriga (f0 = 1/T) to'g'ri keluvchi eng muhim tayanch garmonikadir."
        },
        {
            "q": "Furye qatori yoyilmasida a0 koeffitsiyenti nimani anglatadi?",
            "options": [
                "Signalning bir davr davomidagi o'rtacha qiymati (o'zgarmas komponent / DC offset)",
                "Signalning maksimal amplitudasi",
                "Signalning fazaviy siljishi",
                "Signalning umumiy davomiyligi"
            ],
            "correct": "Signalning bir davr davomidagi o'rtacha qiymati (o'zgarmas komponent / DC offset)",
            "explanation": "a0 koeffitsiyenti f(t) ning bir to'liq davrdagi integrali (o'rtacha sathi) bo'lib, signaldagi doimiy tok yoki yorqinlik siljishini ifodalaydi."
        }
    ],
    5: [
        {
            "q": "Diskret Furye Almashtirishi (DFT) va Tez Furye Almashtirishi (FFT) o'rtasidagi asosiy farq nima?",
            "options": [
                "FFT — bu DFT natijasini o'zgartirmasdan, hisoblash murakkabligini O(N^2) dan O(N*log2(N)) ga kamaytiruvchi tezkor algoritm",
                "FFT analog signallar uchun, DFT esa raqamli signallar uchun mo'ljallangan",
                "DFT to'g'ri spektr beradi, FFT esa faqat taxminiy baholash hisoblanadi",
                "FFT da faqat amplituda hisoblanadi, faza spektri hisoblanmaydi"
            ],
            "correct": "FFT — bu DFT natijasini o'zgartirmasdan, hisoblash murakkabligini O(N^2) dan O(N*log2(N)) ga kamaytiruvchi tezkor algoritm",
            "explanation": "Kuli-Tyuki (Cooley-Tukey) FFT algoritmi simmetriya va davriylik xossalaridan foydalanib hisoblash amallari sonini keskin kamaytiradi."
        },
        {
            "q": "N = 1024 nuqtali massiv uchun klassik DFT amallari soni ~1 000 000 ta bo'lsa, FFT algoritmi qancha amal bajaradi?",
            "options": [
                "N * log2(N) = 1024 * 10 ≈ 10 240 ta amal (taxminan 100 barobar tez)",
                "1024 ta amal",
                "500 000 ta amal",
                "10 ta amal"
            ],
            "correct": "N * log2(N) = 1024 * 10 ≈ 10 240 ta amal (taxminan 100 barobar tez)",
            "explanation": "FFT hisoblash sonini N^2 dan N*log2(N) ga tushiradi. 1024 nuqtada 1 048 576 dan 10 240 gacha qisqaradi."
        },
        {
            "q": "FFT natijasida olingan spektr chiziqlari orasidagi chastota ruxsati (chastota qadami delta_f) qanday hisoblanadi?",
            "options": [
                "delta_f = Fs / N (Diskretlash chastotasini namunalar soniga bo'lish orqali)",
                "delta_f = Fs * N",
                "delta_f = N / Fs",
                "delta_f = 1 / N"
            ],
            "correct": "delta_f = Fs / N (Diskretlash chastotasini namunalar soniga bo'lish orqali)",
            "explanation": "Chastota aniqligi signalning tahlil qilinayotgan umumiy davomiyligi T ga teskari proporsionaldir: delta_f = 1/T = Fs / N."
        },
        {
            "q": "Haqiqiy (real) kirish signallari uchun FFT spektri qanday simmetriyaga ega bo'ladi?",
            "options": [
                "Amplituda spektri Naykvist chastotasiga (Fs/2) nisbatan juft simmetrik bo'ladi",
                "To'liq asimmetrik bo'ladi",
                "Faqat manfiy chastotalar saqlanadi",
                "Barcha qiymatlar kompleks tekislikda nolga tenglashadi"
            ],
            "correct": "Amplituda spektri Naykvist chastotasiga (Fs/2) nisbatan juft simmetrik bo'ladi",
            "explanation": "Haqiqiy sonli kirish signallarining Furye spektri kompleks qo'shma bo'ladi (|X[k]| = |X[N-k]|), shu sababli spektrning faqat 0 dan Fs/2 gacha yarmi tahlil qilinadi."
        },
        {
            "q": "MATLAB dasturida N nuqtali signal x ning Furye spektrining magnitudasini olish buyrug'i qaysi?",
            "options": [
                "abs(fft(x))",
                "angle(fft(x))",
                "real(fft(x))",
                "imag(fft(x))"
            ],
            "correct": "abs(fft(x))",
            "explanation": "fft(x) kompleks sonlar massivini qaytaradi. abs() funksiyasi esa uning modulini (magnitudasini) hisoblab beradi."
        }
    ],
    6: [
        {
            "q": "Chiziqli statsionar (LTI) tizimda chiqish signali y[n] kirish x[n] va impulsli reaksiya h[n] orqali qanday aniqlanadi?",
            "options": [
                "Diskret konvolyutsiya amali orqali: y[n] = x[n] * h[n]",
                "Ularni oddiy elementma-element ko'paytirish orqali",
                "Signallarni bir-biridan ayirish orqali",
                "Faqat differensial tenglamalar yechish orqali"
            ],
            "correct": "Diskret konvolyutsiya amali orqali: y[n] = x[n] * h[n]",
            "explanation": "LTI tizimning kirish ta'siriga javobi kirish signali va tizimning impulsli reaksiyasining diskret konvolyutsiyasiga tengdir."
        },
        {
            "q": "Uzunligi Lx = 3 va Lh = 3 bo'lgan ikkita diskret signalning konvolyutsiyasi natijasida hosil bo'ladigan vektor uzunligi Ly qancha bo'ladi?",
            "options": [
                "Lx + Lh - 1 = 3 + 3 - 1 = 5 ta namuna",
                "Lx * Lh = 9 ta namuna",
                "Lx + Lh = 6 ta namuna",
                "3 ta namuna"
            ],
            "correct": "Lx + Lh - 1 = 3 + 3 - 1 = 5 ta namuna",
            "explanation": "Chiziqli konvolyutsiya uzunligi qoidasi: Ly = Lx + Lh - 1. Shuning uchun 3 va 3 o'lchamli signallar uchun 5 chiqadi."
        },
        {
            "q": "Konvolyutsiyaning kommutativlik (o'rin almashtirish) qoidasi nimani bildiradi?",
            "options": [
                "x[n] * h[n] = h[n] * x[n] (signallar o'rni almashgani bilan natija o'zgarmaydi)",
                "Konvolyutsiya faqat musbat sonlar uchun o'rinli ekanligini",
                "Signal uzunligi cheksizga intilishini",
                "Faza har doim 90 gradusga burilishini"
            ],
            "correct": "x[n] * h[n] = h[n] * x[n] (signallar o'rni almashgani bilan natija o'zgarmaydi)",
            "explanation": "Konvolyutsiya integrali va yig'indisi simmetrik bo'lib, tizim reaksiyasini kirish bilan yoki aksincha buralishini teng qiymatda beradi."
        },
        {
            "q": "Chastota sohasida ko'paytirish vaqt sohasidagi qaysi amalga to'g'ri keladi?",
            "options": [
                "Konvolyutsiya amaliga (Convolution theorem)",
                "Differensiallash amaliga",
                "Oddiy qo'shish amaliga",
                "Signalni teskari aylantirishga"
            ],
            "correct": "Konvolyutsiya amaliga (Convolution theorem)",
            "explanation": "Furye almashtirishining konvolyutsiya teoremasiga ko'ra: F{x * h} = X(w) * H(w). Vaqt sohasidagi konvolyutsiya chastota sohasida ko'paytirishga aylanadi."
        },
        {
            "q": "MATLAB dasturida ikkita vektor x va h ning konvolyutsiyasini hisoblovchi standart funksiya qaysi?",
            "options": [
                "conv(x, h)",
                "convolve(x, h)",
                "fft_mult(x, h)",
                "dot(x, h)"
            ],
            "correct": "conv(x, h)",
            "explanation": "MATLAB da conv() funksiyasi 1D konvolyutsiyani, conv2() esa tasvirlar uchun 2D konvolyutsiyani hisoblaydi."
        }
    ],
    8: [
        {
            "q": "Raqamli tasvirlarga impulsli (tuz-qalampir / Salt and Pepper) shovqin tushganda qaysi filtr eng yaxshi natija beradi?",
            "options": [
                "Median filtri (Chiziqsiz tartib statistikasi filtri)",
                "O'rtacha arifmetik (Mean) silliqlash filtri",
                "Laplasian chekka charxlovchi filtri",
                "Yuqori chastotali o'tkazuvchi filtr"
            ],
            "correct": "Median filtri (Chiziqsiz tartib statistikasi filtri)",
            "explanation": "Median filtri piksel atrofidagi qiymatlarni tartiblab o'rtadagi qiymatni tanlaydi, natijada ekstremal oq (255) va qora (0) shovqin piksellari to'liq bartaraf etiladi va qirralar yuvilmaydi."
        },
        {
            "q": "3x3 o'lchamli fazoviy filtr yadrosida (maska) jami nechta qo'shni piksel ishtirok etadi?",
            "options": [
                "9 ta piksel",
                "3 ta piksel",
                "6 ta piksel",
                "12 ta piksel"
            ],
            "correct": "9 ta piksel",
            "explanation": "3x3 filtr matritsasi markaziy piksel va uning atrofidagi 8 ta qo'shnisi, jami 3 * 3 = 9 ta pikseldan iborat bo'ladi."
        },
        {
            "q": "O'rtacha qiymat (Mean/Averaging) filtrining tasvirga ta'siri qanday bo'ladi?",
            "options": [
                "Tasvirni xiralashtiradi (silliqlaydi) va shovqinni kamaytiradi, ammo qirralarni ham noaniq qiladi",
                "Tasvir kontrastini keskin oshiradi",
                "Tasvirni faqat ikkita rangga (qora va oq) ajratadi",
                "Tasvirni 90 gradusga buradi"
            ],
            "correct": "Tasvirni xiralashtiradi (silliqlaydi) va shovqinni kamaytiradi, ammo qirralarni ham noaniq qiladi",
            "explanation": "Mean filtri barcha qo'shni piksellarning o'rtachasini olgani uchun yuqori chastotali detallarni (shu jumladan qirralarni ham) yuvib yuboradi."
        },
        {
            "q": "Gaus filtri (Gaussian Filter) ning o'ziga xos xususiyati nimada?",
            "options": [
                "Markaziy pikselga eng katta vazn beriladi, markazdan uzoqlashgan sari vaznlar qo'ng'iroqsimon egri chiziq bo'yicha kamayadi",
                "Barcha koeffitsiyentlar faqat 0 yoki 1 ga teng bo'ladi",
                "Faqat burchaklardagi 4 ta piksel o'rtachasini hisoblaydi",
                "Tasvirdagi ranglarni teskari invertatsiya qiladi"
            ],
            "correct": "Markaziy pikselga eng katta vazn beriladi, markazdan uzoqlashgan sari vaznlar qo'ng'iroqsimon egri chiziq bo'yicha kamayadi",
            "explanation": "Gaus taqsimoti asosidagi yadro markazdagi piksellarga katta ahamiyat berib, chetlarni silliq so'ndirgani sababli tabiiy silliqlash effektini beradi."
        },
        {
            "q": "MATLAB dasturida 2 o'lchamli median filtrlash qaysi buyruq yordamida amalga oshiriladi?",
            "options": [
                "medfilt2(I, [3 3])",
                "filter2(I)",
                "imfilter_median(I)",
                "smooth(I)"
            ],
            "correct": "medfilt2(I, [3 3])",
            "explanation": "medfilt2(I, [m n]) MATLAB ning Image Processing Toolbox da 2D median filtrlash standart operatoridir."
        }
    ],
    9: [
        {
            "q": "Matematik morfologiyadagi 'Eroziya' (Erosion) operatsiyasining asosiy vazifasi nima?",
            "options": [
                "Obyekt chegaralarini yemirib qisqartirish va mayda oq shovqin nuqtalarini yo'qotish",
                "Obyekt chegaralarini qalinlashtirib kengaytirish",
                "Tasvirning ranglarini RGB dan HSV ga aylantirish",
                "Tasvir o'lchamini ikki barobar kattalashtirish"
            ],
            "correct": "Obyekt chegaralarini yemirib qisqartirish va mayda oq shovqin nuqtalarini yo'qotish",
            "explanation": "Eroziya strukturaviy element sig'magan chekka piksellarni yo'qotadi, natijada obyekt yupqalashadi va oraliq ko'prikchalar uziladi."
        },
        {
            "q": "Morfologik 'Dilatatsiya' (Dilation) amali tasvirga qanday ta'sir ko'rsatadi?",
            "options": [
                "Obyekt maydonini kengaytiradi, uzilgan chiziqlarni ulaydi va ichki qora teshiklarni to'ldiradi",
                "Obyektni butunlay o'chirib tashlaydi",
                "Tasvirning ravshanligini pasaytiradi",
                "Spektrdagi past chastotalarni kesib tashlaydi"
            ],
            "correct": "Obyekt maydonini kengaytiradi, uzilgan chiziqlarni ulaydi va ichki qora teshiklarni to'ldiradi",
            "explanation": "Dilatatsiya strukturaviy element markazi obyektga tekkanda uning barcha qo'shnilarini 1 ga aylantirib, shaklni kattalashtiradi."
        },
        {
            "q": "Morfologik 'Ochish' (Opening) operatsiyasi ketma-ket qaysi ikkita amalning bajarilishidan iborat?",
            "options": [
                "Dastlab Eroziya, so'ngra Dilatatsiya (Opening = Dilation(Erosion))",
                "Dastlab Dilatatsiya, so'ngra Eroziya (Closing)",
                "Ikkita ketma-ket Eroziya amali",
                "Tasvirni inversiya qilish va qo'shish"
            ],
            "correct": "Dastlab Eroziya, so'ngra Dilatatsiya (Opening = Dilation(Erosion))",
            "explanation": "Ochish amali avval eroziya qilib mayda shovqinlarni yo'qotadi, so'ngra dilatatsiya qilib asosiy obyekt hajmini asl holiga qaytaradi."
        },
        {
            "q": "Morfologik 'Yopish' (Closing) amali qachon eng ko'p qo'llaniladi?",
            "options": [
                "Obyekt ichidagi mayda qora tirqishlar, teshiklar va uzilishlarni yopish kerak bo'lganda",
                "Tasvirning umumiy yorug'ligini kamaytirish uchun",
                "Tasvirni internetga yuklashdan oldin siqish uchun",
                "FFT hisoblashni tezlashtirish uchun"
            ],
            "correct": "Obyekt ichidagi mayda qora tirqishlar, teshiklar va uzilishlarni yopish kerak bo'lganda",
            "explanation": "Yopish (avval dilatatsiya, so'ng eroziya) obyekt konturlarini birlashtirib, mayda oraliq bo'shliqlarni to'ldirish uchun xizmat qiladi."
        },
        {
            "q": "MATLAB da strukturaviy element (Structuring Element) yaratish uchun qaysi funksiya ishlatiladi?",
            "options": [
                "strel('disk', radius) yoki strel('square', width)",
                "create_element()",
                "morph_mask()",
                "matrix_shape()"
            ],
            "correct": "strel('disk', radius) yoki strel('square', width)",
            "explanation": "strel funksiyasi disk, kvadrat, romb yoki chiziq shaklidagi morfologik yadrolarni yaratadi."
        }
    ],
    11: [
        {
            "q": "2D DCT (Diskret Kosinus Almashtirishi) ning tasvirlarni siqishdagi eng asosiy afzalligi nima?",
            "options": [
                "Energiyani zichlashtirish (Energy Compaction) — asosiy axborotni blokning yuqori chap burchagidagi sanoqli koeffitsiyentlarga to'plashi",
                "Tasvirning barcha piksellarini 0 ga aylantirishi",
                "Tasvir ranglarini RGB dan CMYK ga o'tkazishi",
                "Faylni avtomatik ZIP arxiviga aylantirishi"
            ],
            "correct": "Energiyani zichlashtirish (Energy Compaction) — asosiy axborotni blokning yuqori chap burchagidagi sanoqli koeffitsiyentlarga to'plashi",
            "explanation": "DCT tasvir blokidagi piksellararo bog'liqlikni (korrelyatsiyani) yo'qotib, 90%+ energiyani eng pastki bir necha kosinus koeffitsiyentlariga yig'ib beradi."
        },
        {
            "q": "8x8 piksel o'lchamli DCT blokida (0,0) indeksdagi eng birinchi koeffitsiyent qanday nomlanadi?",
            "options": [
                "DC (Direct Current) koeffitsiyenti — blokning o'rtacha yorqinligi",
                "AC (Alternating Current) koeffitsiyenti",
                "Naykvist koeffitsiyenti",
                "Shovqin koeffitsiyenti"
            ],
            "correct": "DC (Direct Current) koeffitsiyenti — blokning o'rtacha yorqinligi",
            "explanation": "DC koeffitsiyenti nolinchi chastotaga mos keladi va 8x8 piksel blokining o'rtacha yorug'lik intensivligini ifodalaydi. Qolgan 63 tasi AC koeffitsiyentlardir."
        },
        {
            "q": "JPEG siqish standartida DCT koeffitsiyentlari nima uchun zig-zag tartibida saralanadi?",
            "options": [
                "Past chastotali katta qiymatlardan nollashgan yuqori chastotali koeffitsiyentlarga qarab ketma-ketlik hosil qilib, RLE siqish samaradorligini oshirish uchun",
                "Kodni shifrlash va xavfsizlikni ta'minlash uchun",
                "Inson ko'zini aldash uchun",
                "Protsessor xotirasini tejash uchun"
            ],
            "correct": "Past chastotali katta qiymatlardan nollashgan yuqori chastotali koeffitsiyentlarga qarab ketma-ketlik hosil qilib, RLE siqish samaradorligini oshirish uchun",
            "explanation": "Kvantlashdan so'ng yuqori chastotalar nolga aylanadi. Zig-zag tartibi bu nollarni oxiriga yig'ib beradi va Run-Length Encoding da bir nechta nolni bitta son bilan kodlashga imkon yaratadi."
        },
        {
            "q": "DCT almashtirishida qaysi koeffitsiyentlarni nollashtirish tasvir sifatiga eng kam ta'sir ko'rsatadi?",
            "options": [
                "Yuqori fazoviy chastotali mayda tebranish koeffitsiyentlarini",
                "DC (o'rtacha yorqinlik) koeffitsiyentini",
                "Past chastotali 1-tartibli tebranishlarni",
                "Barcha koeffitsiyentlar bir xil darajada ta'sir qiladi"
            ],
            "correct": "Yuqori fazoviy chastotali mayda tebranish koeffitsiyentlarini",
            "explanation": "Inson ko'rish tizimi mayda yuqori chastotali detallarga unchalik sezgir emas, shu sababli ularni olib tashlash inson ko'ziga sezilarsiz yo'qotish bilan katta hajm tejaydi."
        },
        {
            "q": "Kvantlash matritsasidagi qiymatlar oshirilganda (masalan Q ko'paytuvchisi 50 dan 10 gacha o'zgarganda) siqish va sifat qanday o'zgaradi?",
            "options": [
                "Siqish darajasi oshadi (fayl hajmi kichrayadi), ammo blokli artefaktlar va sifat yo'qolishi ortadi",
                "Sifat oshadi va fayl hajmi ham kattalashadi",
                "Hech narsa o'zgarmaydi",
                "Fayl formati PNG ga aylanadi"
            ],
            "correct": "Siqish darajasi oshadi (fayl hajmi kichrayadi), ammo blokli artefaktlar va sifat yo'qolishi ortadi",
            "explanation": "Kvantlash qadami kattalashganda ko'proq koeffitsiyentlar nolga yaxlitlanadi, natijada siqilish kuchayadi, lekin tasvirda 8x8 kvadrat bloklar ko'rinib qolishi mumkin."
        }
    ],
    13: [
        {
            "q": "STFT (Qisqa vaqtli Furye almashtirishi)da oyna uzunligi nima uchun odatda 10–30 ms oralig'ida tanlanadi?",
            "options": [
                "Inson nutq signali ushbu qisqa vaqt oralig'ida kvazistatsionar xususiyatga ega bo'lganligi sababli",
                "Matematik jihatdan FFT algoritmi faqat 10-30 ms uzunlikdagi massivlar bilan ishlay olgani uchun",
                "Ovoz balandligini avtomatik 0 dB gacha pasaytirish maqsadida",
                "Signalning faqat yuqori chastotali garmonikalarini filtrlab tashlash uchun"
            ],
            "correct": "Inson nutq signali ushbu qisqa vaqt oralig'ida kvazistatsionar xususiyatga ega bo'lganligi sababli",
            "explanation": "Nutq signali doimiy o'zgaruvchan (nostatsionar) jarayondir. Biroq unli tovushlar talaffuzida vokal trakt 10-30 ms oralig'ida deyarli o'zgarmaydi (kvazistatsionar)."
        },
        {
            "q": "Nutq signallarini tahlil qilishda Hamming yoki Hanning deraza (oyna) funksiyasidan foydalanishning asosiy maqsadi nima?",
            "options": [
                "To'g'ri to'rtburchakli oyna chetlarida yuzaga keladigan spektral qochishlarni (spectral leakage) kamaytirish",
                "Signalning umumiy energiyasini 2 barobar kuchaytirish",
                "Fazalar farqini sun'iy ravishda 90 gradusga siljitish",
                "Nutq signalini analog shaklga qaytarib tiklash"
            ],
            "correct": "To'g'ri to'rtburchakli oyna chetlarida yuzaga keladigan spektral qochishlarni (spectral leakage) kamaytirish",
            "explanation": "Signalni to'g'ri to'rtburchak shaklida kesib olish chetlarda keskin sakrash hosil qilib spektrda noto'g'ri garmonikalar (yon barglar) keltirib chiqaradi. Hamming oynasi chetlarni silliqlaydi."
        },
        {
            "q": "LPC (Linear Predictive Coding - Chiziqli bashorat) modelida filtri tartibi p = 12 bo'lsa, nazariy jihatdan vokal traktining maksimal nechta rezonans formantini aniqlash mumkin?",
            "options": [
                "6 ta juft formant rezonansi",
                "12 ta mustaqil rezonans",
                "24 ta chastota qutbi",
                "Faqat 1 ta asosiy ton (pitch)"
            ],
            "correct": "6 ta juft formant rezonansi",
            "explanation": "Raqamli filtrda har bir rezonans cho'qqi (formant) 2 ta kompleks qo'shma qutb bilan ifodalanadi. Shuning uchun p=12 da formantlar soni p / 2 = 6 ta bo'ladi."
        },
        {
            "q": "Zero-Crossing Rate (ZCR — Signalning noldan o'tishlar sur'ati) parametri nutq signalida asosan nimani ajratish uchun xizmat qiladi?",
            "options": [
                "Shovqinli undosh (unvoiced) va ohangdor unli (voiced) tovushlarni bir-biridan ajratish",
                "Mikrofonning kirish sezgirligi va batareya quvvatini o'lchash",
                "Audio faylning siqilish darajasi va bitrate tezligini hisoblash",
                "Stereo kanallarni chap va o'ng karnaylarga taqsimlash"
            ],
            "correct": "Shovqinli undosh (unvoiced) va ohangdor unli (voiced) tovushlarni bir-biridan ajratish",
            "explanation": "Shovqinli undosh tovushlar (masalan: [s], [sh], [f]) yuqori chastotali tasodifiy jarayon bo'lib, ularda ZCR juda yuqori bo'ladi. Unli tovushlarda esa ZCR past bo'ladi."
        },
        {
            "q": "Inson ovozining asosiy tebranish chastotasi (Pitch / f0) odatda qaysi diapazonda bo'ladi?",
            "options": [
                "Erkaklarda ~85–180 Hz, ayollarda ~165–255 Hz oralig'ida",
                "20 kHz dan 40 kHz gacha ultratovush oralig'ida",
                "1 Hz dan 10 Hz gacha infratovush oralig'ida",
                "Doimiy ravishda 44100 Hz ga teng bo'ladi"
            ],
            "correct": "Erkaklarda ~85–180 Hz, ayollarda ~165–255 Hz oralig'ida",
            "explanation": "Asosiy ton (Pitch f0) ovoz paychalarining tebranish chastotasi bo'lib, erkaklarda o'rtacha 85-180 Hz, ayollarda 165-255 Hz, bolalarda esa 300 Hz gacha yetadi."
        }
    ],
    14: [
        {
            "q": "Parseval teoremasining raqamli signallarga ishlov berishdagi asosiy mazmuni nimada?",
            "options": [
                "Signalning vaqt sohasidagi to'liq energiyasi uning chastota sohasidagi spektral energiyasiga tengdir",
                "Signal energiyasi uning davomiyligiga har doim teskari proporsional",
                "Har qanday signalning o'rtacha quvvati 0 ga teng bo'ladi",
                "Chastota spektri faqat manfiy qiymatlardan iborat bo'ladi"
            ],
            "correct": "Signalning vaqt sohasidagi to'liq energiyasi uning chastota sohasidagi spektral energiyasiga tengdir",
            "explanation": "Parseval teoremasiga ko'ra: sum(|x[n]|^2) = (1/N) * sum(|X[k]|^2). Ya'ni soha o'zgargani bilan umumiy energiya saqlanadi."
        },
        {
            "q": "Signal-shovqin nisbati SNR (Signal-to-Noise Ratio) ning desibellarda (dB) hisoblash formulasi qaysi?",
            "options": [
                "SNR = 10 * log10(P_signal / P_noise)",
                "SNR = P_signal - P_noise",
                "SNR = P_signal * P_noise",
                "SNR = 20 * (P_signal / P_noise)"
            ],
            "correct": "SNR = 10 * log10(P_signal / P_noise)",
            "explanation": "Quvvatlar nisbatining o'nli logarifmi 10 ga ko'paytirilganda quvvatning desibeldagi ifodasi olinadi."
        },
        {
            "q": "Davriy signallar qaysi sinf signallariga kiradi?",
            "options": [
                "Quvvat signallari (cheksiz vaqtda energiyasi cheksiz, lekin o'rtacha quvvati chekli)",
                "Energiya signallari (energiyasi chekli)",
                "Tasodifiy oq shovqin signallari",
                "Nostatsionar kvant signallari"
            ],
            "correct": "Quvvat signallari (cheksiz vaqtda energiyasi cheksiz, lekin o'rtacha quvvati chekli)",
            "explanation": "Cheksiz davom etuvchi garmonik signallarning integrallangan energiyasi cheksizga intiladi, ammo bitta davrdagi o'rtacha quvvati aniq chekli qiymatga ega bo'ladi."
        },
        {
            "q": "Diskret signal x[n] ning N ta namunadagi o'rtacha quvvati P qanday hisoblanadi?",
            "options": [
                "P = (1/N) * sum(x[n]^2)",
                "P = sum(x[n]) / N",
                "P = max(x[n]) * min(x[n])",
                "P = N * sum(x[n]^2)"
            ],
            "correct": "P = (1/N) * sum(x[n]^2)",
            "explanation": "O'rtacha quvvat barcha namunalar kvadratlari yig'indisini namunalar soni N ga bo'lish orqali topiladi."
        },
        {
            "q": "Agar signalning SNR ko'rsatkichi 0 dB ga teng bo'lsa, bu nimani anglatadi?",
            "options": [
                "Foydali signal quvvati shovqin quvvatiga teng (P_signal = P_noise)",
                "Signalda umuman shovqin yo'q",
                "Foydali signal butunlay o'chib qolgan",
                "Shovqin signalga nisbatan 100 barobar kuchli"
            ],
            "correct": "Foydali signal quvvati shovqin quvvatiga teng (P_signal = P_noise)",
            "explanation": "10 * log10(1) = 0 dB. Demak P_signal / P_noise = 1 bo'lganda SNR = 0 dB bo'ladi."
        }
    ],
    17: [
        {
            "q": "HSV rang modelida 'H' (Hue) komponenti nimani ifodalaydi?",
            "options": [
                "Rang tusini (0° dan 360° gacha bo'lgan burchakda sof rang spektri)",
                "Rangning to'yinganligi (0 dan 100% gacha)",
                "Pikselning umumiy yorug'lik intensivligini",
                "Shovqin darajasini"
            ],
            "correct": "Rang tusini (0° dan 360° gacha bo'lgan burchakda sof rang spektri)",
            "explanation": "HSV da H — Hue (rang tusi: qizil, yashil, ko'k), S — Saturation (to'yinganlik), V — Value (yorqinlik) demakdir."
        },
        {
            "q": "Kompyuter ko'rishda obyektlarni rangiga qarab ajratishda (masalan, yashil koptokni topish) nima uchun RGB dan ko'ra HSV modeli afzalroq?",
            "options": [
                "HSV da rang tusi (H) yoritilish darajasi (V) dan mustaqil ajratilgan bo'lib, soyalar va yorug'lik o'zgarishi rang aniqlashga xalaqit bermaydi",
                "RGB modeli faqat oq-qora tasvirlarni qo'llab-quvvatlaydi",
                "HSV modeli tasvir hajmini 10 barobar siqib beradi",
                "RGB modelida faqat 8 ta rang mavjud"
            ],
            "correct": "HSV da rang tusi (H) yoritilish darajasi (V) dan mustaqil ajratilgan bo'lib, soyalar va yorug'lik o'zgarishi rang aniqlashga xalaqit bermaydi",
            "explanation": "RGB da yoritilish o'zgarsa R, G va B ning uchalasi ham o'zgaradi. HSV da esa rang tusi H o'zgarmasdan qolib, faqat V o'zgaradi."
        },
        {
            "q": "RGB rangli tasvirni kulrang (grayscale) tasvirga o'tkazishda inson ko'zining sezgirligini hisobga olgan etalon NTSC formulasi qaysi?",
            "options": [
                "Y = 0.299 * R + 0.587 * G + 0.114 * B",
                "Y = (R + G + B) / 3",
                "Y = max(R, G, B)",
                "Y = R * G * B"
            ],
            "correct": "Y = 0.299 * R + 0.587 * G + 0.114 * B",
            "explanation": "Inson ko'zi yashil (G) rangga eng sezgir (58.7%), qizilga o'rtacha (29.9%) va ko'k rangga eng kam sezgir (11.4%) hisoblanadi."
        },
        {
            "q": "CIE L*a*b* rang fazosining boshqa rang modellaridan asosiy ustunligi nimada?",
            "options": [
                "Inson idrokiga mos (Perceptually Uniform) bo'lib, qurilmaga bog'liq bo'lmagan keng rang qamrovini ta'minlaydi",
                "Faqat lazerli printerlarda ishlaydi",
                "Faqat 2 ta rangdan iborat",
                "Matematik jihatdan butun sonlarda ifodalanmaydi"
            ],
            "correct": "Inson idrokiga mos (Perceptually Uniform) bo'lib, qurilmaga bog'liq bo'lmagan keng rang qamrovini ta'minlaydi",
            "explanation": "Lab fazosida ikki rang orasidagi Evklid masofasi inson ko'zi sezadigan ranglar farqiga to'g'ri mutanosibdir."
        },
        {
            "q": "MATLAB dasturida RGB tasvirni HSV formatiga o'tkazish buyrug'i qaysi?",
            "options": [
                "rgb2hsv(I)",
                "to_hsv(I)",
                "convertColor(I, 'hsv')",
                "imcolorspace(I)"
            ],
            "correct": "rgb2hsv(I)",
            "explanation": "rgb2hsv(I) funksiyasi 0 dan 1 gacha diapazondagi H, S, V kanallarini hisoblab beradi."
        }
    ],
    18: [
        {
            "q": "K-Nearest Neighbors (KNN — K-eng yaqin qo'shnilar) algoritmining ishlash prinsipi nimadan iborat?",
            "options": [
                "Yangi obyektni fazoda unga eng yaqin bo'lgan K ta ma'lumotning ko'pchiligi qaysi sinfga tegishli bo'lsa, o'sha sinfga kiritish",
                "Neyron to'r og'irliklarini gradient tushish orqali optimallashtirish",
                "Ma'lumotlar klasterlarini daraxtsimon ierarxiyaga ajratish",
                "Faqat chiziqli ajratuvchi gipertekislik chizish"
            ],
            "correct": "Yangi obyektni fazoda unga eng yaqin bo'lgan K ta ma'lumotning ko'pchiligi qaysi sinfga tegishli bo'lsa, o'sha sinfga kiritish",
            "explanation": "KNN metrik klassifikator bo'lib, belgilangan masofa mezoni (masalan Evklid) bo'yicha eng yaqin K ta qo'shnining 'ovoz berishi' orqali tasniflaydi."
        },
        {
            "q": "KNN modelida K parametrining qiymati haddan tashqari kichik (masalan K = 1) tanlansa nima yuz berishi mumkin?",
            "options": [
                "Model shovqinlarga haddan tashqari sezgir bo'lib qoladi va qayta moslashish (Overfitting) yuzaga keladi",
                "Model umuman ishlamay qoladi",
                "Klassifikatsiya chegarasi mutlaqo tekis to'g'ri chiziqqa aylanadi",
                "Model barcha obyektlarni bitta sinfga qo'shadi"
            ],
            "correct": "Model shovqinlarga haddan tashqari sezgir bo'lib qoladi va qayta moslashish (Overfitting) yuzaga keladi",
            "explanation": "K=1 bo'lganda bitta tasodifiy xato (shovqinli) nuqta butun bir hududni noto'g'ri sinfga bo'yab qo'yishi mumkin. K ni kattalashtirish qaror chegarasini silliqlaydi."
        },
        {
            "q": "Ko'p o'lchovli belgilarga ega bo'lgan ma'lumotlar to'plamida KNN algoritmini qo'llashdan oldin qaysi muhim bosqich bajarilishi shart?",
            "options": [
                "Belgilarni normallashtirish (Normalization / Standard scaling)",
                "Barcha belgilarni kvadratga oshirish",
                "Ma'lumotlarni tasodifiy o'chirib tashlash",
                "Signalni Furye fazosiga o'tkazish"
            ],
            "correct": "Belgilarni normallashtirish (Normalization / Standard scaling)",
            "explanation": "Agar bitta belgi 0..1 oralig'ida, ikkinchisi 1000..5000 oralig'ida bo'lsa, katta masshtabdagi belgi Evklid masofasida mutlaq ustunlik qilib qarorni buzadi. Shu sababli normallashtirish shart."
        },
        {
            "q": "Ikkita ikki o'lchamli nuqta P1(x1, y1) va P2(x2, y2) orasidagi Evklid masofasi qanday hisoblanadi?",
            "options": [
                "d = sqrt((x2 - x1)^2 + (y2 - y1)^2)",
                "d = |x2 - x1| + |y2 - y1| (Manxetten)",
                "d = max(|x2 - x1|, |y2 - y1|)",
                "d = (x2 + x1) / (y2 + y1)"
            ],
            "correct": "d = sqrt((x2 - x1)^2 + (y2 - y1)^2)",
            "explanation": "Evklid masofasi Pifagor teoremasiga asoslangan to'g'ri chiziqli geometrik masofa formulasidir."
        },
        {
            "q": "Ikki sinfli (binar) tasniflash masalasida KNN da nima uchun K sonini toq son (masalan 3, 5, 7) qilib olish tavsiya etiladi?",
            "options": [
                "Ovozlar soni teng kelib qolishi (durang holat) ning oldini olish uchun",
                "Juft sonlar dasturda xatolik keltirib chiqargani uchun",
                "Toq sonlar xotirani 2 barobar kamroq egallagani uchun",
                "Faqat toq sonlar kvadrat ildizdan chiqarilishi mumkinligi sababli"
            ],
            "correct": "Ovozlar soni teng kelib qolishi (durang holat) ning oldini olish uchun",
            "explanation": "Agar K juft (masalan 4) bo'lsa, 2 ta ovoz A sinfga va 2 ta ovoz B sinfga tushib durang yuzaga kelishi mumkin. Toq sonda esa doim bitta tomon ustun keladi."
        }
    ],
    21: [
        {
            "q": "Tasvirni tiklash (Restoration) va tasvirni yaxshilash (Enhancement) o'rtasidagi asosiy farq nima?",
            "options": [
                "Tiklash buzilishning aniq matematik modeliga (PSF va shovqin) tayanadi, yaxshilash esa vizual idrokni oshirishga qaratilgan",
                "Tiklash faqat oq-qora tasvirlar uchun, yaxshilash esa rangli tasvirlar uchun ishlatiladi",
                "Yaxshilash matematik modelga tayanadi, tiklash esa subyektivdir",
                "Ularning orasida hech qanday farq yo'q"
            ],
            "correct": "Tiklash buzilishning aniq matematik modeliga (PSF va shovqin) tayanadi, yaxshilash esa vizual idrokni oshirishga qaratilgan",
            "explanation": "Tiklash — obyektiv teskari masala bo'lib, buzuvchi operator H va shovqin n(x,y) modeliga asoslangan holda asl tasvir f(x,y) ni matematik tiklashga harakat qiladi."
        },
        {
            "q": "Viner filtri (Wiener Filter) oddiy teskari filtr (Inverse Filter) dan nima bilan ustun turadi?",
            "options": [
                "Shovqin va signalning quvvat spektrlari nisbatini (NSR) hisobga oladi va past signalli yuqori chastotalarda shovqinning cheksiz kuchayib ketishini oldini oladi",
                "Hisoblash tezligi 100 barobar yuqori",
                "Rangli tasvirlarda ranglarni saqlab qoladi",
                "Matritsa determinantini nolga tenglashtiradi"
            ],
            "correct": "Shovqin va signalning quvvat spektrlari nisbatini (NSR) hisobga oladi va past signalli yuqori chastotalarda shovqinning cheksiz kuchayib ketishini oldini oladi",
            "explanation": "Oddiy teskari filtrda H(u,v) nolga yaqin bo'lganda 1/H shovqinni cheksiz oshirib tasvirni buzadi. Viner filtri esa maxrajga |H|^2 + NSR qo'shib muvozanatni saqlaydi."
        },
        {
            "q": "Nuqtali yoyilish funksiyasi (PSF — Point Spread Function) optik va raqamli tizimlarda nimani anglatadi?",
            "options": [
                "Tasvirga olish tizimining bitta nuqtaviy yorug'lik manbaiga (impulsga) bo'lgan javob reaksiyasi (xiralashish modeli)",
                "Kameradagi batareya quvvatining sarflanish egri chizig'i",
                "Tasvirning umumiy piksellar soni",
                "Rang kanallari orasidagi korrelyatsiya koeffitsiyenti"
            ],
            "correct": "Tasvirga olish tizimining bitta nuqtaviy yorug'lik manbaiga (impulsga) bo'lgan javob reaksiyasi (xiralashish modeli)",
            "explanation": "PSF — optik tizimning 2D impulsli reaksiyasidir. Masalan harakatlanish (motion blur) yoki fokus yo'qolishida bitta nuqta qanday yoyilib ketishini ko'rsatadi."
        },
        {
            "q": "Kamera harakatlanishi (Motion Blur) natijasida buzilgan tasvirni modellashtirish uchun qaysi ikkita parametr kerak bo'ladi?",
            "options": [
                "Harakatlanish masofasi (L, pikselda) va harakatlanish burchagi (theta, gradusda)",
                "Fokus masofasi va diafragma ochilishi",
                "Kamera og'irligi va harorati",
                "Ekran o'lchami va yorug'lik sensori"
            ],
            "correct": "Harakatlanish masofasi (L, pikselda) va harakatlanish burchagi (theta, gradusda)",
            "explanation": "fspecial('motion', L, theta) funksiyasi kamera qancha pikselga (L) va qaysi yo'nalish burchagida (theta) surilganini belgilab xiralashish yadrosini tuzadi."
        },
        {
            "q": "MATLAB dasturida Viner filtrlash orqali tasvirni dekonvolyutsiya qilish buyrug'i qaysi?",
            "options": [
                "deconvwnr(I_blurred, PSF, NSR)",
                "wiener2(I)",
                "restore_image(I)",
                "inv_filter(I)"
            ],
            "correct": "deconvwnr(I_blurred, PSF, NSR)",
            "explanation": "deconvwnr funksiyasi xiralashgan tasvir, PSF yadrosi va shovqin-signal nisbati (NSR) asosida Viner dekonvolyutsiyasini bajaradi."
        }
    ]
}

def main():
    if not os.path.exists(DB_PATH):
        print(f"Xatolik: Baza topilmadi: {DB_PATH}")
        return

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Create / replace rich questions
    count_updated = 0
    for lab_num, q_list in QUESTIONS_DATA.items():
        # Delete old dummy questions for this lab
        cur.execute("DELETE FROM question WHERE lab_number = ?", (lab_num,))
        for item in q_list:
            cur.execute("""
                INSERT INTO question (lab_number, question_text, question_type, options, correct_answer, explanation, status, created_at)
                VALUES (?, ?, 'mcq', ?, ?, ?, 'approved', CURRENT_TIMESTAMP)
            """, (
                lab_num,
                item["q"],
                json.dumps(item["options"], ensure_ascii=False),
                item["correct"],
                item["explanation"]
            ))
            count_updated += 1

    con.commit()
    print(f"Muvaffaqiyatli: {count_updated} ta boyitilgan savol bazaga kiritildi!")

    # Check Lab 13 questions
    cur.execute("SELECT id, lab_number, question_text FROM question WHERE lab_number = 13")
    rows = cur.fetchall()
    print(f"\n13-laboratoriya savollari ({len(rows)} ta):")
    for r in rows:
        print(f" - [{r[0]}] {r[2]}")

    con.close()

if __name__ == "__main__":
    main()

ADDITIONAL_QUESTIONS = {
    7: [
        {
            "q": "Z-almashtirishda raqamli filtr turg'un (stable) bo'lishi uchun uning qutblari z-tekisligida qayerda joylashishi kerak?",
            "options": [
                "Birlik aylananing ichida (|z| < 1)",
                "Birlik aylananing tashqarisida (|z| > 1)",
                "Faqat manfiy haqiqiy o'qda",
                "Koordinata boshidan cheksiz uzoqlikda"
            ],
            "correct": "Birlik aylananing ichida (|z| < 1)",
            "explanation": "LTI diskret tizim turg'un bo'lishi uchun uning barcha qutblari birlik radiusli aylana (|z|=1) ichida joylashishi shart."
        },
        {
            "q": "FIR (Chekli impulsli javobli) filtrlarning IIR (Cheksiz impulsli javobli) filtrlarga nisbatan eng katta afzalligi nima?",
            "options": [
                "Doimo qat'iy chiziqli fazaga ega bo'lishi va mutlaq turg'unligi",
                "IIR filtrga qaraganda kamroq koeffitsiyent talab qilishi",
                "Faqat analog sxemalarda ishlashi",
                "Chastotani cheksiz keskin kesishi"
            ],
            "correct": "Doimo qat'iy chiziqli fazaga ega bo'lishi va mutlaq turg'unligi",
            "explanation": "FIR filtrlarda teskari aloqa yo'q (barcha qutblar z=0 da), shuning uchun ular doimo turg'un va chiziqli faza xarakteristikasini beradi."
        },
        {
            "q": "Z-almashtirishning birlik aylanadagi kesimi (|z| = 1, ya'ni z = e^(j*w)) qaysi almashtirishga teng bo'ladi?",
            "options": [
                "Diskret Vaqtli Furye Almashtirishi (DTFT)",
                "Laplas almashtirishi",
                "Veyvlet almashtirishi",
                "Xadamar almashtirishi"
            ],
            "correct": "Diskret Vaqtli Furye Almashtirishi (DTFT)",
            "explanation": "Z-almashtirish umumiy kompleks tekislikdagi almashtirish bo'lib, uning z=e^(jw) birlik aylanasi bo'yicha integrali aynan DTFT ni beradi."
        },
        {
            "q": "Raqamli filtrning uzatish funksiyasi H(z) = B(z) / A(z) ko'rinishida berilganda uning nollari (zeros) qanday topiladi?",
            "options": [
                "Suratdagi ko'phad B(z) ning ildizlari sifatida",
                "Maxrajdagi ko'phad A(z) ning ildizlari sifatida",
                "Faqat z=0 nuqtani olish orqali",
                "Koeffitsiyentlar yig'indisini hisoblash orqali"
            ],
            "correct": "Suratdagi ko'phad B(z) ning ildizlari sifatida",
            "explanation": "Uzatish funksiyasi H(z) ni nolga aylantiruvchi z nuqtalari nollar (surat B(z)=0) va cheksizga aylantiruvchi nuqtalar qutblar (maxraj A(z)=0) deyiladi."
        },
        {
            "q": "MATLAB dasturida raqamli filtrning nol va qutblarini kompleks tekislikda tasvirlash funksiyasi qaysi?",
            "options": [
                "zplane(b, a)",
                "plot_poles(b, a)",
                "filter_roots(b, a)",
                "circle_z(b, a)"
            ],
            "correct": "zplane(b, a)",
            "explanation": "zplane(b, a) birlik aylanani va filtr nollari ('o') hamda qutblarini ('x') kompleks tekislikda chizib beradi."
        }
    ],
    10: [
        {
            "q": "Signallarga ishlov berishda Quvvat Spektral Zichligi (PSD — Power Spectral Density) nimani ifodalaydi?",
            "options": [
                "Signal quvvatining turli chastota polosalari bo'ylab qanday taqsimlanganligini",
                "Signalning umumiy vaqt davomiyligini",
                "Analog-raqamli o'zgartirgich kuchlanishini",
                "Kameraning fokus masofasini"
            ],
            "correct": "Signal quvvatining turli chastota polosalari bo'ylab qanday taqsimlanganligini",
            "explanation": "PSD signal energiyasi yoki quvvatining qaysi chastotalarga jamlanganligini (W/Hz) ko'rsatuvchi muhim statistik ko'rsatkichdir."
        },
        {
            "q": "Oq shovqin (White Noise) signalining spektral zichligi qanday xarakterga ega bo'ladi?",
            "options": [
                "Barcha chastotalarda doimiy o'zgarmas tekis spektrga ega bo'ladi",
                "Faqat bitta tor chastotada cho'qqi hosil qiladi",
                "Past chastotalarda 0 bo'lib yuqori chastotada eksponensial o'sadi",
                "Doimo manfiy qiymatlardan iborat bo'ladi"
            ],
            "correct": "Barcha chastotalarda doimiy o'zgarmas tekis spektrga ega bo'ladi",
            "explanation": "Oq yorug'lik barcha ranglarni o'z ichiga olgani kabi, oq shovqin ham barcha chastotalarda bir xil quvvat zichligiga ega bo'lgan tasodifiy jarayondir."
        },
        {
            "q": "Uelch (Welch) usulining standart periodogrammaga nisbatan asosiy ustunligi nima?",
            "options": [
                "Signalni qisman qoplanuvchi bloklarga bo'lib derazalash orqali spektr dispersiyasini (shovqinli tebranishlarni) kamaytirishi",
                "Faqat 1 ta nuqtadan iborat FFT hisoblashi",
                "Spektrdagi barcha ma'lumotlarni o'chirib tashlashi",
                "Signalni avtomatik mp3 formatiga o'tkazishi"
            ],
            "correct": "Signalni qisman qoplanuvchi bloklarga bo'lib derazalash orqali spektr dispersiyasini (shovqinli tebranishlarni) kamaytirishi",
            "explanation": "Uelch usuli kadrlar bo'yicha spektrlarni o'rtachalashtiradi, bu esa spektr bahosidagi tasodifiy shovqin tebranishlarini keskin pasaytiradi."
        },
        {
            "q": "Autokorrelyatsiya funksiyasi va Quvvat Spektral Zichligi (PSD) o'rtasidagi bog'liqlik qaysi teorema bilan belgilanadi?",
            "options": [
                "Viner-Xinchin (Wiener-Khinchin) teoremasi",
                "Pifagor teoremasi",
                "Nyquist-Kotelnikov teoremasi",
                "Bessel teoremasi"
            ],
            "correct": "Viner-Xinchin (Wiener-Khinchin) teoremasi",
            "explanation": "Viner-Xinchin teoremasiga ko'ra statsionar tasodifiy jarayonning quvvat spektral zichligi uning autokorrelyatsiya funksiyasining Furye almashtirishiga tengdir."
        },
        {
            "q": "MATLAB dasturida Uelch usuli bo'yicha spektral zichlikni baholash qaysi buyruq bilan bajariladi?",
            "options": [
                "pwelch(x, window, noverlap, nfft, Fs)",
                "welch_spec(x)",
                "fft_density(x)",
                "powerspectrum(x)"
            ],
            "correct": "pwelch(x, window, noverlap, nfft, Fs)",
            "explanation": "pwelch funksiyasi oyna, overlap va Fs parametrlarini qabul qilib silliqlangan quvvat spektrini hisoblaydi."
        }
    ],
    12: [
        {
            "q": "JPEG siqish standartida rangli tasvirlar nima uchun dastlab RGB dan YCbCr rang fazosiga o'tkaziladi?",
            "options": [
                "Yorqinlik (Y) va rangdorlik (Cb, Cr) kanallarini ajratib, ko'z sezmaydigan rang kanallarini siyraklashtirish (Chroma Subsampling) uchun",
                "Tasvir ranglarini yo'qotib to'liq oq-qoraga aylantirish uchun",
                "Tasvir hajmini siqmasdan kattalashtirish uchun",
                "Printerda qog'ozni tejash uchun"
            ],
            "correct": "Yorqinlik (Y) va rangdorlik (Cb, Cr) kanallarini ajratib, ko'z sezmaydigan rang kanallarini siyraklashtirish (Chroma Subsampling) uchun",
            "explanation": "Inson ko'zi rang farqlariga qaraganda yorug'lik (Y) detallariga ancha sezgir. Shu sababli Cb va Cr kanallarini 2 yoki 4 barobar siyraklashtirish (4:2:0) sifatni saqlagan holda hajm tejaydi."
        },
        {
            "q": "JPEG siqishda 4:2:0 subsampling rejimi nimani anglatadi?",
            "options": [
                "Har 4 ta yorug'lik (Y) pikseliga faqat 1 ta Cb va 1 ta Cr rang namunasi saqlanadi",
                "Tasvir 4 marta kattalashtiriladi",
                "Tasvirda faqat 2 xil rang qoladi",
                "Fayl hajmi 40 barobarga oshiriladi"
            ],
            "correct": "Har 4 ta yorug'lik (Y) pikseliga faqat 1 ta Cb va 1 ta Cr rang namunasi saqlanadi",
            "explanation": "4:2:0 rejimida rang ma'lumotlari gorizontal va vertikaliga 2 martadan siyraklashtirilib, xom rang ma'lumotining 50% tejalishiga erishiladi."
        },
        {
            "q": "JPEG da 'Yo'qotishli siqish' (Lossy Compression) ning aynan qaysi bosqichida qaytmas axborot yo'qotilishi yuz beradi?",
            "options": [
                "DCT koeffitsiyentlarini kvantlash (Quantization) bosqichida",
                "Xaffman kodlash bosqichida",
                "RLE (Run-Length) saralash bosqichida",
                "RGB dan YCbCr ga o'tkazishda"
            ],
            "correct": "DCT koeffitsiyentlarini kvantlash (Quantization) bosqichida",
            "explanation": "DCT ning o'zi yo'qotishsiz chiziqli almashtirishdir. Yo'qotish aynan koeffitsiyentlarni kvantlash matritsasiga bo'lib butun songa yaxlitlashda sodir bo'ladi."
        },
        {
            "q": "Xaffman (Huffman) kodlash algoritmining asosiy tamoyili nimadan iborat?",
            "options": [
                "Ko'p uchraydigan belgilarga qisqa bitli kodlar, kam uchraydigan belgilarga uzunroq kodlar berish",
                "Barcha belgilarga bir xil 8 bitli kod berish",
                "Belgilarni alifbo tartibida joylashtirish",
                "Matnni shifrlash va parol qo'yish"
            ],
            "correct": "Ko'p uchraydigan belgilarga qisqa bitli kodlar, kam uchraydigan belgilarga uzunroq kodlar berish",
            "explanation": "Entropiyali Xaffman kodi belgilarning ehtimolligiga qarab optimal prefiksli ikkilik daraxt tuzadi va fayl hajmini nazariy minimumga yaqinlashtiradi."
        },
        {
            "q": "JPEG fayl formatida siqish sifati (Quality factor) 100 dan 20 gacha tushirilganda tasvirda qanday xatolik ko'zga tashlanadi?",
            "options": [
                "8x8 bloklar chegaralarida kvadrat katakchalar (Blocking artifacts) paydo bo'ladi",
                "Tasvir to'liq yashil rangga bo'yaladi",
                "Tasvir o'lchami o'zgaradi",
                "Tasvir faqat matnga aylanib qoladi"
            ],
            "correct": "8x8 bloklar chegaralarida kvadrat katakchalar (Blocking artifacts) paydo bo'ladi",
            "explanation": "Kuchli kvantlashda qo'shni 8x8 DCT bloklarining chekka chegaralari bir-biri bilan silliq ulanmay qoladi va kvadrat bloklar ko'rinib qoladi."
        }
    ],
    15: [
        {
            "q": "Obyektlarni aniqlashda (Object Detection) IoU (Intersection over Union) ko'rsatkichi nimani bildiradi?",
            "options": [
                "Bashorat qilingan to'rtburchak va haqiqiy (Ground Truth) to'rtburchakning kesishish maydonining ularning birlashmasi maydoniga nisbati",
                "Obyektning umumiy massasi va og'irligi",
                "Kameraning kadrlari soni (FPS)",
                "Tasvirning piksellari zichligi"
            ],
            "correct": "Bashorat qilingan to'rtburchak va haqiqiy (Ground Truth) to'rtburchakning kesishish maydonining ularning birlashmasi maydoniga nisbati",
            "explanation": "IoU chegarasi 0 dan 1 gacha bo'lib, chegaralar qanchalik aniq topilganini baholaydi. Odatda IoU >= 0.5 to'g'ri aniqlangan deb qabul qilinadi."
        },
        {
            "q": "Non-Maximum Suppression (NMS — Maksimal bo'lmaganlarni so'ndirish) algoritmi nima uchun kerak?",
            "options": [
                "Bitta obyekt atrofida paydo bo'lgan ko'plab takroriy chegaralovchi to'rtburchaklarni yo'qotib, faqat eng yuqori ishonchlisini qoldirish uchun",
                "Tasvirdagi barcha obyektlarni o'chirib tashlash uchun",
                "Tasvirni qoraytirish uchun",
                "Obyektning rangini o'zgartirish uchun"
            ],
            "correct": "Bitta obyekt atrofida paydo bo'lgan ko'plab takroriy chegaralovchi to'rtburchaklarni yo'qotib, faqat eng yuqori ishonchlisini qoldirish uchun",
            "explanation": "Obyekt detektori bitta obyekt ustida o'nlab to'rtburchak chizadi. NMS IoU yuqori bo'lgan past balli to'rtburchaklarni elaydi."
        },
        {
            "q": "Obyektni chegaralovchi Bounding Box odatda qaysi 4 ta koordinata bilan ifodalanadi?",
            "options": [
                "[x_min, y_min, width, height] yoki [x_min, y_min, x_max, y_max]",
                "[radius, burchak, rang, faza]",
                "[chastota, amplituda, energiya, quvvat]",
                "[vaqt, tezlik, tezlanish, massa]"
            ],
            "correct": "[x_min, y_min, width, height] yoki [x_min, y_min, x_max, y_max]",
            "explanation": "To'g'ri to'rtburchakli quti yuqori chap burchak nuqtasi va eni-bo'yi (yoki qarama-qarshi pastki o'ng burchak) orqali aniqlanadi."
        },
        {
            "q": "Obyektni aniqlash modelida 'Confidence Score' (Ishonchlilik ehtimolligi) nimani ko'rsatadi?",
            "options": [
                "To'rtburchak ichida aynan ko'rsatilgan sinf obyekti mavjudligining model tomonidan berilgan ehtimolligi (0..1 oralig'ida)",
                "Kameraning akkumulyator foizi",
                "Piksel rangining yorqinligi",
                "Model faylining megabaytdagi hajmi"
            ],
            "correct": "To'rtburchak ichida aynan ko'rsatilgan sinf obyekti mavjudligining model tomonidan berilgan ehtimolligi (0..1 oralig'ida)",
            "explanation": "Confidence score modelning o'z bashoratiga bo'lgan ishonch darajasidir. Belgilangan threshold dan past bo'lganlar (masalan <0.5) bekor qilinadi."
        },
        {
            "q": "Semantik segmentatsiya (Semantic Segmentation) bilan oddiy obyektni aniqlash (Detection) o'rtasidagi farq nima?",
            "options": [
                "Segmentatsiya har bir pikselni alohida sinfga ajratadi, deteksiya esa faqat to'rtburchak quti bilan chegaralaydi",
                "Deteksiya piksellar bilan ishlaydi, segmentatsiya esa matn bilan",
                "Segmentatsiya faqat oq-qora tasvirlarda ishlaydi",
                "Ular bitta narsaning sinonimi"
            ],
            "correct": "Segmentatsiya har bir pikselni alohida sinfga ajratadi, deteksiya esa faqat to'rtburchak quti bilan chegaralaydi",
            "explanation": "Semantik segmentatsiyada har bir piksel darajasida niqob (mask) tuziladi, deteksiyada esa butun obyekt to'rtburchak (box) ichiga olinadi."
        }
    ],
    16: [
        {
            "q": "Tasvirni kattalashtirishda eng yaqin qo'shni (Nearest Neighbor) interpolyatsiyasining asosiy kamchiligi nima?",
            "options": [
                "Piksellarning zinasimon (piksellashgan / blokli) ko'rinib qolishi va qirralarning g'adir-budur bo'lishi",
                "Hisoblashning juda sekinligi",
                "Tasvir ranglarini butunlay yo'qotishi",
                "Tasvirni manfiy songa aylantirishi"
            ],
            "correct": "Piksellarning zinasimon (piksellashgan / blokli) ko'rinib qolishi va qirralarning g'adir-budur bo'lishi",
            "explanation": "Nearest neighbor eng yaqin bitta pikselni ko'chirib qo'ygani uchun yangi oraliq qiymatlar silliqlanmaydi va kvadrat piksellar ko'zga tashlanadi."
        },
        {
            "q": "Bichiziqli (Bilinear) interpolyatsiyada yangi pikselning qiymati qanday hisoblanadi?",
            "options": [
                "Eng yaqin 4 ta qo'shni pikselning gorizontal va vertikal masofalarga mutanosib vaznli o'rtachasi sifatida",
                "Eng yaqin 16 ta pikselning kubik funksiyasi orqali",
                "Faqat bitta eng yaqin pikselni olish orqali",
                "Barcha tasvir piksellarining yig'indisi sifatida"
            ],
            "correct": "Eng yaqin 4 ta qo'shni pikselning gorizontal va vertikal masofalarga mutanosib vaznli o'rtachasi sifatida",
            "explanation": "Bilinear interpolyatsiya 2x2 to'rtburchakdagi 4 ta nuqta bo'yicha chiziqli interpolyatsiyani ketma-ket qo'llaydi va ancha silliq natija beradi."
        },
        {
            "q": "Bikubik (Bicubic) interpolyatsiya nechta qo'shni piksel ma'lumotidan foydalanadi?",
            "options": [
                "Eng yaqin 16 ta qo'shni pikseldan (4x4 soha)",
                "4 ta pikseldan",
                "1 ta pikseldan",
                "64 ta pikseldan"
            ],
            "correct": "Eng yaqin 16 ta qo'shni pikseldan (4x4 soha)",
            "explanation": "Bicubic interpolyatsiya 16 ta qo'shni piksel va 3-tartibli kubik splinlar asosida hisoblanib, eng silliq va sifatli qirralarni ta'minlaydi."
        },
        {
            "q": "Tasvir ruxsatini oshirishda (Super-Resolution) sun'iy intellekt (CNN/GAN) asosidagi usullarning an'anaviy interpolyatsiyadan ustunligi nima?",
            "options": [
                "Keng qamrovli tajribalar asosida yo'qolgan yuqori chastotali teksturalar va mayda detallarni qayta tiklay olishi",
                "Faylni avtomatik matnga aylantirishi",
                "Barcha tasvirlarni qora rangga bo'yab berishi",
                "Tasvir hajmini 0 baytgacha tushirishi"
            ],
            "correct": "Keng qamrovli tajribalar asosida yo'qolgan yuqori chastotali teksturalar va mayda detallarni qayta tiklay olishi",
            "explanation": "Klassik interpolyatsiya faqat mavjud nuqtalarni silliqlaydi. AI asosidagi SR esa o'rganilgan modellar yordamida soch tolalari, mato teksturalari kabi yangi haqiqiy detallarni generatsiya qiladi."
        },
        {
            "q": "MATLAB dasturida tasvir o'lchamini interpolyatsiya bilan o'zgartirish (masshtablash) funksiyasi qaysi?",
            "options": [
                "imresize(I, scale, 'bicubic')",
                "scale_image(I)",
                "resize2d(I)",
                "imzoom(I)"
            ],
            "correct": "imresize(I, scale, 'bicubic')",
            "explanation": "imresize funksiyasi masshtab koeffitsiyenti yoki yangi o'lchamni hamda usulni ('nearest', 'bilinear', 'bicubic') qabul qilib qayta hisoblaydi."
        }
    ],
    19: [
        {
            "q": "Battervort (Butterworth) raqamli filtrining chastota xarakteristikasidagi eng asosiy afzalligi nima?",
            "options": [
                "O'tkazish polosasida mutlaqo tekis (Monotonic / Maximally flat) amplituda xarakteristikasiga egaligi (to'lqinsimon tebranishlar yo'qligi)",
                "Cheksiz tik qiyalik bilan kesishi",
                "Faza xarakteristikasining har doim 0 bo'lishi",
                "Koeffitsiyentlarining faqat butun sonlardan iborat bo'lishi"
            ],
            "correct": "O'tkazish polosasida mutlaqo tekis (Monotonic / Maximally flat) amplituda xarakteristikasiga egaligi (to'lqinsimon tebranishlar yo'qligi)",
            "explanation": "Battervort filtri 'maksimal tekis' filtr bo'lib, o'tkazish sohasida hech qanday tebranish (ripple) bo'lmaydi va susayish silliq sodir bo'ladi."
        },
        {
            "q": "Filtrning kesish chastotasida (Cutoff frequency fc) signalning amplitudasi qancha darajaga kamayadi?",
            "options": [
                "-3 dB ga (ya'ni boshlang'ich amplitudasining 1/sqrt(2) ≈ 0.707 qismigacha)",
                "0 dB ga (umuman kamaymaydi)",
                "-20 dB ga (10 barobar kamayadi)",
                "-100 dB ga (to'liq so'nadi)"
            ],
            "correct": "-3 dB ga (ya'ni boshlang'ich amplitudasining 1/sqrt(2) ≈ 0.707 qismigacha)",
            "explanation": "Kesish chastotasi standart bo'yicha yarim quvvat (-3 dB) nuqtasi deb qabul qilingan, bu yerda amplituda 70.7% ga teng bo'ladi."
        },
        {
            "q": "Chebishev (Chebyshev Type I) filtrining Battervort filtriga nisbatan asosiy farqi nimada?",
            "options": [
                "O'tkazish sohasida to'lqinlanish (ripple) bo'lishi hisobiga kesish sohasi ancha tik (keskin) bo'ladi",
                "Fazasi har doim 180 gradusga buriladi",
                "Faqat yuqori chastotalarni o'tkazadi",
                "Filtr tartibi doimo 1 ga teng bo'ladi"
            ],
            "correct": "O'tkazish sohasida to'lqinlanish (ripple) bo'lishi hisobiga kesish sohasi ancha tik (keskin) bo'ladi",
            "explanation": "Chebishev filtri o'tkazish zonasida kichik to'lqinlanishga yo'l qo'yish evaziga o'tish zonasini Battervortga qaraganda ancha tor va keskin qiladi."
        },
        {
            "q": "Filtr tartibi (Order n) 2 dan 6 ga oshirilganda chastota xarakteristikasi qanday o'zgaradi?",
            "options": [
                "Kesish chegarasining qiyaligi keskinlashadi va noxush chastotalar tezroq so'ndiriladi",
                "Filtrning o'tkazish zonasi torayib 0 ga aylanadi",
                "Filtr ishlamay qoladi",
                "Signalning shovqini ortadi"
            ],
            "correct": "Kesish chegarasining qiyaligi keskinlashadi va noxush chastotalar tezroq so'ndiriladi",
            "explanation": "Har bir qo'shimcha tartib susayish tezligini 20 dB/dekada (yoki 6 dB/oktava) ga oshiradi. Tartib oshishi bilan filtr ideallashtirilgan to'g'ri to'rtburchakka yaqinlashadi."
        },
        {
            "q": "MATLAB dasturida n-tartibli Battervort past chastotali raqamli filtrini hisoblash buyrug'i qaysi?",
            "options": [
                "[b, a] = butter(n, Wn, 'low')",
                "[b, a] = design_filter(n)",
                "[b, a] = cheby1(n)",
                "b = fir1(n, Wn)"
            ],
            "correct": "[b, a] = butter(n, Wn, 'low')",
            "explanation": "butter(n, Wn) n-tartibli va normallashtirilgan kesish chastotasi Wn bo'lgan IIR Battervort filtrining koeffitsiyentlarini qaytaradi."
        }
    ],
    20: [
        {
            "q": "Tasvirni charxlash (Unsharp Masking) usulining ishlash mexanizmi nimadan iborat?",
            "options": [
                "Asl tasvirdan uning xiralashtirilgan (silliqlangan) nusxasi ayirilib, hosil bo'lgan qirralar asl tasvirga qo'shiladi",
                "Tasvirning barcha piksellarini 2 ga ko'paytirish",
                "Tasvirni 90 gradusga burib qayta joylashtirish",
                "Tasvirdan barcha qora piksellarni o'chirib tashlash"
            ],
            "correct": "Asl tasvirdan uning xiralashtirilgan (silliqlangan) nusxasi ayirilib, hosil bo'lgan qirralar asl tasvirga qo'shiladi",
            "explanation": "Asl tasvir - Silliqlangan tasvir = Qirralar niqobi. Bu niqob ma'lum k koeffitsiyenti bilan asl tasvirga qo'shilganda qirralarning kontrasti keskin oshadi."
        },
        {
            "q": "Polosali o'tkazuvchi filtr (Bandpass Filter) qaysi chastotalarni o'tkazadi?",
            "options": [
                "Belgilangan quyi f_low va yuqori f_high chastotalar oralig'idagi signallarni",
                "Faqat 0 Hz ga teng doimiy tokni",
                "Faqat cheksiz yuqori chastotalarni",
                "Barcha chastotalarni butunlay to'xtatadi"
            ],
            "correct": "Belgilangan quyi f_low va yuqori f_high chastotalar oralig'idagi signallarni",
            "explanation": "Polosali filtr quyi kesish chastotasidan pastdagi va yuqori kesish chastotasidan yuqoridagi signallarni so'ndirib, faqat belgilangan diapazonni o'tkazadi."
        },
        {
            "q": "Laplas (Laplacian) fazoviy filtri tasvirda asosan nimani aniqlash va kuchaytirish uchun ishlatiladi?",
            "options": [
                "Tasvirdagi keskin yorug'lik sakrashlari va konturlarni (2-tartibli hosila orqali)",
                "Tasvirning o'rtacha rangini hisoblash uchun",
                "Faylni shifrlash uchun",
                "Tasvirning geometrik markazini topish uchun"
            ],
            "correct": "Tasvirdagi keskin yorug'lik sakrashlari va konturlarni (2-tartibli hosila orqali)",
            "explanation": "Laplasian izotropik 2-tartibli fazoviy differensial operator bo'lib, barcha yo'nalishlardagi keskin qirralarni belgilab beradi."
        },
        {
            "q": "Tasvirni charxlashda haddan tashqari katta kuchaytirish koeffitsiyenti tanlansa qanday salbiy oqibat yuz beradi?",
            "options": [
                "Qirralar atrofida noxush oq-qora 'halo' (gardish) artefaktlari va shovqinlar haddan ziyod bo'rtib chiqadi",
                "Tasvir to'liq xiralashib ketadi",
                "Tasvirning fayl formati buziladi",
                "Hech qanday o'zgarish bo'lmaydi"
            ],
            "correct": "Qirralar atrofida noxush oq-qora 'halo' (gardish) artefaktlari va shovqinlar haddan ziyod bo'rtib chiqadi",
            "explanation": "Haddan ortiq charxlash (oversharpening) kontrast sakrashlarida oq va qora noxush gardishlar (ringing/halo) paydo qiladi va fon shovqinini kuchaytiradi."
        },
        {
            "q": "MATLAB dasturida tasvirni unsharp masking usulida charxlash funksiyasi qaysi?",
            "options": [
                "imsharpen(I, 'Radius', r, 'Amount', a)",
                "sharpen2d(I)",
                "edge_enhance(I)",
                "highpass_img(I)"
            ],
            "correct": "imsharpen(I, 'Radius', r, 'Amount', a)",
            "explanation": "imsharpen funksiyasi radius va kuchaytirish miqdorini qabul qilib professional darajada tasvir qirralarini charxlaydi."
        }
    ]
}

def seed_all():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    count = 0
    for lab_num, q_list in ADDITIONAL_QUESTIONS.items():
        cur.execute("DELETE FROM question WHERE lab_number = ?", (lab_num,))
        for item in q_list:
            cur.execute("""
                INSERT INTO question (lab_number, question_text, question_type, options, correct_answer, explanation, status, created_at)
                VALUES (?, ?, 'mcq', ?, ?, ?, 'approved', CURRENT_TIMESTAMP)
            """, (
                lab_num,
                item["q"],
                json.dumps(item["options"], ensure_ascii=False),
                item["correct"],
                item["explanation"]
            ))
            count += 1
    con.commit()
    con.close()
    print(f"Qoshimcha {count} ta savol muvaffaqiyatli saqlandi!")

if __name__ == "__main__":
    seed_all()

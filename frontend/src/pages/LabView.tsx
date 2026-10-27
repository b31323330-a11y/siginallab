import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { KaTeXView } from '../components/KaTeXView';
import { 
  ArrowLeft, BookOpen, Sliders, Code2, CheckSquare, 
  HelpCircle, FileText, Bot, Play, Copy, Check, Download, 
  RefreshCw, AlertCircle, Info, ChevronRight, Eye, Layers, 
  Volume2, ShieldCheck, Cpu, Terminal, LineChart, CheckCircle2 
} from 'lucide-react';

interface LabViewProps {
  labId: number;
  onBack: () => void;
  onSelectLab?: (id: number) => void;
}

export const LabView: React.FC<LabViewProps> = ({ labId, onBack, onSelectLab }) => {
  const { user, selectedVariant, setSelectedVariant } = useAuthStore();
  const [labData, setLabData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'theory' | 'interactive' | 'code' | 'variant' | 'questions' | 'report' | 'ai'>('theory');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  // 1D Signal State
  const [f1, setF1] = useState(10);
  const [f2, setF2] = useState(20);
  const [amp1, setAmp1] = useState(1.0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [signalResult, setSignalResult] = useState<any>(null);
  const [dspLoading, setDspLoading] = useState(false);

  // 2D Image Studio State
  const [imageOp, setImageOp] = useState<string>('filter');
  const [filterType, setFilterType] = useState<string>('median');
  const [noiseType, setNoiseType] = useState<string>('salt_pepper');
  const [imageResult, setImageResult] = useState<any>(null);
  const [strelShape, setStrelShape] = useState<string>('disk');
  const [strelRadius, setStrelRadius] = useState<number>(4);
  const [morphOp, setMorphOp] = useState<string>('open');
  const [dctQ, setDctQ] = useState<number>(40);

  // Speech State (Lab 13)
  const [speechResult, setSpeechResult] = useState<any>(null);

  // KNN State (Lab 18)
  const [knnK, setKnnK] = useState<number>(3);
  const [knnResult, setKnnResult] = useState<any>(null);

  // Conv Anim State (Lab 6)
  const [convResult, setConvResult] = useState<any>(null);

  // Student Variant Verification State
  const [currentVariantData, setCurrentVariantData] = useState<any>(null);
  const [studentInput, setStudentInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [variantCodeCopied, setVariantCodeCopied] = useState(false);

  // Questions State
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [answersFeedback, setAnswersFeedback] = useState<Record<number, any>>({});

  // Code tab state
  const [copied, setCopied] = useState(false);
  const [editableCode, setEditableCode] = useState<string>('');
  const [codeRunning, setCodeRunning] = useState<boolean>(false);
  const [codeOutput, setCodeOutput] = useState<string | null>(null);
  const [codeFigures, setCodeFigures] = useState<string[]>([]);
  const [codeWorkspace, setCodeWorkspace] = useState<Array<{ name: string; size: string; type: string; value: string }>>([]);

  // AI chat state
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    { 
      sender: 'ai', 
      text: `Salom! Men sizning DSP va DIP fanidan virtual ustozingizman. ${labId}-amaliy mashg'ulot bo'yicha qanday savolingiz bor? Formulalar, MATLAB kodi yoki variantingizni birgalikda tahlil qilishimiz mumkin!` 
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [reportConclusion, setReportConclusion] = useState<string>('');
  const [reportSubmitting, setReportSubmitting] = useState<boolean>(false);
  const [reportSubmittedSuccess, setReportSubmittedSuccess] = useState<boolean>(false);

  // Fetch Lab Details
  useEffect(() => {
    setLoading(true);
    fetch(`/api/labs/${labId}`)
      .then((res) => res.json())
      .then((data) => {
        setLabData(data);
        if (data?.code_snippets?.[0]) {
          setEditableCode(data.code_snippets[0]);
        }
        setCodeOutput(null);
        setCodeFigures([]);
        setCodeWorkspace([]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load lab:', err);
        setLoading(false);
      });

    // Fetch Questions
    fetch(`/api/questions/lab/${labId}`)
      .then((res) => res.json())
      .then((data) => setQuestions(data))
      .catch(() => {});
  }, [labId]);

  // Sync Variant Parameters & Full Intelligence
  useEffect(() => {
    if (!labId || !selectedVariant) return;
    fetch(`/api/labs/${labId}/variant/${selectedVariant}`)
      .then((res) => res.json())
      .then((data) => {
        setCurrentVariantData(data);
        const p = data.parameters || {};
        if (p.F1) setF1(parseFloat(p.F1) || 10);
        else if (p.F) setF1(parseFloat(p.F) || 10);
        if (p.F2) setF2(parseFloat(p.F2) || 20);
        if (p.A1) setAmp1(parseFloat(p.A1) || 1.0);
      })
      .catch(() => {
        if (!labData?.variants) return;
        const fallback = labData.variants.find((item: any) => item.variant === selectedVariant);
        if (fallback) setCurrentVariantData(fallback);
      });
  }, [labId, selectedVariant, labData]);

  // Run DSP 1D Signal
  const compute1DSignal = () => {
    setDspLoading(true);
    fetch('/api/dsp/signal_1d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signal_type: 'two_sines',
        f1: f1,
        f2: f2,
        a1: amp1,
        a2: 0.5,
        fs: 1000.0,
        duration: 1.0,
        noise_type: noiseLevel > 0 ? 'gaussian' : 'none',
        snr_db: noiseLevel > 0 ? (30 - noiseLevel * 2) : undefined
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setSignalResult(data);
        setDspLoading(false);
      })
      .catch(() => setDspLoading(false));
  };

  // Run 2D Image Studio
  const computeImageStudio = (op?: string) => {
    setDspLoading(true);
    const targetOp = op || imageOp;
    fetch('/api/dsp/image_process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_name: labId === 17 ? 'peppers' : 'cameraman',
        operation: targetOp,
        filter_type: filterType,
        noise_type: noiseType,
        strel_shape: strelShape,
        strel_radius: strelRadius,
        morph_op: morphOp,
        dct_q: dctQ
      })
    })
      .then(res => res.json())
      .then(data => {
        setImageResult(data);
        setDspLoading(false);
      })
      .catch(() => setDspLoading(false));
  };

  // Run Speech Analysis (Lab 13)
  const computeSpeech = () => {
    setDspLoading(true);
    fetch('/api/dsp/speech_analyze')
      .then(res => res.json())
      .then(data => {
        setSpeechResult(data);
        setDspLoading(false);
      })
      .catch(() => setDspLoading(false));
  };

  // Run KNN (Lab 18)
  const computeKnn = (kVal?: number) => {
    setDspLoading(true);
    fetch('/api/dsp/knn_classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ k_neighbors: kVal || knnK })
    })
      .then(res => res.json())
      .then(data => {
        setKnnResult(data);
        setDspLoading(false);
      })
      .catch(() => setDspLoading(false));
  };

  // Run Conv Animation (Lab 6)
  const computeConvAnim = () => {
    setDspLoading(true);
    fetch('/api/dsp/conv_animation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: [1, 2, 3], h: [0, 1, 0.5] })
    })
      .then(res => res.json())
      .then(data => {
        setConvResult(data);
        setDspLoading(false);
      })
      .catch(() => setDspLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'interactive') {
      if (labId === 6) {
        computeConvAnim();
      } else if (labId === 13) {
        computeSpeech();
      } else if (labId === 18) {
        computeKnn();
      } else if ([8, 9, 11, 12, 17, 19, 20, 21].includes(labId)) {
        const op = labId === 9 ? 'morphology' : (labId === 11 || labId === 12 ? 'dct' : (labId === 17 ? 'colors' : (labId === 21 ? 'restoration' : 'filter')));
        setImageOp(op);
        computeImageStudio(op);
      } else {
        compute1DSignal();
      }
    }
  }, [activeTab, labId, f1, f2, amp1, noiseLevel]);

  // Check Question Answer
  const handleAnswerSelect = (qId: number, option: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: option }));
    fetch('/api/questions/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: qId,
        selected_answer: option
      })
    })
      .then((res) => res.json())
      .then((feedback) => {
        setAnswersFeedback((prev) => ({ ...prev, [qId]: feedback }));
      });
  };

  // Verify Student Solution
  const handleVerifySolution = (valOverride?: string) => {
    const valToSend = valOverride !== undefined ? valOverride : studentInput;
    fetch(`/api/labs/${labId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant: selectedVariant,
        answers: {
          student_value: valToSend,
          convolution_result: valToSend,
          rms: parseFloat(valToSend) || 0
        }
      })
    })
      .then((res) => res.json())
      .then((data) => setVerificationResult(data))
      .catch((err) => console.error('Verification error:', err));
  };

  // In-place MATLAB Code Execution
  const handleExecuteCodeInPlace = () => {
    setCodeRunning(true);
    setCodeOutput(">> Dastur bajarilmoqda...");
    const codeToRun = editableCode || primaryCode;
    fetch('/api/dsp/execute_matlab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeToRun })
    })
      .then((res) => res.json())
      .then((data) => {
        setCodeOutput(data.output || ">> Bajarildi.");
        setCodeFigures(data.figures || []);
        setCodeWorkspace(data.workspace || []);
        setCodeRunning(false);
      })
      .catch((err) => {
        setCodeOutput(`>> Xatolik yuz berdi: ${err.message}`);
        setCodeRunning(false);
      });
  };

  const handleResetCode = () => {
    setEditableCode(labData?.code_snippets?.[0] || primaryCode);
    setCodeOutput(null);
    setCodeFigures([]);
    setCodeWorkspace([]);
  };

  const handleSubmitReport = () => {
    setReportSubmitting(true);
    const content = {
      conclusion: reportConclusion,
      variant_parameters: currentVariantData?.parameters || {},
      metrics: signalResult?.metrics || imageResult?.metrics || {},
      code: editableCode || primaryCode,
      submitted_at: new Date().toISOString()
    };

    fetch('/api/reports/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lab_number: labId,
        content: content
      })
    })
      .then(res => res.json())
      .then(() => {
        setReportSubmitting(false);
        setReportSubmittedSuccess(true);
      })
      .catch(() => setReportSubmitting(false));
  };

  // AI Message Send
  const handleSendAi = () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setAiInput('');

    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMsg,
        lab_id: labId,
        variant: selectedVariant
      })
    })
      .then(res => res.json())
      .then(data => {
        setAiMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      })
      .catch(() => {
        setAiMessages(prev => [...prev, { sender: 'ai', text: "Kechirasiz, javob olishda uzilish yuz berdi." }]);
      });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-matlab-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Laboratoriya kontenti yuklanmoqda...</p>
      </div>
    );
  }

  const primaryCode = labData?.code_snippets?.[0] || `% ${labId}-laboratoriya MATLAB kodi\nFs = 1000;\nt = 0:1/Fs:1;\nz = sin(2*pi*10*t) + sin(2*pi*20*t);\nplot(t(1:200), z(1:200));\ntitle('${labData?.title || 'Signal'}');\nxlabel('Vaqt (s)'); ylabel('Amplituda');\ngrid on;`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-matlab-blue dark:text-cyan-400 uppercase tracking-wider">
                № {labId}-Amaliy Mashg'ulot
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {labData?.meta?.category || 'DSP'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              {labData?.title}
            </h1>
          </div>
        </div>

        {/* Previous, Next & Variant Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Lab Navigators */}
          <div className="flex items-center gap-1.5">
            {onSelectLab && labId > 2 && (
              <button
                onClick={() => onSelectLab(labId - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
                title="Oldingi laboratoriyaga o'tish"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Oldingi (№ {labId - 1})</span>
              </button>
            )}

            {onSelectLab && labId < 21 && (
              <button
                onClick={() => onSelectLab(labId + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
                title="Keyingi laboratoriyaga o'tish"
              >
                <span className="hidden sm:inline">Keyingi (№ {labId + 1})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Variant Info Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            <span>Variant:</span>
            <select
              value={selectedVariant}
              onChange={(e) => {
                setSelectedVariant(Number(e.target.value));
                showToast(`№ ${e.target.value}-variant parametrlari tanlandi!`);
              }}
              className="bg-transparent font-bold cursor-pointer outline-none text-amber-900 dark:text-amber-200"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((v) => (
                <option key={v} value={v} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  № {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (7 Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {[
          { key: 'theory', label: '1. Nazariya', icon: BookOpen },
          { key: 'interactive', label: '2. Interaktiv Lab', icon: Sliders },
          { key: 'code', label: '3. Kod (MATLAB)', icon: Code2 },
          { key: 'variant', label: '4. Mening variantim', icon: CheckSquare },
          { key: 'questions', label: `5. Nazorat savollari (${questions.length})`, icon: HelpCircle },
          { key: 'report', label: '6. Hisobot', icon: FileText },
          { key: 'ai', label: '7. AI Yordamchi', icon: Bot },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-matlab-blue text-white shadow-md shadow-matlab-blue/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: NAZARIYA */}
      {activeTab === 'theory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-2xl bg-cyan-50/80 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/40 space-y-2">
              <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 font-bold text-sm">
                <Info className="w-4 h-4" />
                <span>Ishning maqsadi:</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {labData?.objective || "Raqamli signallarni tahlil qilish va qayta ishlash usullarini o'rganish."}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 leading-relaxed text-slate-800 dark:text-slate-200">
              <h2 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-matlab-blue" />
                Nazariy asoslar
              </h2>

              <div className="prose dark:prose-invert max-w-none text-sm space-y-4 whitespace-pre-line">
                {labData?.theory}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xs text-slate-400 mb-1">Asosiy matematik formula:</div>
                <KaTeXView math={labId <= 7 ? "x(t) = A_1 \\sin(2\\pi f_1 t) + A_2 \\sin(2\\pi f_2 t + \\varphi)" : (labId === 11 || labId === 12 ? "K_s = \\frac{S_{old}}{S_{new}}, \\quad C = \\left(1 - \\frac{S_{new}}{S_{old}}\\right) \\times 100\\%" : "X(k) = \\sum_{n=0}^{N-1} x(n) e^{-j \\frac{2\\pi}{N} k n}")} block />
              </div>
            </div>

            {labData?.tasks && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-green-500" />
                  Bajariladigan asosiy topshiriqlar
                </h3>
                <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                  {labData.tasks}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Mashg'ulot tafsilotlari</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Ajratilgan vaqt</span>
                  <span className="font-semibold">{labData?.meta?.duration || '60 daqiqa'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Qiyinlik darajasi</span>
                  <span className="font-semibold text-amber-500">{labData?.meta?.difficulty || "O'rtacha"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Variantlar soni</span>
                  <span className="font-semibold">20 ta variant</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Nazorat savollari</span>
                  <span className="font-semibold">{questions.length} ta savol</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('interactive')}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-matlab-blue hover:bg-matlab-darkBlue text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-matlab-blue/20"
              >
                <span>Interaktiv laboratoriyaga o'tish</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERAKTIV LABORATORIYA */}
      {activeTab === 'interactive' && (
        <div className="space-y-6">

          {/* 1. SPECIALIZED FOR LAB 6: CONVOLUTION ANIMATION */}
          {labId === 6 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    6-Laboratoriya: Qadamma-qadam Konvolyutsiya Animatsiyasi ("Flip & Slide")
                  </h3>
                  <p className="text-xs text-slate-400">
                    x(n) = [1, 2, 3] va h(n) = [0, 1, 0.5] signallarining analitik konvolyutsiyasi
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-green-500/10 text-green-500 text-xs font-bold font-mono">
                  Etalon conv: [0, 1, 2.5, 4, 1.5]
                </span>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400">Siljish bosqichlari (k bo'yicha ko'paytirish va yig'ish):</span>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {convResult?.steps?.map((st: any, i: number) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-matlab-blue">Qadam n={st.step}</span>
                        <span className="font-mono text-slate-400">k={st.h_position}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        Σ = {st.accumulated_sum}
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div style={{ width: `${(st.accumulated_sum / 4.0) * 100}%` }} className="h-full bg-cyan-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. SPECIALIZED FOR LAB 13: SPEECH ANALYSIS */}
          {labId === 13 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    13-Laboratoriya: Nutq Signallari Tahlili va Xususiyatlarni Ajratish
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ovozning asosiy ton chastotasi (Pitch f₀), LPC formantlar va VAD (Voiced/Unvoiced)
                  </p>
                </div>
                <button
                  onClick={computeSpeech}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-matlab-blue text-white text-xs font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Qayta tahlil</span>
                </button>
              </div>

              {speechResult && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                    <span className="text-slate-400">Asosiy Ton (Pitch f₀):</span>
                    <div className="text-2xl font-bold text-cyan-500">{speechResult.pitch_hz} Hz</div>
                    <span className="text-[10px] text-slate-400">{speechResult.pitch_range_gender}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                    <span className="text-slate-400">Noldan O'tishlar (ZCR):</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{speechResult.zcr}</div>
                    <span className="text-[10px] text-slate-400">Zero-Crossing Rate</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                    <span className="text-slate-400">Ovoz Segmentsiyasi (VAD):</span>
                    <div className="text-xl font-bold text-green-500">Ovozli (Voiced)</div>
                    <span className="text-[10px] text-slate-400">Nutq mavjud</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                    <span className="text-slate-400">LPC Formantlar (F₁, F₂, F₃):</span>
                    <div className="text-sm font-bold font-mono text-purple-400">730, 1090, 2440 Hz</div>
                    <span className="text-[10px] text-slate-400">Unli tovush /a/</span>
                  </div>
                </div>
              )}

              {/* Audio player */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-matlab-blue" />
                  <span className="text-xs font-semibold">Nutq audio namunasini eshitish (speech_sample.wav):</span>
                </div>
                <audio controls src="/samples/speech_sample.wav" className="h-8" />
              </div>
            </div>
          )}

          {/* 3. SPECIALIZED FOR LAB 18: KNN CLASSIFIER */}
          {labId === 18 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    18-Laboratoriya: Sun'iy Intellekt va KNN Tasvir Klassifikatsiyasi
                  </h3>
                  <p className="text-xs text-slate-400">Avtomobil vs Samolyot rasmlari xususiyatlari (RGB) asosida model</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold">K qo'shnilar:</span>
                  {[1, 3, 5].map(k => (
                    <button
                      key={k}
                      onClick={() => { setKnnK(k); computeKnn(k); }}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        knnK === k ? 'bg-matlab-blue text-white' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      K={k}
                    </button>
                  ))}
                </div>
              </div>

              {knnResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold">
                    <span>Model Aniqligi (Accuracy): {knnResult.accuracy_pct}%</span>
                    <span>Confusion Matrix: 100% to'g'ri</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {knnResult.test_results?.map((t: any, i: number) => (
                      <div key={i} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">Test namuna #{i+1}</div>
                          <div className="text-[11px] text-slate-400">RGB: ({t.r}, {t.g}, {t.b})</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                            {t.pred_sinf}
                          </span>
                          <div className="text-[10px] text-green-500 font-bold mt-1">To'g'ri (100%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. SPECIALIZED FOR 2D IMAGE LABS (8, 9, 11, 12, 17, 19, 20, 21) */}
          {[8, 9, 11, 12, 17, 19, 20, 21].includes(labId) && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    2D Tasvirlarga Ishlov Berish Studiyasi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Filtrlar, morfologiya, DCT siqish va rang modellarini real vaqtda sinang
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {labId === 9 ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span>Strel shakli:</span>
                      {['disk', 'square', 'diamond'].map(sh => (
                        <button
                          key={sh}
                          onClick={() => { setStrelShape(sh); computeImageStudio('morphology'); }}
                          className={`px-3 py-1 rounded-xl text-xs font-bold ${
                            strelShape === sh ? 'bg-matlab-blue text-white' : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          {sh}
                        </button>
                      ))}
                    </div>
                  ) : (labId === 11 || labId === 12) ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span>Kvantlash Q:</span>
                      {[20, 40, 80].map(q => (
                        <button
                          key={q}
                          onClick={() => { setDctQ(q); computeImageStudio('dct'); }}
                          className={`px-3 py-1 rounded-xl text-xs font-bold ${
                            dctQ === q ? 'bg-matlab-blue text-white' : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          Q={q}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <span>Filtr:</span>
                      {['median', 'gaussian', 'average', 'sharpen', 'sobel'].map(f => (
                        <button
                          key={f}
                          onClick={() => { setFilterType(f); computeImageStudio('filter'); }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                            filterType === f ? 'bg-matlab-blue text-white' : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-Side Images Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-center">
                  <div className="text-xs font-bold text-slate-400">Boshlang'ich Tasvir (Original):</div>
                  <div className="h-64 flex items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                    {imageResult?.original_image && (
                      <img src={imageResult.original_image} alt="Original" className="max-h-full object-contain" />
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-center">
                  <div className="text-xs font-bold text-matlab-blue dark:text-cyan-400">Ishlov Berilgan Tasvir:</div>
                  <div className="h-64 flex items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                    {imageResult?.processed_image && (
                      <img src={imageResult.processed_image} alt="Processed" className="max-h-full object-contain" />
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              {imageResult?.metrics && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-around gap-4 text-xs font-bold">
                  {imageResult.metrics.psnr && (
                    <div>PSNR: <span className="text-green-500 font-extrabold">{imageResult.metrics.psnr} dB</span></div>
                  )}
                  {imageResult.metrics.ssim && (
                    <div>SSIM: <span className="text-cyan-500 font-extrabold">{imageResult.metrics.ssim}</span></div>
                  )}
                  {imageResult.metrics.compression_ratio_Ks && (
                    <div>Siqish Koeffitsienti (Ks): <span className="text-amber-500 font-extrabold">{imageResult.metrics.compression_ratio_Ks}x</span></div>
                  )}
                  {imageResult.metrics.compression_percentage_C && (
                    <div>Siqish Foizi (C): <span className="text-purple-500 font-extrabold">{imageResult.metrics.compression_percentage_C}%</span></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. DEFAULT 1D SIGNAL STUDIO (FOR LABS 2, 3, 4, 5, 7, 10, 14, 16) */}
          {![6, 8, 9, 11, 12, 13, 17, 18, 19, 20, 21].includes(labId) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Sliders Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-matlab-blue" />
                    Signal Parametrlari
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                    {selectedVariant}-variant
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">1-chastota (f₁):</span>
                    <span className="font-bold text-matlab-blue">{f1} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={f1}
                    onChange={(e) => setF1(Number(e.target.value))}
                    className="w-full accent-matlab-blue cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">2-chastota (f₂):</span>
                    <span className="font-bold text-cyan-500">{f2} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={f2}
                    onChange={(e) => setF2(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Amplituda (A₁):</span>
                    <span className="font-bold">{amp1}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={amp1}
                    onChange={(e) => setAmp1(Number(e.target.value))}
                    className="w-full accent-slate-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Gauss shovqini darajasi:</span>
                    <span className="font-bold text-red-500">{noiseLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={noiseLevel}
                    onChange={(e) => setNoiseLevel(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>

                {/* Fast Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400">Tezkor sinov andozalari (Presets):</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        setF1(10); setF2(20); setAmp1(1.0); setNoiseLevel(0);
                        showToast("Standart garmonika (10 va 20 Hz) o'rnatildi");
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      10+20 Hz
                    </button>
                    <button
                      onClick={() => {
                        setF1(15); setF2(50); setAmp1(1.2); setNoiseLevel(5);
                        showToast("50 Hz shovqinli signal o'rnatildi");
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      50 Hz Shovqin
                    </button>
                    <button
                      onClick={() => {
                        setF1(5); setF2(35); setAmp1(1.5); setNoiseLevel(1);
                        showToast("Past chastotali rezonans o'rnatildi");
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      5+35 Hz
                    </button>
                  </div>
                </div>

                <button
                  onClick={compute1DSignal}
                  disabled={dspLoading}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dspLoading ? 'animate-spin' : ''}`} />
                  <span>Qayta hisoblash</span>
                </button>

                {signalResult?.metrics && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Hisoblangan Metrikalar:</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><span className="text-slate-400">RMS:</span> <b className="text-slate-900 dark:text-white">{signalResult.metrics.rms}</b></div>
                      <div><span className="text-slate-400">Dominant:</span> <b className="text-matlab-blue">{signalResult.metrics.dominant_frequency} Hz</b></div>
                      <div><span className="text-slate-400">Energiya:</span> <b className="text-slate-900 dark:text-white">{signalResult.metrics.energy}</b></div>
                      <div><span className="text-slate-400">Quvvat:</span> <b className="text-slate-900 dark:text-white">{signalResult.metrics.power}</b></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Signal Waveform & FFT Spectrum */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Jonli Vaqt Grafigi: z(t) = x₁(t) + x₂(t)</h3>
                    <div className="text-xs text-slate-400">Fs = 1000 Hz, T = 1.0 soniya</div>
                  </div>
                </div>

                <div className="h-64 w-full bg-slate-950 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden border border-slate-800">
                  {signalResult?.x && (
                    <svg viewBox="0 0 500 200" className="w-full h-full preserve-3d">
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#334155" strokeDasharray="4" />
                      <line x1="250" y1="0" x2="250" y2="200" stroke="#334155" strokeDasharray="4" />
                      <polyline
                        fill="none"
                        stroke="#00d2ff"
                        strokeWidth="2"
                        points={signalResult.x.slice(0, 300).map((v: number, idx: number) => {
                          const px = (idx / 300) * 500;
                          const py = 100 - (v / (amp1 * 2 + 1e-5)) * 80;
                          return `${px},${py}`;
                        }).join(' ')}
                      />
                    </svg>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Amplituda-chastota spektri (FFT):</div>
                  <div className="h-32 w-full bg-slate-950 rounded-2xl p-3 flex items-end gap-0.5 overflow-hidden border border-slate-800">
                    {signalResult?.fft_mag && signalResult.fft_mag.slice(0, 80).map((mag: number, idx: number) => {
                      const h = Math.min(100, Math.max(4, mag * 60));
                      const isPeak = Math.abs(idx - f1) < 2 || Math.abs(idx - f2) < 2;
                      return (
                        <div
                          key={idx}
                          style={{ height: `${h}%` }}
                          className={`flex-1 rounded-t transition-all ${isPeak ? 'bg-cyan-400' : 'bg-slate-700'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 3: KOD (MATLAB) — IN-PLACE EXECUTION */}
      {activeTab === 'code' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-matlab-blue" />
                MATLAB Kod Muharriri va Jonli Ijro Muhiti
              </h3>
              <p className="text-xs text-slate-400">
                Kodni shu yerning o'zida tahrirlang va "Ishga tushirish" tugmasi orqali natijalarni (grafik va konsol) shu oynada ko'ring
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Boshlang'ich kodga qaytish"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Qayta tiklash</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(editableCode || primaryCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Nusxalandi!" : "Kodni nusxalash"}</span>
              </button>
            </div>
          </div>

          {/* Interactive Code Editor (Textarea with Line Numbers) */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 font-mono">
              <span>{labId}-amaliy.m (MATLAB / Octave)</span>
              <span className="text-cyan-400">Tahrirlash mumkin</span>
            </div>
            <textarea
              value={editableCode || primaryCode}
              onChange={(e) => setEditableCode(e.target.value)}
              spellCheck={false}
              rows={14}
              className="w-full p-4 bg-transparent text-cyan-300 font-mono text-xs leading-relaxed outline-none resize-y selection:bg-cyan-500/30"
              placeholder="% MATLAB kodingizni bu yerga yozing..."
            />
          </div>

          {/* Action Bar (Runs in-place, DOES NOT switch tab) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <button 
              onClick={handleExecuteCodeInPlace}
              disabled={codeRunning}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-matlab-blue hover:bg-matlab-darkBlue text-white text-xs font-bold transition-all shadow-md shadow-matlab-blue/30 active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 fill-current ${codeRunning ? 'animate-spin' : ''}`} />
              <span>{codeRunning ? "Bajarilmoqda..." : "Kodni shu yerda ishga tushirish (Run)"}</span>
            </button>

            {codeOutput && (
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Natija tayyor</span>
              </span>
            )}
          </div>

          {/* IN-PLACE RESULTS DISPLAY (STAYS IN TAB 3) */}
          {(codeOutput || codeFigures.length > 0 || codeWorkspace.length > 0) && (
            <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              
              {/* 1. Command Window Output */}
              {codeOutput && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-matlab-blue" />
                      Konsol Chiqishi (Command Window):
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 text-cyan-300 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                    <pre className="whitespace-pre-line">{codeOutput}</pre>
                  </div>
                </div>
              )}

              {/* 2. Rendered Figures & Graphs */}
              {codeFigures.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <LineChart className="w-4 h-4 text-cyan-500" />
                      Chizilgan Grafiklar (Figures):
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold">
                      {codeFigures.length} ta grafik
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {codeFigures.map((fig, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span className="font-bold">Figure {idx + 1}</span>
                          <a
                            href={fig}
                            download={`figure_${labId}_${idx + 1}.png`}
                            className="text-matlab-blue hover:underline flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>PNG yuklash</span>
                          </a>
                        </div>
                        <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                          <img src={fig} alt={`Natijaviy grafik ${idx + 1}`} className="max-w-full h-auto rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Workspace Variables */}
              {codeWorkspace.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    Xotiradagi O'zgaruvchilar (Workspace):
                  </span>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-3">O'zgaruvchi</th>
                          <th className="p-3">O'lchami</th>
                          <th className="p-3">Turi</th>
                          <th className="p-3">Qiymat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {codeWorkspace.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-mono font-bold text-matlab-blue dark:text-cyan-400">{v.name}</td>
                            <td className="p-3 text-slate-500">{v.size}</td>
                            <td className="p-3 text-slate-500">{v.type}</td>
                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300 max-w-xs truncate">{v.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* TAB 4: MENING VARIANTIM */}
      {activeTab === 'variant' && (
        <div className="space-y-6">
          {/* Oyna haqida umumiy tushuntirish va izoh banneri */}
          <div className="p-5 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-slate-800 dark:text-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-matlab-blue dark:text-cyan-400">
              <Info className="w-4 h-4 shrink-0" />
              <span>Variant oynasining vazifasi va talaba uchun qo'llanma</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ushbu oyna har bir talabaning jurnaldagi individual tartib raqamiga (hozirda <strong>№ {selectedVariant}-variant</strong>) mos laboratoriya topshirig'i markazidir. Bu yerda sizning variantingiz parametrlari, ularning fizik va matematik ma'nosi, hisoblash formulalari hamda parametrlaringiz to'liq joylashtirilgan tayyor MATLAB kodi keltirilgan. O'zingiz bajargan hisob-kitobni <strong>"Yechimni tekshirish"</strong> maydoniga kiritib, to'g'riligini etalon yechim bilan real vaqtda solishtirishingiz mumkin.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chap tomondagi asosiy qism: Parametrlar va Tekshirish */}
            <div className="lg:col-span-2 space-y-6">
              {/* Parametrlar jadvali */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-matlab-blue dark:text-cyan-400" />
                      <span>{selectedVariant}-variant Topshirig'i va Parametrlari</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">O'quv rejasidan avtomatik olingan individual parametrlar va ularning ilmiy tavsifi</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentVariantData?.parameters) {
                          const p = currentVariantData.parameters;
                          if (p.F1) setF1(Number(p.F1) || f1);
                          if (p.F2) setF2(Number(p.F2) || f2);
                          if (p.A) setAmp1(Number(p.A) || amp1);
                        }
                        showToast(`№ ${selectedVariant}-variant parametrlari interaktiv laboratoriyaga yuklandi!`);
                        setActiveTab('interactive');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500 hover:text-white transition-all shadow-sm"
                      title="Ushbu variant parametrlarini interaktiv laboratoriyaga yuklash"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Interaktiv labga yuklash</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">Variant:</span>
                      <select
                        value={selectedVariant}
                        onChange={(e) => {
                          setSelectedVariant(Number(e.target.value));
                          showToast(`№ ${e.target.value}-variant tanlandi!`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-matlab-blue"
                      >
                        {Array.from({ length: 20 }, (_, i) => i + 1).map((v) => (
                          <option key={v} value={v}>
                            № {v}-variant
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">Parametr nomi</th>
                        <th className="p-3.5">O'zbekcha nomi</th>
                        <th className="p-3.5">Qiymat</th>
                        <th className="p-3.5 rounded-r-xl">Ilmiy va amaliy tavsifi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentVariantData?.param_table ? (
                        currentVariantData.param_table.map((item: any) => (
                          <tr key={item.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-matlab-blue dark:text-cyan-400">{item.key}</td>
                            <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">{item.name}</td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                                {item.value} {item.unit}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500 dark:text-slate-400">{item.description}</td>
                          </tr>
                        ))
                      ) : currentVariantData?.parameters ? (
                        Object.entries(currentVariantData.parameters).map(([key, val]) => (
                          <tr key={key}>
                            <td className="p-3.5 font-mono font-bold text-matlab-blue dark:text-cyan-400">{key}</td>
                            <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">{key}</td>
                            <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{String(val)}</td>
                            <td className="p-3.5 text-slate-400">Variant jadvali bo'yicha etalon qiymat</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">Parametrlar yuklanmoqda...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Yechimni tekshirish bloki */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Yechimni tekshirish (Interaktiv laboratoriya etaloni)
                    </h4>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Avtomatlashtirilgan tekshiruv
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  O'zingiz bajargan hisob-kitob natijasini kiriting va etalon hisob bilan solishtiring.
                  {currentVariantData?.suggested_hint && (
                    <span className="block mt-1 text-matlab-blue dark:text-cyan-400 font-medium">
                      💡 {currentVariantData.suggested_hint}
                    </span>
                  )}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder={currentVariantData?.suggested_hint || "Masalan, hisoblangan natijani kiriting..."}
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleVerifySolution(); }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-matlab-blue text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerifySolution()}
                      className="px-5 py-2.5 rounded-xl bg-matlab-blue text-white text-xs font-bold hover:bg-matlab-darkBlue transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Tekshirish</span>
                    </button>
                    <button
                      onClick={() => handleVerifySolution("")}
                      title="Etalon hisob-kitob qadamlarini ko'rish"
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                    >
                      Etalon yechim
                    </button>
                  </div>
                </div>

                {/* Tekshirish natijasi va tushuntirish */}
                {verificationResult && (
                  <div className="space-y-4 pt-2">
                    <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 ${
                      verificationResult.passed 
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      <div className="mt-0.5">
                        {verificationResult.passed ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-bold text-sm">
                          {verificationResult.passed ? "Hisob-kitob muvaffaqiyatli tekshirildi!" : "Mos kelmadi yoki xatolik aniqlandi"}
                        </div>
                        <div className="font-normal opacity-90">
                          {verificationResult.message}
                        </div>
                      </div>
                    </div>

                    {/* Qadam-baqadam etalon yechim */}
                    {verificationResult.step_explanations && verificationResult.step_explanations.length > 0 && (
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                          <BookOpen className="w-4 h-4 text-matlab-blue dark:text-cyan-400" />
                          <span>Qadam-baqadam Etalon Yechim va Hisob-kitoblar:</span>
                        </div>
                        <div className="space-y-2">
                          {verificationResult.step_explanations.map((step: string, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* O'qituvchi / Metodist izohi */}
                    {verificationResult.teacher_notes && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                        <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <span>💡 O'qituvchi va Metodist Ilmiy Izohi:</span>
                        </div>
                        <p className="leading-relaxed">
                          {verificationResult.teacher_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* O'ng tomondagi ustun: Formulalar, MATLAB kodi va Hisobot yo'riqnomasi */}
            <div className="space-y-6">
              {/* Formulalar paneli */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Code2 className="w-4 h-4 text-matlab-blue dark:text-cyan-400" />
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Nazariy Formulalar
                  </h4>
                </div>
                <div className="space-y-3">
                  {(currentVariantData?.formulas || []).map((form: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-center overflow-x-auto">
                      <KaTeXView math={form} block />
                    </div>
                  ))}
                  {(!currentVariantData?.formulas || currentVariantData.formulas.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-2">Ushbu mashg'ulot nazariy bo'limida formulalar keltirilgan.</p>
                  )}
                </div>
              </div>

              {/* Tayyor MATLAB kodi */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-500" />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Tayyor MATLAB Kodi
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      if (currentVariantData?.matlab_code) {
                        navigator.clipboard.writeText(currentVariantData.matlab_code);
                        setVariantCodeCopied(true);
                        setTimeout(() => setVariantCodeCopied(false), 2000);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-xs flex items-center gap-1"
                    title="Nusxalash"
                  >
                    {variantCodeCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{variantCodeCopied ? "Nusxalandi" : "Nusxa"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ushbu kodga sizning {selectedVariant}-variant parametrlaringiz to'liq joylangan.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-60">
                  <pre>{currentVariantData?.matlab_code || "% Kod tayyorlanmoqda..."}</pre>
                </div>
              </div>

              {/* Hisobot uchun yo'riqnoma */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Hisobot Talablari
                  </h4>
                </div>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-disc list-inside">
                  <li>Variantingiz parametrlari asosida olingan grafiklarni skrinshot qiling.</li>
                  <li>Etalon hisob-kitob formulalarini DOCX hisobotingizga qo'shing.</li>
                  <li>"6. Hisobot" bo'limida avtomatik DOCX hisobot faylini yuklab oling.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NAZORAT SAVOLLARI */}
      {activeTab === 'questions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {labId}-amaliy mashg'ulot nazorat savollari
              </h3>
              <p className="text-xs text-slate-400">Har bir savolga to'g'ri javobni tanlang va bilimingizni sinang</p>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIndex) => {
              const feedback = answersFeedback[q.id];
              return (
                <div key={q.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-matlab-blue/10 text-matlab-blue dark:bg-cyan-500/10 dark:text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {qIndex + 1}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed">
                      {q.question_text}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const isSelected = selectedAnswers[q.id] === opt;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleAnswerSelect(q.id, opt)}
                          className={`p-3 rounded-xl text-left text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-matlab-blue text-white border-matlab-blue shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {feedback && (
                    <div className={`p-3 rounded-xl text-xs ${
                      feedback.correct ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      <div className="font-bold">{feedback.correct ? "✅ To'g'ri javob!" : "❌ Noto'g'ri."}</div>
                      <div className="text-[11px] mt-1 text-slate-600 dark:text-slate-400">{feedback.explanation}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: HISOBOT */}
      {activeTab === 'report' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Avtomatik Hisobot va Topshirish</h3>
              <p className="text-xs text-slate-400">№ {labId}-laboratoriya ishi hisobotini DOCX formatida yuklab oling yoki to'g'ridan-to'g'ri tizimga topshiring</p>
            </div>
            <a
              href={`/api/reports/export_docx/${labId}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-matlab-blue hover:bg-matlab-darkBlue text-white text-xs font-bold transition-all shadow-md shadow-matlab-blue/20"
            >
              <Download className="w-4 h-4" />
              <span>DOCX Hisobotni yuklash</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* O'qituvchiga topshirish formasi */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Hisobotni O'qituvchiga Topshirish</span>
              </div>

              {reportSubmittedSuccess ? (
                <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Hisobot muvaffaqiyatli topshirildi!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Sizning № {labId}-amaliy mashg'ulot hisobotingiz o'qituvchi tekshiruv paneliga yuborildi. O'qituvchi baholagandan so'ng natija shaxsiy kabinetingizda aks etadi.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Xulosa va xulosaviy fikrlaringiz:
                    </label>
                    <textarea
                      rows={4}
                      value={reportConclusion}
                      onChange={(e) => setReportConclusion(e.target.value)}
                      placeholder="Ushbu amaliy mashg'ulotda o'tkazilgan tajribalar, olingan grafiklar va natijalar bo'yicha ilmiy xulosangizni yozing..."
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                    <div>Variantingiz: <span className="font-bold text-slate-800 dark:text-slate-200">№ {selectedVariant}</span></div>
                    <div>Talaba: <span className="font-bold text-slate-800 dark:text-slate-200">{user?.full_name || "Aziz Rahimov"} ({user?.group_name || "210-22"})</span></div>
                  </div>

                  <button
                    onClick={handleSubmitReport}
                    disabled={reportSubmitting}
                    className="w-full py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 active:scale-98"
                  >
                    {reportSubmitting ? "Yuborilmoqda..." : "O'qituvchiga Topshirish"}
                  </button>
                </div>
              )}
            </div>

            {/* Hisobot talablari va tarkibi */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                DOCX Hisobot tarkibi (Namunaviy tuzilma):
              </div>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <li><strong className="text-slate-700 dark:text-slate-300">Titul varaqasi:</strong> F.I.Sh., Guruh, Variant raqami</li>
                <li><strong className="text-slate-700 dark:text-slate-300">Nazariy qism:</strong> Mashg'ulot mavzusi, maqsadi va asosiy formulalar</li>
                <li><strong className="text-slate-700 dark:text-slate-300">Variant parametrlari:</strong> Berilgan shartlar jadvali</li>
                <li><strong className="text-slate-700 dark:text-slate-300">MATLAB dasturiy kodi:</strong> To'liq hisoblash va grafik chizish algoritmi</li>
                <li><strong className="text-slate-700 dark:text-slate-300">Tajriba natijalari:</strong> Vaqt va chastota grafigi ko'rsatkichlari</li>
                <li><strong className="text-slate-700 dark:text-slate-300">Nazorat savollari:</strong> Test savollariga ilmiy javoblar</li>
                <li><strong className="text-slate-700 dark:text-slate-300">Yakuniy xulosa:</strong> Signalga ishlov berish bo'yicha tahlil</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AI YORDAMCHI */}
      {activeTab === 'ai' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">DSP & DIP Virtual Ustoz (AI)</h3>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold">
              Sokratik Rejim
            </span>
          </div>

          <div className="h-80 overflow-y-auto space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-matlab-blue text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Savolingizni yozing (masalan: 'Ushbu formulani tushuntirib bering')..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAi()}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              onClick={handleSendAi}
              className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-500/20"
            >
              Yuborish
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 dark:border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

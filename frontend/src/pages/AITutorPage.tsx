import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { KaTeXView } from '../components/KaTeXView';
import { 
  Bot, Send, Sparkles, Code2, Wrench, RefreshCw, 
  HelpCircle, CheckCircle2, AlertTriangle, BookOpen, Layers 
} from 'lucide-react';

export const AITutorPage: React.FC = () => {
  const { user, selectedVariant, setSelectedVariant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'debugger' | 'analyzer'>('chat');
  const [selectedLab, setSelectedLab] = useState<number>(2);

  // Chat State
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time?: string }>>([
    {
      sender: 'ai',
      text: "Assalomu alaykum! Men SignalLab platformasining AI Sokratik Ustoziman. Signallar va tasvirlarga ishlov berish (DSP & DIP) fani bo'yicha barcha nazariy formulalar, MATLAB kodlari, variant hisob-kitoblari va xatoliklarni tahlil qilishda yordam beraman. Qanday savolingiz bor?",
      time: 'Hozir'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Debugger State
  const [debugCode, setDebugCode] = useState(`% MATLAB kodingizni bu yerga kiriting
fs = 1000;
t = 0:1/fs:1;
f = 40;
x = sin(2*pi*f*t);
% Xatolik keltirib chiqaruvchi qator:
y = x * [1, 2, 3];`);
  const [debugError, setDebugError] = useState("Inner matrix dimensions must agree. (Operator '*' uchun vektor o'lchamlari mos kelmadi)");
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // Analyzer State
  const [psnrInput, setPsnrInput] = useState<number>(34.2);
  const [rmsInput, setRmsInput] = useState<number>(0.7071);
  const [domFreqInput, setDomFreqInput] = useState<number>(25);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const quickQuestions = [
    "Kotelnikov teoremasini tushuntirib ber",
    "Mening variantimdagi parametrlarni qanday hisoblayman?",
    "Butterworth filtri formulasini keltirib ber",
    "Tez Furye Transformatsiyasi (FFT) nima uchun kerak?",
    "2D Tasvirda PSNR qanday o'lchanadi?",
    "Konvolyutsiya amalini qadam-baqadam tushuntir",
    "DCT va JPEG siqish qanday ishlaydi?"
  ];

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
    return (
      <div className="space-y-1 whitespace-pre-wrap font-sans">
        {parts.map((part, idx) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            const math = part.slice(2, -2).trim();
            return <KaTeXView key={idx} math={math} block={true} />;
          } else if (part.startsWith('$') && part.endsWith('$')) {
            const math = part.slice(1, -1).trim();
            return <KaTeXView key={idx} math={math} block={false} />;
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  const handleSendMessage = (customMsg?: string) => {
    const textToSend = customMsg || inputMessage;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customMsg) setInputMessage('');
    setChatLoading(true);

    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: textToSend,
        lab_id: selectedLab,
        variant: selectedVariant
      })
    })
      .then(res => res.json())
      .then(data => {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: data.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setChatLoading(false);
      })
      .catch(() => {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: "Kechirasiz, javob generatsiya qilishda uzilish yuz berdi. Iltimos qaytadan urinib ko'ring.",
            time: 'Xatolik'
          }
        ]);
        setChatLoading(false);
      });
  };

  const handleRunDebugger = () => {
    setDebugLoading(true);
    fetch('/api/ai/fix_error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: debugCode,
        error_message: debugError
      })
    })
      .then(res => res.json())
      .then(data => {
        setDebugResult(data);
        setDebugLoading(false);
      })
      .catch(() => setDebugLoading(false));
  };

  const handleRunAnalyzer = () => {
    setAnalysisLoading(true);
    fetch('/api/ai/analyze_results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lab_id: selectedLab,
        metrics: {
          psnr: psnrInput,
          rms: rmsInput,
          dominant_frequency: domFreqInput
        }
      })
    })
      .then(res => res.json())
      .then(data => {
        setAnalysisResult(data.analysis);
        setAnalysisLoading(false);
      })
      .catch(() => setAnalysisLoading(false));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                SignalLab AI Virtual Ustoz
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                24/7 Sokratik Murabbiy
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              DSP & DIP bo'yicha ilmiy savollarga javob, formulalar hisobi va dasturiy kod xatolarini tuzatish
            </p>
          </div>
        </div>

        {/* Lab & Variant Selectors */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-400 px-2 font-medium">Mavzu:</span>
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none pr-2 cursor-pointer"
            >
              {Array.from({ length: 20 }, (_, i) => i + 2).map(n => (
                <option key={n} value={n} className="bg-white dark:bg-slate-900">{n}-amaliy mashg'ulot</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-400 px-2 font-medium">Variant:</span>
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(Number(e.target.value))}
              className="bg-transparent font-bold text-amber-500 focus:outline-none pr-2 cursor-pointer"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n} className="bg-white dark:bg-slate-900">№ {n}-variant</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'chat' 
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Interaktiv Suhbat (Chat)</span>
        </button>

        <button
          onClick={() => setActiveTab('debugger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'debugger' 
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Koddagi Xatoni Tuzatish (Debugger)</span>
        </button>

        <button
          onClick={() => setActiveTab('analyzer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'analyzer' 
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Natijalarni Tahlil Qilish (Analyzer)</span>
        </button>
      </div>

      {/* TAB 1: INTERAKTIV CHAT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Chat Area */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 shadow-sm flex flex-col h-[650px]">
            {/* Messages box */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-bl-none shadow-sm'
                  }`}>
                    {m.sender === 'ai' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                        <Bot className="w-3.5 h-3.5" />
                        <span>AI Sokratik Ustoz</span>
                      </div>
                    )}
                    <div>
                      {renderMessageContent(m.text)}
                    </div>
                    {m.time && (
                      <div className={`text-[10px] text-right mt-1.5 ${m.sender === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                        {m.time}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                    <span>AI Ustoz ilmiy javob tayyorlamoqda...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input form */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Savolingizni yozing (masalan: 'Ushbu formulani qadam-baqadam tushuntir')..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={chatLoading}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs hover:opacity-95 shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Yuborish</span>
              </button>
            </div>
          </div>

          {/* Quick Prompts Sidebar */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-cyan-500" />
                <span>Tezkor Savollar</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Qiziqtirgan mavzuni bosing va darhol tushuntirish oling:
              </p>
              <div className="space-y-2">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors border border-slate-100 dark:border-slate-800 line-clamp-2"
                  >
                    💡 {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-200 dark:border-cyan-800/40 text-xs space-y-2">
              <span className="font-bold text-cyan-700 dark:text-cyan-300">Variantingiz bo'yicha:</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Hozir siz № {selectedVariant}-variantdasiz. Savol berganda AI aynan sizning variantingizdagi chastotalar va parametrlarga moslab hisob-kitob qilib beradi!
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: KODDAGI XATOLARNI TUZATISH (DEBUGGER) */}
      {activeTab === 'debugger' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-500" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Kodingiz va Xatolik Matni
              </h3>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                MATLAB yoki Python dastur kodi:
              </label>
              <textarea
                rows={9}
                value={debugCode}
                onChange={(e) => setDebugCode(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Terminalda chiqqan xatolik xabari (Error message):
              </label>
              <input
                type="text"
                value={debugError}
                onChange={(e) => setDebugError(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 font-mono"
              />
            </div>

            <button
              onClick={handleRunDebugger}
              disabled={debugLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-98 transition-all"
            >
              {debugLoading ? "Tahlil qilinmoqda..." : "Xatolikni Tekshirish va Tuzatish"}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                AI Tuzatgan Natija
              </h3>
            </div>

            {debugResult ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>💡 Xatolik tushuntirishi:</span>
                  </div>
                  <p className="leading-relaxed">
                    {debugResult.explanation}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Tuzatilgan to'g'ri kod:</span>
                  <pre className="p-4 rounded-2xl bg-slate-950 text-green-400 font-mono text-xs overflow-x-auto border border-slate-800">
                    {debugResult.fixed_code}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <span>Kodni kiritib "Xatolikni Tekshirish" tugmasini bosing. AI xatolik sababini ko'rsatib, tuzatilgan to'g'ri kodni taqdim etadi.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NATIJALARNI TAHLIL QILISH (ANALYZER) */}
      {activeTab === 'analyzer' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Tajriba Metrikalari Bo'yicha Ilmiy Xulosa
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Laboratoriyada o'lchagan ko'rsatkichlaringizni kiriting va AI avtomatik ilmiy xulosa generatsiya qiladi:
          </p>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                PSNR (dB):
              </label>
              <input
                type="number"
                step="0.1"
                value={psnrInput}
                onChange={(e) => setPsnrInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-purple-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                RMS:
              </label>
              <input
                type="number"
                step="0.0001"
                value={rmsInput}
                onChange={(e) => setRmsInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-purple-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Dominant f (Hz):
              </label>
              <input
                type="number"
                value={domFreqInput}
                onChange={(e) => setDomFreqInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-purple-600"
              />
            </div>
          </div>

          <button
            onClick={handleRunAnalyzer}
            disabled={analysisLoading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-600/20 active:scale-98 transition-all"
          >
            {analysisLoading ? "Tahlil qilinmoqda..." : "Avtomatik Ilmiy Xulosa Olish"}
          </button>

          {analysisResult && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
              {analysisResult}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

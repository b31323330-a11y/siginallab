import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, BookOpen, Clock, Layers, Search, 
  CheckCircle2, XCircle, ChevronRight, RotateCcw, Award, Check, Sparkles 
} from 'lucide-react';
import { KaTeXView } from '../components/KaTeXView';

export const QuizSystem: React.FC = () => {
  const [mode, setMode] = useState<'study' | 'test' | 'flashcards' | 'search'>('study');
  const [selectedLab, setSelectedLab] = useState<number>(2);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Feedback from backend for checked answers { [question_id]: { correct: bool, correct_answer: str, explanation: str } }
  const [feedback, setFeedback] = useState<Record<number, { correct: boolean; correct_answer: string; explanation: string }>>({});

  // Quiz Test State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [testChecking, setTestChecking] = useState(false);

  // Flashcard flip
  const [isFlipped, setIsFlipped] = useState(false);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  const renderMathText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
    return (
      <span className="leading-relaxed">
        {parts.map((part, idx) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            return <KaTeXView key={idx} math={part.slice(2, -2).trim()} block={true} />;
          } else if (part.startsWith('$') && part.endsWith('$')) {
            return <KaTeXView key={idx} math={part.slice(1, -1).trim()} block={false} />;
          }
          return <span key={idx}>{part}</span>;
        })}
      </span>
    );
  };

  const loadQuestions = () => {
    setLoading(true);
    fetch(`/api/questions/lab/${selectedLab}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(Array.isArray(data) ? data : []);
        setCurrentIndex(0);
        setUserAnswers({});
        setFeedback({});
        setShowResult(false);
        setIsFlipped(false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedLab]);

  // Study Mode: Check answer immediately
  const handleSelectStudyOption = (qId: number, option: string) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: option }));
    fetch('/api/questions/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: qId,
        selected_answer: option
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setFeedback((prev) => ({
          ...prev,
          [qId]: data
        }));
      })
      .catch(() => {});
  };

  // Test Mode: Select option without revealing answer yet
  const handleSelectTestOption = (qId: number, option: string) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  // Finish test and check all answers through backend
  const handleFinishTest = async () => {
    setTestChecking(true);
    const checks: Record<number, any> = {};
    let correctCount = 0;

    for (const q of questions) {
      const selected = userAnswers[q.id] || '';
      try {
        const res = await fetch('/api/questions/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: q.id,
            selected_answer: selected
          })
        });
        const data = await res.json();
        checks[q.id] = data;
        if (data.correct) {
          correctCount++;
        }
      } catch (e) {
        checks[q.id] = { correct: false, correct_answer: q.options?.[0] || '', explanation: '' };
      }
    }

    setFeedback(checks);
    const finalScore = Math.round((correctCount / Math.max(1, questions.length)) * 100);
    setScore(finalScore);
    setTestChecking(false);
    setShowResult(true);
  };

  const currentQ = questions[currentIndex];

  const filteredSearchQuestions = questions.filter(q => 
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Savol-Javob va Test Tizimi
            </h1>
            <p className="text-xs text-slate-400">
              Barcha 20 ta laboratoriyaning nazorat savollari, ilmiy tushuntirishlari va test sinovlari
            </p>
          </div>
        </div>

        {/* Lab Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">Laboratoriya:</span>
          <select
            value={selectedLab}
            onChange={(e) => setSelectedLab(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none"
          >
            {Array.from({ length: 20 }, (_, i) => i + 2).map((num) => (
              <option key={num} value={num}>
                № {num}-laboratoriya
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: 'study', label: "O'rganish Rejimi", icon: BookOpen },
          { key: 'test', label: 'Nazorat Testi (Sinov)', icon: Clock },
          { key: 'flashcards', label: 'Flashcards', icon: Layers },
          { key: 'search', label: 'Savollar Qidiruvi (RAG)', icon: Search },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = mode === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setMode(tab.key as any);
                setShowResult(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODE 1: STUDY MODE */}
      {mode === 'study' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Savollar yuklanmoqda...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">Ushbu laboratoriyada savollar topilmadi.</div>
          ) : (
            questions.map((q, idx) => {
              const qFeedback = feedback[q.id];
              return (
                <div key={q.id} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed">
                        {renderMathText(q.question_text)}
                      </h3>
                      <span className="text-[10px] text-slate-400">Holat: {q.status === 'approved' ? 'Tasdiqlangan' : 'AI Qoralama'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {q.options?.map((opt: string, i: number) => {
                      const isSelected = userAnswers[q.id] === opt;
                      const isCorrect = qFeedback?.correct_answer === opt;

                      let btnStyle = 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                      if (qFeedback) {
                        if (isCorrect) {
                          btnStyle = 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-300 font-bold';
                        } else if (isSelected && !qFeedback.correct) {
                          btnStyle = 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-semibold';
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => handleSelectStudyOption(q.id, opt)}
                          className={`p-3.5 rounded-2xl text-left text-xs font-medium transition-all border ${btnStyle}`}
                        >
                          {renderMathText(opt)}
                        </button>
                      );
                    })}
                  </div>

                  {qFeedback && (
                    <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                      qFeedback.correct 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                        : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5">
                        {qFeedback.correct ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-amber-600" />}
                        <span>{qFeedback.correct ? "To'g'ri javob!" : `Noto'g'ri. To'g'ri javob: ${qFeedback.correct_answer}`}</span>
                      </div>
                      {qFeedback.explanation && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                          <b>Ilmiy asos:</b> {renderMathText(qFeedback.explanation)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODE 2: TEST MODE */}
      {mode === 'test' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          {showResult ? (
            <div className="space-y-6">
              <div className="text-center py-4 space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 mx-auto flex items-center justify-center">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Test Yakunlandi!</h2>
                <div className="text-4xl font-extrabold text-matlab-blue dark:text-cyan-400">{score}%</div>
                <p className="text-xs text-slate-500">
                  {score >= 60 ? "Tabriklaymiz! Siz ushbu laboratoriya bo'yicha nazorat sinovidan muvaffaqiyatli o'tdingiz." : "Natijangiz pastroq bo'ldi. Nazariyani qayta o'qib chiqishni tavsiya qilamiz."}
                </p>
                <button
                  onClick={() => {
                    setShowResult(false);
                    setCurrentIndex(0);
                    setUserAnswers({});
                    setFeedback({});
                  }}
                  className="px-6 py-2.5 rounded-xl bg-matlab-blue text-white text-xs font-bold hover:bg-matlab-darkBlue transition-colors shadow-md shadow-matlab-blue/20"
                >
                  Qayta topshirish
                </button>
              </div>

              {/* Comprehensive Question Review */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Natijalar tahlili:</h4>
                {questions.map((q, idx) => {
                  const check = feedback[q.id];
                  const userAns = userAnswers[q.id];
                  const isCorrect = check?.correct;

                  return (
                    <div key={q.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <span className="font-bold text-slate-900 dark:text-white">
                          {idx + 1}. {renderMathText(q.question_text)}
                        </span>
                      </div>

                      <div className="pl-6 space-y-1 text-[11px]">
                        <div>Sizning javobingiz: <span className={isCorrect ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{userAns || "(Javob berilmagan)"}</span></div>
                        {!isCorrect && (
                          <div className="text-green-600">To'g'ri javob: <span className="font-bold">{check?.correct_answer}</span></div>
                        )}
                        {check?.explanation && (
                          <div className="text-slate-400 pt-1">
                            <b>Izoh:</b> {renderMathText(check.explanation)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentQ ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Savol {currentIndex + 1} / {questions.length}</span>
                <span className="font-semibold text-amber-500">№ {selectedLab}-amaliy</span>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-relaxed">
                {renderMathText(currentQ.question_text)}
              </h3>

              <div className="space-y-2.5">
                {currentQ.options?.map((opt: string, i: number) => {
                  const isSelected = userAnswers[currentQ.id] === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectTestOption(currentQ.id, opt)}
                      className={`w-full p-3.5 rounded-2xl text-left text-xs font-medium transition-all border ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {renderMathText(opt)}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 disabled:opacity-30"
                >
                  Oldingi
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm"
                  >
                    Keyingi savol
                  </button>
                ) : (
                  <button
                    disabled={testChecking}
                    onClick={handleFinishTest}
                    className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                  >
                    {testChecking ? "Baholanmoqda..." : "Testni yakunlash"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">Savollar yuklanmoqda...</div>
          )}
        </div>
      )}

      {/* MODE 3: FLASHCARDS */}
      {mode === 'flashcards' && (
        <div className="max-w-xl mx-auto space-y-6">
          {currentQ ? (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="min-h-72 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 flex flex-col justify-between cursor-pointer shadow-lg hover:border-amber-500 transition-all text-center select-none"
            >
              <div className="text-[11px] uppercase tracking-wider text-amber-500 font-bold">
                {isFlipped ? "Javob va Nazariy Qoida" : "Nazorat Savoli (Bosing)"}
              </div>

              <div className="text-base font-bold text-slate-900 dark:text-white leading-relaxed my-4">
                {isFlipped ? (
                  <div className="space-y-2">
                    <div className="text-green-600 dark:text-green-400">
                      {renderMathText(currentQ.options?.[0] || "To'g'ri javob")}
                    </div>
                  </div>
                ) : (
                  renderMathText(currentQ.question_text)
                )}
              </div>

              <div className="text-xs text-slate-400">
                Aylantirish uchun kartaning ustiga bosing
              </div>
            </div>
          ) : null}

          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex(prev => (prev > 0 ? prev - 1 : questions.length - 1));
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
            >
              Oldingi karta
            </button>
            <button
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex(prev => (prev < questions.length - 1 ? prev + 1 : 0));
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold"
            >
              Keyingi karta
            </button>
          </div>
        </div>
      )}

      {/* MODE 4: SEARCH / RAG */}
      {mode === 'search' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Istalgan mavzu, savol yoki atama bo'yicha qidiring (masalan: aliasing, wavelet, DCT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          />

          <div className="space-y-3">
            {filteredSearchQuestions.map((q, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {renderMathText(q.question_text)}
                </div>
                <div className="text-[11px] text-green-600 dark:text-green-400">
                  <b>Etalon javob:</b> {renderMathText(q.options?.[0] || "Ilmiy nazariy qoida")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

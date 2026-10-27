import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  ClipboardList, Clock, Award, CheckCircle2, 
  AlertCircle, Send, X, FileText, ChevronRight 
} from 'lucide-react';

export const StudentAssignments: React.FC = () => {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [solutionText, setSolutionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadAssignments = () => {
    setLoading(true);
    const userId = user?.id || 1;
    fetch(`/api/assignments/my?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        setAssignments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadAssignments();
  }, [user?.id]);

  const handleSubmitSolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !solutionText.trim()) return;

    setSubmitting(true);
    const userId = user?.id || 1;
    fetch(`/api/assignments/${selectedAssignment.id}/submit?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solution_text: solutionText
      })
    })
      .then(res => res.json())
      .then(() => {
        setSubmitting(false);
        setSelectedAssignment(null);
        setSolutionText('');
        setSuccessMessage("Vazifa muvaffaqiyatli topshirildi!");
        setTimeout(() => setSuccessMessage(''), 3000);
        loadAssignments();
      })
      .catch(() => setSubmitting(false));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Mening Amaliy Vazifalarim
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O'qituvchi tomonidan yuklangan individual topshiriqlar, hisob-kitoblar va ularning baholari
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="px-4 py-2 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-600 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Grid of assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-16 text-slate-400 text-xs">Yuklanmoqda...</div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400 text-xs">Sizning guruhingiz uchun yangi vazifalar mavjud emas.</div>
        ) : (
          assignments.map((item) => {
            const isGraded = item.status === 'graded';
            const isSubmitted = item.is_submitted;

            return (
              <div 
                key={item.id} 
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                  isGraded 
                    ? 'border-green-300 dark:border-green-800/60' 
                    : isSubmitted 
                    ? 'border-blue-300 dark:border-blue-800/60' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[11px] font-bold">
                      {item.lab_number ? `№ ${item.lab_number}-Lab mavzusi` : "Mustaqil ish"}
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isGraded 
                        ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300'
                        : isSubmitted 
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    }`}>
                      {isGraded ? "Baholandi" : isSubmitted ? "Tekshiruvda" : "Topshirilmagan"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Muddat: {item.deadline || "Belgilanmagan"}</span>
                    </div>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">
                      Maks: {item.max_score} ball
                    </span>
                  </div>

                  {isGraded && (
                    <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-green-700 dark:text-green-300">
                        <span>O'qituvchi Bahosi:</span>
                        <span className="text-sm">{item.grade} ball</span>
                      </div>
                      {item.teacher_feedback && (
                        <p className="text-[11px] text-green-800 dark:text-green-400 italic">
                          "{item.teacher_feedback}"
                        </p>
                      )}
                    </div>
                  )}

                  {!isGraded && (
                    <button
                      onClick={() => {
                        setSelectedAssignment(item);
                        setSolutionText(item.solution_text || '');
                      }}
                      className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        isSubmitted 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-cyan-500/20'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitted ? "Yechimni yangilash" : "Vazifani topshirish"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Yechim topshirish */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleSubmitSolution}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Vazifa Yechimini Topshirish
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedAssignment.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Yechimingiz, hisoblash natijalari yoki MATLAB dastur kodingiz:
              </label>
              <textarea
                required
                rows={6}
                value={solutionText}
                onChange={(e) => setSolutionText(e.target.value)}
                placeholder="Topshiriq yechimi, formulalar hisobi va olingan natijalarni batafsil yozing..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20"
              >
                {submitting ? "Yuborilmoqda..." : "O'qituvchiga Yuborish"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

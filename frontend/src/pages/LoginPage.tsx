import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { 
  Activity, GraduationCap, User, Lock, Mail, 
  ArrowRight, CheckCircle2, ShieldCheck, Moon, Sun, 
  AlertCircle, Sparkles, BookOpen, Users 
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (role: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { setUser } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('talaba1@signallab.uz');
  const [password, setPassword] = useState('talaba123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSwitch = (selectedRole: 'student' | 'teacher') => {
    setRole(selectedRole);
    setError(null);
    if (selectedRole === 'student') {
      setEmail('talaba1@signallab.uz');
      setPassword('talaba123');
    } else {
      setEmail('teacher@signallab.uz');
      setPassword('teacher123');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Email yoki parol noto\'g\'ri');
      }

      const data = await res.json();
      setUser(data.user, data.access_token);
      onLoginSuccess(data.user.role);
    } catch (err: any) {
      setError(err.message || 'Serverga ulanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string, demoRole: 'student' | 'teacher') => {
    setRole(demoRole);
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: demoPass }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user, data.access_token);
          onLoginSuccess(data.user.role);
        } else {
          setError('Kirishda xatolik yuz berdi');
        }
      })
      .catch(() => setError('Server bilan aloqa uzildi'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-matlab-blue to-cyan-400 flex items-center justify-center text-white shadow-md shadow-matlab-blue/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-lg bg-gradient-to-r from-matlab-blue to-cyan-400 bg-clip-text text-transparent">
              SignalLab UZ
            </span>
            <span className="block text-[11px] text-slate-400 font-medium">Virtual Ta'lim Platformasi</span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Mavzuni almashtirish"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Intro Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DSP & DIP Akademik Tizimi</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Signallar va tasvirlarga ishlov berish
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                20 ta to'liq amaliy laboratoriya, MATLAB muhiti, shaxsiy variant hisob-kitoblari va AI ustoz tizimi.
              </p>
            </div>

            {/* Platform Features Pill List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span><strong>Talaba Paneli:</strong> Variant parametrlari, interaktiv lablar va testlar</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-matlab-blue dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span><strong>O'qituvchi Paneli:</strong> Hisobotlarni tekshirish, ball qo'yish va nazorat</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span><strong>Avtomatlashtirilgan DOCX:</strong> Titul va hisobotlarni bir zumda yuklash</span>
              </div>
            </div>
          </div>

          {/* Right Login Card Column */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
            
            {/* Role Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => handleRoleSwitch('student')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  role === 'student'
                    ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Talaba Kirishi</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('teacher')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  role === 'teacher'
                    ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>O'qituvchi Kirishi</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Elektron pochta (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@signallab.uz"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-matlab-blue transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Parol
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-matlab-blue transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-matlab-blue hover:bg-matlab-darkBlue text-white font-bold text-xs transition-colors shadow-lg shadow-matlab-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <span>{loading ? "Tekshirilmoqda..." : `${role === 'teacher' ? "O'qituvchi Paneliga" : "Talaba Paneliga"} Kirish`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Login Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tezkor Demo Profil Tanlash (1-bosishda):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('talaba1@signallab.uz', 'talaba123', 'student')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors"
                >
                  <div className="font-bold text-slate-900 dark:text-white">Aziz Rahimov</div>
                  <div className="text-[11px] text-slate-400">Talaba • 3-variant (210-22)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('talaba2@signallab.uz', 'talaba123', 'student')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors"
                >
                  <div className="font-bold text-slate-900 dark:text-white">Madina Karimova</div>
                  <div className="text-[11px] text-slate-400">Talaba • 7-variant (210-22)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('teacher@signallab.uz', 'teacher123', 'teacher')}
                  className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-colors sm:col-span-2"
                >
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                    <span>Dotsent O. Qodirov</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20">O'qituvchi Paneli</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Tekshirish, ball qo'yish va savollar monitoringi</div>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
        SignalLab UZ • 2026 • DSP & DIP Virtual Ta'lim Platformasi
      </footer>

    </div>
  );
};

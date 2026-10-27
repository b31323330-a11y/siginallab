import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { LabView } from './pages/LabView';
import { Workbench } from './pages/Workbench';
import { PipelineBuilder } from './pages/PipelineBuilder';
import { QuizSystem } from './pages/QuizSystem';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentAssignments } from './pages/StudentAssignments';
import { StudentAttendance } from './pages/StudentAttendance';
import { AITutorPage } from './pages/AITutorPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { 
  BookOpen, Terminal, Sparkles, ClipboardList, 
  HelpCircle, GraduationCap, Shield, LayoutGrid 
} from 'lucide-react';

export const App: React.FC = () => {
  const { user } = useAuthStore();
  const [currentView, setCurrentView] = useState<
    'dashboard' | 'lab' | 'workbench' | 'pipeline' | 'quiz' | 'teacher' | 'assignments' | 'attendance' | 'ai_tutor' | 'admin'
  >('dashboard');
  const [activeLabId, setActiveLabId] = useState<number>(2);

  // Set default view on user role change
  useEffect(() => {
    if (user?.role === 'admin') {
      setCurrentView('admin');
    } else if (user?.role === 'teacher') {
      setCurrentView('teacher');
    } else if (user?.role === 'student') {
      setCurrentView('dashboard');
    }
  }, [user?.role]);

  const handleNavigate = (view: string, labId?: number) => {
    if (view === 'lab' && labId) {
      setActiveLabId(labId);
      setCurrentView('lab');
    } else {
      setCurrentView(view as any);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If not logged in, show beautiful Login Page
  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(role) => {
          if (role === 'admin') {
            setCurrentView('admin');
          } else if (role === 'teacher') {
            setCurrentView('teacher');
          } else {
            setCurrentView('dashboard');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Header currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1 pb-24 lg:pb-16">
        {currentView === 'dashboard' && (
          <Dashboard onSelectLab={(id) => handleNavigate('lab', id)} />
        )}

        {currentView === 'lab' && (
          <LabView 
            labId={activeLabId} 
            onBack={() => handleNavigate(user?.role === 'admin' ? 'admin' : (user?.role === 'teacher' ? 'teacher' : 'dashboard'))} 
            onSelectLab={(id) => handleNavigate('lab', id)}
          />
        )}

        {currentView === 'assignments' && (
          <StudentAssignments />
        )}

        {currentView === 'attendance' && (
          <StudentAttendance />
        )}

        {currentView === 'ai_tutor' && (
          <AITutorPage />
        )}

        {currentView === 'workbench' && (
          <Workbench />
        )}

        {currentView === 'pipeline' && (
          <PipelineBuilder />
        )}

        {currentView === 'quiz' && (
          <QuizSystem />
        )}

        {currentView === 'teacher' && (
          <TeacherDashboard />
        )}

        {currentView === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* PWA / Mobile Bottom Navigation Bar (Section 18) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-bottom">
        {user?.role === 'admin' && (
          <button
            onClick={() => handleNavigate('admin')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentView === 'admin' 
                ? 'text-rose-600 dark:text-rose-400 font-bold scale-105' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px]">Admin</span>
          </button>
        )}

        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <button
            onClick={() => handleNavigate('teacher')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentView === 'teacher' 
                ? 'text-purple-600 dark:text-purple-400 font-bold scale-105' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            <span className="text-[10px]">Ustoz</span>
          </button>
        )}

        <button
          onClick={() => handleNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentView === 'dashboard' 
              ? 'text-matlab-blue dark:text-cyan-400 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Lablar</span>
        </button>

        {user?.role === 'student' && (
          <button
            onClick={() => handleNavigate('assignments')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentView === 'assignments' 
                ? 'text-cyan-600 dark:text-cyan-400 font-bold scale-105' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px]">Vazifalar</span>
          </button>
        )}

        <button
          onClick={() => handleNavigate('workbench')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentView === 'workbench' 
              ? 'text-matlab-blue dark:text-cyan-400 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Terminal className="w-5 h-5" />
          <span className="text-[10px]">MATLAB</span>
        </button>

        <button
          onClick={() => handleNavigate('ai_tutor')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentView === 'ai_tutor' 
              ? 'text-indigo-600 dark:text-cyan-400 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">AI Ustoz</span>
        </button>

        {user?.role === 'student' && (
          <button
            onClick={() => handleNavigate('quiz')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentView === 'quiz' 
                ? 'text-matlab-blue dark:text-cyan-400 font-bold scale-105' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-[10px]">Testlar</span>
          </button>
        )}
      </nav>

      <footer className="hidden lg:block border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        SignalLab UZ — "Signallar va tasvirlarga ishlov berish" fani uchun interaktiv ta'limiy platforma. 2026.
      </footer>
    </div>
  );
};
export default App;

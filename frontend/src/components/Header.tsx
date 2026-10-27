import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { 
  Activity, Moon, Sun, User, BookOpen, Terminal, 
  Network, HelpCircle, GraduationCap, LogOut, Shield, 
  ClipboardList, Calendar, Bot, Sparkles, Menu, X, 
  ChevronDown, ArrowRight, Layers, Bell, CheckCheck
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string, labId?: number) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { user, selectedVariant, setSelectedVariant, setUser, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [labJumpOpen, setLabJumpOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  // Load Notifications
  const loadNotifications = () => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = () => {
    fetch('/api/notifications/mark_all_read', { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      })
      .catch(() => {});
  };

  const handleMarkOneRead = (id: number) => {
    fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      })
      .catch(() => {});
  };

  // Demo accounts for fast switching & grading demonstration
  const demoAccounts = [
    {
      role: 'student',
      name: 'Aziz Rahimov (Talaba 1)',
      email: 'talaba1@signallab.uz',
      group: '210-22',
      variant: 3
    },
    {
      role: 'student',
      name: 'Madina Karimova (Talaba 2)',
      email: 'talaba2@signallab.uz',
      group: '210-22',
      variant: 7
    },
    {
      role: 'teacher',
      name: "Prof. Farhod Toshmatov (O'qituvchi)",
      email: 'teacher@signallab.uz',
      group: 'DSP & DIP Kafedrasi',
      variant: 1
    },
    {
      role: 'admin',
      name: "Tizim Administratori",
      email: 'admin@signallab.uz',
      group: 'Kafedra Nazorati',
      variant: 1
    }
  ];

  const handleSwitchAccount = (acc: typeof demoAccounts[0]) => {
    setUser({
      id: acc.role === 'admin' ? 5 : (acc.role === 'teacher' ? 4 : (acc.variant === 7 ? 2 : 1)),
      email: acc.email,
      full_name: acc.name,
      group_name: acc.group,
      variant_number: acc.variant,
      role: acc.role as any
    }, 'demo-token');
    setSelectedVariant(acc.variant);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    onNavigate(acc.role === 'admin' ? 'admin' : (acc.role === 'teacher' ? 'teacher' : 'dashboard'));
  };

  const handleNavClick = (view: string, labId?: number) => {
    onNavigate(view, labId);
    setMobileMenuOpen(false);
    setLabJumpOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        
        {/* Brand */}
        <div 
          onClick={() => handleNavClick(isAdmin ? 'admin' : (isTeacher ? 'teacher' : 'dashboard'))} 
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-matlab-blue to-cyan-400 flex items-center justify-center text-white shadow-md shadow-matlab-blue/20 group-hover:scale-105 transition-transform shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="font-extrabold text-lg leading-tight bg-gradient-to-r from-matlab-blue to-cyan-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent flex items-center gap-1.5 whitespace-nowrap">
              <span>SignalLab UZ</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20">
                2026
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
              DSP & DIP Virtual Platformasi
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto scrollbar-none shrink-0">
          {/* Admin Panel Button */}
          {isAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                currentView === 'admin'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Admin Paneli</span>
            </button>
          )}

          {/* Teacher Primary Panel Button */}
          {(isTeacher || isAdmin) && (
            <button
              onClick={() => handleNavClick('teacher')}
              className={`h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                currentView === 'teacher'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>O'qituvchi Paneli</span>
            </button>
          )}

          {/* Student Specific: Vazifalarim & Davomatim */}
          {!isTeacher && !isAdmin && (
            <>
              <button
                onClick={() => handleNavClick('assignments')}
                className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  currentView === 'assignments'
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
                <span>Vazifalarim</span>
              </button>

              <button
                onClick={() => handleNavClick('attendance')}
                className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  currentView === 'attendance'
                    ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0 text-green-500" />
                <span>Davomatim</span>
              </button>
            </>
          )}

          {/* Laboratories for all */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              currentView === 'dashboard'
                ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Laboratoriyalar</span>
            <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-600/80 font-bold">
              20
            </span>
          </button>

          {/* AI Virtual Ustoz for all */}
          <button
            onClick={() => handleNavClick('ai_tutor')}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
              currentView === 'ai_tutor'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>AI Virtual Ustoz</span>
          </button>

          <button
            onClick={() => handleNavClick('workbench')}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              currentView === 'workbench'
                ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 shrink-0" />
            <span>MATLAB</span>
          </button>

          <button
            onClick={() => handleNavClick('pipeline')}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              currentView === 'pipeline'
                ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5 shrink-0" />
            <span>Pipeline</span>
          </button>

          <button
            onClick={() => handleNavClick('quiz')}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              currentView === 'quiz'
                ? 'bg-white dark:bg-slate-700 text-matlab-blue dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Testlar</span>
          </button>
        </nav>

        {/* Right Tools */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Quick Lab Jump Dropdown Button */}
          <div className="relative hidden sm:block shrink-0">
            <button
              onClick={() => setLabJumpOpen(!labJumpOpen)}
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              title="Tezkor laboratoriyaga o'tish"
            >
              <Layers className="w-3.5 h-3.5 shrink-0 text-matlab-blue dark:text-cyan-400" />
              <span>Labga o'tish</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {labJumpOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 text-xs space-y-1"
                onMouseLeave={() => setLabJumpOpen(false)}
              >
                <div className="px-3 py-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                  20 ta amaliy mashg'ulot
                </div>
                {Array.from({ length: 20 }, (_, i) => i + 2).map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      handleNavClick('lab', num);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span className="font-semibold">№ {num}-laboratoriya</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Variant Selector Pill (Only for students) */}
          {!isTeacher && !isAdmin && (
            <div className="h-9 flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 px-3 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-sm whitespace-nowrap shrink-0">
              <span className="hidden sm:inline">Variant:</span>
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(Number(e.target.value))}
                className="bg-transparent font-bold cursor-pointer outline-none text-amber-900 dark:text-amber-200"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    № {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notification Bell Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Bildirishnomalar"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {notifDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-150"
                onMouseLeave={() => setNotifDropdownOpen(false)}
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-matlab-blue dark:text-cyan-400" />
                    <span>Bildirishnomalar</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Barchasini o'qish</span>
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Hozircha yangi bildirishnomalar yo'q.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkOneRead(notif.id)}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                          notif.is_read
                            ? 'bg-slate-50/60 dark:bg-slate-800/40 border-transparent text-slate-500'
                            : 'bg-cyan-50/60 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-900/40 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-[11px] text-slate-900 dark:text-white leading-tight">
                            {notif.title}
                          </span>
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-400 mt-1.5 block">
                          {notif.created_at}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title={isDark ? "Kunduzgi rejim" : "Tungi rejim"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Account Switcher Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="h-9 flex items-center gap-2 px-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 ${
                isAdmin ? 'bg-rose-600' : (isTeacher ? 'bg-purple-600' : 'bg-matlab-blue')
              }`}>
                {isAdmin ? <Shield className="w-3.5 h-3.5" /> : (isTeacher ? <GraduationCap className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />)}
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span className="truncate max-w-[120px]">{user?.full_name?.split(' ')[0] || "Mehmon"}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    isAdmin ? 'bg-rose-500/10 text-rose-600' : (isTeacher ? 'bg-purple-500/10 text-purple-600' : 'bg-cyan-500/10 text-cyan-600')
                  }`}>
                    {isAdmin ? "Admin" : (isTeacher ? "Ustoz" : "Talaba")}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {isAdmin ? "Kafedra Nazorati" : (isTeacher ? "DSP Kafedrasi" : (user?.group_name || "Guruh: 210-22"))}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
            </button>

            {userDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-xs space-y-1"
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">{user?.full_name}</div>
                  <div className="text-[11px] text-slate-400">{user?.email}</div>
                </div>

                <div className="px-3 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tezkor rollarni almashtirish (Demo):
                </div>

                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleSwitchAccount(acc)}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                      user?.email === acc.email
                        ? 'bg-slate-100 dark:bg-slate-800 text-matlab-blue dark:text-cyan-400 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs">{acc.name}</div>
                      <div className="text-[10px] text-slate-400">{acc.role === 'admin' ? 'Tizim Admini' : (acc.role === 'teacher' ? 'O\'qituvchi' : `${acc.variant}-variant`)}</div>
                    </div>
                    {user?.email === acc.email && <div className="w-2 h-2 rounded-full bg-green-500" />}
                  </button>
                ))}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-red-500 hover:bg-red-500/10 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Tizimdan chiqish</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl lg:hidden text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Menyu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-4 duration-200">
          {isAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
                currentView === 'admin'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Admin Paneli</span>
            </button>
          )}

          {(isTeacher || isAdmin) && (
            <button
              onClick={() => handleNavClick('teacher')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
                currentView === 'teacher'
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>O'qituvchi Paneli</span>
            </button>
          )}

          {!isTeacher && !isAdmin && (
            <>
              <button
                onClick={() => handleNavClick('assignments')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  currentView === 'assignments'
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0 text-cyan-500" />
                <span>Mening Vazifalarim</span>
              </button>

              <button
                onClick={() => handleNavClick('attendance')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  currentView === 'attendance'
                    ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0 text-green-500" />
                <span>Davomatim</span>
              </button>
            </>
          )}

          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
              currentView === 'dashboard'
                ? 'bg-matlab-blue text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>20 ta Laboratoriya</span>
          </button>

          <button
            onClick={() => handleNavClick('ai_tutor')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
              currentView === 'ai_tutor'
                ? 'bg-cyan-500 text-white'
                : 'text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>AI Virtual Ustoz</span>
          </button>

          <button
            onClick={() => handleNavClick('workbench')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
              currentView === 'workbench'
                ? 'bg-matlab-blue text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4 shrink-0" />
            <span>MATLAB Workbench</span>
          </button>

          <button
            onClick={() => handleNavClick('pipeline')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
              currentView === 'pipeline'
                ? 'bg-matlab-blue text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Network className="w-4 h-4 shrink-0" />
            <span>DIP Pipeline Qurgich</span>
          </button>

          <button
            onClick={() => handleNavClick('quiz')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
              currentView === 'quiz'
                ? 'bg-matlab-blue text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Nazorat Testlari</span>
          </button>
        </div>
      )}
    </header>
  );
};
export default Header;

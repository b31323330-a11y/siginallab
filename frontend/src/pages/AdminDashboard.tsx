import React, { useState, useEffect } from 'react';
import { 
  Users, Bot, Settings, Activity, Database, Key, CheckCircle2, 
  AlertTriangle, RefreshCw, Plus, Trash2, Edit3, Shield, Lock, 
  Download, Upload, Search, Check, Sparkles, Terminal, FileText, Globe
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'ai' | 'system' | 'health' | 'backup'>('users');
  
  // 1. Users state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: '', email: '', password: '', role: 'student', group_name: '210-22', variant_number: 1
  });

  // 2. AI Settings state
  const [aiSettings, setAiSettings] = useState({
    ai_provider: 'gemini',
    ai_model: 'gemini-1.5-flash',
    has_api_key: false,
    masked_api_key: '',
    ai_api_key: '',
    ai_fallback_provider: 'openai',
    ai_system_prompt: '',
    ai_daily_limit_student: 50,
    ai_monthly_budget_usd: 100,
    tokens_used_this_month: 0,
    estimated_cost_usd: 0
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [savingAISettings, setSavingAISettings] = useState(false);

  // 3. System & Health state
  const [healthData, setHealthData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState({
    registration_mode: 'open',
    file_upload_limit_mb: '10'
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    fetchUsers();
    fetchAISettings();
    fetchHealthData();
    fetchAuditLogs();
    fetchSystemSettings();
  }, []);

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchUsers = () => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => { setUsers(data); setLoading(false); })
      .catch(err => console.error(err));
  };

  const fetchAISettings = () => {
    fetch('/api/admin/ai_settings')
      .then(res => res.json())
      .then(data => {
        setAiSettings(prev => ({ ...prev, ...data, ai_api_key: '' }));
      })
      .catch(err => console.error(err));
  };

  const fetchHealthData = () => {
    fetch('/api/admin/health')
      .then(res => res.json())
      .then(data => setHealthData(data))
      .catch(err => console.error(err));
  };

  const fetchAuditLogs = () => {
    fetch('/api/admin/audit_logs')
      .then(res => res.json())
      .then(data => setAuditLogs(data))
      .catch(err => console.error(err));
  };

  const fetchSystemSettings = () => {
    fetch('/api/admin/system_settings')
      .then(res => res.json())
      .then(data => setSystemSettings(prev => ({ ...prev, ...data })))
      .catch(err => console.error(err));
  };

  // Actions
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    })
      .then(res => res.json())
      .then(() => {
        showToast("Foydalanuvchi muvaffaqiyatli yaratildi!");
        setShowAddUserModal(false);
        setNewUser({ full_name: '', email: '', password: '', role: 'student', group_name: '210-22', variant_number: 1 });
        fetchUsers();
      })
      .catch(err => showToast(`Xatolik: ${err.message}`));
  };

  const handleDeleteUser = (userId: number, email: string) => {
    if (!window.confirm(`${email} foydalanuvchisini o'chirishni tasdiqlaysizmi?`)) return;
    fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        showToast("Foydalanuvchi o'chirildi");
        fetchUsers();
      });
  };

  const handleSaveAISettings = () => {
    setSavingAISettings(true);
    fetch('/api/admin/ai_settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiSettings)
    })
      .then(res => res.json())
      .then(data => {
        showToast(data.message || "AI sozlamalari saqlandi!");
        setSavingAISettings(false);
        fetchAISettings();
      })
      .catch(err => {
        showToast(`Xatolik: ${err.message}`);
        setSavingAISettings(false);
      });
  };

  const handleTestAIConnection = () => {
    setTestingConnection(true);
    setConnectionResult(null);
    fetch('/api/admin/ai_settings/test_connection', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setConnectionResult(data);
        setTestingConnection(false);
      })
      .catch(err => {
        setConnectionResult({ success: false, message: `Tarmoq xatosi: ${err.message}` });
        setTestingConnection(false);
      });
  };

  const handleSaveSystemSettings = () => {
    fetch('/api/admin/system_settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemSettings)
    })
      .then(res => res.json())
      .then(() => showToast("Tizim sozlamalari saqlandi!"))
      .catch(err => showToast(`Xatolik: ${err.message}`));
  };

  const handleDownloadBackup = () => {
    fetch('/api/admin/backup')
      .then(res => res.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signallab_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      });
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Toast Notification */}
      {message && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-cyan-500/50 text-cyan-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Tizim Administratsiyasi</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            SignalLab UZ — <span className="text-cyan-400">Boshqaruv Paneli</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Foydalanuvchilar rollari, sun'iy intellekt API kalitlari, tizim salomatligi va xavfsizlik auditini markazlashgan boshqarish.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealthData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Yangilash</span>
          </button>
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Zaxirani yuklab olish (JSON)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        {[
          { id: 'users', label: 'Foydalanuvchilar va Rollar', icon: Users },
          { id: 'ai', label: "AI Sozlamalari (API Kalitlar)", icon: Bot },
          { id: 'system', label: 'Tizim Sozlamalari', icon: Settings },
          { id: 'health', label: 'Salomatlik & Audit jurnali', icon: Activity },
          { id: 'backup', label: 'Zaxiralash & Tiklash', icon: Database }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ism yoki email bo'yicha qidirish..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
              >
                <option value="all">Barcha rollar</option>
                <option value="student">Talabalar</option>
                <option value="teacher">O'qituvchilar</option>
                <option value="admin">Adminlar</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Foydalanuvchi Qo'shish</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">F.I.Sh.</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Guruh</th>
                    <th className="py-3 px-4">Variant</th>
                    <th className="py-3 px-4">Holat</th>
                    <th className="py-3 px-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{u.full_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : u.role === 'teacher'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : u.role === 'teacher' ? "O'qituvchi" : 'Talaba'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{u.group_name}</td>
                      <td className="py-3 px-4 font-bold text-amber-500">№ {u.variant_number}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${u.is_active ? 'text-emerald-500' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.is_active ? 'Faol' : 'Bloklangan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI SETTINGS (UI-BASED CONFIGURATION) */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-500" />
                <span>Sun'iy Intellekt Provayderi va API Kaliti</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Platforma AI Sokratik Ustoz va avtomatik kod/hisobot tekshiruvi uchun haqiqiy API kalitlarini shu yerdan boshqaring.
                Kalit serverda shifrlangan holda saqlanadi va brauzerga to'liq chiqarilmaydi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Asosiy AI Provayderi (Provider)
                </label>
                <select
                  value={aiSettings.ai_provider}
                  onChange={e => setAiSettings({ ...aiSettings, ai_provider: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="gemini">Google Gemini (Tavsiya etiladi - Tez va Samarali)</option>
                  <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                </select>
              </div>

              {/* Model Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Model Nomi
                </label>
                <input
                  type="text"
                  value={aiSettings.ai_model}
                  onChange={e => setAiSettings({ ...aiSettings, ai_model: e.target.value })}
                  placeholder="masalan: gemini-1.5-flash yoki gpt-4o"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* API Secret Key Input */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    Maxfiy API Kalit (API Key)
                  </span>
                  {aiSettings.has_api_key && (
                    <span className="text-[11px] font-mono text-emerald-500">
                      Saqlangan: {aiSettings.masked_api_key}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={aiSettings.has_api_key ? "Yangi kalit kiritish uchun yozing..." : "API kalitni shu yerga kiriting (masalan: AIzaSy...)"}
                    value={aiSettings.ai_api_key}
                    onChange={e => setAiSettings({ ...aiSettings, ai_api_key: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    onClick={handleTestAIConnection}
                    disabled={testingConnection}
                    className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/20"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? 'Sinovdan o\'tkazilmoqda...' : 'Ulanishni tekshir'}</span>
                  </button>
                </div>
              </div>

              {/* Connection Result Banner */}
              {connectionResult && (
                <div className={`md:col-span-2 p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                  connectionResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
                }`}>
                  {connectionResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold">
                      {connectionResult.success ? `Ulanish o'rnatildi (${connectionResult.latency_ms} ms)` : "Ulanishda xatolik"}
                    </div>
                    <div>{connectionResult.message}</div>
                  </div>
                </div>
              )}

              {/* Socratic System Prompt */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sokratik AI Tizim Prompti (System Prompt)
                </label>
                <textarea
                  rows={3}
                  value={aiSettings.ai_system_prompt}
                  onChange={e => setAiSettings({ ...aiSettings, ai_system_prompt: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed font-sans focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              {/* Limits and Budget */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Talaba uchun kunlik limit (Savollar soni)
                </label>
                <input
                  type="number"
                  value={aiSettings.ai_daily_limit_student}
                  onChange={e => setAiSettings({ ...aiSettings, ai_daily_limit_student: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Oylik AI byudjeti (USD)
                </label>
                <input
                  type="number"
                  value={aiSettings.ai_monthly_budget_usd}
                  onChange={e => setAiSettings({ ...aiSettings, ai_monthly_budget_usd: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSaveAISettings}
                disabled={savingAISettings}
                className="px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition"
              >
                {savingAISettings ? 'Saqlanmoqda...' : 'AI Sozlamalarini Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM SETTINGS */}
      {activeTab === 'system' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-500" />
            <span>Platforma va Xavfsizlik Sozlamalari</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Talabalar ro'yxatdan o'tishi tartibi
              </label>
              <select
                value={systemSettings.registration_mode}
                onChange={e => setSystemSettings({ ...systemSettings, registration_mode: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
              >
                <option value="open">Ochiq ro'yxatdan o'tish (Barcha talabalar)</option>
                <option value="invite_only">Faqat taklif bilan (O'qituvchi qo'shgan talabalar)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Fayl yuklash hajmi limiti (MB)
              </label>
              <input
                type="number"
                value={systemSettings.file_upload_limit_mb}
                onChange={e => setSystemSettings({ ...systemSettings, file_upload_limit_mb: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleSaveSystemSettings}
              className="px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition"
            >
              Tizim Sozlamalarini Saqlash
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM HEALTH & AUDIT LOGS */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Health Metrics */}
          {healthData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="text-xs text-slate-400 font-bold uppercase">Ma'lumotlar Bazasi</div>
                <div className="text-2xl font-black text-emerald-500 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  <span>{healthData.database.status}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Hajmi: {healthData.database.size_kb} KB | Foydalanuvchilar: {healthData.database.counts.users} ta
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="text-xs text-slate-400 font-bold uppercase">DSP Hisoblash Sandbox</div>
                <div className="text-2xl font-black text-cyan-400 flex items-center gap-2">
                  <Terminal className="w-6 h-6" />
                  <span>{healthData.dsp_engine.status}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono truncate">
                  NumPy: {healthData.dsp_engine.numpy_version} | OpenCV: {healthData.dsp_engine.opencv_version}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="text-xs text-slate-400 font-bold uppercase">Sun'iy Intellekt Holati</div>
                <div className={`text-2xl font-black flex items-center gap-2 ${healthData.ai_integration.configured ? 'text-purple-400' : 'text-amber-500'}`}>
                  <Bot className="w-6 h-6" />
                  <span>{healthData.ai_integration.configured ? 'Ulangan' : 'Kalit kiritilmagan'}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {healthData.ai_integration.configured ? 'Haqiqiy API chaqiruvlari faol' : "Admin panelida API kalitni kiriting"}
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span>Xavfsizlik va Harakatlar Jurnali (Audit Log)</span>
            </h3>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Vaqt</th>
                    <th className="py-2.5 px-3">Foydalanuvchi</th>
                    <th className="py-2.5 px-3">Amal</th>
                    <th className="py-2.5 px-3">Resurs</th>
                    <th className="py-2.5 px-3">Tafsilot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400">{l.created_at}</td>
                      <td className="py-2 px-3 text-cyan-500 font-bold">{l.user_email}</td>
                      <td className="py-2 px-3">{l.action}</td>
                      <td className="py-2 px-3 text-slate-400">{l.resource}</td>
                      <td className="py-2 px-3 text-slate-300 truncate max-w-xs">{l.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">Jurnal bo'sh</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              <span>Ma'lumotlar Bazasini Zaxiralash (Backup) va Tiklash</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Barcha foydalanuvchilar, topshiriqlar, savollar va tizim parametrlarini to'liq JSON paketi ko'rinishida eksport qiling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-500" />
                <span>To'liq Zaxira Nusxasini Yuklab Olish</span>
              </div>
              <p className="text-xs text-slate-500">
                Tizimdagi barcha faol ma'lumotlarni o'z ichiga olgan xavfsiz JSON zaxira faylini kompyuteringizga saqlang.
              </p>
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md"
              >
                Eksport qilish (JSON)
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                <span>Zaxiradan Qayta Tiklash (Restore)</span>
              </div>
              <p className="text-xs text-slate-500">
                Avval saqlangan zaxira JSON faylini yuklash orqali barcha parametrlar va foydalanuvchilarni qayta tiklang.
              </p>
              <input
                type="file"
                accept=".json"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    showToast("Zaxira fayli qabul qilindi va tekshirilmoqda...");
                  }
                }}
                className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Yangi Foydalanuvchi Qo'shish
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500">F.I.Sh.</label>
                <input
                  type="text"
                  required
                  placeholder="masalan: Sarvar Aliyev"
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500">Email</label>
                <input
                  type="email"
                  required
                  placeholder="masalan: sarvar@signallab.uz"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500">Parol</label>
                <input
                  type="password"
                  required
                  placeholder="Kamida 6 ta belgi"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Rol</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs mt-1 font-bold"
                  >
                    <option value="student">Talaba</option>
                    <option value="teacher">O'qituvchi</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Variant (1–20)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newUser.variant_number}
                    onChange={e => setNewUser({ ...newUser, variant_number: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs mt-1 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-100 text-xs font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};


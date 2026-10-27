import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Search, Play, CheckCircle2, Clock, Sparkles, Filter, 
  Award, ChevronRight, X, AlertCircle, BarChart3, CheckCircle 
} from 'lucide-react';

interface LabItem {
  id: number;
  title: string;
  objective: string;
  category: string;
  difficulty: string;
  duration: string;
  tags: string[];
  variants_count: number;
  questions_count: number;
  status: string;
  score: number;
}

interface DashboardProps {
  onSelectLab: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectLab }) => {
  const { user, selectedVariant } = useAuthStore();
  const [labs, setLabs] = useState<LabItem[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/labs')
      .then((res) => res.json())
      .then((data) => {
        setLabs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load labs:', err);
        setLoading(false);
      });

    fetch('/api/assignments')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUpcomingAssignments(data);
      })
      .catch(() => {});
  }, []);

  const categories = [
    'Barchasi',
    '1D & 2D',
    '1D Signal',
    '2D Image',
    'Spektr',
    'Siqish',
    'Audio & Nutq',
    'AI & Deteksiya',
    'Interpolatsiya',
    'Rang Modellari',
    'Restavratsiya'
  ];

  const getCategoryCount = (cat: string) => {
    if (cat === 'Barchasi') return labs.length;
    return labs.filter(l => l.category && l.category.includes(cat)).length;
  };

  const filteredLabs = labs.filter((lab) => {
    const matchesSearch = 
      lab.title.toLowerCase().includes(search.toLowerCase()) ||
      lab.objective.toLowerCase().includes(search.toLowerCase()) ||
      lab.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCat = selectedCategory === 'Barchasi' || (lab.category && lab.category.includes(selectedCategory));
    return matchesSearch && matchesCat;
  });

  const completedCount = labs.filter((l) => l.status === 'completed' || (l.score && l.score > 0)).length;
  const progressPercent = Math.round((completedCount / (labs.length || 20)) * 100);

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'oson':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Oson
          </span>
        );
      case 'qiyin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Qiyin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            O'rtacha
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-matlab-darkBlue to-slate-950 text-white p-8 md:p-10 shadow-2xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold backdrop-blur border border-cyan-500/30">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            2026-yilgi Interaktiv O'quv Dasturi
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Xush kelibsiz, <span className="text-cyan-400">{user?.full_name || 'Talaba'}</span>!
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            "Signallar va tasvirlarga ishlov berish" fani bo'yicha 20 ta amaliy laboratoriya mashg'ulotlari. 
            Sizga biriktirilgan variant: <span className="font-bold text-amber-400">№ {selectedVariant}-variant</span>. 
            MATLAB instrumental vositasi orqali signallar va tasvirlarni real vaqtda tahlil qiling.
          </p>

          {/* Quick Metrics */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
              <div className="text-xs text-slate-400">Jami laboratoriyalar</div>
              <div className="text-2xl font-bold text-white">20 ta</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
              <div className="text-xs text-slate-400">Bajarilgan</div>
              <div className="text-2xl font-bold text-emerald-400">{completedCount} ta</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
              <div className="text-xs text-slate-400">Umumiy progress</div>
              <div className="text-2xl font-bold text-cyan-300">{progressPercent}%</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
              <div className="text-xs text-slate-400">Joriy variantingiz</div>
              <div className="text-2xl font-bold text-amber-400">№ {selectedVariant}</div>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Kursni o'zlashtirish jarayoni</span>
              <span className="font-bold text-cyan-300">{completedCount} / 20 amaliy topshiriq ({progressPercent}%)</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Decorative Wave BG */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-96 h-96 text-cyan-400 fill-current">
            <path d="M44.5,-76.3C58.3,-69.1,70.6,-57.8,78.2,-44.1C85.7,-30.4,88.5,-15.2,86.6,-0.6C84.7,14,78.1,28,69.5,40.1C60.9,52.2,50.3,62.4,37.8,69.2C25.3,76,10.9,79.4,-3.8,80.6C-18.5,81.8,-37,80.7,-50.7,73.1C-64.4,65.5,-73.3,51.3,-78.9,36.1C-84.5,20.8,-86.8,4.5,-83.4,-10.3C-80,-25.1,-70.9,-38.4,-59.4,-47.9C-47.9,-57.4,-34,-63,-20.5,-69.8C-7,-76.6,6.1,-84.6,20.6,-85.7C35.1,-86.8,51,-81,44.5,-76.3Z" transform="translate(100 100)" />
          </svg>
        </div>
      </div>

      {/* Upcoming Deadlines Widget */}
      {upcomingAssignments.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Yaqin Muddatlar va Topshiriqlar
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Faol topshiriqlar: {upcomingAssignments.length} ta
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {upcomingAssignments.slice(0, 3).map((as) => (
              <div 
                key={as.id}
                className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    № {as.lab_number || 2}-Lab
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {as.deadline || "Muddatsiz"}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                  {as.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {as.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Mavzu, funksiya (conv, fft, dct) yoki kalit so'z..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-matlab-blue dark:focus:ring-cyan-500 shadow-sm"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Natija: <b className="text-slate-900 dark:text-white">{filteredLabs.length}</b> ta mashg'ulot</span>
          </div>
        </div>

        {/* Categories Scrollable Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const count = getCategoryCount(cat);
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-matlab-blue text-white shadow-md shadow-matlab-blue/30 scale-105'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Labs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredLabs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Laboratoriya topilmadi</h3>
            <p className="text-xs text-slate-400 mt-1">
              "{search}" so'rovi bo'yicha laboratoriyalar mavjud emas. Qidiruv so'zini o'zgartiring.
            </p>
          </div>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('Barchasi');
            }}
            className="px-4 py-2 rounded-xl bg-matlab-blue text-white text-xs font-bold hover:bg-matlab-darkBlue transition-colors shadow-sm"
          >
            Filtrni tozalash
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLabs.map((lab) => {
            const isCompleted = lab.status === 'completed' || (lab.score && lab.score > 0);
            return (
              <div
                key={lab.id}
                onClick={() => onSelectLab(lab.id)}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-xl hover:border-matlab-blue/40 dark:hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  {/* Header Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-matlab-blue/10 text-matlab-blue dark:bg-cyan-500/10 dark:text-cyan-400">
                        № {lab.id}-amaliy
                      </span>
                      {getDifficultyBadge(lab.difficulty)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{lab.duration}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-matlab-blue dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {lab.title}
                  </h3>

                  {/* Objective */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {lab.objective}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {lab.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                    {lab.tags.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[10px] text-slate-400">
                        +{lab.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Bajarilgan {lab.score ? `(${lab.score} ball)` : ''}</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Variant: <b className="font-bold">№ {selectedVariant}</b>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLab(lab.id);
                    }}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold group-hover:bg-matlab-blue group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-slate-950 transition-all shadow-sm"
                  >
                    <span>Ochish</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Calendar, CheckCircle, XCircle, AlertCircle, Award, Clock } from 'lucide-react';

export const StudentAttendance: React.FC = () => {
  const { user } = useAuthStore();
  const [attendanceData, setAttendanceData] = useState<any>({
    summary: { total_lessons: 0, present_count: 0, absent_count: 0, excused_count: 0, attendance_rate: 100 },
    records: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = user?.id || 1;
    fetch(`/api/attendance/my?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        setAttendanceData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  const { summary, records } = attendanceData;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Mening Dars Davomatim
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              "Signallar va tasvirlarga ishlov berish" fani bo'yicha mashg'ulotlarda qatnashish ko'rsatkichlaringiz
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Talaba:</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {user?.full_name || "Aziz Rahimov"} ({user?.group_name || "210-22"})
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Davomat darajasi</span>
          <div className={`text-2xl font-bold ${
            (summary.attendance_rate || 100) >= 80 ? 'text-green-500' : 'text-red-500'
          }`}>
            {summary.attendance_rate || 100}%
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Qatnashgan darslar</span>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {summary.present_count || 0} ta
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Sababli qoldirilgan</span>
          <div className="text-2xl font-bold text-amber-500">
            {summary.excused_count || 0} ta
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Sababsiz qoldirilgan</span>
          <div className="text-2xl font-bold text-red-500">
            {summary.absent_count || 0} ta
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Mashg'ulotlar Tarixi
          </h3>
          <span className="text-xs text-slate-400">
            Jami: {records.length} ta dars qayd etilgan
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Yuklanmoqda...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">Hozircha davomat qaydlari kiritilmagan.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
              <tr>
                <th className="p-3.5 rounded-l-xl">Sana</th>
                <th className="p-3.5">Mashg'ulot</th>
                <th className="p-3.5">Holati</th>
                <th className="p-3.5 rounded-r-xl">O'qituvchi Eslatmasi / Izohi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white font-mono">
                    {r.lesson_date}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    {r.lab_number ? `№ ${r.lab_number}-laboratoriya mashg'uloti` : "Nazariy dars"}
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                      r.status === 'present'
                        ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300'
                        : r.status === 'excused'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                    }`}>
                      {r.status === 'present' ? <CheckCircle className="w-3.5 h-3.5" /> : r.status === 'excused' ? <Clock className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{r.status === 'present' ? "Kelgan" : r.status === 'excused' ? "Sababli" : "Kelmagan"}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500 italic">
                    {r.note || "Izoh kiritilmagan"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

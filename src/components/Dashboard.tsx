/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Calendar,
  BookOpen,
  ClipboardList,
  ShoppingCart,
  Users,
  Activity,
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';
import { Period, MenuDay, MenuPlan, ProcurementOrder, AuditLog } from '../types';

interface DashboardProps {
  periods: Period[];
  menuDays: MenuDay[];
  menuPlans: MenuPlan[];
  procurementOrders: ProcurementOrder[];
  auditLogs: AuditLog[];
  setActiveTab: (tab: string) => void;
  onQuickCreatePeriod: () => void;
}

export default function Dashboard({
  periods,
  menuDays,
  menuPlans,
  procurementOrders,
  auditLogs,
  setActiveTab,
  onQuickCreatePeriod
}: DashboardProps) {
  // Compute active variables
  const activePeriod = periods.find(p => p.status === 'Draft' || p.status === 'Final');
  const activeDays = activePeriod ? menuDays.filter(d => d.period_id === activePeriod.id && d.distribution_day) : [];
  const completedDaysCount = activeDays.filter(d => {
    // Check if there are finalized menu plans on this day
    const plansOnDay = menuPlans.filter(p => p.menu_day_id === d.id);
    return plansOnDay.length > 0 && plansOnDay.every(p => p.status === 'Final');
  }).length;

  const totalHppSpend = procurementOrders.reduce((sum, order) => sum + order.total_cost, 0);

  const stats = [
    {
      name: 'Periode Aktif',
      value: activePeriod ? activePeriod.name : 'Belum Ada',
      description: activePeriod ? `${activePeriod.start_date} s/d ${activePeriod.end_date}` : 'Buat periode baru',
      icon: Calendar,
      color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    },
    {
      name: 'Progress Menu Planning',
      value: activeDays.length > 0 ? `${completedDaysCount} / ${activeDays.length} Hari` : '0 Hari',
      description: activeDays.length > 0 ? `${Math.round((completedDaysCount / activeDays.length) * 100)}% Tersusun Final` : 'Belum dimulai',
      icon: ClipboardList,
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    },
    {
      name: 'Total Belanja Bahan',
      value: `Rp ${totalHppSpend.toLocaleString('id-ID')}`,
      description: 'Seluruh periode operasional',
      icon: ShoppingCart,
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">Sistem Keputusan Gizi</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Selamat Datang di GzQ Plan</h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Percepat perencanaan siklus menu 12 hari operasional, kendalikan Harga Pokok Produksi (HPP), dan pastikan target Angka Kecukupan Gizi (AKG) terpenuhi secara real-time.
          </p>
          {!activePeriod && (
            <div className="pt-3">
              <button
                onClick={onQuickCreatePeriod}
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span>Mulai Siklus Menu Baru</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300">
              <div className={`p-4 rounded-2xl border ${stat.color} flex-shrink-0 flex items-center justify-center`}>
                <Icon size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.name}</p>
                <h3 className="text-xl font-bold text-slate-800 truncate mt-1 leading-tight">{stat.value}</h3>
                <p className="text-xs text-slate-500 truncate mt-1 leading-none">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shortcuts & Audit Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Shortcuts */}
        <div className="lg:col-span-2 space-y-5">
          <h4 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Activity size={18} className="text-slate-400" />
            <span>Alur Kerja Operasional</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab('periods')}
              className="text-left bg-white border border-slate-100 rounded-2xl p-5 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group cursor-pointer"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <Calendar size={20} />
              </div>
              <h5 className="font-bold text-slate-800 mt-4 leading-tight">1. Setup Kalender & Periode</h5>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Kelola rentang operasional 14 hari, abaikan hari Minggu secara otomatis.</p>
            </button>

            <button
              onClick={() => setActiveTab('planning')}
              className="text-left bg-white border border-slate-100 rounded-2xl p-5 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group cursor-pointer"
            >
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <ClipboardList size={20} />
              </div>
              <h5 className="font-bold text-slate-800 mt-4 leading-tight">2. Menu Planning & Nutrition Engine</h5>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Input gramasi bersih, hitung gizi real-time tanpa tombol hitung.</p>
            </button>

            <button
              onClick={() => setActiveTab('procurement')}
              className="text-left bg-white border border-slate-100 rounded-2xl p-5 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group cursor-pointer"
            >
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                <ShoppingCart size={20} />
              </div>
              <h5 className="font-bold text-slate-800 mt-4 leading-tight">3. Rekap & Procurement</h5>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Gabungkan kebutuhan bahan, kelola harga satuan, dan bumbu tambahan.</p>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className="text-left bg-white border border-slate-100 rounded-2xl p-5 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group cursor-pointer"
            >
              <div className="p-3 bg-slate-100 text-slate-700 rounded-xl w-fit group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
                <BookOpen size={20} />
              </div>
              <h5 className="font-bold text-slate-800 mt-4 leading-tight">4. Cetak Laporan Gizi Operasional</h5>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Ekspor siklus menu, gizi lengkap, dan daftar rincian belanja.</p>
            </button>
          </div>
        </div>

        {/* Audit Logs Sidebar */}
        <div className="space-y-5">
          <h4 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <History size={18} className="text-slate-400" />
            <span>Aktivitas Pengguna Terbaru</span>
          </h4>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 max-h-[360px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada riwayat aktivitas.</p>
            ) : (
              auditLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="flex gap-3 text-xs leading-relaxed border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      {log.user_name || 'System'}{' '}
                      <span className="font-normal text-slate-500">melakukan</span> {log.action}
                    </p>
                    <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-1">
                      <span>{log.module}</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleTimeString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Period, MenuDay } from '../types';

interface PeriodsProps {
  periods: Period[];
  menuDays: MenuDay[];
  onCreatePeriod: (name: string, startDate: string, endDate: string) => void;
  onDeletePeriod: (id: number) => void;
}

export default function Periods({ periods, menuDays, onCreatePeriod, onDeletePeriod }: PeriodsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(periods[0]?.id || null);
  const [deletingPeriodId, setDeletingPeriodId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    onCreatePeriod(name, startDate, endDate);
    setName('');
    setStartDate('');
    setEndDate('');
    setShowAddForm(false);
  };

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
  const selectedDays = selectedPeriod ? menuDays.filter(d => d.period_id === selectedPeriod.id) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Siklus Periode Operasional</h2>
          <p className="text-sm text-slate-500">Kelola kalender siklus menu 14 Hari Operasional (12 Hari Distribusi Menu).</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer"
        >
          <Plus size={16} />
          <span>Buat Periode Baru</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-xl space-y-4 animate-fade-in">
          <h3 className="font-bold text-slate-800 text-lg">Input Data Periode Operasional</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nama Periode</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Periode Siklus Menu Juli 2026"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    // Automatically calculate standard 14 days operational end date (start date + 13 days)
                    if (e.target.value) {
                      const d = new Date(e.target.value);
                      d.setDate(d.getDate() + 13);
                      setEndDate(d.toISOString().split('T')[0]);
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Selesai (Otomatis 14 Hari)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none cursor-not-allowed"
                  disabled
                  required
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/60 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-md shadow-emerald-500/15"
            >
              Simpan & Generate Hari Menu
            </button>
          </div>
        </form>
      )}

      {periods.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
          <Calendar size={48} className="text-slate-300 mx-auto" />
          <div>
            <h4 className="font-bold text-slate-800">Belum Ada Periode Terbuat</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Buat periode baru untuk mengotomatisasi daftar 12 hari distribusi menu dan mengabaikan hari Minggu.</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-md"
          >
            Buat Periode Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List of Periods */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Periode</h4>
            <div className="space-y-3">
              {periods.map(p => {
                const isSelected = p.id === selectedPeriodId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPeriodId(p.id)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500/30 shadow-md shadow-emerald-500/5'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-800 text-sm truncate">{p.name}</h5>
                        <p className="text-xs text-slate-500 mt-1">{p.start_date} s/d {p.end_date}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingPeriodId(p.id);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Hapus periode"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Days Calendar Grid for Selected Period */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Kalender Hari Menu: <span className="text-slate-700 font-semibold">{selectedPeriod?.name}</span>
              </h4>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-500/10">
                12 Hari Distribusi
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3.5">
              {selectedDays.map(day => {
                const isSunday = !day.distribution_day;
                return (
                  <div
                    key={day.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between min-h-[100px] transition-all duration-200 ${
                      isSunday
                        ? 'bg-red-50/40 border-red-500/10 text-slate-400'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 leading-none">
                        {new Date(day.calendar_date).toLocaleDateString('id-ID', { weekday: 'short' })}
                      </p>
                      <p className="text-lg font-extrabold text-slate-800 leading-tight mt-1">
                        {new Date(day.calendar_date).getDate()}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                        {new Date(day.calendar_date).toLocaleDateString('id-ID', { month: 'short' })}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between">
                      {isSunday ? (
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider leading-none">Minggu Libur</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-700 leading-none">H-{day.day_number}</span>
                        </div>
                      )}

                      {!isSunday && (
                        <div className="flex-shrink-0">
                          {day.status === 'Final' ? (
                            <CheckCircle size={12} className="text-emerald-500" />
                          ) : (
                            <Clock size={12} className="text-amber-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {deletingPeriodId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl max-w-md w-full mx-4 space-y-4 text-center">
            <div className="flex justify-center text-red-500">
              <Trash2 size={48} className="animate-pulse" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-base">Hapus Periode Operasional</h4>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Apakah Anda yakin ingin menghapus periode ini? Tindakan ini akan menghapus seluruh data hari menu, menu planning, dan lembar pesanan belanja terkait secara permanen.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeletingPeriodId(null)}
                className="px-5 py-2.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deletingPeriodId) {
                    onDeletePeriod(deletingPeriodId);
                    if (selectedPeriodId === deletingPeriodId) {
                      const nextPeriod = periods.find(x => x.id !== deletingPeriodId);
                      setSelectedPeriodId(nextPeriod ? nextPeriod.id : null);
                    }
                    setDeletingPeriodId(null);
                  }
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-400 rounded-xl cursor-pointer"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

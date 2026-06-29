/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileBarChart2, Printer, Check, ClipboardList, ShoppingCart, Calendar } from 'lucide-react';
import { Period, MenuDay, MenuPlan, BeneficiaryGroup, ProcurementOrder, Ingredient } from '../types';

interface ReportsProps {
  periods: Period[];
  menuDays: MenuDay[];
  menuPlans: MenuPlan[];
  beneficiaryGroups: BeneficiaryGroup[];
  procurementOrders: ProcurementOrder[];
}

export default function Reports({
  periods,
  menuDays,
  menuPlans,
  beneficiaryGroups,
  procurementOrders
}: ReportsProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(periods[0]?.id || null);
  const [reportType, setReportType] = useState<'siklus' | 'gizi' | 'rekap' | 'belanja'>('siklus');
  const [showPrintIframeModal, setShowPrintIframeModal] = useState(false);

  useEffect(() => {
    if (periods.length > 0) {
      if (selectedPeriodId === null || !periods.some(p => p.id === selectedPeriodId)) {
        setSelectedPeriodId(periods[0].id);
      }
    } else {
      setSelectedPeriodId(null);
    }
  }, [periods, selectedPeriodId]);

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
  const activeDays = selectedPeriod ? menuDays.filter(d => d.period_id === selectedPeriod.id && d.distribution_day) : [];

  const handlePrint = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintIframeModal(true);
    } else {
      window.focus();
      window.print();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:p-0">
      {/* Selector Options Header - Hide during print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Laporan Gizi Operasional</h2>
          <p className="text-sm text-slate-500">Cetak lembar siklus menu, gizi lengkap, dan lampiran rekapitulasi pengadaan bahan.</p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-sm shadow-md transition-all duration-200 cursor-pointer"
        >
          <Printer size={16} />
          <span>Cetak Laporan (Print / PDF)</span>
        </button>
      </div>

      {/* Selectors Panel - Hide during print */}
      <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm print:hidden">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Periode Operasional</label>
          <select
            value={selectedPeriodId || ''}
            onChange={e => setSelectedPeriodId(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Jenis Laporan</label>
          <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setReportType('siklus')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                reportType === 'siklus' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
              }`}
            >
              Siklus Menu
            </button>
            <button
              onClick={() => setReportType('gizi')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                reportType === 'gizi' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
              }`}
            >
              Kandungan Gizi
            </button>
            <button
              onClick={() => setReportType('rekap')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                reportType === 'rekap' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
              }`}
            >
              Rekap Kebutuhan
            </button>
            <button
              onClick={() => setReportType('belanja')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                reportType === 'belanja' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
              }`}
            >
              Rekap Belanja
            </button>
          </div>
        </div>
      </div>

      {/* =======================================================
          PRINT PREVIEW AREA (This is styled to render beautifully
          for both on-screen display and physical A4 paper print)
          ======================================================= */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6 print:border-0 print:shadow-none print:p-0">
        {/* Report Official Document Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">LAPORAN GIZI OPERASIONAL</h3>
            <p className="text-xs text-slate-600 font-medium">SPPG Sumenep Arjasa Bilis-bilis 2</p>
            <p className="text-xs font-bold text-slate-800">Siklus: {selectedPeriod?.name}</p>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-500">
            <p>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
            <p>Oleh: Pengawas Gizi</p>
          </div>
        </div>

        {/* 1. Siklus Menu Report */}
        {reportType === 'siklus' && (
          <div className="space-y-6 animate-fade-in">
            <h4 className="text-base font-bold text-slate-800 border-l-4 border-emerald-500 pl-3 uppercase tracking-wider">Laporan Matriks Siklus Menu 12 Hari</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200">Hari Menu</th>
                    {beneficiaryGroups.map(grp => (
                      <th key={grp.id} className="p-3 border-r border-slate-200">{grp.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeDays.map(day => {
                    return (
                      <tr key={day.id} className="hover:bg-slate-50/20">
                        <td className="p-3 font-bold bg-slate-50 border-r border-slate-200">Hari {day.day_number}<br/><span className="text-[10px] font-normal text-slate-500">{day.calendar_date}</span></td>
                        {beneficiaryGroups.map(grp => {
                          const plan = menuPlans.find(p => p.menu_day_id === day.id && p.beneficiary_group_id === grp.id);
                          return (
                            <td key={grp.id} className="p-3 border-r border-slate-200 align-top">
                              {plan ? (
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-800 leading-snug">{plan.menu_name}</p>
                                  <div className="space-y-1 mt-1.5 pt-1.5 border-t border-slate-100">
                                    {plan.components?.map(c => {
                                      const hasItems = c.items && c.items.length > 0;
                                      if (!hasItems) return null;
                                      return (
                                        <div key={c.id} className="text-[10px] text-slate-600 leading-normal">
                                          <span className="font-bold text-slate-800">{c.name}:</span>{' '}
                                          <span className="text-slate-600">
                                            {c.items.map(item => `${item.name} (${item.net_weight}g)`).join(', ')}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Belum disusun</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Kandungan Gizi Report */}
        {reportType === 'gizi' && (
          <div className="space-y-6 animate-fade-in">
            <h4 className="text-base font-bold text-slate-800 border-l-4 border-emerald-500 pl-3 uppercase tracking-wider">Laporan Rincian Nutrisi & Validasi AKG</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200">Hari Menu</th>
                    <th className="p-3 border-r border-slate-200">Kelompok Sasaran</th>
                    <th className="p-3 border-r border-slate-200 text-center">Energi (kcal)</th>
                    <th className="p-3 border-r border-slate-200 text-center">Protein (g)</th>
                    <th className="p-3 border-r border-slate-200 text-center">Lemak (g)</th>
                    <th className="p-3 border-r border-slate-200 text-center">Karbohidrat (g)</th>
                    <th className="p-3 text-center">Status Gizi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeDays.flatMap(day => {
                    return beneficiaryGroups.map(grp => {
                      const plan = menuPlans.find(p => p.menu_day_id === day.id && p.beneficiary_group_id === grp.id);
                      if (!plan) return null;

                      const isEnergyOk = plan.total_energy >= grp.energy_min && plan.total_energy <= grp.energy_max;
                      const isProteinOk = plan.total_protein >= grp.protein_min && plan.total_protein <= grp.protein_max;

                      return (
                        <tr key={`${day.id}-${grp.id}`} className="hover:bg-slate-50/20">
                          <td className="p-3 font-semibold bg-slate-50 border-r border-slate-200">Hari {day.day_number}</td>
                          <td className="p-3 font-medium text-slate-700 border-r border-slate-200">{grp.name}</td>
                          <td className="p-3 text-center border-r border-slate-200 font-mono">{plan.total_energy} / {grp.energy_min}-{grp.energy_max}</td>
                          <td className="p-3 text-center border-r border-slate-200 font-mono">{plan.total_protein} / {grp.protein_min}-{grp.protein_max}</td>
                          <td className="p-3 text-center border-r border-slate-200 font-mono">{plan.total_fat} / {grp.fat_min}-{grp.fat_max}</td>
                          <td className="p-3 text-center border-r border-slate-200 font-mono">{plan.total_carbohydrate} / {grp.carbohydrate_min}-{grp.carbohydrate_max}</td>
                          <td className="p-3 text-center font-bold">
                            {isEnergyOk && isProteinOk ? (
                              <span className="text-emerald-600">🟢 Sesuai</span>
                            ) : (
                              <span className="text-amber-500">🟡 Batas Toleransi</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  }).filter(Boolean)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Rekap Kebutuhan Report */}
        {reportType === 'rekap' && (
          <div className="space-y-6 animate-fade-in">
            <h4 className="text-base font-bold text-slate-800 border-l-4 border-emerald-500 pl-3 uppercase tracking-wider">Laporan Akumulasi Kebutuhan Bahan Baku Gizi</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Berikut rekapitulasi penggabungan total bahan kotor yang dibutuhkan dari seluruh penerima manfaat periode ini.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 max-w-xl">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    <th className="p-3">Kode</th>
                    <th className="p-3">Bahan Makanan</th>
                    <th className="p-3 text-right">Total Berat Kotor (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Aggregate values dynamically */}
                  {(() => {
                    const map: { [id: number]: { name: string, code: string, qty: number } } = {};
                    procurementOrders.forEach(order => {
                      if (order.items) {
                        order.items.forEach(it => {
                          if (!map[it.ingredient_id]) {
                            map[it.ingredient_id] = { name: it.name, code: it.code, qty: 0 };
                          }
                          map[it.ingredient_id].qty += it.actual_quantity;
                        });
                      }
                    });

                    const list = Object.values(map);
                    if (list.length === 0) {
                      return (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400">Belum ada daftar pesanan belanja bahan.</td>
                        </tr>
                      );
                    }

                    return list.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20">
                        <td className="p-3 font-mono text-emerald-600 font-bold">{item.code}</td>
                        <td className="p-3 font-semibold text-slate-700">{item.name}</td>
                        <td className="p-3 text-right font-bold font-mono text-slate-800">{Math.round(item.qty * 100) / 100} kg</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Rekap Belanja Report */}
        {reportType === 'belanja' && (
          <div className="space-y-6 animate-fade-in">
            <h4 className="text-base font-bold text-slate-800 border-l-4 border-emerald-500 pl-3 uppercase tracking-wider">Laporan Rincian Anggaran Belanja Logistik</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    <th className="p-3">Tanggal Pesanan</th>
                    <th className="p-3">Hari Menu</th>
                    <th className="p-3 text-right">Biaya Bahan Baku Gizi</th>
                    <th className="p-3 text-right">Biaya Tambahan Operasional</th>
                    <th className="p-3 text-right">Total Real Belanja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {procurementOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">Belum ada pesanan belanja logistik dibuat.</td>
                    </tr>
                  ) : (
                    procurementOrders.map(order => {
                      const matCost = order.items?.reduce((sum, i) => sum + i.subtotal, 0) || 0;
                      const manualCost = order.manual_items?.reduce((sum, i) => sum + i.subtotal, 0) || 0;
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-medium text-slate-700">{order.order_date}</td>
                          <td className="p-3 font-bold text-slate-700">Hari {menuDays.find(d => d.id === order.menu_day_id)?.day_number}</td>
                          <td className="p-3 text-right font-mono text-slate-600">Rp {matCost.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right font-mono text-slate-600">Rp {manualCost.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right font-extrabold text-emerald-600 font-mono">Rp {order.total_cost.toLocaleString('id-ID')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-right space-y-1.5 w-64">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Akumulasi Anggaran Belanja</span>
                <p className="text-xl font-extrabold text-emerald-600 font-mono">
                  Rp {procurementOrders.reduce((sum, o) => sum + o.total_cost, 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signature Area */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-700 print:block print:pt-24">
          <div className="space-y-12">
            <p>Disetujui Oleh,<br/><strong>Kepala SPPG</strong></p>
            <p className="font-mono text-[10px] text-slate-400">________________________</p>
          </div>
          <div className="space-y-12">
            <p>Dibuat Oleh,<br/><strong>Pengawas Gizi</strong></p>
            <p className="font-mono text-[10px] text-slate-400">________________________</p>
          </div>
        </div>
      </div>

      {showPrintIframeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden p-6 space-y-4 text-left">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <span>ℹ️ Panduan Cetak PDF / Laporan</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Keamanan browser membatasi pencetakan langsung dari dalam frame.</p>
              </div>
              <button
                onClick={() => setShowPrintIframeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 font-bold transition duration-150"
              >
                ✕
              </button>
            </div>
            
            <div className="text-xs text-slate-600 leading-relaxed space-y-2.5">
              <p>
                Karena aplikasi saat ini berjalan di dalam **Iframe Preview**, browser memblokir dialog pencetakan secara langsung demi keamanan.
              </p>
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-indigo-700 font-semibold text-center">
                Silakan klik tombol <strong className="font-extrabold text-indigo-800">"Open in New Tab" / "Buka di Tab Baru"</strong> yang berwarna biru/hijau di <strong>sudut kanan paling atas layar Anda</strong>.
              </div>
              <p>
                Setelah aplikasi terbuka di tab baru, Anda dapat mengeklik tombol <strong className="font-bold text-slate-800">Cetak Laporan</strong> kembali untuk langsung mencetak atau menyimpannya sebagai file **PDF** dengan rapi.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPrintIframeModal(false)}
                className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

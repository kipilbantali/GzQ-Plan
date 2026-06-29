/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Printer, 
  Search, 
  Unlock, 
  Lock, 
  RefreshCw, 
  Save, 
  FileText, 
  Check,
  Copy,
  Download,
  ExternalLink,
  X
} from 'lucide-react';
import { Period, MenuDay, ProcurementOrder, ProcurementItem, ProcurementManualItem, Ingredient, ProcurementStatus } from '../types';

interface ProcurementProps {
  periods: Period[];
  menuDays: MenuDay[];
  procurementOrders: ProcurementOrder[];
  ingredients: Ingredient[];
  onGenerateOrder: (periodId: number, dayId: number) => void;
  onUpdateOrder: (id: number, data: Partial<ProcurementOrder>) => void;
  onFinalizeOrder: (id: number) => void;
  onUnlockOrder: (id: number) => void;
  onDeleteOrder: (id: number) => void;
}

const UNITS_LIST = ["kg", "gram", "pcs", "ekor", "liter", "bungkus", "pak", "kardus", "ikat"];

export default function Procurement({
  periods,
  menuDays,
  procurementOrders,
  ingredients,
  onGenerateOrder,
  onUpdateOrder,
  onFinalizeOrder,
  onUnlockOrder,
  onDeleteOrder
}: ProcurementProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(periods[0]?.id || null);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);

  useEffect(() => {
    if (periods.length > 0) {
      if (selectedPeriodId === null || !periods.some(p => p.id === selectedPeriodId)) {
        setSelectedPeriodId(periods[0].id);
      }
    } else {
      setSelectedPeriodId(null);
    }
  }, [periods, selectedPeriodId]);

  const activePeriodDays = selectedPeriodId ? menuDays.filter(d => d.period_id === selectedPeriodId && d.distribution_day) : [];

  useEffect(() => {
    if (activePeriodDays.length > 0) {
      if (!selectedDayId || !activePeriodDays.some(d => d.id === selectedDayId)) {
        setSelectedDayId(activePeriodDays[0].id);
      }
    } else {
      setSelectedDayId(null);
    }
  }, [selectedPeriodId, activePeriodDays, selectedDayId]);

  // Active procurement order for the selected day from server
  const activeOrder = procurementOrders.find(o => o.menu_day_id === selectedDayId);

  // Manual bumbu inputs
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState<number>(1);
  const [manualUnit, setManualUnit] = useState('bungkus');
  const [manualPrice, setManualPrice] = useState<number>(5000);

  // Local state for draft editing and auto/manual saving
  const [localOrder, setLocalOrder] = useState<ProcurementOrder | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showPrintIframeModal, setShowPrintIframeModal] = useState(false);

  // Sync localOrder with activeOrder whenever day selection or activeOrder updates from server
  useEffect(() => {
    if (activeOrder) {
      setLocalOrder(JSON.parse(JSON.stringify(activeOrder)));
      setIsDirty(false);
    } else {
      setLocalOrder(null);
      setIsDirty(false);
    }
  }, [activeOrder, selectedDayId]);

  const handleGenerate = () => {
    if (!selectedPeriodId || !selectedDayId) return;
    onGenerateOrder(selectedPeriodId, selectedDayId);
  };

  const handleSave = async () => {
    if (!localOrder) return;
    await onUpdateOrder(localOrder.id, localOrder);
    setIsDirty(false);
  };

  const handlePrint = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintIframeModal(true);
    } else {
      window.focus();
      window.print();
    }
  };

  const handleUpdateItemQty = (itemId: number, qty: number) => {
    if (!localOrder || localOrder.status === ProcurementStatus.FINAL) return;

    const updated = JSON.parse(JSON.stringify(localOrder)) as ProcurementOrder;
    const it = updated.items?.find(i => i.id === itemId);
    if (it) {
      it.actual_quantity = qty;
      it.subtotal = Math.round(qty * it.unit_price);
    }
    
    // Recalculate billing
    const totalItemsCost = updated.items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
    const totalManualCost = updated.manual_items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
    updated.total_cost = totalItemsCost + totalManualCost;

    setLocalOrder(updated);
    setIsDirty(true);
  };

  const handleUpdateItemPrice = (itemId: number, price: number) => {
    if (!localOrder || localOrder.status === ProcurementStatus.FINAL) return;

    const updated = JSON.parse(JSON.stringify(localOrder)) as ProcurementOrder;
    const it = updated.items?.find(i => i.id === itemId);
    if (it) {
      it.unit_price = price;
      it.subtotal = Math.round(it.actual_quantity * price);
    }
    
    // Recalculate billing
    const totalItemsCost = updated.items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
    const totalManualCost = updated.manual_items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
    updated.total_cost = totalItemsCost + totalManualCost;

    setLocalOrder(updated);
    setIsDirty(true);
  };

  const handleUpdateItemUnit = (itemId: number, unit: string) => {
    if (!localOrder || localOrder.status === ProcurementStatus.FINAL) return;

    const updated = JSON.parse(JSON.stringify(localOrder)) as ProcurementOrder;
    const it = updated.items?.find(i => i.id === itemId);
    if (it) {
      it.purchase_unit = unit;
    }
    setLocalOrder(updated);
    setIsDirty(true);
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localOrder || !manualName || localOrder.status === ProcurementStatus.FINAL) return;

    const updated = JSON.parse(JSON.stringify(localOrder)) as ProcurementOrder;
    const nextId = updated.manual_items && updated.manual_items.length > 0
      ? Math.max(...updated.manual_items.map(m => m.id)) + 1
      : 1;

    const newItem: ProcurementManualItem = {
      id: nextId,
      procurement_order_id: localOrder.id,
      item_name: manualName,
      quantity: manualQty,
      unit: manualUnit,
      unit_price: manualPrice,
      subtotal: manualQty * manualPrice
    };

    if (!updated.manual_items) updated.manual_items = [];
    updated.manual_items.push(newItem);

    // Recalculate billing
    const totalItemsCost = updated.items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
    const totalManualCost = updated.manual_items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
    updated.total_cost = totalItemsCost + totalManualCost;

    setLocalOrder(updated);
    setIsDirty(true);

    // reset form
    setManualName('');
    setManualQty(1);
    setManualPrice(5000);
  };

  const handleDeleteManualItem = (manualId: number) => {
    if (!localOrder || localOrder.status === ProcurementStatus.FINAL) return;

    const updated = JSON.parse(JSON.stringify(localOrder)) as ProcurementOrder;
    updated.manual_items = updated.manual_items?.filter(m => m.id !== manualId);

    // Recalculate billing
    const totalItemsCost = updated.items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
    const totalManualCost = updated.manual_items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
    updated.total_cost = totalItemsCost + totalManualCost;

    setLocalOrder(updated);
    setIsDirty(true);
  };

  // Sum calculations
  const totalItemsCost = localOrder?.items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
  const totalManualCost = localOrder?.manual_items?.reduce((sum, it) => sum + it.subtotal, 0) || 0;
  const grandTotalCost = totalItemsCost + totalManualCost;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Interactive Section (hidden during print) */}
      <div className="space-y-8 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pesanan & Procurement</h2>
            <p className="text-sm text-slate-500">Konversikan rekapitulasi kebutuhan bahan kotor menjadi rincian rencana belanja supplier.</p>
          </div>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Periode</label>
            <select
              value={selectedPeriodId || ''}
              onChange={e => {
                setSelectedPeriodId(Number(e.target.value));
                setSelectedDayId(null);
              }}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">-- Pilih Periode --</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hari Distribusi</label>
            <select
              value={selectedDayId || ''}
              onChange={e => setSelectedDayId(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              disabled={!selectedPeriodId}
            >
              <option value="">-- Pilih Hari Menu --</option>
              {activePeriodDays.map(d => (
                <option key={d.id} value={d.id}>Hari {d.day_number} ({d.calendar_date})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Order Button or Details */}
        {!selectedDayId ? (
          <div className="bg-white border border-slate-100 p-12 rounded-2xl text-center text-slate-400">
            <ShoppingCart size={36} className="mx-auto mb-2" />
            <p className="text-sm">Silakan pilih Hari Distribusi terlebih dahulu.</p>
          </div>
        ) : !activeOrder ? (
          <div className="bg-white border border-slate-100 p-12 rounded-2xl text-center max-w-xl mx-auto space-y-4">
            <ShoppingCart size={48} className="text-slate-300 mx-auto" />
            <div>
              <h4 className="font-bold text-slate-800">Generate Rekap Belanja Hari Ini</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Sistem akan otomatis menggabungkan seluruh kebutuhan bahan dari menu-menu aktif seluruh kelompok dan mengkonversikannya ke berat kotor.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs shadow-md shadow-emerald-500/10 hover:shadow-lg transition cursor-pointer"
            >
              Generate Pesanan Supplier
            </button>
          </div>
        ) : !localOrder ? (
          <div className="flex items-center justify-center p-12">
            <Clock className="animate-spin text-slate-400 mr-2" size={20} />
            <span className="text-xs text-slate-500 font-medium">Memuat draf pesanan...</span>
          </div>
        ) : (
          // Procurement Order Workspace
          <div className="space-y-8 animate-fade-in">
            {/* Header Card (Styled as targeted CSS element for premium feel) */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl shadow-lg border border-slate-700/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-all duration-300">
              <div className="min-w-0">
                <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-mono tracking-widest text-indigo-300 uppercase">
                  Lembar Pesanan Bahan
                </span>
                <h3 className="text-xl font-extrabold text-white mt-2 tracking-tight">
                  Hari Distribusi {menuDays.find(d => d.id === selectedDayId)?.day_number}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Tanggal Operasional: <span className="font-mono text-indigo-300">{localOrder.order_date}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {localOrder.status === ProcurementStatus.FINAL ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      <CheckCircle size={14} />
                      <span>Selesai & Dikirim (Terkunci)</span>
                    </span>
                    <button
                      onClick={() => onUnlockOrder(localOrder.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs transition-all duration-200 cursor-pointer shadow-sm hover:shadow active:scale-95"
                      title="Kembali membuka kunci dan memunculkan tombol Simpan & Muat Ulang"
                    >
                      <Unlock size={14} className="text-rose-400" />
                      <span>Edit (Buka Kunci)</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      <Printer size={14} />
                      <span>Cetak Rencana Belanja (Pdf)</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleGenerate}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      <RefreshCw size={14} className="text-slate-400" />
                      <span>Muat Ulang (Regenerate)</span>
                    </button>
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-sky-500/10 bg-sky-500 hover:bg-sky-400 text-white transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      <Save size={14} />
                      <span>{isDirty ? "Simpan Perubahan" : "Simpan Rencana"}</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (isDirty) {
                          await onUpdateOrder(localOrder.id, localOrder);
                          setIsDirty(false);
                        }
                        onFinalizeOrder(localOrder.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      <Lock size={14} />
                      <span>Finalisasi & Kunci Belanja</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Main items table */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-sm text-slate-800">1. Rekap Bahan Baku Gizi (Hasil Menu Planning)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                      <th className="pb-2">Bahan Makanan</th>
                      <th className="pb-2 text-center">Kalkulasi (kg)</th>
                      <th className="pb-2 text-center w-28">Satuan Beli</th>
                      <th className="pb-2 text-center w-24">Jumlah Real</th>
                      <th className="pb-2 text-center w-28">Harga Satuan</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {localOrder.items?.map(it => (
                      <tr key={it.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-800">{it.name}</td>
                        <td className="py-3 text-center font-mono text-slate-500">{it.calculated_quantity} kg</td>
                        <td className="py-3 text-center">
                          <select
                            value={it.purchase_unit}
                            onChange={e => handleUpdateItemUnit(it.id, e.target.value)}
                            disabled={localOrder.status === ProcurementStatus.FINAL}
                            className="px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none bg-white"
                          >
                            {UNITS_LIST.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            value={it.actual_quantity || ''}
                            onChange={e => handleUpdateItemQty(it.id, Number(e.target.value))}
                            disabled={localOrder.status === ProcurementStatus.FINAL}
                            className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-xs font-semibold focus:outline-none"
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            value={it.unit_price || ''}
                            onChange={e => handleUpdateItemPrice(it.id, Number(e.target.value))}
                            disabled={localOrder.status === ProcurementStatus.FINAL}
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-center text-xs font-semibold text-emerald-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 text-right font-bold text-slate-800 font-mono">
                          Rp {it.subtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual additional items Section (Phase 9) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-sm text-slate-800">2. Bumbu Tambahan & Kebutuhan Operasional</h4>

                {localOrder.status !== ProcurementStatus.FINAL && (
                  <form onSubmit={handleAddManualItem} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl items-end">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Item Bumbu/LPG</label>
                      <input
                        type="text"
                        placeholder="Contoh: Gas LPG 3kg, Garam Dapur"
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none bg-white"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah</label>
                      <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <input
                          type="number"
                          value={manualQty}
                          onChange={e => setManualQty(Number(e.target.value))}
                          className="w-full px-2 text-center text-xs font-semibold focus:outline-none border-r border-slate-200"
                          min={1}
                          required
                        />
                        <select
                          value={manualUnit}
                          onChange={e => setManualUnit(e.target.value)}
                          className="px-1 text-[10px] bg-slate-50 focus:outline-none max-w-[70px]"
                        >
                          {UNITS_LIST.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Harga Satuan (Rp)</label>
                      <input
                        type="number"
                        placeholder="Harga Satuan"
                        value={manualPrice}
                        onChange={e => setManualPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-emerald-600 focus:outline-none bg-white"
                        min={0}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subtotal Belanja (Rp)</label>
                      <input
                        type="text"
                        value={`Rp ${(manualQty * manualPrice).toLocaleString('id-ID')}`}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-100 focus:outline-none"
                        readOnly
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="w-full py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-400 cursor-pointer shadow-md shadow-emerald-500/10 transition duration-150"
                      >
                        Tambah Item
                      </button>
                    </div>
                  </form>
                )}

                {/* Manual items list */}
                {(!localOrder.manual_items || localOrder.manual_items.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6 bg-slate-50/20 rounded-xl border border-dashed border-slate-100">
                    Belum ada bumbu atau kebutuhan operasional tambahan.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-50 pb-2">
                          <th className="pb-2">Nama Kebutuhan</th>
                          <th className="pb-2 text-center">Volume</th>
                          <th className="pb-2 text-center">Harga Satuan</th>
                          <th className="pb-2 text-right">Subtotal</th>
                          {localOrder.status !== ProcurementStatus.FINAL && <th className="pb-2 text-center w-12">Hapus</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {localOrder.manual_items.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-medium text-slate-700">{m.item_name}</td>
                            <td className="py-2.5 text-center font-mono text-slate-500">{m.quantity} {m.unit}</td>
                            <td className="py-2.5 text-center text-slate-500 font-mono">Rp {m.unit_price.toLocaleString('id-ID')}</td>
                            <td className="py-2.5 text-right font-bold text-slate-800 font-mono">Rp {m.subtotal.toLocaleString('id-ID')}</td>
                            {localOrder.status !== ProcurementStatus.FINAL && (
                              <td className="py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteManualItem(m.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Billing Summary Box */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg h-fit space-y-6 border border-slate-800">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-sm tracking-tight">Rangkuman Belanja</h4>
                  <p className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">Supplier Procurement Billing</p>
                </div>

                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal Bahan Gizi</span>
                    <span className="font-mono">Rp {totalItemsCost.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal Tambahan</span>
                    <span className="font-mono">Rp {totalManualCost.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-3 text-white font-bold text-sm">
                    <span>Total Anggaran</span>
                    <span className="text-emerald-400 font-mono">Rp {grandTotalCost.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-[10px] text-indigo-300 leading-relaxed font-medium">
                  Pemeriksaan HPP menu sasarans akan didasarkan pada harga real yang dicatat dalam form Lembar Pesanan Supplier di atas.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable Invoice Section (Visible only when print is triggered) */}
      {localOrder && (
        <div className="hidden print:block bg-white text-slate-900 p-8 font-sans" id="printable-procurement-invoice">
          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-5 mb-6">
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">GzQ PLAN - LAPORAN PROCUREMENT</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Lembar Rencana Belanja Bahan Makanan</p>
            <div className="flex justify-center gap-6 text-[10px] text-slate-600 font-mono mt-2">
              <span>PERIODE: {periods.find(p => p.id === localOrder.period_id)?.name || "-"}</span>
              <span>HARI DISTRIBUSI: {menuDays.find(d => d.id === selectedDayId)?.day_number || "-"}</span>
              <span>TANGGAL: {localOrder.order_date || "-"}</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Gizi Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">1. Rekap Bahan Baku Gizi</h3>
              <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 uppercase tracking-wider font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300">Nama Bahan Baku</th>
                    <th className="p-2 text-center border border-slate-300">Volume Kalkulasi</th>
                    <th className="p-2 text-center border border-slate-300">Jumlah Real</th>
                    <th className="p-2 text-center border border-slate-300">Satuan</th>
                    <th className="p-2 text-right border border-slate-300">Harga Satuan</th>
                    <th className="p-2 text-right border border-slate-300">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {localOrder.items?.map(it => (
                    <tr key={it.id} className="text-slate-700">
                      <td className="p-2 border border-slate-300 font-semibold">{it.name}</td>
                      <td className="p-2 text-center border border-slate-300 font-mono">{it.calculated_quantity} kg</td>
                      <td className="p-2 text-center border border-slate-300 font-bold font-mono">{it.actual_quantity}</td>
                      <td className="p-2 text-center border border-slate-300 uppercase font-mono">{it.purchase_unit}</td>
                      <td className="p-2 text-right border border-slate-300 font-mono">Rp {it.unit_price.toLocaleString('id-ID')}</td>
                      <td className="p-2 text-right border border-slate-300 font-bold font-mono">Rp {it.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Manual Table */}
            {localOrder.manual_items && localOrder.manual_items.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">2. Bumbu Tambahan & Kebutuhan Operasional</h3>
                <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 uppercase tracking-wider font-bold border-b border-slate-300">
                      <th className="p-2 border border-slate-300">Nama Kebutuhan</th>
                      <th className="p-2 text-center border border-slate-300">Jumlah</th>
                      <th className="p-2 text-center border border-slate-300">Satuan</th>
                      <th className="p-2 text-right border border-slate-300">Harga Satuan</th>
                      <th className="p-2 text-right border border-slate-300">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {localOrder.manual_items.map(m => (
                      <tr key={m.id} className="text-slate-700">
                        <td className="p-2 border border-slate-300 font-semibold">{m.item_name}</td>
                        <td className="p-2 text-center border border-slate-300 font-mono">{m.quantity}</td>
                        <td className="p-2 text-center border border-slate-300 uppercase font-mono">{m.unit}</td>
                        <td className="p-2 text-right border border-slate-300 font-mono">Rp {m.unit_price.toLocaleString('id-ID')}</td>
                        <td className="p-2 text-right border border-slate-300 font-bold font-mono">Rp {m.subtotal.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Billing */}
            <div className="flex justify-end pt-4">
              <div className="w-72 border border-slate-300 p-4 rounded-xl space-y-2 bg-slate-50">
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Subtotal Bahan Gizi:</span>
                  <span className="font-mono">Rp {totalItemsCost.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Subtotal Operasional:</span>
                  <span className="font-mono">Rp {totalManualCost.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-900 border-t border-slate-300 pt-2">
                  <span>Total Anggaran:</span>
                  <span className="font-mono text-emerald-700 font-bold">Rp {grandTotalCost.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="pt-16 grid grid-cols-2 gap-12 text-center text-xs text-slate-800">
              <div className="space-y-16">
                <span className="block font-medium">Disiapkan Oleh,</span>
                <div className="space-y-1">
                  <span className="block font-bold border-b border-slate-400 w-48 mx-auto pb-1">........................................</span>
                  <span className="block text-[10px] text-slate-500 font-medium">Supplier / Operasional</span>
                </div>
              </div>
              <div className="space-y-16">
                <span className="block font-medium">Disetujui & Dikunci Oleh,</span>
                <div className="space-y-1">
                  <span className="block font-bold border-b border-slate-400 w-48 mx-auto pb-1">........................................</span>
                  <span className="block text-[10px] text-slate-500 font-medium">Pengawas Gizi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintIframeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <span>ℹ️ Panduan Cetak PDF / Rencana Belanja</span>
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
                Setelah aplikasi terbuka di tab baru, Anda dapat mengeklik tombol <strong className="font-bold text-slate-800">Cetak Rencana Belanja (Pdf)</strong> kembali untuk langsung mencetak atau menyimpannya sebagai file **PDF** dengan rapi.
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

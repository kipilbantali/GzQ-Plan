/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { History, Search, Calendar, Shield, Activity } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsProps {
  auditLogs: AuditLog[];
}

export default function AuditLogs({ auditLogs }: AuditLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  const modules = ['All', 'Authentication', 'MasterData', 'Library', 'Planning', 'Procurement'];

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;

    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Audit Log Transaksi</h2>
        <p className="text-sm text-slate-500">Pantau seluruh catatan mutasi data, login, dan finalisasi menu secara permanen.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4 max-w-sm w-full">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Cari audit berdasarkan user, aksi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-sm text-slate-700 bg-transparent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modul</span>
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none bg-white"
          >
            {modules.map(mod => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History size={36} className="mx-auto mb-2" />
            <p className="text-sm">Catatan audit log tidak ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-700 border-b border-slate-100">
                  <th className="p-4">Tanggal & Waktu</th>
                  <th className="p-4">Pengguna</th>
                  <th className="p-4">Modul</th>
                  <th className="p-4">Aktivitas (Aksi)</th>
                  <th className="p-4">Nama Tabel</th>
                  <th className="p-4 text-center">Record ID</th>
                  <th className="p-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                {filteredLogs.map(log => {
                  let badgeColor = "bg-slate-100 text-slate-600";
                  if (log.module === 'Authentication') badgeColor = "bg-indigo-50 text-indigo-700";
                  if (log.module === 'Planning') badgeColor = "bg-emerald-50 text-emerald-700";
                  if (log.module === 'Procurement') badgeColor = "bg-amber-50 text-amber-700";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/20">
                      <td className="p-4 font-mono text-slate-400">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 font-bold text-slate-800">{log.user_name || 'System'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{log.action}</td>
                      <td className="p-4 font-mono text-slate-500">{log.table_name}</td>
                      <td className="p-4 text-center font-mono text-slate-400">{log.record_id || '-'}</td>
                      <td className="p-4 font-mono text-slate-400">{log.ip_address}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

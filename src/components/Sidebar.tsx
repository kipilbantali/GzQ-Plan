/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  ClipboardList,
  ShoppingCart,
  FileBarChart2,
  Database,
  History,
  LogOut,
  User,
  Activity
} from 'lucide-react';
import { User as UserType } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  supabaseConnected?: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, supabaseConnected }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Administrator', 'Pengawas Gizi'] },
    { id: 'periods', name: 'Periode & Hari Menu', icon: Calendar, roles: ['Administrator', 'Pengawas Gizi'] },
    { id: 'library', name: 'Library Menu Template', icon: BookOpen, roles: ['Administrator', 'Pengawas Gizi'] },
    { id: 'planning', name: 'Menu Planning Editor', icon: ClipboardList, roles: ['Administrator', 'Pengawas Gizi'] },
    { id: 'procurement', name: 'Pesanan & Procurement', icon: ShoppingCart, roles: ['Administrator', 'Pengawas Gizi'] },
    { id: 'reports', name: 'Laporan Gizi Operasional', icon: FileBarChart2, roles: ['Administrator', 'Pengawas Gizi'] },
    { id: 'master', name: 'Master Data', icon: Database, roles: ['Administrator', 'Pengawas Gizi'] },
    { id: 'audit', name: 'Audit Logs', icon: History, roles: ['Administrator'] }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!currentUser) return false;
    return item.roles.includes(currentUser.role);
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-emerald-500 text-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-none mb-1">GzQ Plan</h1>
          <span className="text-[10px] font-mono text-emerald-400 tracking-wider uppercase font-semibold leading-none block mb-1">Nutrition Engine v1.0</span>
          {supabaseConnected && (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-sky-400 font-sans tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
              Supabase Backend
            </span>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredMenuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info & Footer */}
      {currentUser && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3.5">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-sans">
              {currentUser.name[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate leading-snug">{currentUser.name}</p>
              <p className="text-xs text-slate-400 truncate leading-none">{currentUser.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-red-500/10 hover:text-red-400 border border-slate-700 hover:border-red-500/20 transition-all duration-200"
          >
            <LogOut size={14} />
            <span>Keluar Sesi</span>
          </button>
        </div>
      )}
    </aside>
  );
}

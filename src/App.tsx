/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  KeyRound,
  UserCheck,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Menu
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Periods from './components/Periods';
import Library from './components/Library';
import Planning from './components/Planning';
import Procurement from './components/Procurement';
import Reports from './components/Reports';
import MasterData from './components/MasterData';
import AuditLogs from './components/AuditLogs';

import {
  User,
  UserRole,
  Period,
  MenuDay,
  MenuPlan,
  BeneficiaryGroup,
  LibraryMenu,
  Ingredient,
  ProcurementOrder
} from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Core Data States
  const [periods, setPeriods] = useState<Period[]>([]);
  const [menuDays, setMenuDays] = useState<MenuDay[]>([]);
  const [menuPlans, setMenuPlans] = useState<MenuPlan[]>([]);
  const [beneficiaryGroups, setBeneficiaryGroups] = useState<BeneficiaryGroup[]>([]);
  const [libraryMenus, setLibraryMenus] = useState<LibraryMenu[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [procurementOrders, setProcurementOrders] = useState<ProcurementOrder[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Notification Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all database tables robustly based on permissions
  const fetchData = async (userOverride?: User | null) => {
    const activeUser = userOverride !== undefined ? userOverride : currentUser;
    const isAdmin = activeUser?.role === UserRole.ADMINISTRATOR;

    const fetchTable = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Fetch returned status ${res.status} for ${url}`);
          return [];
        }
        const text = await res.text();
        try {
          const body = JSON.parse(text);
          return body.data || [];
        } catch (jsonErr) {
          console.warn(`Failed to parse JSON from ${url}:`, text.slice(0, 100));
          return [];
        }
      } catch (err) {
        console.error(`Network error fetching ${url}:`, err);
        return [];
      }
    };

    const [
      periodsData,
      menuDaysData,
      menuPlansData,
      beneficiaryGroupsData,
      libraryMenusData,
      ingredientsData,
      procurementOrdersData,
      auditLogsData,
      usersData
    ] = await Promise.all([
      fetchTable('/api/v1/periods'),
      fetchTable('/api/v1/menu-days'),
      fetchTable('/api/v1/menu-plans'),
      fetchTable('/api/v1/beneficiary-groups'),
      fetchTable('/api/v1/library-menus'),
      fetchTable('/api/v1/ingredients'),
      fetchTable('/api/v1/procurement-orders'),
      fetchTable('/api/v1/audit-logs'),
      isAdmin ? fetchTable('/api/v1/users') : Promise.resolve([])
    ]);

    setPeriods(periodsData);
    setMenuDays(menuDaysData);
    setMenuPlans(menuPlansData);
    setBeneficiaryGroups(beneficiaryGroupsData);
    setLibraryMenus(libraryMenusData);
    setIngredients(ingredientsData);
    setProcurementOrders(procurementOrdersData);
    setAuditLogs(auditLogsData);
    setUsers(usersData);
  };

  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    storeOk: boolean;
    ingredientsOk: boolean;
    ingredientsRlsError: boolean;
    errorMessage: string;
    projectUrl: string;
  } | null>(null);

  // Check Supabase Backend connectivity
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const res = await fetch('/api/v1/supabase-status');
        const body = await res.json();
        setSupabaseStatus(body);
        if (body.success && body.connected) {
          setSupabaseConnected(true);
        }
      } catch (err) {
        console.error("Supabase status check failed", err);
      }
    };
    checkSupabase();
  }, []);

  // Check login session on startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/v1/auth/me');
        const body = await res.json();
        if (body.data?.user) {
          setCurrentUser(body.data.user);
          await fetchData(body.data.user);
        }
      } catch (err) {
        console.error("Session check failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const body = await res.json();
      if (body.success) {
        setCurrentUser(body.data.user);
        showToast("Login Berhasil! Selamat Datang.");
        await fetchData(body.data.user);
      } else {
        setLoginError(body.message);
      }
    } catch (err) {
      setLoginError("Koneksi ke server terputus.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      showToast("Berhasil Keluar Sesi.", "info");
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // MUTATION API HELPERS
  // ==========================================

  // Periods & Days
  const handleCreatePeriod = async (name: string, startDate: string, endDate: string) => {
    try {
      const res = await fetch('/api/v1/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start_date: startDate, end_date: endDate })
      });
      const body = await res.json();
      if (body.success) {
        showToast("Periode baru dan 12 Hari Menu berhasil digenerate otomatis!");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menyimpan periode.", "error");
    }
  };

  const handleDeletePeriod = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/periods/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        showToast("Periode beserta datanya berhasil dihapus.", "info");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menghapus periode.", "error");
    }
  };

  // Library Menu templates
  const handleCreateLibraryMenu = async (menuData: Partial<LibraryMenu>) => {
    try {
      const res = await fetch('/api/v1/library-menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuData)
      });
      const body = await res.json();
      if (body.success) {
        showToast("Template Menu berhasil disimpan.");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menyimpan template.", "error");
    }
  };

  const handleUpdateLibraryMenu = async (id: number, menuData: Partial<LibraryMenu>) => {
    try {
      const res = await fetch(`/api/v1/library-menus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuData)
      });
      const body = await res.json();
      if (body.success) {
        showToast("Template Menu berhasil diperbarui.");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal memperbarui template.", "error");
    }
  };

  const handleDeleteLibraryMenu = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/library-menus/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        showToast("Template Menu berhasil dihapus.", "info");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menghapus template.", "error");
    }
  };

  // Menu Planning Editor
  const handleCreateMenuPlan = async (data: Partial<MenuPlan>): Promise<MenuPlan | null> => {
    try {
      const res = await fetch('/api/v1/menu-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      if (body.success) {
        showToast("Perencanaan menu berhasil diinisialisasi.");
        await fetchData();
        return body.data;
      } else {
        showToast(body.message, "error");
        return null;
      }
    } catch (err) {
      showToast("Gagal menginisialisasi menu.", "error");
      return null;
    }
  };

  const handleUpdateMenuPlan = async (id: number, data: Partial<MenuPlan>) => {
    try {
      await fetch(`/api/v1/menu-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      // In auto save, we fetch silent to keep input responsive
      const res = await fetch('/api/v1/menu-plans');
      const body = await res.json();
      setMenuPlans(body.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalizeMenuPlan = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/menu-plans/${id}/finalize`, { method: 'POST' });
      const body = await res.json();
      if (body.success) {
        showToast("Menu Plan berhasil difinalisasi dan dikunci.");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal melakukan finalisasi.", "error");
    }
  };

  const handleDraftMenuPlan = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/menu-plans/${id}/draft`, { method: 'POST' });
      const body = await res.json();
      if (body.success) {
        showToast("Menu Plan dikembalikan ke status Draft.", "info");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal mengubah status.", "error");
    }
  };

  const handleCopyFromGroup = async (targetId: number, sourceId: number) => {
    try {
      const res = await fetch(`/api/v1/menu-plans/${targetId}/copy-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_menu_plan_id: sourceId })
      });
      const body = await res.json();
      if (body.success) {
        showToast("Komponen dan bahan menu disalin berhasil.");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menyalin menu.", "error");
    }
  };

  const handleCopyFromLibrary = async (targetId: number, libraryMenuId: number) => {
    try {
      const res = await fetch(`/api/v1/menu-plans/${targetId}/copy-library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ library_menu_id: libraryMenuId })
      });
      const body = await res.json();
      if (body.success) {
        showToast("Komponen disalin dari library template berhasil.");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menyalin menu dari library.", "error");
    }
  };

  // Procurement Management
  const handleGenerateOrder = async (periodId: number, dayId: number) => {
    try {
      const res = await fetch(`/api/v1/procurement-orders/${dayId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: periodId, menu_day_id: dayId })
      });
      const body = await res.json();
      if (body.success) {
        showToast("Lembar pesanan belanja berhasil dibuat otomatis!");
        await fetchData();
      } else {
        showToast(body.message, "error");
      }
    } catch (err) {
      showToast("Gagal menggenerate rekap pengadaan.", "error");
    }
  };

  const handleUpdateOrder = async (id: number, data: Partial<ProcurementOrder>) => {
    try {
      const response = await fetch(`/api/v1/procurement-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const bodyUpdate = await response.json();
      if (bodyUpdate.success) {
        showToast("Rencana belanja berhasil disimpan!");
      }
      const res = await fetch('/api/v1/procurement-orders');
      const body = await res.json();
      setProcurementOrders(body.data || []);
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan rencana belanja.", "error");
    }
  };

  const handleFinalizeOrder = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/procurement-orders/${id}/finalize`, { method: 'POST' });
      const body = await res.json();
      if (body.success) {
        showToast("Lembar pesanan belanja berhasil difinalisasi & dikunci.");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal memfinalisasi pesanan.", "error");
    }
  };

  const handleUnlockOrder = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/procurement-orders/${id}/unlock`, { method: 'POST' });
      const body = await res.json();
      if (body.success) {
        showToast("Kunci dibuka. Rencana belanja lama dibersihkan.");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal membuka kunci pesanan.", "error");
    }
  };

  const handleDeleteOrder = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/procurement-orders/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        showToast("Pesanan berhasil dihapus.", "info");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menghapus pesanan.", "error");
    }
  };

  // Master Users, ingredients
  const handleAddUser = async (data: Partial<User>) => {
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      if (body.success) {
        showToast("User baru berhasil dibuat.");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menambahkan user.", "error");
    }
  };

  const handleUpdateUser = async (id: number, data: Partial<User>) => {
    try {
      const res = await fetch(`/api/v1/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      if (body.success) {
        showToast("User berhasil diperbarui.");
        await fetchData();
      } else {
        showToast(body.message, "error");
      }
    } catch (err) {
      showToast("Gagal memperbarui user.", "error");
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/users/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        showToast("User berhasil dihapus.", "info");
        await fetchData();
      } else {
        showToast(body.message, "error");
      }
    } catch (err) {
      showToast("Gagal menghapus user.", "error");
    }
  };

  const handleAddIngredient = async (data: Partial<Ingredient>) => {
    try {
      const res = await fetch('/api/v1/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      if (body.success) {
        showToast("Bahan pangan baru ditambahkan ke TKPI.");
        await fetchData();
      } else {
        showToast(body.message, "error");
      }
    } catch (err) {
      showToast("Gagal menambahkan bahan.", "error");
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/ingredients/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        showToast("Bahan pangan dinonaktifkan.", "info");
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal menghapus bahan.", "error");
    }
  };

  const handleUpdateIngredient = async (id: number, data: Partial<Ingredient>) => {
    try {
      const res = await fetch(`/api/v1/ingredients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      if (body.success) {
        showToast("Bahan pangan berhasil diperbarui.");
        await fetchData();
      } else {
        showToast(body.message, "error");
      }
    } catch (err) {
      showToast("Gagal memperbarui bahan.", "error");
    }
  };

  const handleUpdateBeneficiaryGroup = async (id: number, data: Partial<BeneficiaryGroup>) => {
    try {
      const res = await fetch(`/api/v1/beneficiary-groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      if (body.success) {
        showToast("Kelompok sasaran berhasil diperbarui.");
        await fetchData();
      } else {
        showToast(body.message, "error");
      }
    } catch (err) {
      showToast("Gagal memperbarui kelompok sasaran.", "error");
    }
  };

  const handleImportIngredients = async (list: any[]) => {
    try {
      const res = await fetch('/api/v1/ingredients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: list })
      });
      const body = await res.json();
      if (body.success) {
        showToast(body.message);
        await fetchData();
      }
    } catch (err) {
      showToast("Gagal mengimport bahan.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <Activity size={48} className="text-emerald-500 animate-pulse" />
        <p className="mt-4 text-xs font-semibold text-slate-500 tracking-wider uppercase font-mono">GzQ Plan Engine Loading...</p>
      </div>
    );
  }

  // If no user is logged in, show elegant design-forward login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl translate-y-12 -translate-x-12"></div>

        <div className="w-full max-w-md space-y-8 z-10">
          <div className="text-center space-y-3">
            <div className="inline-flex bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-500/10">
              <Activity size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">GzQ Plan Portal</h1>
              <p className="text-xs text-slate-400 mt-1">Sistem Perencanaan Siklus Menu Gizi, HPP & Procurement</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest text-center border-b border-slate-800 pb-4">Masuk ke Sesi Kerja</h2>

            {loginError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                Masuk Sesi
              </button>
            </form>

            {/* Custom Description & Copyright info */}
            <div className="border-t border-slate-800 pt-5 space-y-4 text-center">
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplikasi web ini merupakan aplikasi khusus untuk SPPG Sumenep Arjasa Bilis-bilis 2 yang dikelola oleh Pengawas Gizi SPPG.
              </p>
              <div className="text-[11px] text-slate-500 font-medium">
                © 2026 Zulkifli Bantali. GzQ Plan v1.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Toast Notification Banner - Hide during print */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 animate-slide-in print:hidden">
          {toast.type === 'success' && <CheckCircle className="text-emerald-400" size={18} />}
          {toast.type === 'error' && <XCircle className="text-red-400" size={18} />}
          {toast.type === 'info' && <Clock className="text-indigo-400" size={18} />}
          <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
        </div>
      )}

      {/* Navigation Sidebar Rail - Hide during print */}
      <div className="print:hidden flex-shrink-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          supabaseConnected={supabaseConnected}
        />
      </div>

      {/* Main content viewport */}
      <main className="flex-1 min-w-0 p-8 sm:p-10 max-w-7xl mx-auto print:p-0 print:max-w-none">
        {activeTab === 'dashboard' && (
          <Dashboard
            periods={periods}
            menuDays={menuDays}
            menuPlans={menuPlans}
            procurementOrders={procurementOrders}
            auditLogs={auditLogs}
            setActiveTab={setActiveTab}
            onQuickCreatePeriod={() => setActiveTab('periods')}
          />
        )}

        {activeTab === 'periods' && (
          <Periods
            periods={periods}
            menuDays={menuDays}
            onCreatePeriod={handleCreatePeriod}
            onDeletePeriod={handleDeletePeriod}
          />
        )}

        {activeTab === 'library' && (
          <Library
            libraryMenus={libraryMenus}
            ingredients={ingredients}
            onCreateLibraryMenu={handleCreateLibraryMenu}
            onUpdateLibraryMenu={handleUpdateLibraryMenu}
            onDeleteLibraryMenu={handleDeleteLibraryMenu}
          />
        )}

        {activeTab === 'planning' && (
          <Planning
            periods={periods}
            menuDays={menuDays}
            menuPlans={menuPlans}
            beneficiaryGroups={beneficiaryGroups}
            libraryMenus={libraryMenus}
            ingredients={ingredients}
            onCreateMenuPlan={handleCreateMenuPlan}
            onUpdateMenuPlan={handleUpdateMenuPlan}
            onFinalizeMenuPlan={handleFinalizeMenuPlan}
            onDraftMenuPlan={handleDraftMenuPlan}
            onCopyFromGroup={handleCopyFromGroup}
            onCopyFromLibrary={handleCopyFromLibrary}
            onUpdateBeneficiaryGroup={handleUpdateBeneficiaryGroup}
          />
        )}

        {activeTab === 'procurement' && (
          <Procurement
            periods={periods}
            menuDays={menuDays}
            procurementOrders={procurementOrders}
            ingredients={ingredients}
            onGenerateOrder={handleGenerateOrder}
            onUpdateOrder={handleUpdateOrder}
            onFinalizeOrder={handleFinalizeOrder}
            onUnlockOrder={handleUnlockOrder}
            onDeleteOrder={handleDeleteOrder}
          />
        )}

        {activeTab === 'reports' && (
          <Reports
            periods={periods}
            menuDays={menuDays}
            menuPlans={menuPlans}
            beneficiaryGroups={beneficiaryGroups}
            procurementOrders={procurementOrders}
          />
        )}

        {activeTab === 'master' && (
          <MasterData
            users={users}
            beneficiaryGroups={beneficiaryGroups}
            ingredients={ingredients}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onAddIngredient={handleAddIngredient}
            onUpdateIngredient={handleUpdateIngredient}
            onDeleteIngredient={handleDeleteIngredient}
            onImportIngredients={handleImportIngredients}
            supabaseStatus={supabaseStatus}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogs
            auditLogs={auditLogs}
          />
        )}
      </main>
    </div>
  );
}

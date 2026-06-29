/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Plus, Search, Trash2, Shield, Users, Apple, Pencil, Download } from 'lucide-react';
import { User, BeneficiaryGroup, Ingredient, UserRole, UserStatus } from '../types';

interface MasterDataProps {
  users: User[];
  beneficiaryGroups: BeneficiaryGroup[];
  ingredients: Ingredient[];
  currentUser?: User | null;
  onAddUser: (data: Partial<User>) => void;
  onUpdateUser: (id: number, data: Partial<User>) => void;
  onDeleteUser: (id: number) => void;
  onAddIngredient: (data: Partial<Ingredient>) => void;
  onUpdateIngredient: (id: number, data: Partial<Ingredient>) => void;
  onDeleteIngredient: (id: number) => void;
  onImportIngredients: (list: any[]) => void;
  firebaseStatus?: {
    connected: boolean;
    storeOk: boolean;
    ingredientsOk: boolean;
    ingredientsRlsError: boolean;
    errorMessage: string;
    projectUrl: string;
  } | null;
}

export default function MasterData({
  users,
  beneficiaryGroups,
  ingredients,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  onImportIngredients,
  firebaseStatus
}: MasterDataProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ingredients' | 'groups' | 'users'>('ingredients');

  // Add User Form States
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.PENGAWAS_GIZI);
  const [userPassword, setUserPassword] = useState('');

  // Edit User Form States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>(UserRole.PENGAWAS_GIZI);
  const [editUserStatus, setEditUserStatus] = useState<UserStatus>(UserStatus.ACTIVE);
  const [editUserPassword, setEditUserPassword] = useState('');

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserUsername(user.username);
    setEditUserEmail(user.email);
    setEditUserRole(user.role);
    setEditUserStatus(user.status);
    setEditUserPassword(user.password || '');
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    onUpdateUser(editingUser.id, {
      name: editUserName,
      username: editUserUsername,
      email: editUserEmail,
      role: editUserRole,
      status: editUserStatus,
      password: editUserPassword || undefined
    });

    setEditingUser(null);
  };

  // Add Ingredient Form States
  const [showAddIngForm, setShowAddIngForm] = useState(false);
  const [ingCode, setIngCode] = useState('');
  const [ingName, setIngName] = useState('');
  const [ingBdd, setIngBdd] = useState<number>(100);
  const [ingEnergy, setIngEnergy] = useState<number>(100);
  const [ingProtein, setIngProtein] = useState<number>(10);
  const [ingFat, setIngFat] = useState<number>(5);
  const [ingCarb, setIngCarb] = useState<number>(20);
  const [ingFiber, setIngFiber] = useState<number>(2);

  // Edit Ingredient Form States
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editBdd, setEditBdd] = useState<number>(100);
  const [editEnergy, setEditEnergy] = useState<number>(100);
  const [editProtein, setEditProtein] = useState<number>(10);
  const [editFat, setEditFat] = useState<number>(5);
  const [editCarb, setEditCarb] = useState<number>(20);
  const [editFiber, setEditFiber] = useState<number>(2);

  const [searchQuery, setSearchQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userUsername || !userEmail) return;

    onAddUser({
      name: userName,
      username: userUsername,
      email: userEmail,
      role: userRole,
      status: UserStatus.ACTIVE,
      password: userPassword || undefined
    });

    setUserName('');
    setUserUsername('');
    setUserEmail('');
    setUserPassword('');
    setShowAddUserForm(false);
  };

  const handleAddIngSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingCode || !ingName) return;

    onAddIngredient({
      code: ingCode,
      name: ingName,
      bdd: ingBdd,
      energy: ingEnergy,
      protein: ingProtein,
      fat: ingFat,
      carbohydrate: ingCarb,
      fiber: ingFiber,
      price: 0 // Hapus harga standard di master data, ditentukan manual di pesanan
    });

    setIngCode('');
    setIngName('');
    setIngBdd(100);
    setIngEnergy(100);
    setIngProtein(10);
    setIngFat(5);
    setIngCarb(20);
    setIngFiber(2);
    setShowAddIngForm(false);
  };

  const handleEditIngStart = (ing: Ingredient) => {
    setEditingIng(ing);
    setEditCode(ing.code);
    setEditName(ing.name);
    setEditBdd(ing.bdd);
    setEditEnergy(ing.energy);
    setEditProtein(ing.protein);
    setEditFat(ing.fat);
    setEditCarb(ing.carbohydrate);
    setEditFiber(ing.fiber);
  };

  const handleEditIngSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIng || !editCode || !editName) return;

    onUpdateIngredient(editingIng.id, {
      code: editCode,
      name: editName,
      bdd: editBdd,
      energy: editEnergy,
      protein: editProtein,
      fat: editFat,
      carbohydrate: editCarb,
      fiber: editFiber,
      price: 0 // Keep price at 0 since standard baseline prices are deleted
    });

    setEditingIng(null);
  };

  // Export empty CSV template with aligned headers for manual data input
  const handleExportTemplate = () => {
    const headers = [
      "Kode",
      "Nama Bahan",
      "BDD",
      "Energi (100g)",
      "Protein (100g)",
      "Lemak (100g)",
      "Karbohidrat (100g)",
      "Serat (100g)",
      "Harga (per kg)"
    ];
    
    // Create an empty template with only headers and a single sample row to guide input
    const sampleRows = [
      ["A15", "Roti Tawar Putih", "100", "248", "8.0", "1.5", "50.0", "1.5", "15000"],
      ["B12", "Daging Kambing Segar", "100", "154", "16.6", "9.2", "0.0", "0.0", "120000"]
    ];

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_impor_bahan_tkpi.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showError = (customMsg?: string) => {
    const msg = customMsg || "Struktur atau file salah, silakan unduh template dan sesuaikan struktur filenya.";
    setImportError(msg);
    try {
      window.alert(msg);
    } catch (_) {}
  };

  const parseAndValidateCsv = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        showError("File kosong atau tidak memiliki data.");
        return;
      }

      // Automatically detect if semicolon (;) or comma (,) is used as separator
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';

      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result.map(cell => {
          if (cell.startsWith('"') && cell.endsWith('"')) {
            return cell.slice(1, -1).trim();
          }
          return cell;
        });
      };

      const headers = parseCsvLine(lines[0]);
      const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

      // Validate required columns
      const getIndex = (aliases: string[]) => {
        return headers.findIndex(h => {
          const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return aliases.some(alias => norm.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, '')));
        });
      };

      const codeIdx = getIndex(["kode"]);
      const nameIdx = getIndex(["namabahan", "nama"]);
      const bddIdx = getIndex(["bdd"]);
      const energyIdx = getIndex(["energi"]);
      const proteinIdx = getIndex(["protein"]);
      
      if (codeIdx === -1 || nameIdx === -1 || bddIdx === -1 || energyIdx === -1 || proteinIdx === -1) {
        showError("Struktur tabel salah! Pastikan file memiliki kolom wajib: Kode, Nama Bahan, BDD, Energi (100g), Protein (100g).");
        return;
      }

      // Optional columns
      const fatIdx = getIndex(["lemak", "fat"]);
      const carbIdx = getIndex(["karbohidrat", "carb"]);
      const fiberIdx = getIndex(["serat", "fiber"]);
      const priceIdx = getIndex(["harga", "price"]);

      const parsedList: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) continue;

        const code = cells[codeIdx];
        const name = cells[nameIdx];
        
        if (!code || !name) continue;

        // Skip sample rows if they were kept
        if (code.toLowerCase() === 'kode' || name.toLowerCase().includes('roti tawar putih') || name.toLowerCase().includes('daging kambing')) {
          continue;
        }

        const bdd = bddIdx !== -1 ? (Number(cells[bddIdx]) || 100) : 100;
        const energy = energyIdx !== -1 ? (Number(cells[energyIdx]) || 0) : 0;
        const protein = proteinIdx !== -1 ? (Number(cells[proteinIdx]) || 0) : 0;
        const fat = fatIdx !== -1 ? (Number(cells[fatIdx]) || 0) : 0;
        const carbohydrate = carbIdx !== -1 ? (Number(cells[carbIdx]) || 0) : 0;
        const fiber = fiberIdx !== -1 ? (Number(cells[fiberIdx]) || 0) : 0;
        const price = priceIdx !== -1 ? (Number(cells[priceIdx]) || 0) : 0;

        parsedList.push({
          code: String(code).trim(),
          name: String(name).trim(),
          bdd,
          energy,
          protein,
          fat,
          carbohydrate,
          fiber,
          price
        });
      }

      if (parsedList.length === 0) {
        showError("Tidak ada data bahan pangan yang valid untuk diimpor.");
        return;
      }

      onImportIngredients(parsedList);
      setImportError(null);
    } catch (err) {
      showError("Gagal membaca file, pastikan format CSV/Excel sesuai dengan template.");
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        showError();
        return;
      }
      parseAndValidateCsv(text);
    };
    reader.onerror = () => {
      showError();
    };
    reader.readAsText(file);

    if (e.target) {
      e.target.value = '';
    }
  };

  const filteredIngredients = ingredients.filter(i =>
    !i.deleted_at &&
    (i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     i.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manajemen Data Master</h2>
          <p className="text-sm text-slate-500">Kelola database pengguna, klasifikasi batasan gizi kelompok sasaran, dan tabel bahan pangan TKPI.</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-slate-100 border border-slate-200/50 p-1 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveSubTab('ingredients'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'ingredients' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Apple size={14} />
          <span>Bahan Pangan (TKPI)</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('groups'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'groups' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Shield size={14} />
          <span>Target Gizi AKG</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('users'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'users' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users size={14} />
          <span>Manajemen Pengguna</span>
        </button>
      </div>

      {/* =======================================================
          TAB 1: INGREDIENTS DATABASE (TKPI)
          ======================================================= */}
      {activeSubTab === 'ingredients' && (
        <div className="space-y-4 animate-fade-in">
          {firebaseStatus?.ingredientsRlsError && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-900 space-y-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-extrabold text-amber-950 text-base">Firebase Security Rules Membatasi Penyimpanan</h4>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    Firestore Database di Firebase Anda mengaktifkan Security Rules, tetapi belum mengizinkan akses tulis publik secara penuh untuk pengujian atau autentikasi pengguna. Hal ini menyebabkan penambahan atau pengubahan baris bahan pangan ditolak oleh Firebase.
                  </p>
                </div>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                *Catatan: Pastikan Anda telah memasang file <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-amber-950">firestore.rules</code> yang mengizinkan akses baca dan tulis bagi koleksi-koleksi aplikasi Anda.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4 max-w-sm w-full">
              <Search size={18} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari bahan pangan berdasarkan kode/nama..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm text-slate-700 bg-transparent focus:outline-none"
              />
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFileChange}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <button
                onClick={handleExportTemplate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                <Download size={14} />
                <span>Download Template</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Impor Excel/CSV TKPI
              </button>
              <button
                onClick={() => setShowAddIngForm(!showAddIngForm)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Bahan Manual</span>
              </button>
            </div>
          </div>

          {showAddIngForm && (
            <form onSubmit={handleAddIngSubmit} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 max-w-2xl animate-fade-in">
              <h4 className="font-bold text-slate-800 text-sm">Input Bahan Pangan Baru</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kode TKPI</label>
                  <input
                    type="text"
                    value={ingCode}
                    onChange={e => setIngCode(e.target.value)}
                    placeholder="Contoh: A20"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Bahan Pangan</label>
                  <input
                    type="text"
                    value={ingName}
                    onChange={e => setIngName(e.target.value)}
                    placeholder="Contoh: Gandum Kasar"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BDD (%)</label>
                  <input
                    type="number"
                    value={ingBdd}
                    onChange={e => setIngBdd(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    min={1} max={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Energi (kcal/100g)</label>
                  <input
                    type="number"
                    value={ingEnergy}
                    onChange={e => setIngEnergy(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Protein (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ingProtein}
                    onChange={e => setIngProtein(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lemak (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ingFat}
                    onChange={e => setIngFat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Karbohidrat (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ingCarb}
                    onChange={e => setIngCarb(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Serat (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ingFiber}
                    onChange={e => setIngFiber(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddIngForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200/50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-lg"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-700 border-b border-slate-100">
                    <th className="p-3">Kode</th>
                    <th className="p-3">Nama Bahan</th>
                    <th className="p-3 text-center">BDD</th>
                    <th className="p-3 text-center">Energi (100g)</th>
                    <th className="p-3 text-center">Protein (100g)</th>
                    <th className="p-3 text-center">Lemak (100g)</th>
                    <th className="p-3 text-center">Karbohidrat (100g)</th>
                    <th className="p-3 text-center">Serat (100g)</th>
                    <th className="p-3 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {filteredIngredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-slate-50/20">
                      <td className="p-3 font-mono font-bold text-emerald-600">{ing.code}</td>
                      <td className="p-3 font-semibold text-slate-800">{ing.name}</td>
                      <td className="p-3 text-center font-mono">{ing.bdd}%</td>
                      <td className="p-3 text-center font-mono">{ing.energy} kcal</td>
                      <td className="p-3 text-center font-mono">{ing.protein}g</td>
                      <td className="p-3 text-center font-mono">{ing.fat}g</td>
                      <td className="p-3 text-center font-mono">{ing.carbohydrate}g</td>
                      <td className="p-3 text-center font-mono">{ing.fiber}g</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditIngStart(ing)}
                            className="text-slate-400 hover:text-emerald-500 p-1.5 rounded hover:bg-slate-100 cursor-pointer animate-fade-in"
                            title="Edit bahan"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Hapus bahan pangan ini?")) {
                                onDeleteIngredient(ing.id);
                              }
                            }}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-100 cursor-pointer"
                            title="Hapus bahan"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          TAB 2: TARGET AKG RANGE
          ======================================================= */}
      {activeSubTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {beneficiaryGroups.map(grp => (
            <div key={grp.id} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="border-b border-slate-50 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">{grp.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Jumlah Penerima: {grp.beneficiary_count} anak / jiwa</p>
                </div>
                <span className="text-xs font-bold text-slate-100 bg-slate-800 px-3 py-1 rounded-full">
                  Limit HPP: Rp {grp.hpp_limit.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Target Energi</span>
                  <p className="text-slate-800 font-bold font-mono mt-1">{grp.energy_min} - {grp.energy_max} kcal</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Target Protein</span>
                  <p className="text-slate-800 font-bold font-mono mt-1">{grp.protein_min} - {grp.protein_max}g</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Target Lemak</span>
                  <p className="text-slate-800 font-bold font-mono mt-1">{grp.fat_min} - {grp.fat_max}g</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Target Karbohidrat</span>
                  <p className="text-slate-800 font-bold font-mono mt-1">{grp.carbohydrate_min} - {grp.carbohydrate_max}g</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =======================================================
          TAB 3: USER MANAGEMENT
          ======================================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddUserForm(!showAddUserForm)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs rounded-xl cursor-pointer"
            >
              <Plus size={14} />
              <span>Tambah User Baru</span>
            </button>
          </div>

          {showAddUserForm && (
            <form onSubmit={handleAddUserSubmit} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 max-w-lg animate-fade-in">
              <h4 className="font-bold text-slate-800 text-sm">Tambah Pengguna Baru</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    placeholder="Contoh: Dr. Clara"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Username</label>
                    <input
                      type="text"
                      value={userUsername}
                      onChange={e => setUserUsername(e.target.value)}
                      placeholder="Contoh: clara"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role Akun</label>
                    <select
                      value={userRole}
                      onChange={e => setUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none bg-white"
                    >
                      <option value={UserRole.PENGAWAS_GIZI}>{UserRole.PENGAWAS_GIZI}</option>
                      <option value={UserRole.ADMINISTRATOR}>{UserRole.ADMINISTRATOR}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={e => setUserEmail(e.target.value)}
                      placeholder="Contoh: clara@gzqplan.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kata Sandi (Password)</label>
                    <input
                      type="text"
                      value={userPassword}
                      onChange={e => setUserPassword(e.target.value)}
                      placeholder="Contoh: rahasia123"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none font-mono"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block font-medium">Jika dikosongkan, default password adalah <span className="font-mono font-bold">username123</span></span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddUserForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-lg cursor-pointer"
                >
                  Simpan User
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-700 border-b border-slate-100">
                  <th className="p-4">Nama</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Kata Sandi</th>
                  <th className="p-4 text-center w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="p-4 font-semibold text-slate-800">{u.name}</td>
                    <td className="p-4 font-mono">{u.username}</td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        u.role === UserRole.ADMINISTRATOR ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-500">{u.password || `${u.username}123`}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded hover:bg-slate-100 cursor-pointer transition"
                          title="Edit User"
                        >
                          <Pencil size={12} />
                        </button>
                        
                        {u.id === currentUser?.id ? (
                          <span className="text-[10px] text-slate-400 font-bold px-2 py-1 bg-slate-100 rounded-lg select-none" title="Anda tidak dapat menghapus akun Anda sendiri">
                            Aktif
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus user "${u.name}"?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-100 cursor-pointer transition"
                            title="Hapus User"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl max-w-2xl w-full mx-4 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Edit Bahan Pangan (TKPI)</h4>
              <button 
                onClick={() => setEditingIng(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <form onSubmit={handleEditIngSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kode TKPI</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={e => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Bahan Pangan</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BDD (%)</label>
                  <input
                    type="number"
                    value={editBdd}
                    onChange={e => setEditBdd(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    min={1} max={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Energi (kcal/100g)</label>
                  <input
                    type="number"
                    value={editEnergy}
                    onChange={e => setEditEnergy(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Protein (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editProtein}
                    onChange={e => setEditProtein(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lemak (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editFat}
                    onChange={e => setEditFat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Karbohidrat (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editCarb}
                    onChange={e => setEditCarb(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Serat (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editFiber}
                    onChange={e => setEditFiber(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingIng(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-lg cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <Shield size={16} className="text-indigo-500" />
                <span>Edit Pengguna</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={e => setEditUserName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Username</label>
                  <input
                    type="text"
                    value={editUserUsername}
                    onChange={e => setEditUserUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none bg-slate-50 text-slate-500 font-mono"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={editUserEmail}
                    onChange={e => setEditUserEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role Akun</label>
                  <select
                    value={editUserRole}
                    onChange={e => setEditUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none bg-white"
                    disabled={editingUser.id === currentUser?.id}
                  >
                    <option value={UserRole.PENGAWAS_GIZI}>{UserRole.PENGAWAS_GIZI}</option>
                    <option value={UserRole.ADMINISTRATOR}>{UserRole.ADMINISTRATOR}</option>
                  </select>
                  {editingUser.id === currentUser?.id && (
                    <span className="text-[9px] text-slate-400 mt-1 block">Anda tidak bisa mengubah role Anda sendiri</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Akun</label>
                  <select
                    value={editUserStatus}
                    onChange={e => setEditUserStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none bg-white"
                    disabled={editingUser.id === currentUser?.id}
                  >
                    <option value={UserStatus.ACTIVE}>Aktif</option>
                    <option value={UserStatus.INACTIVE}>Nonaktif</option>
                  </select>
                  {editingUser.id === currentUser?.id && (
                    <span className="text-[9px] text-slate-400 mt-1 block">Anda tidak bisa menonaktifkan diri Anda sendiri</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kata Sandi (Password)</label>
                <input
                  type="text"
                  value={editUserPassword}
                  onChange={e => setEditUserPassword(e.target.value)}
                  placeholder="Kosongkan untuk default username123"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl max-w-md w-full mx-4 space-y-4 text-center">
            <div className="flex justify-center text-red-500">
              <Database size={48} className="animate-bounce" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-base">Kesalahan Impor Data</h4>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {importError}
            </p>
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-400 rounded-xl cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

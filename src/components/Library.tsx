/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Plus, Search, Trash2, Edit, ChevronDown, Check, X } from 'lucide-react';
import { LibraryMenu, Ingredient } from '../types';

interface LibraryProps {
  libraryMenus: LibraryMenu[];
  ingredients: Ingredient[];
  onCreateLibraryMenu: (menu: Partial<LibraryMenu>) => void;
  onUpdateLibraryMenu: (id: number, menu: Partial<LibraryMenu>) => void;
  onDeleteLibraryMenu: (id: number) => void;
}

const COMPONENTS_LIST = [
  { id: 1, name: "Makanan Pokok" },
  { id: 2, name: "Lauk Hewani" },
  { id: 3, name: "Lauk Nabati" },
  { id: 4, name: "Sayur" },
  { id: 5, name: "Buah" },
  { id: 6, name: "Susu" }
];

export default function Library({
  libraryMenus,
  ingredients,
  onCreateLibraryMenu,
  onUpdateLibraryMenu,
  onDeleteLibraryMenu
}: LibraryProps) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [menuName, setMenuName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<{ [compId: number]: number[] }>({});

  const [activeSelectComp, setActiveSelectComp] = useState<number | null>(null);
  const [ingSearch, setIngSearch] = useState('');

  const handleOpenCreate = () => {
    setEditingId(null);
    setMenuName('');
    setDescription('');
    setSelectedComponents({});
    setShowForm(true);
  };

  const handleOpenEdit = (menu: LibraryMenu) => {
    setEditingId(menu.id);
    setMenuName(menu.menu_name);
    setDescription(menu.description);

    const compMap: { [compId: number]: number[] } = {};
    if (menu.components) {
      menu.components.forEach(c => {
        compMap[c.component_id] = c.items.map(it => it.ingredient_id);
      });
    }
    setSelectedComponents(compMap);
    setShowForm(true);
  };

  const toggleIngredientInComponent = (compId: number, ingId: number) => {
    const current = selectedComponents[compId] || [];
    let updated;
    if (current.includes(ingId)) {
      updated = current.filter(id => id !== ingId);
    } else {
      updated = [...current, ingId];
    }
    setSelectedComponents({
      ...selectedComponents,
      [compId]: updated
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuName) return;

    // Structure components
    const componentsToSave = Object.keys(selectedComponents).map(compIdStr => {
      const compId = Number(compIdStr);
      const componentName = COMPONENTS_LIST.find(c => c.id === compId)!.name;
      const ingredientIds = selectedComponents[compId] || [];

      return {
        id: compId,
        component_id: compId,
        name: componentName,
        items: ingredientIds.map((ingId, idx) => {
          const ing = ingredients.find(i => i.id === ingId)!;
          return {
            id: idx + 1,
            ingredient_id: ingId,
            name: ing.name,
            code: ing.code
          };
        })
      };
    }).filter(c => c.items.length > 0);

    const menuData: Partial<LibraryMenu> = {
      menu_name: menuName,
      description,
      components: componentsToSave
    };

    if (editingId) {
      onUpdateLibraryMenu(editingId, menuData);
    } else {
      onCreateLibraryMenu(menuData);
    }

    setShowForm(false);
  };

  const filteredMenus = libraryMenus.filter(m =>
    m.menu_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(ingSearch.toLowerCase()) ||
    i.code.toLowerCase().includes(ingSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Katalog Template Menu</h2>
          <p className="text-sm text-slate-500">Kelola master template hidangan (Library Menu) tanpa menyimpan gramasi gizi langsung.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer"
        >
          <Plus size={16} />
          <span>Buat Template Baru</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-md space-y-6 animate-fade-in max-w-4xl">
          <div className="flex justify-between items-center pb-4 border-b border-slate-50">
            <h3 className="font-bold text-slate-800 text-lg">
              {editingId ? "Edit Template Menu" : "Buat Template Menu Baru"}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nama Menu Template</label>
                <input
                  type="text"
                  value={menuName}
                  onChange={e => setMenuName(e.target.value)}
                  placeholder="Contoh: Paket Nasi Sop Daging Sapi"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Deskripsi Hidangan</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Isi rincian penyajian template menu"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Component Setup */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
              <h4 className="font-bold text-sm text-slate-700">Komponen Penyusun Hidangan</h4>
              <p className="text-xs text-slate-400">Pilih komponen dan tambahkan bahan makanan dari TKPI.</p>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {COMPONENTS_LIST.map(comp => {
                  const selectedIngs = selectedComponents[comp.id] || [];
                  const isSelecting = activeSelectComp === comp.id;

                  return (
                    <div key={comp.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">{comp.name}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">{selectedIngs.length} bahan dipilih</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSelectComp(isSelecting ? null : comp.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg border border-emerald-500/10 cursor-pointer"
                        >
                          {isSelecting ? "Tutup" : "Pilih Bahan"}
                        </button>
                      </div>

                      {/* Display Selected Bahan Names */}
                      {selectedIngs.length > 0 && !isSelecting && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {selectedIngs.map(ingId => {
                            const ing = ingredients.find(i => i.id === ingId);
                            return ing ? (
                              <span key={ingId} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-medium px-2 py-1 rounded-md border border-emerald-500/10">
                                <span>{ing.name}</span>
                                <button type="button" onClick={() => toggleIngredientInComponent(comp.id, ingId)} className="text-emerald-400 hover:text-emerald-600">
                                  <X size={10} />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Selection Box overlay in container */}
                      {isSelecting && (
                        <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
                          <input
                            type="text"
                            placeholder="Cari bahan..."
                            value={ingSearch}
                            onChange={e => setIngSearch(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          />
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {filteredIngredients.map(ing => {
                              const isChecked = selectedIngs.includes(ing.id);
                              return (
                                <button
                                  key={ing.id}
                                  type="button"
                                  onClick={() => toggleIngredientInComponent(comp.id, ing.id)}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                                    isChecked ? 'bg-emerald-500/10 text-emerald-700' : 'hover:bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <span>{ing.code} - {ing.name}</span>
                                  {isChecked && <Check size={12} className="text-emerald-600" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/60 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-md shadow-emerald-500/15"
            >
              {editingId ? "Simpan Perubahan" : "Simpan Template"}
            </button>
          </div>
        </form>
      )}

      {/* Grid of Existing Templates */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 max-w-md shadow-sm">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Cari nama template menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-sm text-slate-700 bg-transparent focus:outline-none"
          />
        </div>

        {filteredMenus.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
            <BookOpen size={36} className="mx-auto mb-3" />
            <p className="text-sm">Template menu tidak ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenus.map(menu => (
              <div key={menu.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="font-bold text-slate-800 text-base leading-tight">{menu.menu_name}</h4>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenEdit(menu)}
                        className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Hapus template menu ini?")) {
                            onDeleteLibraryMenu(menu.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed min-h-[40px] line-clamp-2">{menu.description}</p>

                  {/* Components breakdown */}
                  <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Komponen Hidangan</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {menu.components && menu.components.map(c => (
                        <span key={c.id} className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {menu.components?.reduce((sum, c) => sum + c.items.length, 0) || 0} bahan pangan
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Ready
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

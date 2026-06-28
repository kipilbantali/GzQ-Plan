/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import {
  Calendar,
  ClipboardList,
  Search,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  Save,
  Lock,
  Unlock,
  Settings
} from 'lucide-react';
import {
  Period,
  MenuDay,
  MenuPlan,
  BeneficiaryGroup,
  LibraryMenu,
  Ingredient,
  MenuStatus,
  MenuPlanComponent,
  MenuPlanItem
} from '../types';

interface PlanningProps {
  periods: Period[];
  menuDays: MenuDay[];
  menuPlans: MenuPlan[];
  beneficiaryGroups: BeneficiaryGroup[];
  libraryMenus: LibraryMenu[];
  ingredients: Ingredient[];
  onCreateMenuPlan: (data: Partial<MenuPlan>) => Promise<MenuPlan | null>;
  onUpdateMenuPlan: (id: number, data: Partial<MenuPlan>) => void;
  onFinalizeMenuPlan: (id: number) => void;
  onDraftMenuPlan: (id: number) => void;
  onCopyFromGroup: (targetId: number, sourceId: number) => void;
  onCopyFromLibrary: (targetId: number, libraryMenuId: number) => void;
  onUpdateBeneficiaryGroup?: (id: number, data: Partial<BeneficiaryGroup>) => Promise<void> | void;
}

export default function Planning({
  periods,
  menuDays,
  menuPlans,
  beneficiaryGroups,
  libraryMenus,
  ingredients,
  onCreateMenuPlan,
  onUpdateMenuPlan,
  onFinalizeMenuPlan,
  onDraftMenuPlan,
  onCopyFromGroup,
  onCopyFromLibrary,
  onUpdateBeneficiaryGroup
}: PlanningProps) {
  // State for selections
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(periods[0]?.id || null);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(beneficiaryGroups[0]?.id || 1);

  // Selector search / overlays
  const [showAddIngredientCompId, setShowAddIngredientCompId] = useState<number | null>(null);
  const [ingSearchQuery, setIngSearchQuery] = useState('');
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  // States for Editing Beneficiary Group Targets
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const [editHpp, setEditHpp] = useState(0);
  const [editEnergyMin, setEditEnergyMin] = useState(0);
  const [editEnergyMax, setEditEnergyMax] = useState(0);
  const [editProteinMin, setEditProteinMin] = useState(0);
  const [editProteinMax, setEditProteinMax] = useState(0);
  const [editFatMin, setEditFatMin] = useState(0);
  const [editFatMax, setEditFatMax] = useState(0);
  const [editCarbMin, setEditCarbMin] = useState(0);
  const [editCarbMax, setEditCarbMax] = useState(0);
  const [editFiberMin, setEditFiberMin] = useState(0);
  const [editFiberMax, setEditFiberMax] = useState(0);

  // Local menu plans state to enable instantaneous user interaction without lag
  const [localMenuPlans, setLocalMenuPlans] = useState<MenuPlan[]>(menuPlans);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalMenuPlans(menuPlans);
  }, [menuPlans]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Recalculate item level nutrients
  const calculateItemNutrition = (item: MenuPlanItem, weight: number): MenuPlanItem => {
    const ing = ingredients.find(i => i.id === item.ingredient_id);
    if (!ing) return item;

    const factor = weight / 100;
    const gross_weight = ing.bdd > 0 ? (weight * 100) / ing.bdd : 0;
    const ingredient_cost = (gross_weight / 1000) * ing.price;

    return {
      ...item,
      net_weight: weight,
      bdd: ing.bdd,
      gross_weight: Math.round(gross_weight * 100) / 100,
      energy: Math.round(ing.energy * factor * 10) / 10,
      protein: Math.round(ing.protein * factor * 10) / 10,
      fat: Math.round(ing.fat * factor * 10) / 10,
      carbohydrate: Math.round(ing.carbohydrate * factor * 10) / 10,
      fiber: Math.round(ing.fiber * factor * 10) / 10,
      ingredient_cost: Math.round(ingredient_cost)
    };
  };

  // Recalculate overall menu plan totals
  const recalculatePlanTotals = (plan: MenuPlan): MenuPlan => {
    let totalEnergy = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbohydrate = 0;
    let totalFiber = 0;
    let totalHpp = 0;

    if (plan.components) {
      plan.components.forEach(comp => {
        comp.items.forEach(item => {
          totalEnergy += item.energy || 0;
          totalProtein += item.protein || 0;
          totalFat += item.fat || 0;
          totalCarbohydrate += item.carbohydrate || 0;
          totalFiber += item.fiber || 0;
          totalHpp += item.ingredient_cost || 0;
        });
      });
    }

    return {
      ...plan,
      total_energy: Math.round(totalEnergy * 10) / 10,
      total_protein: Math.round(totalProtein * 10) / 10,
      total_fat: Math.round(totalFat * 10) / 10,
      total_carbohydrate: Math.round(totalCarbohydrate * 10) / 10,
      total_fiber: Math.round(totalFiber * 10) / 10,
      total_hpp: Math.round(totalHpp)
    };
  };

  // Synchronously update UI local state and debounce the API update
  const updatePlanAndSave = (updatedPlan: MenuPlan) => {
    const finalizedPlan = recalculatePlanTotals(updatedPlan);

    // 1. Update local state instantly so input and sticky panel are in sync with 0ms delay
    setLocalMenuPlans(prev => prev.map(p => p.id === finalizedPlan.id ? finalizedPlan : p));

    // 2. Clear any outstanding debounced save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('Saving...');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onUpdateMenuPlan(finalizedPlan.id, finalizedPlan);
        setSaveStatus('Saved');
      } catch (err) {
        setSaveStatus('Failed');
      }
    }, 600);
  };

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Failed'>('Saved');

  // Trigger default Day selection
  const activePeriodDays = selectedPeriodId ? menuDays.filter(d => d.period_id === selectedPeriodId && d.distribution_day) : [];
  useEffect(() => {
    if (activePeriodDays.length > 0 && !selectedDayId) {
      setSelectedDayId(activePeriodDays[0].id);
    }
  }, [selectedPeriodId, activePeriodDays]);

  const currentDay = menuDays.find(d => d.id === selectedDayId);
  const currentGroup = beneficiaryGroups.find(g => g.id === selectedGroupId);

  const handleOpenEditGroup = () => {
    if (!currentGroup) return;
    setEditCount(currentGroup.beneficiary_count);
    setEditHpp(currentGroup.hpp_limit);
    setEditEnergyMin(currentGroup.energy_min);
    setEditEnergyMax(currentGroup.energy_max);
    setEditProteinMin(currentGroup.protein_min);
    setEditProteinMax(currentGroup.protein_max);
    setEditFatMin(currentGroup.fat_min);
    setEditFatMax(currentGroup.fat_max);
    setEditCarbMin(currentGroup.carbohydrate_min);
    setEditCarbMax(currentGroup.carbohydrate_max);
    setEditFiberMin(currentGroup.fiber_min);
    setEditFiberMax(currentGroup.fiber_max);
    setShowEditGroupModal(true);
  };

  const handleSaveGroupTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup || !onUpdateBeneficiaryGroup) return;
    await onUpdateBeneficiaryGroup(currentGroup.id, {
      beneficiary_count: Number(editCount),
      hpp_limit: Number(editHpp),
      energy_min: Number(editEnergyMin),
      energy_max: Number(editEnergyMax),
      protein_min: Number(editProteinMin),
      protein_max: Number(editProteinMax),
      fat_min: Number(editFatMin),
      fat_max: Number(editFatMax),
      carbohydrate_min: Number(editCarbMin),
      carbohydrate_max: Number(editCarbMax),
      fiber_min: Number(editFiberMin),
      fiber_max: Number(editFiberMax),
    });
    setShowEditGroupModal(false);
  };

  // Find existing menu plan for selected Day + Group from local menu plans
  const currentPlan = localMenuPlans.find(
    p => p.menu_day_id === selectedDayId && p.beneficiary_group_id === selectedGroupId
  );

  // 1. Setup Blank Menu
  const handleCreateBlankMenu = async () => {
    if (!selectedDayId || !currentGroup) return;
    const defaultComponents = [
      { id: 1, name: "Makanan Pokok", sort_order: 0, items: [] },
      { id: 2, name: "Lauk Hewani", sort_order: 1, items: [] },
      { id: 3, name: "Lauk Nabati", sort_order: 2, items: [] },
      { id: 4, name: "Sayur", sort_order: 3, items: [] },
      { id: 5, name: "Buah", sort_order: 4, items: [] },
      { id: 6, name: "Susu", sort_order: 5, items: [] }
    ];

    const created = await onCreateMenuPlan({
      menu_day_id: selectedDayId,
      beneficiary_group_id: selectedGroupId,
      menu_name: `Siklus Menu Kelompok ${currentGroup.name}`,
      status: MenuStatus.DRAFT,
      components: defaultComponents as any
    });

    if (created) {
      setLocalMenuPlans(prev => [...prev, created]);
    }
  };

  // 2. Setup Menu using Library Snapshot
  const handleCreateFromLibrary = async (libMenuId: number) => {
    const lib = libraryMenus.find(l => l.id === libMenuId);
    if (!lib || !selectedDayId) return;

    const created = await onCreateMenuPlan({
      menu_day_id: selectedDayId,
      beneficiary_group_id: selectedGroupId,
      library_menu_id: libMenuId,
      menu_name: lib.menu_name
    });

    if (created) {
      setLocalMenuPlans(prev => [...prev, created]);
    }
  };

  // 3. Handle Copy Menu from another Group on same day
  const handleCopyFromOtherGroup = async (sourcePlanId: number) => {
    if (!selectedDayId || !currentGroup) return;

    // Create a blank target menu plan first
    const defaultComponents = [
      { id: 1, name: "Makanan Pokok", sort_order: 0, items: [] },
      { id: 2, name: "Lauk Hewani", sort_order: 1, items: [] },
      { id: 3, name: "Lauk Nabati", sort_order: 2, items: [] },
      { id: 4, name: "Sayur", sort_order: 3, items: [] },
      { id: 5, name: "Buah", sort_order: 4, items: [] },
      { id: 6, name: "Susu", sort_order: 5, items: [] }
    ];

    const created = await onCreateMenuPlan({
      menu_day_id: selectedDayId,
      beneficiary_group_id: selectedGroupId,
      menu_name: `Salinan Menu`,
      status: MenuStatus.DRAFT,
      components: defaultComponents as any
    });

    if (created) {
      setLocalMenuPlans(prev => [...prev, created]);
      await onCopyFromGroup(created.id, sourcePlanId);
    }
  };

  // 3b. Copy from previous group on same day
  const handleCopyFromPreviousGroup = async () => {
    if (!currentPlan || currentPlan.status === MenuStatus.FINAL) return;

    const currentGroupIdx = beneficiaryGroups.findIndex(g => g.id === selectedGroupId);
    let sourcePlan: MenuPlan | undefined;

    if (currentGroupIdx > 0) {
      const prevGroup = beneficiaryGroups[currentGroupIdx - 1];
      sourcePlan = otherPlansOnDay.find(p => p.beneficiary_group_id === prevGroup.id);
    }

    // Fallback: If no plan found for immediate previous group, copy from any other group plan on same day
    if (!sourcePlan && otherPlansOnDay.length > 0) {
      sourcePlan = otherPlansOnDay[0];
    }

    if (!sourcePlan) {
      alert("Tidak ada perencanaan menu dari kelompok sasaran lain untuk disalin hari ini.");
      return;
    }

    await onCopyFromGroup(currentPlan.id, sourcePlan.id);
  };

  // 3c. Handle select library menu
  const handleSelectLibraryMenu = async (libMenuId: number) => {
    if (currentPlan) {
      await onCopyFromLibrary(currentPlan.id, libMenuId);
    } else {
      await handleCreateFromLibrary(libMenuId);
    }
    setShowLibraryModal(false);
    setLibrarySearchQuery('');
  };

  // 4. Update individual ingredient weight (Gramasi) in planning editor
  const handleGramasiChange = (compId: number, itemId: number, weight: number) => {
    if (!currentPlan || currentPlan.status === MenuStatus.FINAL) return;

    const updatedPlan = JSON.parse(JSON.stringify(currentPlan)) as MenuPlan;
    const comp = updatedPlan.components?.find(c => c.component_id === compId);
    if (comp) {
      const item = comp.items.find(it => it.id === itemId);
      if (item) {
        const updatedItem = calculateItemNutrition(item, weight);
        Object.assign(item, updatedItem);
      }
    }

    updatePlanAndSave(updatedPlan);
  };

  // 5. Add new ingredient to component
  const handleAddIngredient = (compId: number, ingId: number) => {
    if (!currentPlan || currentPlan.status === MenuStatus.FINAL) return;

    const ing = ingredients.find(i => i.id === ingId);
    if (!ing) return;

    const updatedPlan = JSON.parse(JSON.stringify(currentPlan)) as MenuPlan;
    const comp = updatedPlan.components?.find(c => c.component_id === compId);
    if (comp) {
      const defaultGramasi = 50; // standard default gramasi

      const newItem: MenuPlanItem = {
        id: Date.now() + Math.random(),
        component_plan_id: compId,
        ingredient_id: ingId,
        name: ing.name,
        code: ing.code,
        net_weight: defaultGramasi,
        bdd: ing.bdd,
        gross_weight: 0,
        energy: 0,
        protein: 0,
        fat: 0,
        carbohydrate: 0,
        fiber: 0,
        ingredient_cost: 0
      };

      const updatedItem = calculateItemNutrition(newItem, defaultGramasi);
      comp.items.push(updatedItem);
    }

    setShowAddIngredientCompId(null);
    updatePlanAndSave(updatedPlan);
  };

  // 6. Delete ingredient from component
  const handleDeleteIngredient = (compId: number, itemId: number) => {
    if (!currentPlan || currentPlan.status === MenuStatus.FINAL) return;

    const updatedPlan = JSON.parse(JSON.stringify(currentPlan)) as MenuPlan;
    const comp = updatedPlan.components?.find(c => c.component_id === compId);
    if (comp) {
      comp.items = comp.items.filter(it => it.id !== itemId);
    }

    updatePlanAndSave(updatedPlan);
  };

  // 7. Calculate validations for Sticky Nutrition Panel (BR-009)
  const getValidationIndicator = (current: number, min: number, max: number) => {
    if (current >= min && current <= max) {
      return { text: "Sesuai", icon: "🟢", color: "text-emerald-500", barColor: "bg-emerald-500" };
    }
    // Yellow zone (within 10% tolerance)
    const marginMin = min * 0.9;
    const marginMax = max * 1.1;
    if (current >= marginMin && current <= marginMax) {
      return { text: "Mendekati Batas", icon: "🟡", color: "text-amber-500", barColor: "bg-amber-500" };
    }
    return { text: "Di luar Batas", icon: "🔴", color: "text-rose-500", barColor: "bg-rose-500" };
  };

  // Group HPP validation
  const getHppIndicator = (currentHpp: number, limit: number) => {
    if (currentHpp <= limit) {
      return { text: "Sesuai Anggaran", icon: "🟢", color: "text-emerald-500" };
    }
    return { text: "Over Budget", icon: "🔴", color: "text-rose-500" };
  };

  // Calculate nutrition sums for current active plan
  const planEnergy = currentPlan?.total_energy || 0;
  const planProtein = currentPlan?.total_protein || 0;
  const planFat = currentPlan?.total_fat || 0;
  const planCarb = currentPlan?.total_carbohydrate || 0;
  const planFiber = currentPlan?.total_fiber || 0;
  const planHpp = currentPlan?.total_hpp || 0;

  const energyVal = currentGroup ? getValidationIndicator(planEnergy, currentGroup.energy_min, currentGroup.energy_max) : null;
  const proteinVal = currentGroup ? getValidationIndicator(planProtein, currentGroup.protein_min, currentGroup.protein_max) : null;
  const fatVal = currentGroup ? getValidationIndicator(planFat, currentGroup.fat_min, currentGroup.fat_max) : null;
  const carbVal = currentGroup ? getValidationIndicator(planCarb, currentGroup.carbohydrate_min, currentGroup.carbohydrate_max) : null;
  const fiberVal = currentGroup ? getValidationIndicator(planFiber, currentGroup.fiber_min, currentGroup.fiber_max) : null;

  const hppVal = currentGroup ? getHppIndicator(planHpp, currentGroup.hpp_limit) : null;

  const filteredIngredients = ingredients.filter(i =>
    !i.deleted_at &&
    (i.name.toLowerCase().includes(ingSearchQuery.toLowerCase()) ||
     i.code.toLowerCase().includes(ingSearchQuery.toLowerCase()))
  );

  // Other menu plans on same day to copy from (BR-023, BR-024)
  const otherPlansOnDay = selectedDayId
    ? localMenuPlans.filter(p => p.menu_day_id === selectedDayId && p.beneficiary_group_id !== selectedGroupId)
    : [];

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Auto Save Status Indicator */}
      <div className="absolute top-0 right-0 flex items-center gap-2 text-xs font-semibold bg-white border border-slate-100 px-3 py-1.5 rounded-full shadow-sm">
        <span className={`w-2 h-2 rounded-full ${saveStatus === 'Saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`}></span>
        <span className="text-slate-500">Auto Save: {saveStatus}</span>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Menu Planning Editor</h2>
        <p className="text-sm text-slate-500">Sempurnakan susunan porsi makanan dan gizi real-time tanpa pemicu tombol hitung.</p>
      </div>

      {/* Selector Toolbar */}
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
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hari Menu</label>
          <select
            value={selectedDayId || ''}
            onChange={e => setSelectedDayId(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            disabled={activePeriodDays.length === 0}
          >
            {activePeriodDays.map(d => (
              <option key={d.id} value={d.id}>Hari {d.day_number} ({d.calendar_date})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kelompok Sasaran</label>
          <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl">
            {beneficiaryGroups.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  selectedGroupId === g.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end h-full self-end pt-3 sm:pt-0">
          <button
            onClick={handleOpenEditGroup}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-extrabold text-xs transition duration-150 cursor-pointer active:scale-95 border border-indigo-100"
            title="Edit target sasaran, limit HPP, dan kandungan gizi kelompok sasaran ini"
          >
            <Settings size={13} className="text-indigo-500 animate-spin-hover" />
            <span>Edit Target & Penerima</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {!currentPlan ? (
        // Empty State: Create Menu Plan (BR-020, BR-024)
        <div className="bg-white border border-slate-100/70 rounded-3xl p-12 text-center max-w-2xl mx-auto space-y-8 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-500 border border-slate-100/75 shadow-sm">
            <ClipboardList size={26} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Siklus Menu Belum Ditentukan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Tentukan hidangan pada kelompok sasaran <strong className="text-slate-700 font-bold">{currentGroup?.name}</strong> untuk <strong className="text-slate-700 font-bold">Hari Menu {currentDay?.day_number}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
            {/* blank new */}
            <button
              onClick={handleCreateBlankMenu}
              className="p-6 border border-slate-100 hover:border-emerald-500/20 rounded-3xl bg-slate-50/50 hover:bg-emerald-50/10 text-left transition-all duration-200 group cursor-pointer"
            >
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-200 shadow-sm">
                <Plus size={18} />
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm mt-4">Buat Menu Kosong</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Susun bahan pangan secara mandiri dari awal.</p>
            </button>

            {/* library dialog option */}
            <button
              onClick={() => setShowLibraryModal(true)}
              className="p-6 border border-slate-100 hover:border-indigo-500/20 rounded-3xl bg-slate-50/50 hover:bg-indigo-50/10 text-left transition-all duration-200 group cursor-pointer"
            >
              <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-200 shadow-sm">
                <Sparkles size={18} />
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm mt-4">Gunakan Template Library</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Salin langsung dari blueprint katalog template.</p>
            </button>
          </div>

          {otherPlansOnDay.length > 0 && (
            <div className="pt-6 border-t border-slate-100 max-w-lg mx-auto space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">Atau Salin Dari Kelompok Lain Hari Ini</span>
              <div className="flex flex-wrap justify-center gap-2">
                {otherPlansOnDay.map(other => {
                  const grp = beneficiaryGroups.find(g => g.id === other.beneficiary_group_id);
                  return (
                    <button
                      key={other.id}
                      onClick={() => handleCopyFromOtherGroup(other.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 shadow-sm transition duration-150 cursor-pointer"
                    >
                      <Copy size={12} className="text-slate-400" />
                      <span>{grp?.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Three Panel Layout Editor (BR-022, BR-12, BR-13)
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Panel Tengah: Editor Menu Components (3/4 width) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-slate-50/15 to-slate-50/30 border border-slate-200/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sedang Mengedit Menu</p>
                <h3 className="text-lg font-extrabold text-slate-800 truncate mt-1 tracking-tight">{currentPlan.menu_name}</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {currentPlan.status !== MenuStatus.FINAL && (
                  <>
                    <button
                      onClick={handleCopyFromPreviousGroup}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-sky-100 bg-sky-50/40 hover:bg-sky-50 text-sky-700 font-extrabold text-xs transition duration-200 cursor-pointer shadow-sm hover:shadow active:scale-95"
                    >
                      <Copy size={13} className="text-sky-500" />
                      <span>Salin Menu dari Kelompok Sebelumnya</span>
                    </button>

                    <button
                      onClick={() => setShowLibraryModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-extrabold text-xs transition duration-200 cursor-pointer shadow-sm hover:shadow active:scale-95"
                    >
                      <Sparkles size={13} className="text-indigo-500" />
                      <span>Salin Menu dari Library</span>
                    </button>
                  </>
                )}

                {currentPlan.status === MenuStatus.FINAL ? (
                  <button
                    onClick={() => onDraftMenuPlan(currentPlan.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition duration-200 cursor-pointer"
                  >
                    <Unlock size={14} />
                    <span>Ubah ke Draft</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onFinalizeMenuPlan(currentPlan.id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-md shadow-emerald-500/10 hover:shadow-lg transition duration-200 cursor-pointer active:scale-95"
                  >
                    <Lock size={14} />
                    <span>Finalisasi Menu</span>
                  </button>
                )}
              </div>
            </div>

            {/* Component Cards list */}
            <div className="space-y-6">
              {currentPlan.components && currentPlan.components.map(comp => (
                <div key={comp.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>{comp.name}</span>
                    </span>

                    {currentPlan.status !== MenuStatus.FINAL && (
                      <button
                        onClick={() => {
                          setShowAddIngredientCompId(comp.component_id);
                          setIngSearchQuery('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100/50 text-xs font-semibold cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Tambah Bahan</span>
                      </button>
                    )}
                  </div>

                  {/* Search Selector overlay per component */}
                  {showAddIngredientCompId === comp.component_id && (
                    <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                        <Search size={14} className="text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari bahan pangan TKPI..."
                          value={ingSearchQuery}
                          onChange={e => setIngSearchQuery(e.target.value)}
                          className="w-full focus:outline-none text-slate-700 bg-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        {filteredIngredients.map(ing => (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => handleAddIngredient(comp.component_id, ing.id)}
                            className="text-left p-2 hover:bg-white border border-transparent hover:border-slate-100 rounded-lg text-xs text-slate-700 truncate"
                          >
                            <span className="font-bold text-emerald-600 mr-2 font-mono">{ing.code}</span>
                            <span>{ing.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Component Ingredients list Table */}
                  {comp.items.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada bahan dalam komponen ini.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                            <th className="pb-2">Bahan</th>
                            <th className="pb-2 text-center w-16">BDD</th>
                            <th className="pb-2 text-center w-24">Gramasi (g)</th>
                            <th className="pb-2 text-center w-20">Kotor (g)</th>
                            <th className="pb-2 text-center">Penerima Manfaat</th>
                            <th className="pb-2 text-center">Kebutuhan Bahan (Kg)</th>
                            <th className="pb-2 text-center">HPP</th>
                            <th className="pb-2 text-center w-12">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {comp.items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-semibold text-slate-800">{item.name}</td>
                              <td className="py-2.5 text-center font-mono text-slate-500">{item.bdd}%</td>
                              <td className="py-2.5 text-center">
                                <input
                                  type="number"
                                  value={item.net_weight || ''}
                                  onChange={e => handleGramasiChange(comp.component_id, item.id, Number(e.target.value))}
                                  disabled={currentPlan.status === MenuStatus.FINAL}
                                  className="w-16 px-2 py-1 rounded border border-slate-200 text-center text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 text-center font-mono font-medium text-slate-600">{item.gross_weight}g</td>
                              <td className="py-2.5 text-center text-slate-600 font-mono">{(currentGroup?.beneficiary_count || 0).toLocaleString('id-ID')} orang</td>
                              <td className="py-2.5 text-center text-indigo-600 font-bold font-mono">
                                {((item.gross_weight * (currentGroup?.beneficiary_count || 0)) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                              </td>
                              <td className="py-2.5 text-center text-emerald-600 font-bold font-mono">Rp {item.ingredient_cost?.toLocaleString('id-ID')}</td>
                              <td className="py-2.5 text-center">
                                <button
                                  onClick={() => handleDeleteIngredient(comp.component_id, item.id)}
                                  disabled={currentPlan.status === MenuStatus.FINAL}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panel Kanan: Sticky Nutrition Panel (1/4 width) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6 sticky top-24 border border-slate-800">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm tracking-tight">Sticky Nutrition Panel</h4>
                  <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">Real-Time Validation</span>
                </div>
                <ClipboardList size={18} className="text-slate-400" />
              </div>

              {/* Group Limits Information */}
              <div className="space-y-3.5">
                {/* Energy */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Energi</span>
                    <span className={`font-mono font-bold ${energyVal?.color}`}>{planEnergy} / {currentGroup?.energy_min}-{currentGroup?.energy_max} kcal</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${energyVal?.barColor}`}
                      style={{ width: `${Math.min((planEnergy / (currentGroup?.energy_max || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Protein */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Protein</span>
                    <span className={`font-mono font-bold ${proteinVal?.color}`}>{planProtein} / {currentGroup?.protein_min}-{currentGroup?.protein_max}g</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${proteinVal?.barColor}`}
                      style={{ width: `${Math.min((planProtein / (currentGroup?.protein_max || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Fat */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Lemak</span>
                    <span className={`font-mono font-bold ${fatVal?.color}`}>{planFat} / {currentGroup?.fat_min}-{currentGroup?.fat_max}g</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${fatVal?.barColor}`}
                      style={{ width: `${Math.min((planFat / (currentGroup?.fat_max || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Carbohydrate */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Karbohidrat</span>
                    <span className={`font-mono font-bold ${carbVal?.color}`}>{planCarb} / {currentGroup?.carbohydrate_min}-{currentGroup?.carbohydrate_max}g</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${carbVal?.barColor}`}
                      style={{ width: `${Math.min((planCarb / (currentGroup?.carbohydrate_max || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Fiber */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Serat</span>
                    <span className={`font-mono font-bold ${fiberVal?.color}`}>{planFiber} / {currentGroup?.fiber_min}-{currentGroup?.fiber_max}g</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${fiberVal?.barColor}`}
                      style={{ width: `${Math.min((planFiber / (currentGroup?.fiber_max || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* HPP Control Card */}
              <div className="bg-slate-950/50 rounded-2xl p-4.5 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">HPP per Porsi</span>
                  <p className="text-xl font-extrabold text-white">Rp {planHpp.toLocaleString('id-ID')}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-400">Limit: Rp {currentGroup?.hpp_limit.toLocaleString('id-ID')}</span>
                  <span className={`font-bold ${hppVal?.color}`}>{hppVal?.text}</span>
                </div>
              </div>

              {/* Lock Status Info */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 text-xs text-emerald-400 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle size={14} />
                  <span>Pedoman AKG</span>
                </div>
                <p className="leading-relaxed font-medium">Sesuaikan Gramasi di panel kiri agar seluruh status indikator di atas menjadi warna hijau 🟢.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Library Selection Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Pilih Template Library</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih blueprint katalog untuk kelompok <strong className="text-slate-700 font-semibold">{currentGroup?.name}</strong>.
                </p>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 font-bold transition duration-150"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3.5 py-2.5 rounded-2xl text-xs shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition animate-fade-in">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Cari template berdasarkan nama..."
                value={librarySearchQuery}
                onChange={e => setLibrarySearchQuery(e.target.value)}
                className="w-full focus:outline-none text-slate-700 bg-transparent font-medium"
              />
            </div>

            {/* Template List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {libraryMenus
                .filter(lib => lib.menu_name.toLowerCase().includes(librarySearchQuery.toLowerCase()))
                .map(lib => (
                  <button
                    key={lib.id}
                    onClick={() => {
                      handleSelectLibraryMenu(lib.id);
                    }}
                    className="w-full text-left p-4 border border-slate-100 hover:border-indigo-500/20 rounded-2xl bg-slate-50/40 hover:bg-indigo-50/10 transition-all duration-150 group flex flex-col cursor-pointer"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">{lib.menu_name}</span>
                      <Sparkles size={12} className="text-indigo-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    {lib.description && (
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{lib.description}</p>
                    )}
                  </button>
                ))}
              {libraryMenus.filter(lib => lib.menu_name.toLowerCase().includes(librarySearchQuery.toLowerCase())).length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <p className="text-xs font-semibold text-slate-400">Tidak ada template yang cocok.</p>
                  <p className="text-[10px] text-slate-400">Coba gunakan kata kunci pencarian lainnya.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowLibraryModal(false);
                  setLibrarySearchQuery('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Beneficiary Group Targets Modal */}
      {showEditGroupModal && currentGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden p-6 space-y-4 my-8 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Edit Target & Penerima</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelompok Sasaran: <strong className="text-indigo-600 font-bold">{currentGroup.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowEditGroupModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 font-bold transition duration-150"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroupTargets} className="space-y-4">
              {/* Part 1: Penerima & Anggaran */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <span>Penerima & Anggaran</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah Penerima (Jiwa)</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="1"
                        value={editCount}
                        onChange={e => setEditCount(Math.max(1, Number(e.target.value)))}
                        className="w-full pl-3 pr-14 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                      <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">orang</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Limit HPP per Porsi (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-[10px] font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        required
                        min="1000"
                        value={editHpp}
                        onChange={e => setEditHpp(Math.max(0, Number(e.target.value)))}
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 2: Target Kandungan Gizi */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Pedoman AKG (Min & Max)</span>
                </h4>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {/* Energy Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Energi Min (kcal)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editEnergyMin}
                        onChange={e => setEditEnergyMin(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Energi Max (kcal)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editEnergyMax}
                        onChange={e => setEditEnergyMax(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Protein Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Protein Min (g)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editProteinMin}
                        onChange={e => setEditProteinMin(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Protein Max (g)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editProteinMax}
                        onChange={e => setEditProteinMax(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Lemak Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lemak Min (g)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editFatMin}
                        onChange={e => setEditFatMin(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lemak Max (g)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editFatMax}
                        onChange={e => setEditFatMax(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Karbohidrat Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Karbohidrat Min (g)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editCarbMin}
                        onChange={e => setEditCarbMin(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Karbohidrat Max (g)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editCarbMax}
                        onChange={e => setEditCarbMax(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Serat Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Serat Min (g)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editFiberMin}
                        onChange={e => setEditFiberMin(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Serat Max (g)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editFiberMax}
                        onChange={e => setEditFiberMax(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 transition cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

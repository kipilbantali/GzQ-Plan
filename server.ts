/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { getDb, saveDb, calculateNutrition, logAudit, syncFromSupabase, supabase, ensureDbSynced } from './server/db';
import {
  User,
  UserRole,
  UserStatus,
  Period,
  PeriodStatus,
  MenuDay,
  MenuPlan,
  MenuPlanComponent,
  MenuPlanItem,
  MenuStatus,
  ProcurementOrder,
  ProcurementStatus,
  ProcurementItem,
  ProcurementManualItem,
  BeneficiaryGroup,
  LibraryMenu
} from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure local database state is loaded & synchronized with Supabase on serverless/cold starts
app.use(async (req, res, next) => {
  try {
    await ensureDbSynced();
  } catch (err) {
    console.error("Error in ensureDbSynced middleware:", err);
  }
  next();
});

// Request logging middleware to diagnose route dispatching
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Mock Auth Session middleware
let currentUser: User | null = null;

app.use((req, res, next) => {
  // Allow overriding logged-in user with a header for testing
  const authHeader = req.headers['x-user-id'];
  if (authHeader) {
    const db = getDb();
    const found = db.users.find(u => u.id === Number(authHeader));
    if (found) {
      currentUser = found;
    }
  }
  next();
});

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!currentUser) {
    return res.status(401).json({ success: false, message: "Unauthorized. Silakan login terlebih dahulu." });
  }
  next();
}

function requireRole(roles: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!currentUser || !roles.includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: "Forbidden. Anda tidak memiliki hak akses." });
    }
    next();
  };
}

// ==========================================
// AUTHENTICATION APIs
// ==========================================
app.post('/api/v1/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username dan password wajib diisi." });
  }

  const db = getDb();
  const user = db.users.find(u => u.username === username);

  const expectedPassword = user ? (user.password || `${username}123`) : null;
  if (!user || password !== expectedPassword) {
    return res.status(422).json({ success: false, message: "Username atau password salah." });
  }

  if (user.status === UserStatus.INACTIVE) {
    return res.status(403).json({ success: false, message: "Akun Anda dinonaktifkan." });
  }

  currentUser = user;
  user.last_login_at = new Date().toISOString();
  await saveDb(db);

  logAudit(user.id, user.name, "Authentication", "Login", "users", user.id);

  res.json({
    success: true,
    message: "Login berhasil.",
    data: { user }
  });
});

app.post('/api/v1/auth/logout', requireAuth, (req, res) => {
  if (currentUser) {
    logAudit(currentUser.id, currentUser.name, "Authentication", "Logout", "users", currentUser.id);
  }
  currentUser = null;
  res.json({ success: true, message: "Logout berhasil." });
});

app.get('/api/v1/auth/me', (req, res) => {
  res.json({
    success: true,
    data: currentUser ? { user: currentUser } : null
  });
});


// ==========================================
// MASTER USERS APIs
// ==========================================
app.get('/api/v1/users', requireAuth, requireRole([UserRole.ADMINISTRATOR]), (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.users });
});

app.post('/api/v1/users', requireAuth, requireRole([UserRole.ADMINISTRATOR]), async (req, res) => {
  const { name, username, email, role, status, password } = req.body;
  if (!name || !username || !email || !role) {
    return res.status(422).json({ success: false, message: "Data tidak lengkap." });
  }

  const db = getDb();
  if (db.users.some(u => u.username === username)) {
    return res.status(409).json({ success: false, message: "Username sudah terdaftar." });
  }

  const newUser: User = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    name,
    username,
    email,
    role,
    status: status || UserStatus.ACTIVE,
    password: password || `${username}123`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.users.push(newUser);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "MasterData", "Create User", "users", newUser.id, null, newUser);

  res.status(201).json({ success: true, message: "User berhasil dibuat.", data: newUser });
});

app.put('/api/v1/users/:id', requireAuth, requireRole([UserRole.ADMINISTRATOR]), async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const userIdx = db.users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ success: false, message: "User tidak ditemukan." });
  }

  const existingUser = db.users[userIdx];

  // Prevent modifying own crucial attributes if logged-in user is self (anti-lock admin role)
  if (id === currentUser?.id) {
    if (req.body.role && req.body.role !== UserRole.ADMINISTRATOR) {
      return res.status(400).json({ success: false, message: "Anda tidak dapat mengubah role administrator Anda sendiri untuk menghindari terkunci." });
    }
    if (req.body.status && req.body.status === UserStatus.INACTIVE) {
      return res.status(400).json({ success: false, message: "Anda tidak dapat menonaktifkan akun administrator Anda sendiri." });
    }
  }

  const oldUser = { ...existingUser };
  const updatedUser = {
    ...existingUser,
    ...req.body,
    id, // preserve ID
    updated_at: new Date().toISOString()
  };

  db.users[userIdx] = updatedUser;
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "MasterData", "Update User", "users", id, oldUser, updatedUser);

  res.json({ success: true, message: "User berhasil diperbarui.", data: updatedUser });
});

app.delete('/api/v1/users/:id', requireAuth, requireRole([UserRole.ADMINISTRATOR]), async (req, res) => {
  const id = Number(req.params.id);
  if (id === currentUser?.id) {
    return res.status(400).json({ success: false, message: "Anda tidak dapat menghapus akun Anda sendiri." });
  }

  const db = getDb();
  const userIdx = db.users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ success: false, message: "User tidak ditemukan." });
  }

  const deletedUser = db.users[userIdx];
  db.users.splice(userIdx, 1);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "MasterData", "Delete User", "users", id, deletedUser, null);

  res.json({ success: true, message: "User berhasil dihapus." });
});


// ==========================================
// BENEFICIARY GROUPS APIs
// ==========================================
app.get('/api/v1/beneficiary-groups', requireAuth, (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.beneficiary_groups });
});

app.post('/api/v1/beneficiary-groups', requireAuth, requireRole([UserRole.ADMINISTRATOR]), async (req, res) => {
  const db = getDb();
  const newGroup: BeneficiaryGroup = {
    id: db.beneficiary_groups.length > 0 ? Math.max(...db.beneficiary_groups.map(g => g.id)) + 1 : 1,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.beneficiary_groups.push(newGroup);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "MasterData", "Create Group", "beneficiary_groups", newGroup.id, null, newGroup);

  res.status(201).json({ success: true, message: "Kelompok penerima berhasil dibuat.", data: newGroup });
});

app.put('/api/v1/beneficiary-groups/:id', requireAuth, requireRole([UserRole.ADMINISTRATOR, UserRole.PENGAWAS_GIZI]), async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const index = db.beneficiary_groups.findIndex(g => g.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Kelompok tidak ditemukan." });
  }

  const old = { ...db.beneficiary_groups[index] };
  const updated = {
    ...db.beneficiary_groups[index],
    ...req.body,
    id,
    updated_at: new Date().toISOString()
  };

  db.beneficiary_groups[index] = updated;
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "MasterData", "Update Group", "beneficiary_groups", id, old, updated);

  res.json({ success: true, message: "Kelompok berhasil diperbarui.", data: updated });
});


// ==========================================
// MASTER INGREDIENTS APIs
// ==========================================
app.get('/api/v1/ingredients', requireAuth, (req, res) => {
  const db = getDb();
  const search = req.query.search?.toString().toLowerCase();
  let list = db.ingredients.filter(i => !i.deleted_at);

  if (search) {
    list = list.filter(i => i.name.toLowerCase().includes(search) || i.code.toLowerCase().includes(search));
  }

  res.json({ success: true, data: list });
});

app.post('/api/v1/ingredients/import', requireAuth, async (req, res) => {
  const { ingredients } = req.body; // Array of ingredients to import
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(422).json({ success: false, message: "Format data import tidak valid." });
  }

  const db = getDb();
  let importCount = 0;

  ingredients.forEach(item => {
    // Check if ingredient with code already exists (even if soft-deleted)
    const existingIdx = db.ingredients.findIndex(i => i.code === item.code);
    if (existingIdx !== -1) {
      db.ingredients[existingIdx] = {
        ...db.ingredients[existingIdx],
        ...item,
        deleted_at: undefined,
        updated_at: new Date().toISOString()
      };
    } else {
      const nextId = db.ingredients.length > 0 ? Math.max(...db.ingredients.map(i => i.id)) + 1 : 1;
      db.ingredients.push({
        id: nextId,
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    importCount++;
  });

  await saveDb(db);
  logAudit(currentUser!.id, currentUser!.name, "MasterData", `Import Ingredients x${importCount}`, "ingredients");

  res.json({ success: true, message: `${importCount} bahan pangan TKPI berhasil diimport.` });
});

app.post('/api/v1/ingredients', requireAuth, async (req, res) => {
  const db = getDb();
  const { code, name, bdd, energy, protein, fat, carbohydrate, fiber, price } = req.body;

  if (db.ingredients.some(i => i.code === code && !i.deleted_at)) {
    return res.status(409).json({ success: false, message: "Kode bahan pangan sudah digunakan." });
  }

  const newIngredient = {
    id: db.ingredients.length > 0 ? Math.max(...db.ingredients.map(i => i.id)) + 1 : 1,
    code,
    category_id: 1, // default general category
    name,
    bdd: Number(bdd) || 100,
    energy: Number(energy) || 0,
    protein: Number(protein) || 0,
    fat: Number(fat) || 0,
    carbohydrate: Number(carbohydrate) || 0,
    fiber: Number(fiber) || 0,
    price: Number(price) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.ingredients.push(newIngredient);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "MasterData", "Create Ingredient", "ingredients", newIngredient.id, null, newIngredient);

  res.status(201).json({ success: true, message: "Bahan pangan berhasil ditambahkan.", data: newIngredient });
});

app.put('/api/v1/ingredients/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.ingredients.findIndex(i => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Bahan pangan tidak ditemukan." });
  }

  const old = { ...db.ingredients[idx] };
  const updated = {
    ...db.ingredients[idx],
    ...req.body,
    id,
    updated_at: new Date().toISOString()
  };

  db.ingredients[idx] = updated;
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "MasterData", "Update Ingredient", "ingredients", id, old, updated);

  res.json({ success: true, message: "Bahan pangan berhasil diperbarui.", data: updated });
});

app.delete('/api/v1/ingredients/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.ingredients.findIndex(i => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Bahan pangan tidak ditemukan." });
  }

  const old = { ...db.ingredients[idx] };
  db.ingredients[idx].deleted_at = new Date().toISOString();
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "MasterData", "Delete Ingredient (Soft)", "ingredients", id, old, db.ingredients[idx]);

  res.json({ success: true, message: "Bahan pangan berhasil dihapus." });
});


// ==========================================
// LIBRARY MENUS APIs (BR-010, BR-011, BR-012)
// ==========================================
app.get('/api/v1/library-menus', requireAuth, (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.library_menus });
});

app.post('/api/v1/library-menus', requireAuth, async (req, res) => {
  const { menu_name, description, components } = req.body;
  if (!menu_name) {
    return res.status(422).json({ success: false, message: "Nama menu wajib diisi." });
  }

  const db = getDb();
  const newMenu: LibraryMenu = {
    id: db.library_menus.length > 0 ? Math.max(...db.library_menus.map(m => m.id)) + 1 : 1,
    menu_name,
    description: description || "",
    created_by: currentUser!.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    components: components || []
  };

  db.library_menus.push(newMenu);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Library", "Create Library Menu", "library_menus", newMenu.id, null, newMenu);

  res.status(201).json({ success: true, message: "Library Menu berhasil ditambahkan.", data: newMenu });
});

app.put('/api/v1/library-menus/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.library_menus.findIndex(m => m.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Library Menu tidak ditemukan." });
  }

  const old = JSON.parse(JSON.stringify(db.library_menus[idx]));
  const updated: LibraryMenu = {
    ...db.library_menus[idx],
    ...req.body,
    id,
    updated_at: new Date().toISOString()
  };

  db.library_menus[idx] = updated;
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Library", "Update Library Menu", "library_menus", id, old, updated);

  res.json({ success: true, message: "Library Menu berhasil diperbarui.", data: updated });
});

app.delete('/api/v1/library-menus/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.library_menus.findIndex(m => m.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Library Menu tidak ditemukan." });
  }

  const deleted = db.library_menus[idx];
  db.library_menus.splice(idx, 1);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Library", "Delete Library Menu", "library_menus", id, deleted, null);

  res.json({ success: true, message: "Library Menu berhasil dihapus." });
});


// ==========================================
// PERIODS & DAYS APIs (BR-001)
// ==========================================
app.get('/api/v1/periods', requireAuth, (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.periods });
});

app.post('/api/v1/periods', requireAuth, async (req, res) => {
  const { name, start_date, end_date } = req.body;
  if (!name || !start_date || !end_date) {
    return res.status(422).json({ success: false, message: "Data tidak lengkap." });
  }

  const db = getDb();
  const newPeriod: Period = {
    id: db.periods.length > 0 ? Math.max(...db.periods.map(p => p.id)) + 1 : 1,
    name,
    start_date,
    end_date,
    status: PeriodStatus.DRAFT,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Generate Menu Days automatically (BR-001: 14 days operational, 12 days menu, exclude Sundays)
  const start = new Date(start_date);
  const menuDays: MenuDay[] = [];
  let dayNum = 1;
  const dayStartId = db.menu_days.length > 0 ? Math.max(...db.menu_days.map(d => d.id)) + 1 : 1;

  for (let i = 0; i < 14; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const isSunday = current.getDay() === 0;

    menuDays.push({
      id: dayStartId + i,
      period_id: newPeriod.id,
      day_number: isSunday ? 0 : dayNum,
      calendar_date: current.toISOString().split('T')[0],
      distribution_day: !isSunday,
      status: isSunday ? "Holiday" : "Pending"
    });

    if (!isSunday) {
      dayNum++;
    }
  }

  db.periods.push(newPeriod);
  db.menu_days.push(...menuDays);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", "Create Period & Days", "periods", newPeriod.id, null, newPeriod);

  res.status(201).json({ success: true, message: "Periode dan 12 Hari Menu berhasil dibuat.", data: { period: newPeriod, days: menuDays } });
});

app.put('/api/v1/periods/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.periods.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Periode tidak ditemukan." });
  }

  const old = { ...db.periods[idx] };
  const updated = {
    ...db.periods[idx],
    ...req.body,
    id,
    updated_at: new Date().toISOString()
  };

  db.periods[idx] = updated;
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", "Update Period", "periods", id, old, updated);

  res.json({ success: true, message: "Periode berhasil diperbarui.", data: updated });
});

app.delete('/api/v1/periods/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.periods.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Periode tidak ditemukan." });
  }

  const deleted = db.periods[idx];
  
  // Find associated menu days first before filtering
  const dayIds = db.menu_days.filter(d => d.period_id === id).map(d => d.id);
  
  db.periods.splice(idx, 1);
  // Cascade delete menu days
  db.menu_days = db.menu_days.filter(d => d.period_id !== id);
  // Remove associated menu plans
  db.menu_plans = db.menu_plans.filter(p => !dayIds.includes(p.menu_day_id));
  // Remove associated procurement orders
  db.procurement_orders = db.procurement_orders.filter(o => o.period_id !== id && !dayIds.includes(o.menu_day_id));

  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", "Delete Period Cascade", "periods", id, deleted, null);

  res.json({ success: true, message: "Periode berhasil dihapus." });
});

app.get('/api/v1/menu-days', requireAuth, (req, res) => {
  const db = getDb();
  const periodId = req.query.period_id ? Number(req.query.period_id) : null;
  let list = db.menu_days;
  if (periodId) {
    list = list.filter(d => d.period_id === periodId);
  }
  res.json({ success: true, data: list });
});


// ==========================================
// MENU PLANNING CORE APIs (BR-020 -> BR-024)
// ==========================================

// Internal helper to calculate overall menu nutrition aggregates
function recalculateMenuPlanAggregates(menuPlan: MenuPlan) {
  let totalEnergy = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbohydrate = 0;
  let totalFiber = 0;
  let totalHpp = 0;

  if (menuPlan.components) {
    menuPlan.components.forEach(comp => {
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

  menuPlan.total_energy = Math.round(totalEnergy * 10) / 10;
  menuPlan.total_protein = Math.round(totalProtein * 10) / 10;
  menuPlan.total_fat = Math.round(totalFat * 10) / 10;
  menuPlan.total_carbohydrate = Math.round(totalCarbohydrate * 10) / 10;
  menuPlan.total_fiber = Math.round(totalFiber * 10) / 10;
  menuPlan.total_hpp = Math.round(totalHpp);
}

app.get('/api/v1/menu-plans', requireAuth, (req, res) => {
  const db = getDb();
  const menuDayId = req.query.menu_day_id ? Number(req.query.menu_day_id) : null;
  let list = db.menu_plans;

  if (menuDayId) {
    list = list.filter(p => p.menu_day_id === menuDayId);
  }

  res.json({ success: true, data: list });
});

app.get('/api/v1/menu-plans/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const plan = db.menu_plans.find(p => p.id === id);
  if (!plan) {
    return res.status(404).json({ success: false, message: "Menu plan tidak ditemukan." });
  }
  res.json({ success: true, data: plan });
});

// Create/Initialize a Menu Plan (with Library snapshot, or copy, or blank)
app.post('/api/v1/menu-plans', requireAuth, async (req, res) => {
  const { menu_day_id, beneficiary_group_id, library_menu_id, menu_name } = req.body;
  if (!menu_day_id || !beneficiary_group_id || !menu_name) {
    return res.status(422).json({ success: false, message: "Data tidak lengkap." });
  }

  const db = getDb();

  // Enforce unique constraint: only one menu plan per day per beneficiary group (BR-020, BR-13)
  const existing = db.menu_plans.find(p => p.menu_day_id === Number(menu_day_id) && p.beneficiary_group_id === Number(beneficiary_group_id));
  if (existing) {
    return res.status(409).json({ success: false, message: "Menu untuk kelompok penerima ini pada hari tersebut sudah dibuat." });
  }

  const newId = db.menu_plans.length > 0 ? Math.max(...db.menu_plans.map(p => p.id)) + 1 : 1;
  const newPlan: MenuPlan = {
    id: newId,
    menu_day_id: Number(menu_day_id),
    beneficiary_group_id: Number(beneficiary_group_id),
    library_menu_id: library_menu_id ? Number(library_menu_id) : undefined,
    menu_name,
    status: MenuStatus.DRAFT,
    total_energy: 0,
    total_protein: 0,
    total_fat: 0,
    total_carbohydrate: 0,
    total_fiber: 0,
    total_hpp: 0,
    components: [
      { id: 1, menu_plan_id: newId, component_id: 1, name: "Makanan Pokok", sort_order: 0, items: [] },
      { id: 2, menu_plan_id: newId, component_id: 2, name: "Lauk Hewani", sort_order: 1, items: [] },
      { id: 3, menu_plan_id: newId, component_id: 3, name: "Lauk Nabati", sort_order: 2, items: [] },
      { id: 4, menu_plan_id: newId, component_id: 4, name: "Sayur", sort_order: 3, items: [] },
      { id: 5, menu_plan_id: newId, component_id: 5, name: "Buah", sort_order: 4, items: [] },
      { id: 6, menu_plan_id: newId, component_id: 6, name: "Susu", sort_order: 5, items: [] }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // If library menu is chosen, make a robust decoupled SNAPSHOT (BR-012, BR-021)
  if (library_menu_id) {
    const libMenu = db.library_menus.find(m => m.id === Number(library_menu_id));
    if (libMenu && libMenu.components) {
      newPlan.components = libMenu.components.map((c, cIdx) => {
        return {
          id: cIdx + 1,
          menu_plan_id: newId,
          component_id: c.component_id,
          name: c.name,
          sort_order: cIdx,
          items: c.items.map((it, itIdx) => {
            const ing = db.ingredients.find(i => i.id === it.ingredient_id)!;
            const defaultGramasi = 50; // default baseline gramasi
            const nut = calculateNutrition(ing, defaultGramasi);

            return {
              id: (cIdx + 1) * 100 + itIdx,
              component_plan_id: cIdx + 1,
              ingredient_id: ing.id,
              name: ing.name,
              code: ing.code,
              net_weight: defaultGramasi,
              bdd: ing.bdd,
              gross_weight: nut.gross_weight,
              energy: nut.energy,
              protein: nut.protein,
              fat: nut.fat,
              carbohydrate: nut.carbohydrate,
              fiber: nut.fiber,
              ingredient_cost: nut.ingredient_cost
            };
          })
        };
      });
    }
  }

  recalculateMenuPlanAggregates(newPlan);
  db.menu_plans.push(newPlan);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", "Create Menu Plan", "menu_plans", newId, null, newPlan);

  res.status(201).json({ success: true, message: "Menu plan berhasil dibuat.", data: newPlan });
});

// Update Menu Plan whole structure (for Autosave, components, weight modifications)
app.put('/api/v1/menu-plans/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.menu_plans.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Menu plan tidak ditemukan." });
  }

  // Ensure lock if already finalized (BR-13)
  if (db.menu_plans[idx].status === MenuStatus.FINAL && req.body.status !== MenuStatus.DRAFT) {
    return res.status(409).json({ success: false, message: "Menu plan sudah final dan terkunci untuk pengeditan." });
  }

  const old = JSON.parse(JSON.stringify(db.menu_plans[idx]));
  const updated: MenuPlan = {
    ...db.menu_plans[idx],
    ...req.body,
    id, // preserve id
    updated_at: new Date().toISOString()
  };

  // Recalculate everything inside upon save just to verify calculations
  if (updated.components) {
    updated.components.forEach(comp => {
      comp.items.forEach(item => {
        const ing = db.ingredients.find(i => i.id === item.ingredient_id);
        if (ing) {
          const nut = calculateNutrition(ing, item.net_weight);
          item.bdd = ing.bdd;
          item.gross_weight = nut.gross_weight;
          item.energy = nut.energy;
          item.protein = nut.protein;
          item.fat = nut.fat;
          item.carbohydrate = nut.carbohydrate;
          item.fiber = nut.fiber;
          item.ingredient_cost = nut.ingredient_cost;
        }
      });
    });
  }

  recalculateMenuPlanAggregates(updated);
  db.menu_plans[idx] = updated;
  await saveDb(db);

  // We only audit actual status changes or heavy mutations to prevent log flooding during active auto-saves
  if (old.status !== updated.status || old.menu_name !== updated.menu_name) {
    logAudit(currentUser!.id, currentUser!.name, "Planning", `Update Menu status to ${updated.status}`, "menu_plans", id);
  }

  res.json({ success: true, message: "Menu plan berhasil diperbarui.", data: updated });
});

// Finalize Menu Plan (BR-13)
app.post('/api/v1/menu-plans/:id/finalize', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.menu_plans.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Menu plan tidak ditemukan." });
  }

  db.menu_plans[idx].status = MenuStatus.FINAL;
  db.menu_plans[idx].updated_at = new Date().toISOString();
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", "Finalize Menu Plan", "menu_plans", id);

  res.json({ success: true, message: "Menu berhasil difinalisasi.", data: db.menu_plans[idx] });
});

// Unfinalize Menu Plan (set back to Draft)
app.post('/api/v1/menu-plans/:id/draft', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.menu_plans.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Menu plan tidak ditemukan." });
  }

  db.menu_plans[idx].status = MenuStatus.DRAFT;
  db.menu_plans[idx].updated_at = new Date().toISOString();
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", "Change Menu Status to Draft", "menu_plans", id);

  res.json({ success: true, message: "Menu dikembalikan ke status Draft.", data: db.menu_plans[idx] });
});

// Copy Menu Plan from another group on same day (BR-023, BR-024)
app.post('/api/v1/menu-plans/:id/copy-group', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id); // Menu Plan ID to copy into
  const { source_menu_plan_id } = req.body;

  if (!source_menu_plan_id) {
    return res.status(422).json({ success: false, message: "Source menu plan wajib ditentukan." });
  }

  const db = getDb();
  const targetIdx = db.menu_plans.findIndex(p => p.id === targetId);
  const source = db.menu_plans.find(p => p.id === Number(source_menu_plan_id));

  if (targetIdx === -1 || !source) {
    return res.status(404).json({ success: false, message: "Menu plan target atau sumber tidak ditemukan." });
  }

  if (db.menu_plans[targetIdx].status === MenuStatus.FINAL) {
    return res.status(409).json({ success: false, message: "Menu plan target sudah final." });
  }

  // Clone components and items deeply with new plan id reference
  const clonedComponents: MenuPlanComponent[] = (source.components || []).map((c, cIdx) => {
    return {
      id: cIdx + 1,
      menu_plan_id: targetId,
      component_id: c.component_id,
      name: c.name,
      sort_order: c.sort_order,
      items: c.items.map((it, itIdx) => {
        return {
          ...it,
          id: (cIdx + 1) * 100 + itIdx,
          component_plan_id: cIdx + 1
        };
      })
    };
  });

  db.menu_plans[targetIdx].menu_name = source.menu_name;
  db.menu_plans[targetIdx].components = clonedComponents;
  db.menu_plans[targetIdx].library_menu_id = source.library_menu_id;
  recalculateMenuPlanAggregates(db.menu_plans[targetIdx]);
  db.menu_plans[targetIdx].updated_at = new Date().toISOString();

  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", `Copy Menu from Group ID ${source.beneficiary_group_id}`, "menu_plans", targetId);

  res.json({ success: true, message: "Menu berhasil disalin.", data: db.menu_plans[targetIdx] });
});

// Copy Menu Plan from library template (BR-023, BR-024)
app.post('/api/v1/menu-plans/:id/copy-library', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id); // Menu Plan ID to copy into
  const { library_menu_id } = req.body;

  if (!library_menu_id) {
    return res.status(422).json({ success: false, message: "Library menu wajib ditentukan." });
  }

  const db = getDb();
  const targetIdx = db.menu_plans.findIndex(p => p.id === targetId);
  const libMenu = db.library_menus.find(m => m.id === Number(library_menu_id));

  if (targetIdx === -1 || !libMenu) {
    return res.status(404).json({ success: false, message: "Menu plan target atau library menu tidak ditemukan." });
  }

  if (db.menu_plans[targetIdx].status === MenuStatus.FINAL) {
    return res.status(409).json({ success: false, message: "Menu plan target sudah final." });
  }

  // Cloned components and items with new plan id reference
  const clonedComponents: MenuPlanComponent[] = (libMenu.components || []).map((c, cIdx) => {
    return {
      id: cIdx + 1,
      menu_plan_id: targetId,
      component_id: c.component_id,
      name: c.name,
      sort_order: cIdx,
      items: (c.items || []).map((it, itIdx) => {
        const ing = db.ingredients.find(i => i.id === it.ingredient_id)!;
        const defaultGramasi = 50; // default baseline gramasi
        const nut = calculateNutrition(ing, defaultGramasi);

        return {
          id: (cIdx + 1) * 100 + itIdx,
          component_plan_id: cIdx + 1,
          ingredient_id: ing.id,
          name: ing.name,
          code: ing.code,
          net_weight: defaultGramasi,
          bdd: ing.bdd,
          gross_weight: nut.gross_weight,
          energy: nut.energy,
          protein: nut.protein,
          fat: nut.fat,
          carbohydrate: nut.carbohydrate,
          fiber: nut.fiber,
          ingredient_cost: nut.ingredient_cost
        };
      })
    };
  });

  db.menu_plans[targetIdx].components = clonedComponents;
  db.menu_plans[targetIdx].library_menu_id = libMenu.id;
  recalculateMenuPlanAggregates(db.menu_plans[targetIdx]);
  db.menu_plans[targetIdx].updated_at = new Date().toISOString();

  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", `Copy Menu from Library ID ${libMenu.id}`, "menu_plans", targetId);

  res.json({ success: true, message: "Menu berhasil disalin dari library.", data: db.menu_plans[targetIdx] });
});

app.delete('/api/v1/menu-plans/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.menu_plans.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Menu plan tidak ditemukan." });
  }

  const deleted = db.menu_plans[idx];
  db.menu_plans.splice(idx, 1);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Planning", "Delete Menu Plan", "menu_plans", id, deleted, null);

  res.json({ success: true, message: "Menu plan berhasil dihapus." });
});


// ==========================================
// PROCUREMENT APIs (BR-11, BR-12, BR-13)
// ==========================================
app.get('/api/v1/procurement-orders', requireAuth, (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.procurement_orders });
});

app.get('/api/v1/procurement-orders/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const order = db.procurement_orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
  }
  res.json({ success: true, data: order });
});

// Generate/Initialize a procurement list by combining all ingredients of Finalized MenuPlans of a Day
app.post('/api/v1/procurement-orders/:id/generate', requireAuth, async (req, res) => {
  const orderId = Number(req.params.id);
  const { period_id, menu_day_id } = req.body;

  if (!period_id || !menu_day_id) {
    return res.status(422).json({ success: false, message: "Periode dan Hari Menu wajib diisi." });
  }

  const db = getDb();

  // 1. Gather all menu plans for that specific menu day
  const plans = db.menu_plans.filter(p => p.menu_day_id === Number(menu_day_id));
  if (plans.length === 0) {
    return res.status(400).json({ success: false, message: "Belum ada Menu Planning yang dibuat untuk Hari Menu tersebut." });
  }

  // Check if at least some are Finalized?
  // In our flexible preview, we allow generating even if draft, but throw warning. Let's make it easy to work with.

  // 2. Aggregate all ingredients from all plans (BR-11)
  // Kebutuhan (kg) = Berat Kotor * Jumlah Penerima / 1000 (BR-008)
  const aggregated: { [ingredientId: number]: { calculated_qty: number } } = {};

  plans.forEach(plan => {
    const group = db.beneficiary_groups.find(g => g.id === plan.beneficiary_group_id);
    const count = group ? group.beneficiary_count : 1;

    if (plan.components) {
      plan.components.forEach(comp => {
        comp.items.forEach(item => {
          const ingId = item.ingredient_id;
          const grossWeight = item.gross_weight || 0; // gross weight per portion in grams
          const portionKebutuhanKg = (grossWeight * count) / 1000;

          if (!aggregated[ingId]) {
            aggregated[ingId] = { calculated_qty: 0 };
          }
          aggregated[ingId].calculated_qty += portionKebutuhanKg;
        });
      });
    }
  });

  // 3. Build ProcurementItems list
  const pItems: ProcurementItem[] = Object.keys(aggregated).map((ingIdStr, idx) => {
    const ingId = Number(ingIdStr);
    const ing = db.ingredients.find(i => i.id === ingId)!;
    const calcQty = Math.round(aggregated[ingId].calculated_qty * 100) / 100;

    return {
      id: idx + 1,
      procurement_order_id: orderId,
      ingredient_id: ingId,
      name: ing.name,
      code: ing.code,
      calculated_quantity: calcQty,
      purchase_unit: "kg",
      actual_quantity: calcQty, // defaults to calculated qty (BR-11)
      unit_price: ing.price,
      subtotal: Math.round(calcQty * ing.price)
    };
  });

  // Check if order already exists
  const existingIdx = db.procurement_orders.findIndex(o => o.id === orderId);
  const totalCost = pItems.reduce((acc, it) => acc + it.subtotal, 0);

  const orderDay = db.menu_days.find(d => d.id === Number(menu_day_id));

  const newOrder: ProcurementOrder = {
    id: orderId,
    period_id: Number(period_id),
    menu_day_id: Number(menu_day_id),
    order_date: orderDay ? orderDay.calendar_date : new Date().toISOString().split('T')[0],
    status: ProcurementStatus.DRAFT,
    total_cost: totalCost,
    items: pItems,
    manual_items: existingIdx !== -1 && db.procurement_orders[existingIdx].manual_items
      ? db.procurement_orders[existingIdx].manual_items
      : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    db.procurement_orders[existingIdx] = newOrder;
  } else {
    db.procurement_orders.push(newOrder);
  }

  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Procurement", `Generate Procurement Order x${pItems.length} items`, "procurement_orders", orderId);

  res.json({ success: true, message: "Daftar pesanan bahan berhasil digenerate otomatis.", data: newOrder });
});

// Save whole procurement state (items, manual bumbu items, actual quantities)
app.put('/api/v1/procurement-orders/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.procurement_orders.findIndex(o => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
  }

  const old = JSON.parse(JSON.stringify(db.procurement_orders[idx]));
  const updated: ProcurementOrder = {
    ...db.procurement_orders[idx],
    ...req.body,
    id,
    updated_at: new Date().toISOString()
  };

  // Recalculate totals
  let cost = 0;
  if (updated.items) {
    updated.items.forEach(it => {
      it.subtotal = Math.round(it.actual_quantity * it.unit_price);
      cost += it.subtotal;
    });
  }
  if (updated.manual_items) {
    updated.manual_items.forEach(it => {
      it.subtotal = Math.round(it.quantity * it.unit_price);
      cost += it.subtotal;
    });
  }

  updated.total_cost = cost;
  db.procurement_orders[idx] = updated;
  await saveDb(db);

  res.json({ success: true, message: "Pesanan berhasil disimpan.", data: updated });
});

// Finalize Procurement Order
app.post('/api/v1/procurement-orders/:id/finalize', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.procurement_orders.findIndex(o => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
  }

  db.procurement_orders[idx].status = ProcurementStatus.FINAL;
  db.procurement_orders[idx].updated_at = new Date().toISOString();
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Procurement", "Finalize Procurement Order", "procurement_orders", id);

  res.json({ success: true, message: "Daftar pesanan berhasil difinalisasi.", data: db.procurement_orders[idx] });
});

// Unlock Procurement Order & Clear Saved Items to avoid duplicates (BR-12, Edit Action)
app.post('/api/v1/procurement-orders/:id/unlock', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.procurement_orders.findIndex(o => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
  }

  db.procurement_orders[idx].status = ProcurementStatus.DRAFT;
  db.procurement_orders[idx].items = [];
  db.procurement_orders[idx].manual_items = [];
  db.procurement_orders[idx].total_cost = 0;
  db.procurement_orders[idx].updated_at = new Date().toISOString();
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Procurement", "Unlock Procurement Order & Clear Saved Items", "procurement_orders", id);

  res.json({ success: true, message: "Kunci pesanan dibuka dan data lama dibersihkan. Silakan muat ulang atau simpan kembali.", data: db.procurement_orders[idx] });
});

app.delete('/api/v1/procurement-orders/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const idx = db.procurement_orders.findIndex(o => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
  }

  const deleted = db.procurement_orders[idx];
  db.procurement_orders.splice(idx, 1);
  await saveDb(db);

  logAudit(currentUser!.id, currentUser!.name, "Procurement", "Delete Procurement Order", "procurement_orders", id, deleted, null);

  res.json({ success: true, message: "Pesanan berhasil dihapus." });
});


// ==========================================
// SYSTEM AUDIT LOG APIs
// ==========================================
app.get('/api/v1/audit-logs', requireAuth, (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.audit_logs });
});

app.get('/api/v1/supabase-status', async (req, res) => {
  let storeOk = false;
  let ingredientsOk = false;
  let ingredientsRlsError = false;
  let errorMessage = '';

  try {
    // Check gzq_db_store table
    const { error: storeError } = await supabase
      .from('gzq_db_store')
      .select('id')
      .limit(1);
    storeOk = !storeError;
    if (storeError) {
      errorMessage = storeError.message;
    }

    // Check ingredients table readability
    const { error: ingReadError } = await supabase
      .from('ingredients')
      .select('id')
      .limit(1);

    if (ingReadError) {
      errorMessage = errorMessage || ingReadError.message;
    } else {
      // Check ingredients table writeability by testing an upsert with dummy ID 0
      const testItem = {
        id: 0,
        code: 'TEMP_RLS_CHECK',
        category_id: 1,
        name: 'RLS Check Temp Item',
        bdd: 100,
        energy: 0,
        protein: 0,
        fat: 0,
        carbohydrate: 0,
        fiber: 0,
        price: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error: ingWriteError } = await supabase
        .from('ingredients')
        .upsert([testItem]);

      if (ingWriteError) {
        errorMessage = ingWriteError.message;
        if (ingWriteError.code === '42501' || ingWriteError.message.includes('row-level security') || ingWriteError.message.includes('policy')) {
          ingredientsRlsError = true;
        }
      } else {
        ingredientsOk = true;
        // Clean up
        await supabase.from('ingredients').delete().eq('id', 0);
      }
    }
  } catch (err: any) {
    errorMessage = err.message || 'Unknown error';
  }

  res.json({
    success: true,
    projectUrl: process.env.SUPABASE_URL || 'https://bvzvydkasblggorengus.supabase.co',
    projectId: 'bvzvydkasblggorengus',
    connected: storeOk,
    storeOk,
    ingredientsOk,
    ingredientsRlsError,
    errorMessage
  });
});

// Global error handler middleware to catch backend runtime exceptions
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express Global Error Handler caught an exception:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Terjadi kesalahan internal pada server.",
    error: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});


// ==========================================
// VITE AND DEVELOPMENT SETUP
// ==========================================
async function startServer() {
  // Sync DB with Supabase on startup
  try {
    await syncFromSupabase();
  } catch (err) {
    console.error("Supabase sync on startup failed:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only auto-start standalone server when NOT running inside Netlify Serverless Functions
if (!process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT && !process.env.VERCEL) {
  startServer();
}

export { app };

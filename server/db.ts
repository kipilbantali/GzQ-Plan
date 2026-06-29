/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  User,
  UserRole,
  UserStatus,
  BeneficiaryGroup,
  Ingredient,
  LibraryMenu,
  Period,
  PeriodStatus,
  MenuDay,
  MenuPlan,
  MenuStatus,
  ProcurementOrder,
  ProcurementStatus,
  AuditLog,
  ProcurementItem,
  ProcurementManualItem
} from '../src/types';

const supabaseUrl = process.env.SUPABASE_URL || 'https://bvzvydkasblggorengus.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2enZ5ZGthc2JsZ2dvcmVuZ3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MjM1NzYsImV4cCI6MjA5ODE5OTU3Nn0.RNUGX4IrmNt5_Y-GlsHHGgJZE4OuBlMWLhQb2Z4gdjw';

export const supabase = createClient(supabaseUrl, supabaseKey);

interface DatabaseSchema {
  users: User[];
  beneficiary_groups: BeneficiaryGroup[];
  ingredients: Ingredient[];
  library_menus: LibraryMenu[];
  periods: Period[];
  menu_days: MenuDay[];
  menu_plans: MenuPlan[];
  procurement_orders: ProcurementOrder[];
  audit_logs: AuditLog[];
}

export const isServerless = !!(process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT || process.env.VERCEL);
const DB_FILE_PATH = (process.env.NODE_ENV === 'production' || isServerless)
  ? '/tmp/gzq_db.json' 
  : path.join(process.cwd(), 'gzq_db.json');

const WORKSPACE_DB_PATH = path.join(process.cwd(), 'gzq_db.json');

let lastSyncedAt: string | null = null;

export async function ensureDbSynced() {
  try {
    // 1. Check the updated_at in Supabase gzq_db_store
    const { data, error } = await supabase
      .from('gzq_db_store')
      .select('updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn("Could not check updated_at on Supabase:", error.message);
      // Fallback: if local file doesn't exist, run full sync anyway
      if (!fs.existsSync(DB_FILE_PATH)) {
        await syncFromSupabase();
      }
      return;
    }

    const remoteUpdatedAt = data?.updated_at || null;

    // 2. If remote has a different updated_at, or if local file doesn't exist, we must sync
    if (!fs.existsSync(DB_FILE_PATH) || remoteUpdatedAt !== lastSyncedAt || !lastSyncedAt) {
      console.log(`Local database is stale or missing (Local: ${lastSyncedAt}, Remote: ${remoteUpdatedAt}). Syncing...`);
      await syncFromSupabase();
      if (remoteUpdatedAt) {
        lastSyncedAt = remoteUpdatedAt;
      }
    }
  } catch (err) {
    console.error("Failed to sync from Supabase in ensureDbSynced:", err);
  }
}



// Preseeded data
const defaultUsers: User[] = [
  {
    id: 1,
    name: "System Admin",
    username: "admin",
    email: "admin@gzqplan.com",
    role: UserRole.ADMINISTRATOR,
    status: UserStatus.ACTIVE,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Pengawas Gizi",
    username: "pengawas",
    email: "pengawas@gzqplan.com",
    role: UserRole.PENGAWAS_GIZI,
    status: UserStatus.ACTIVE,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultBeneficiaryGroups: BeneficiaryGroup[] = [
  {
    id: 1,
    name: "Balita",
    beneficiary_count: 50,
    hpp_limit: 15000,
    energy_min: 1350,
    energy_max: 1450,
    protein_min: 35,
    protein_max: 45,
    fat_min: 40,
    fat_max: 50,
    carbohydrate_min: 180,
    carbohydrate_max: 220,
    fiber_min: 15,
    fiber_max: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "PAUD / TK / SD Kelas 1-3",
    beneficiary_count: 80,
    hpp_limit: 18000,
    energy_min: 1600,
    energy_max: 1700,
    protein_min: 45,
    protein_max: 55,
    fat_min: 50,
    fat_max: 60,
    carbohydrate_min: 220,
    carbohydrate_max: 250,
    fiber_min: 20,
    fiber_max: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "SD Kelas 4-6 / SMP",
    beneficiary_count: 120,
    hpp_limit: 22000,
    energy_min: 2000,
    energy_max: 2100,
    protein_min: 60,
    protein_max: 70,
    fat_min: 60,
    fat_max: 70,
    carbohydrate_min: 280,
    carbohydrate_max: 320,
    fiber_min: 25,
    fiber_max: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    name: "Ibu Hamil / Menyusui",
    beneficiary_count: 30,
    hpp_limit: 25000,
    energy_min: 2400,
    energy_max: 2600,
    protein_min: 75,
    protein_max: 85,
    fat_min: 70,
    fat_max: 80,
    carbohydrate_min: 340,
    carbohydrate_max: 380,
    fiber_min: 30,
    fiber_max: 35,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// TKPI Ingredients Database
const defaultIngredients: Ingredient[] = [
  // Makanan Pokok
  { id: 1, code: "A01", category_id: 1, name: "Beras Giling", bdd: 100, energy: 360, protein: 6.8, fat: 0.7, carbohydrate: 78.9, fiber: 0.3, price: 14000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, code: "A02", category_id: 1, name: "Kentang", bdd: 85, energy: 62, protein: 2.1, fat: 0.2, carbohydrate: 13.5, fiber: 0.5, price: 18000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, code: "A03", category_id: 1, name: "Singkong", bdd: 75, energy: 154, protein: 1.2, fat: 0.3, carbohydrate: 36.8, fiber: 0.9, price: 8000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Lauk Hewani
  { id: 4, code: "B01", category_id: 2, name: "Daging Ayam (dengan kulit)", bdd: 58, energy: 298, protein: 18.2, fat: 25.0, carbohydrate: 0.0, fiber: 0.0, price: 38000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 5, code: "B02", category_id: 2, name: "Daging Sapi Sedang", bdd: 100, energy: 249, protein: 17.5, fat: 19.1, carbohydrate: 0.0, fiber: 0.0, price: 125000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 6, code: "B03", category_id: 2, name: "Telur Ayam Ras", bdd: 87, energy: 154, protein: 12.4, fat: 10.8, carbohydrate: 0.7, fiber: 0.0, price: 26000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 7, code: "B04", category_id: 2, name: "Ikan Kembung Segar", bdd: 80, energy: 112, protein: 21.4, fat: 2.3, carbohydrate: 0.0, fiber: 0.0, price: 35000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 8, code: "B05", category_id: 2, name: "Udang Segar", bdd: 68, energy: 91, protein: 21.0, fat: 0.2, carbohydrate: 0.1, fiber: 0.0, price: 80000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Lauk Nabati
  { id: 9, code: "C01", category_id: 3, name: "Tempe Kedelai Murni", bdd: 100, energy: 150, protein: 14.0, fat: 7.7, carbohydrate: 9.1, fiber: 1.4, price: 12000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 10, code: "C02", category_id: 3, name: "Tahu Putih", bdd: 100, energy: 68, protein: 7.8, fat: 4.6, carbohydrate: 1.6, fiber: 0.1, price: 10000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 11, code: "C03", category_id: 3, name: "Kacang Hijau Kupas", bdd: 100, energy: 345, protein: 22.2, fat: 1.5, carbohydrate: 62.9, fiber: 4.1, price: 24000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Sayuran
  { id: 12, code: "D01", category_id: 4, name: "Wortel Segar", bdd: 88, energy: 26, protein: 1.0, fat: 0.6, carbohydrate: 4.8, fiber: 0.9, price: 15000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 13, code: "D02", category_id: 4, name: "Bayam Segar", bdd: 71, energy: 16, protein: 0.9, fat: 0.4, carbohydrate: 2.9, fiber: 0.7, price: 8000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 14, code: "D03", category_id: 4, name: "Kangkung Segar", bdd: 70, energy: 15, protein: 3.4, fat: 0.7, carbohydrate: 3.9, fiber: 2.0, price: 7000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 15, code: "D04", category_id: 4, name: "Labu Siam", bdd: 83, energy: 26, protein: 0.6, fat: 0.1, carbohydrate: 6.7, fiber: 1.0, price: 10000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 16, code: "D05", category_id: 4, name: "Kol / Kubis", bdd: 90, energy: 22, protein: 1.4, fat: 0.2, carbohydrate: 5.3, fiber: 1.3, price: 9000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Buah
  { id: 17, code: "E01", category_id: 5, name: "Pisang Ambon", bdd: 75, energy: 108, protein: 1.0, fat: 0.2, carbohydrate: 24.3, fiber: 1.9, price: 16000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 18, code: "E02", category_id: 5, name: "Pepaya Matang", bdd: 75, energy: 46, protein: 0.5, fat: 0.0, carbohydrate: 12.2, fiber: 1.6, price: 8000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 19, code: "E03", category_id: 5, name: "Apel Fuji", bdd: 88, energy: 58, protein: 0.3, fat: 0.4, carbohydrate: 14.9, fiber: 2.6, price: 35000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 20, code: "E04", category_id: 5, name: "Jeruk Manis", bdd: 72, energy: 44, protein: 0.9, fat: 0.2, carbohydrate: 11.2, fiber: 1.4, price: 22000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 21, code: "E05", category_id: 5, name: "Semangka", bdd: 46, energy: 28, protein: 0.5, fat: 0.2, carbohydrate: 6.9, fiber: 0.4, price: 7000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Susu
  { id: 22, code: "F01", category_id: 6, name: "Susu Sapi Segar", bdd: 100, energy: 61, protein: 3.2, fat: 3.5, carbohydrate: 4.3, fiber: 0.0, price: 20000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 23, code: "F02", category_id: 6, name: "Susu Tepung Full Cream", bdd: 100, energy: 509, protein: 24.6, fat: 27.0, carbohydrate: 38.0, fiber: 0.0, price: 95000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const defaultLibraryMenus: LibraryMenu[] = [
  {
    id: 1,
    menu_name: "Paket Menu Sehat A",
    description: "Nasi Putih dengan Ayam Goreng, Tempe Bacem, Sop Wortel-Kentang, Pisang Ambon, dan Susu Segar.",
    created_by: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    components: [
      { id: 1, component_id: 1, name: "Makanan Pokok", items: [{ id: 1, ingredient_id: 1, name: "Beras Giling", code: "A01" }] },
      { id: 2, component_id: 2, name: "Lauk Hewani", items: [{ id: 2, ingredient_id: 4, name: "Daging Ayam (dengan kulit)", code: "B01" }] },
      { id: 3, component_id: 3, name: "Lauk Nabati", items: [{ id: 3, ingredient_id: 9, name: "Tempe Kedelai Murni", code: "C01" }] },
      { id: 4, component_id: 4, name: "Sayur", items: [
        { id: 4, ingredient_id: 12, name: "Wortel Segar", code: "D01" },
        { id: 5, ingredient_id: 2, name: "Kentang", code: "A02" }
      ]},
      { id: 5, component_id: 5, name: "Buah", items: [{ id: 6, ingredient_id: 17, name: "Pisang Ambon", code: "E01" }] },
      { id: 6, component_id: 6, name: "Susu", items: [{ id: 7, ingredient_id: 22, name: "Susu Sapi Segar", code: "F01" }] }
    ]
  },
  {
    id: 2,
    menu_name: "Menu Ikan Goreng Mentega",
    description: "Nasi Putih, Ikan Kembung Mentega, Tahu Goreng, Cah Kangkung, Jeruk Manis, dan Susu.",
    created_by: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    components: [
      { id: 7, component_id: 1, name: "Makanan Pokok", items: [{ id: 8, ingredient_id: 1, name: "Beras Giling", code: "A01" }] },
      { id: 8, component_id: 2, name: "Lauk Hewani", items: [{ id: 9, ingredient_id: 7, name: "Ikan Kembung Segar", code: "B04" }] },
      { id: 9, component_id: 3, name: "Lauk Nabati", items: [{ id: 10, ingredient_id: 10, name: "Tahu Putih", code: "C02" }] },
      { id: 10, component_id: 4, name: "Sayur", items: [{ id: 11, ingredient_id: 14, name: "Kangkung Segar", code: "D03" }] },
      { id: 11, component_id: 5, name: "Buah", items: [{ id: 12, ingredient_id: 20, name: "Jeruk Manis", code: "E04" }] },
      { id: 12, component_id: 6, name: "Susu", items: [{ id: 13, ingredient_id: 22, name: "Susu Sapi Segar", code: "F01" }] }
    ]
  },
  {
    id: 3,
    menu_name: "Bubur Bayi Halus",
    description: "Khusus Balita: Bubur Beras halus dengan Kukusan Fillet Ayam, Tahu Lembut, Wortel Serut, Pepaya, dan Susu Tepung.",
    created_by: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    components: [
      { id: 13, component_id: 1, name: "Makanan Pokok", items: [{ id: 14, ingredient_id: 1, name: "Beras Giling", code: "A01" }] },
      { id: 14, component_id: 2, name: "Lauk Hewani", items: [{ id: 15, ingredient_id: 4, name: "Daging Ayam (dengan kulit)", code: "B01" }] },
      { id: 15, component_id: 3, name: "Lauk Nabati", items: [{ id: 16, ingredient_id: 10, name: "Tahu Putih", code: "C02" }] },
      { id: 16, component_id: 4, name: "Sayur", items: [{ id: 17, ingredient_id: 12, name: "Wortel Segar", code: "D01" }] },
      { id: 17, component_id: 5, name: "Buah", items: [{ id: 18, ingredient_id: 18, name: "Pepaya Matang", code: "E02" }] },
      { id: 18, component_id: 6, name: "Susu", items: [{ id: 19, ingredient_id: 23, name: "Susu Tepung Full Cream", code: "F02" }] }
    ]
  }
];

export function getDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE_PATH)) {
    // If the active DB file doesn't exist, check if we have a committed gzq_db.json in the workspace to clone as baseline
    if (fs.existsSync(WORKSPACE_DB_PATH) && DB_FILE_PATH !== WORKSPACE_DB_PATH) {
      try {
        console.log(`Cloning baseline database from workspace (${WORKSPACE_DB_PATH}) to active cache (${DB_FILE_PATH})...`);
        const content = fs.readFileSync(WORKSPACE_DB_PATH, 'utf-8');
        // Validate JSON before writing
        JSON.parse(content); 
        fs.writeFileSync(DB_FILE_PATH, content, 'utf-8');
      } catch (copyErr) {
        console.error("Failed to copy workspace baseline DB file, will generate fresh copy instead:", copyErr);
      }
    }
  }

  if (!fs.existsSync(DB_FILE_PATH)) {
    // Generate initial period on startup
    const start = new Date("2026-07-01");
    const end = new Date("2026-07-14");
    const initialPeriod: Period = {
      id: 1,
      name: "Periode Operasional Juli 2026",
      start_date: "2026-07-01",
      end_date: "2026-07-14",
      status: PeriodStatus.DRAFT,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Pre-generate menu days excluding Sundays (BR-001)
    const menuDays: MenuDay[] = [];
    let dayNum = 1;
    for (let i = 0; i < 14; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const isSunday = current.getDay() === 0;

      menuDays.push({
        id: i + 1,
        period_id: 1,
        day_number: isSunday ? 0 : dayNum,
        calendar_date: current.toISOString().split('T')[0],
        distribution_day: !isSunday,
        status: isSunday ? "Holiday" : "Pending"
      });

      if (!isSunday) {
        dayNum++;
      }
    }

    const initialDb: DatabaseSchema = {
      users: defaultUsers,
      beneficiary_groups: defaultBeneficiaryGroups,
      ingredients: defaultIngredients,
      library_menus: defaultLibraryMenus,
      periods: [initialPeriod],
      menu_days: menuDays,
      menu_plans: [],
      procurement_orders: [],
      audit_logs: [
        {
          id: 1,
          user_id: 1,
          user_name: "System Admin",
          module: "Authentication",
          action: "Initialize DB",
          table_name: "users",
          ip_address: "127.0.0.1",
          user_agent: "Server Startup",
          created_at: new Date().toISOString()
        }
      ]
    };

    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    
    let dataRepaired = false;
    if (!data.users || !Array.isArray(data.users) || data.users.length === 0) {
      data.users = defaultUsers;
      dataRepaired = true;
    }
    if (!data.beneficiary_groups || !Array.isArray(data.beneficiary_groups) || data.beneficiary_groups.length === 0) {
      data.beneficiary_groups = defaultBeneficiaryGroups;
      dataRepaired = true;
    }
    if (!data.ingredients || !Array.isArray(data.ingredients) || data.ingredients.length === 0) {
      data.ingredients = defaultIngredients;
      dataRepaired = true;
    }
    if (!data.library_menus || !Array.isArray(data.library_menus) || data.library_menus.length === 0) {
      data.library_menus = defaultLibraryMenus;
      dataRepaired = true;
    }
    if (!data.periods || !Array.isArray(data.periods) || data.periods.length === 0) {
      const start = new Date("2026-07-01");
      const initialPeriod: Period = {
        id: 1,
        name: "Periode Operasional Juli 2026",
        start_date: "2026-07-01",
        end_date: "2026-07-14",
        status: PeriodStatus.DRAFT,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      data.periods = [initialPeriod];
      
      const menuDays: MenuDay[] = [];
      let dayNum = 1;
      for (let i = 0; i < 14; i++) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        const isSunday = current.getDay() === 0;

        menuDays.push({
          id: i + 1,
          period_id: 1,
          day_number: isSunday ? 0 : dayNum,
          calendar_date: current.toISOString().split('T')[0],
          distribution_day: !isSunday,
          status: isSunday ? "Holiday" : "Pending"
        });

        if (!isSunday) {
          dayNum++;
        }
      }
      data.menu_days = menuDays;
      dataRepaired = true;
    }
    if (!data.menu_plans || !Array.isArray(data.menu_plans)) {
      data.menu_plans = [];
      dataRepaired = true;
    }
    if (!data.procurement_orders || !Array.isArray(data.procurement_orders)) {
      data.procurement_orders = [];
      dataRepaired = true;
    }
    if (!data.audit_logs || !Array.isArray(data.audit_logs)) {
      data.audit_logs = [];
      dataRepaired = true;
    }

    if (dataRepaired) {
      console.log("Database missing crucial fields, automatically repaired with default/empty baseline.");
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      saveToSupabase(data).catch(() => {});
    }

    // Auto-migration for renaming "Balita (1-5 Tahun)" to "Balita"
    let migratedName = false;
    if (data) {
      if (Array.isArray(data.beneficiary_groups)) {
        data.beneficiary_groups.forEach((g: any) => {
          if (g.name === "Balita (1-5 Tahun)") {
            g.name = "Balita";
            migratedName = true;
          }
        });
      }
      if (Array.isArray(data.library_menus)) {
        data.library_menus.forEach((m: any) => {
          if (typeof m.menu_name === 'string' && m.menu_name.includes("Balita (1-5 Tahun)")) {
            m.menu_name = m.menu_name.replace("Balita (1-5 Tahun)", "Balita");
            migratedName = true;
          }
        });
      }
      if (Array.isArray(data.menu_plans)) {
        data.menu_plans.forEach((p: any) => {
          if (typeof p.menu_name === 'string' && p.menu_name.includes("Balita (1-5 Tahun)")) {
            p.menu_name = p.menu_name.replace("Balita (1-5 Tahun)", "Balita");
            migratedName = true;
          }
        });
      }
      if (migratedName) {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
        // Push the renamed data back to Supabase to keep it in sync
        saveToSupabase(data).catch(() => {});
      }
    }

    // Auto-repair empty components inside existing menu plans (restore baseline components structure)
    if (data && Array.isArray(data.menu_plans)) {
      let migrated = false;
      data.menu_plans.forEach((p: any) => {
        if (!p.components || !Array.isArray(p.components) || p.components.length === 0) {
          p.components = [
            { id: 1, menu_plan_id: p.id, component_id: 1, name: "Makanan Pokok", sort_order: 0, items: [] },
            { id: 2, menu_plan_id: p.id, component_id: 2, name: "Lauk Hewani", sort_order: 1, items: [] },
            { id: 3, menu_plan_id: p.id, component_id: 3, name: "Lauk Nabati", sort_order: 2, items: [] },
            { id: 4, menu_plan_id: p.id, component_id: 4, name: "Sayur", sort_order: 3, items: [] },
            { id: 5, menu_plan_id: p.id, component_id: 5, name: "Buah", sort_order: 4, items: [] },
            { id: 6, menu_plan_id: p.id, component_id: 6, name: "Susu", sort_order: 5, items: [] }
          ];
          migrated = true;
        }
      });
      if (migrated) {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      }
    }
    
    return data;
  } catch (err) {
    console.error("Failed to read database file, returning fresh copy", err);
    return {
      users: defaultUsers,
      beneficiary_groups: defaultBeneficiaryGroups,
      ingredients: defaultIngredients,
      library_menus: defaultLibraryMenus,
      periods: [],
      menu_days: [],
      menu_plans: [],
      procurement_orders: [],
      audit_logs: []
    };
  }
}

export async function saveToSupabase(data: DatabaseSchema) {
  try {
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from('gzq_db_store')
      .upsert({ id: 1, data: data, updated_at: timestamp });
    if (error) {
      console.error("CRITICAL Supabase Sync Error (table gzq_db_store):", error.message, error);
    } else {
      console.log("Database state successfully synchronized with Supabase table gzq_db_store.");
      lastSyncedAt = timestamp; // Prevent thinking we are stale on the next read of the same lambda
    }
  } catch (err) {
    console.error("Exception saving to Supabase gzq_db_store:", err);
  }
}

export async function saveIngredientsToSupabase(ingredients: Ingredient[]) {
  try {
    const { error } = await supabase
      .from('ingredients')
      .upsert(ingredients.map(i => ({
        id: i.id,
        code: i.code,
        category_id: i.category_id,
        name: i.name,
        bdd: i.bdd,
        energy: i.energy,
        protein: i.protein,
        fat: i.fat,
        carbohydrate: i.carbohydrate,
        fiber: i.fiber,
        price: i.price,
        created_at: i.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: i.deleted_at || null
      })));
    if (error) {
      console.error("CRITICAL Supabase Sync Error (table ingredients):", error.message, error);
    } else {
      console.log(`Successfully synced ${ingredients.length} ingredients with Supabase ingredients table.`);
    }
  } catch (err) {
    console.error("Exception saving to Supabase ingredients table:", err);
  }
}

export async function syncIngredientsFromSupabase() {
  try {
    console.log("Checking for real ingredients table in Supabase...");
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      if (error.message.includes('relation "ingredients" does not exist')) {
        console.log("Table 'ingredients' does not exist yet on Supabase. Using baseline JSON ingredients.");
      } else {
        console.warn("Could not retrieve ingredients from Supabase:", error.message);
      }
      return;
    }

    if (data && data.length > 0) {
      console.log(`Found ${data.length} ingredients from Supabase! Synchronizing with local cache...`);
      const db = getDb();
      
      const mappedIngredients: Ingredient[] = data.map((item: any) => ({
        id: item.id,
        code: item.code,
        category_id: item.category_id || 1,
        name: item.name,
        bdd: Number(item.bdd) || 100,
        energy: Number(item.energy) || 0,
        protein: Number(item.protein) || 0,
        fat: Number(item.fat) || 0,
        carbohydrate: Number(item.carbohydrate) || 0,
        fiber: Number(item.fiber) || 0,
        price: Number(item.price) || 0,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        deleted_at: item.deleted_at || undefined
      }));
      
      db.ingredients = mappedIngredients.sort((a, b) => a.id - b.id);
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
      console.log("Successfully synchronized local ingredients cache with Supabase table!");
    }
  } catch (err) {
    console.error("Error during ingredients Supabase sync:", err);
  }
}

export async function syncFromSupabase() {
  try {
    console.log("Checking for database state on Supabase backend...");
    const { data, error } = await supabase
      .from('gzq_db_store')
      .select('data, updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn("Could not retrieve state from Supabase (maybe table 'gzq_db_store' is missing):", error.message);
      return;
    }

    if (data && data.data) {
      console.log("Existing database state found on Supabase! Synchronizing local file...");
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data.data, null, 2), 'utf-8');
      lastSyncedAt = data.updated_at || new Date().toISOString();
    } else {
      console.log("No existing database state on Supabase yet. Synchronizing local file as base state...");
      const baseline = getDb();
      await saveToSupabase(baseline);
    }

    // Try to sync from the dedicated 'ingredients' table if it exists
    await syncIngredientsFromSupabase();
  } catch (err) {
    console.error("Error during Supabase fetch:", err);
  }
}

export async function saveDb(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    // Await the push to Supabase to guarantee synchronization
    await saveToSupabase(data);
    await saveIngredientsToSupabase(data.ingredients);
  } catch (err) {
    console.error("Failed to write to database file", err);
  }
}

// Relational helper functions for GzQ Plan nutrition calculations

export function calculateNutrition(ingredient: Ingredient, netWeight: number) {
  const factor = netWeight / 100;
  // BDD formula (BR-007): gross = net * 100 / BDD
  const gross_weight = ingredient.bdd > 0 ? (netWeight * 100) / ingredient.bdd : 0;
  // Cost = gross_weight in kg * price per kg -> gross_weight/1000 * ingredient.price
  const ingredient_cost = (gross_weight / 1000) * ingredient.price;

  return {
    net_weight: netWeight,
    bdd: ingredient.bdd,
    gross_weight: Math.round(gross_weight * 100) / 100,
    energy: Math.round(ingredient.energy * factor * 10) / 10,
    protein: Math.round(ingredient.protein * factor * 10) / 10,
    fat: Math.round(ingredient.fat * factor * 10) / 10,
    carbohydrate: Math.round(ingredient.carbohydrate * factor * 10) / 10,
    fiber: Math.round(ingredient.fiber * factor * 10) / 10,
    ingredient_cost: Math.round(ingredient_cost)
  };
}

export function logAudit(userId: number, username: string, module: string, action: string, tableName: string, recordId?: number, oldValues?: any, newValues?: any) {
  const db = getDb();
  const log: AuditLog = {
    id: db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map(l => l.id)) + 1 : 1,
    user_id: userId,
    user_name: username,
    module,
    action,
    table_name: tableName,
    record_id: recordId,
    old_values: oldValues,
    new_values: newValues,
    ip_address: "127.0.0.1",
    user_agent: "GzQ Plan App Engine",
    created_at: new Date().toISOString()
  };
  db.audit_logs.unshift(log); // newest first
  saveDb(db);
}

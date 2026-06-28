/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMINISTRATOR = "Administrator",
  PENGAWAS_GIZI = "Pengawas Gizi"
}

export enum UserStatus {
  ACTIVE = "Active",
  INACTIVE = "Inactive"
}

export enum PeriodStatus {
  DRAFT = "Draft",
  FINAL = "Final"
}

export enum MenuStatus {
  DRAFT = "Draft",
  FINAL = "Final"
}

export enum ProcurementStatus {
  DRAFT = "Draft",
  FINAL = "Final"
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryGroup {
  id: number;
  name: string;
  beneficiary_count: number;
  hpp_limit: number;
  energy_min: number;
  energy_max: number;
  protein_min: number;
  protein_max: number;
  fat_min: number;
  fat_max: number;
  carbohydrate_min: number;
  carbohydrate_max: number;
  fiber_min: number;
  fiber_max: number;
  created_at: string;
  updated_at: string;
}

export interface IngredientCategory {
  id: number;
  name: string;
  description: string;
}

export interface Ingredient {
  id: number;
  code: string;
  category_id: number;
  name: string;
  bdd: number; // Berat Dapat Dimakan (e.g. 58 for chicken, 100 for rice)
  energy: number; // per 100g
  protein: number; // per 100g
  fat: number; // per 100g
  carbohydrate: number; // per 100g
  fiber: number; // per 100g
  price: number; // Price per kg (used as standard HPP baseline)
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface MenuComponent {
  id: number;
  name: string; // Makanan Pokok, Lauk Hewani, Lauk Nabati, Sayur, Buah, Susu
}

export interface LibraryMenu {
  id: number;
  menu_name: string;
  description: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  components?: {
    id: number;
    component_id: number;
    name: string;
    items: {
      id: number;
      ingredient_id: number;
      name: string;
      code: string;
    }[];
  }[];
}

export interface Period {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  created_at: string;
  updated_at: string;
}

export interface MenuDay {
  id: number;
  period_id: number;
  day_number: number;
  calendar_date: string;
  distribution_day: boolean;
  status: string;
}

export interface MenuPlan {
  id: number;
  menu_day_id: number;
  beneficiary_group_id: number;
  library_menu_id?: number;
  menu_name: string;
  status: MenuStatus;
  total_energy: number;
  total_protein: number;
  total_fat: number;
  total_carbohydrate: number;
  total_fiber: number;
  total_hpp: number;
  created_at: string;
  updated_at: string;
  components?: MenuPlanComponent[];
}

export interface MenuPlanComponent {
  id: number;
  menu_plan_id: number;
  component_id: number;
  sort_order: number;
  name: string; // Component Name
  items: MenuPlanItem[];
}

export interface MenuPlanItem {
  id: number;
  component_plan_id: number;
  ingredient_id: number;
  name: string; // Ingredient Name
  code: string; // Ingredient Code
  net_weight: number; // Gramasi bersih (inputted by user)
  bdd: number;
  gross_weight: number; // Calculated: net * 100 / bdd
  energy: number; // Calculated: TKPI * net / 100
  protein: number; // Calculated: TKPI * net / 100
  fat: number; // Calculated: TKPI * net / 100
  carbohydrate: number; // Calculated: TKPI * net / 100
  fiber: number; // Calculated: TKPI * net / 100
  ingredient_cost: number; // Calculated: gross_weight * price_per_g
}

export interface ProcurementOrder {
  id: number;
  period_id: number;
  menu_day_id: number;
  order_date: string;
  status: ProcurementStatus;
  total_cost: number;
  created_at: string;
  updated_at: string;
  items?: ProcurementItem[];
  manual_items?: ProcurementManualItem[];
}

export interface ProcurementItem {
  id: number;
  procurement_order_id: number;
  ingredient_id: number;
  name: string; // Ingredient Name
  code: string; // Ingredient Code
  calculated_quantity: number; // kg
  purchase_unit: string; // kg, gram, pcs, ekor, liter, etc.
  actual_quantity: number; // user adjusted
  unit_price: number; // price per purchase unit
  subtotal: number; // actual_quantity * unit_price
}

export interface ProcurementManualItem {
  id: number;
  procurement_order_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  module: string;
  action: string;
  table_name: string;
  record_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

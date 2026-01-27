export interface Expense {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category_id: string | null;
  date: string;
  tags: string[];
  receipt_url: string | null;
  location: string | null;
  notes: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Budget {
  id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  period: 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string | null;
}

export interface ExpenseCreate {
  amount: number;
  currency?: string;
  description: string;
  category_id?: string | null;
  date: string;
  tags?: string[];
  receipt_url?: string | null;
  location?: string | null;
  notes?: string | null;
  is_recurring?: boolean;
}

export interface ExpenseUpdate {
  amount?: number;
  currency?: string;
  description?: string;
  category_id?: string | null;
  date?: string;
  tags?: string[];
  receipt_url?: string | null;
  location?: string | null;
  notes?: string | null;
  is_recurring?: boolean;
}

export interface CategoryCreate {
  name: string;
  icon?: string | null;
  color?: string;
}

export interface BudgetCreate {
  category_id?: string | null;
  amount: number;
  currency?: string;
  period: 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
}

export interface ExpenseFilters {
  category_id?: string; // Deprecated: use category_ids instead
  category_ids?: string[]; // Multiple category IDs for OR filtering
  start_date?: string;
  end_date?: string;
  tags?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface SummaryReport {
  period: string;
  start_date: string;
  end_date: string;
  total_expenses: number;
  total_amount: number;
  average_amount: number;
  currency?: string;
}

export interface TrendData {
  period: string;
  start_date?: string;
  end_date?: string;
  trends: Array<{
    period: string;
    total: number;
  }>;
}

export interface CategoryBreakdown {
  start_date: string;
  end_date: string;
  breakdown: Array<{
    category_id: string;
    category_name: string;
    total: number;
    count: number;
  }>;
}

export interface TopExpensesResponse {
  period_type: string;
  period_value?: string | null;
  start_date: string;
  end_date: string;
  expenses: Array<Expense & { amount_in_idr: number }>;
  has_more: boolean;
  total_count: number;
}

// Rent Expense Types
export interface RentExpense {
  id: string;
  period: string; // Format: YYYY-MM
  currency: string;
  
  // Summary fields
  sinking_fund_idr: number;
  service_charge_idr: number;
  ppn_service_charge_idr: number;
  electric_m1_total_idr: number;
  water_m1_total_idr: number;
  fitout_idr: number;
  total_idr: number;
  
  // Electricity breakdown
  electric_usage_idr: number | null;
  electric_ppn_idr: number | null;
  electric_area_bersama_idr: number | null;
  electric_pju_idr: number | null;
  electric_kwh: number | null;
  electric_tarif_per_kwh: number | null;
  
  // Water breakdown
  water_usage_potable_idr: number | null;
  water_non_potable_idr: number | null;
  water_air_limbah_idr: number | null;
  water_ppn_air_limbah_idr: number | null;
  water_pemeliharaan_idr: number | null;
  water_area_bersama_idr: number | null;
  water_m3: number | null;
  water_tarif_per_m3: number | null;
  
  // Meta
  source: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string | null;
}

export interface RentExpenseTrendItem {
  period: string;
  total: number;
}

export interface RentExpenseTrend {
  period_type: 'monthly' | 'yearly';
  trends: RentExpenseTrendItem[];
}

export interface RentExpenseBreakdownItem {
  category: string;
  total: number;
  count: number;
}

export interface RentExpenseBreakdown {
  period: string | null;
  breakdown: RentExpenseBreakdownItem[];
}

export type RentExpenseCategory = 'electricity' | 'water' | 'service_charge' | 'sinking_fund' | 'fitout';

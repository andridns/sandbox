export interface Expense {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category_id: string | null;
  date: string;
  tags: string[];
  payment_method: string;
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
  payment_method: string;
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
  payment_method?: string;
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
  category_id?: string;
  start_date?: string;
  end_date?: string;
  tags?: string;
  payment_method?: string;
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
  start_date: string;
  end_date: string;
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

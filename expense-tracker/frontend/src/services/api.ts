import axios from 'axios';
import type {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseFilters,
  Category,
  CategoryCreate,
  Budget,
  BudgetCreate,
  SummaryReport,
  TrendData,
  CategoryBreakdown,
} from '../types';

// Use environment variable for API URL, fallback to relative path for local development
// In local dev, Vite proxy handles /api -> http://localhost:8000
// In production, VITE_API_URL should be set to the backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for session-based auth
});

// Token storage key
const TOKEN_STORAGE_KEY = 'auth_token';

// Add request interceptor to include Bearer token if available
api.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage (fallback for cross-site cookie issues)
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors and store tokens
api.interceptors.response.use(
  (response) => {
    // If login response includes a token, store it
    if (response.data?.token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on 401
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      // Only redirect to login if we're not already on the login page
      // This prevents redirect loops when checking auth status
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Expenses
export const expensesApi = {
  getAll: async (filters?: ExpenseFilters): Promise<Expense[]> => {
    const response = await api.get<Expense[]>('/expenses', { params: filters });
    return response.data;
  },
  getById: async (id: string): Promise<Expense> => {
    const response = await api.get<Expense>(`/expenses/${id}`);
    return response.data;
  },
  create: async (data: ExpenseCreate): Promise<Expense> => {
    const response = await api.post<Expense>('/expenses', data);
    return response.data;
  },
  update: async (id: string, data: ExpenseUpdate): Promise<Expense> => {
    const response = await api.put<Expense>(`/expenses/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },
};

// Categories
export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },
  create: async (data: CategoryCreate): Promise<Category> => {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CategoryCreate>): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

// Budgets
export const budgetsApi = {
  getAll: async (period?: string, categoryId?: string): Promise<Budget[]> => {
    const response = await api.get<Budget[]>('/budgets', {
      params: { period, category_id: categoryId },
    });
    return response.data;
  },
  getById: async (id: string): Promise<Budget> => {
    const response = await api.get<Budget>(`/budgets/${id}`);
    return response.data;
  },
  getSpent: async (budgetId: string, params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get(`/budgets/${budgetId}/spent`, { params });
    return response.data;
  },
  create: async (data: BudgetCreate): Promise<Budget> => {
    const response = await api.post<Budget>('/budgets', data);
    return response.data;
  },
  update: async (id: string, data: Partial<BudgetCreate>): Promise<Budget> => {
    const response = await api.put<Budget>(`/budgets/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/budgets/${id}`);
  },
};

// Reports
export const reportsApi = {
  getSummary: async (startDate?: string, endDate?: string, period?: string): Promise<SummaryReport> => {
    const response = await api.get<SummaryReport>('/reports/summary', {
      params: { start_date: startDate, end_date: endDate, period },
    });
    return response.data;
  },
  getTrends: async (startDate?: string, endDate?: string, period?: string): Promise<TrendData> => {
    const response = await api.get<TrendData>('/reports/trends', {
      params: { start_date: startDate, end_date: endDate, period },
    });
    return response.data;
  },
  getCategoryBreakdown: async (startDate?: string, endDate?: string): Promise<CategoryBreakdown> => {
    const response = await api.get<CategoryBreakdown>('/reports/category-breakdown', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },
};

// Tags
export const tagsApi = {
  getSuggestions: async (query: string, limit = 10): Promise<string[]> => {
    const response = await api.get<string[]>('/tags/suggestions', {
      params: { query, limit },
    });
    return response.data;
  },
};

// Upload
export const uploadApi = {
  uploadReceipt: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string; filename: string }>('/upload/receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Export
export const exportApi = {
  exportCSV: async (startDate?: string, endDate?: string): Promise<Blob> => {
    const response = await api.get('/export/csv', {
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob',
    });
    return response.data;
  },
  exportExcel: async (startDate?: string, endDate?: string): Promise<Blob> => {
    const response = await api.get('/export/excel', {
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob',
    });
    return response.data;
  },
  exportPDF: async (startDate?: string, endDate?: string): Promise<Blob> => {
    const response = await api.get('/export/pdf', {
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob',
    });
    return response.data;
  },
};

// Import
export interface ImportResult {
  success: boolean;
  summary: {
    total_rows: number;
    imported: number;
    failed: number;
    uncategorized: number;
    categories_imported?: number;
  };
  category_matches: Record<string, number>;
  errors: string[];
  failed_rows: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

export const importApi = {
  excelImport: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportResult>('/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Auth
export interface User {
  id: string;
  username?: string;
  email?: string;
  is_active: boolean;
  token?: string;  // Bearer token for cross-site cookie fallback
}

export const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    const response = await api.post<User>('/auth/login', { username, password });
    // Token is automatically stored by interceptor
    return response.data;
  },
  googleLogin: async (idToken: string): Promise<User> => {
    const response = await api.post<User>('/auth/google', { id_token: idToken });
    // Token is automatically stored by interceptor
    return response.data;
  },
  logout: async (): Promise<void> => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    await api.post('/auth/logout');
  },
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

// Admin
export const adminApi = {
  deleteAllData: async (): Promise<{ message: string; deleted: any }> => {
    const response = await api.delete('/admin/delete-all');
    return response.data;
  },
};

export default api;

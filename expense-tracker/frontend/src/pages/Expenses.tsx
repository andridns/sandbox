import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, exportApi } from '../services/api';
import { toast } from 'react-hot-toast';
import ExpenseList from '../components/Expenses/ExpenseList';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import ExpenseFilters from '../components/Expenses/ExpenseFilters';
import type { ExpenseFilters as ExpenseFiltersType } from '../types';

const Expenses = () => {
  const [filters, setFilters] = useState<ExpenseFiltersType>({ limit: 400 });
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expensesApi.getAll(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted');
    },
    onError: () => {
      toast.error('Failed to delete expense');
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    // Show success toast
    toast.success('Expense deleted', {
      duration: 5000,
    });
  };

  const handleEdit = (id: string) => {
    setEditingExpense(id);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleExport = async () => {
    try {
      toast.loading('Exporting data...');
      const blob = await exportApi.exportExcel();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Data exported successfully!');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Failed to export data');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <h2 className="text-2xl md:text-3xl font-semibold text-warm-gray-800">Expenses</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleExport}
            className="w-full sm:w-auto bg-green-500 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl hover:bg-green-600 transition-all shadow-apple hover:shadow-apple-lg font-medium flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <span>📥</span>
            <span className="hidden sm:inline">Export to Excel</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto bg-primary-400 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl hover:bg-primary-500 transition-all shadow-apple hover:shadow-apple-lg font-medium text-sm md:text-base"
          >
            + Add Expense
          </button>
        </div>
      </div>

      <ExpenseFilters 
        filters={filters} 
        onFiltersChange={(newFilters) => setFilters({ ...newFilters, limit: 400 })} 
      />

      {showForm && (
        <ExpenseForm
          expenseId={editingExpense}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose();
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
          }}
        />
      )}

      <ExpenseList
        expenses={expenses || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Expenses;

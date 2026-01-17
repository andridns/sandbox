import { useState, useMemo } from 'react';
import { formatDate } from '../../utils/format';
import CurrencyDisplay from '../CurrencyDisplay';
import type { Expense } from '../../types';

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

type SortField = 'date' | 'description' | 'category' | 'amount' | 'payment';
type SortDirection = 'asc' | 'desc';

const ExpenseList = ({ expenses, isLoading, onEdit, onDelete }: ExpenseListProps) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedExpenses = useMemo(() => {
    const sorted = [...expenses];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'category':
          aValue = a.category_id || '';
          bValue = b.category_id || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'payment':
          aValue = a.payment_method.toLowerCase();
          bValue = b.payment_method.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [expenses, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <span className="ml-1 text-warm-gray-400">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    return sortDirection === 'asc' ? (
      <span className="ml-1 text-primary-500">
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </span>
    ) : (
      <span className="ml-1 text-primary-500">
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="glass p-4 md:p-8 rounded-2xl shadow-modern border border-modern-border/50">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gradient-to-r from-modern-border/20 to-modern-border/10 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="glass p-4 md:p-8 rounded-2xl shadow-modern border border-modern-border/50 text-center">
        <p className="text-modern-text-light text-sm md:text-base font-medium">No expenses found</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl shadow-modern-lg border border-modern-border/50">
      <div className="p-4 md:p-6 border-b border-modern-border/50">
        <h3 className="text-base md:text-lg font-bold text-modern-text">
          {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
        </h3>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-modern-border/30">
        {sortedExpenses.map((expense) => (
          <div key={expense.id} className="p-4 hover:bg-primary-50/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-modern-text text-sm">{expense.description}</span>
                  {expense.is_recurring && (
                    <span className="px-2 py-0.5 bg-gradient-accent/10 text-accent-600 text-xs rounded-lg font-medium border border-accent-200/50">
                      🔄
                    </span>
                  )}
                </div>
                <div className="text-xs text-modern-text-light font-medium">{formatDate(expense.date)}</div>
              </div>
              <div className="text-right">
                <CurrencyDisplay 
                  amount={expense.amount} 
                  currency={expense.currency}
                  size="sm"
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-modern-border/20">
              <div className="text-xs text-modern-text-light font-medium">
                <span className="mr-3">{expense.payment_method}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onEdit(expense.id)}
                  className="text-primary-600 hover:text-primary-700 font-semibold transition-colors text-sm hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="text-red-500 hover:text-red-600 font-semibold transition-colors text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-modern-border/10 to-transparent">
            <tr>
              <th 
                className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider cursor-pointer hover:bg-primary-50/30 transition-colors select-none"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Date
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider cursor-pointer hover:bg-primary-50/30 transition-colors select-none"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center">
                  Description
                  {getSortIcon('description')}
                </div>
              </th>
              <th 
                className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider cursor-pointer hover:bg-primary-50/30 transition-colors select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center">
                  Amount
                  {getSortIcon('amount')}
                </div>
              </th>
              <th 
                className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider cursor-pointer hover:bg-primary-50/30 transition-colors select-none"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center">
                  Category
                  {getSortIcon('category')}
                </div>
              </th>
              <th 
                className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider cursor-pointer hover:bg-primary-50/30 transition-colors select-none"
                onClick={() => handleSort('payment')}
              >
                <div className="flex items-center">
                  Payment
                  {getSortIcon('payment')}
                </div>
              </th>
              <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-modern-border/30">
            {sortedExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-primary-50/20 transition-colors">
                <td className="px-5 py-4 text-sm text-modern-text font-medium">
                  {formatDate(expense.date)}
                </td>
                <td className="px-5 py-4 text-sm text-modern-text font-semibold">
                  <div className="flex items-center gap-2">
                    {expense.description}
                    {expense.is_recurring && (
                      <span className="px-2.5 py-1 bg-gradient-accent/10 text-accent-600 text-xs rounded-lg font-medium border border-accent-200/50">
                        🔄
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-bold text-modern-text">
                  <CurrencyDisplay 
                    amount={expense.amount} 
                    currency={expense.currency}
                    size="sm"
                  />
                </td>
                <td className="px-5 py-4 text-sm text-modern-text-light font-medium">-</td>
                <td className="px-5 py-4 text-sm text-modern-text-light font-medium">{expense.payment_method}</td>
                <td className="px-5 py-4 text-sm">
                  <div className="flex gap-3">
                    <button
                      onClick={() => onEdit(expense.id)}
                      className="text-primary-600 hover:text-primary-700 font-semibold transition-colors hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(expense.id)}
                      className="text-red-500 hover:text-red-600 font-semibold transition-colors hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseList;

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
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-apple">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-beige-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-apple text-center">
        <p className="text-warm-gray-500 text-sm md:text-base">No expenses found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-apple-lg">
      <div className="p-4 md:p-6 border-b border-warm-gray-200">
        <h3 className="text-base md:text-lg font-semibold text-warm-gray-800">
          {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
        </h3>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-warm-gray-200">
        {sortedExpenses.map((expense) => (
          <div key={expense.id} className="p-4 hover:bg-beige-50 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-warm-gray-800 text-sm">{expense.description}</span>
                  {expense.is_recurring && (
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-lg">
                      🔄
                    </span>
                  )}
                </div>
                <div className="text-xs text-warm-gray-600">{formatDate(expense.date)}</div>
              </div>
              <div className="text-right">
                <CurrencyDisplay 
                  amount={expense.amount} 
                  currency={expense.currency}
                  size="sm"
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-warm-gray-100">
              <div className="text-xs text-warm-gray-600">
                <span className="mr-3">{expense.payment_method}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onEdit(expense.id)}
                  className="text-primary-500 hover:text-primary-600 font-medium transition-colors text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="text-red-500 hover:text-red-600 font-medium transition-colors text-sm"
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
          <thead className="bg-beige-50">
            <tr>
              <th 
                className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider cursor-pointer hover:bg-beige-100 transition-colors select-none"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Date
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider cursor-pointer hover:bg-beige-100 transition-colors select-none"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center">
                  Description
                  {getSortIcon('description')}
                </div>
              </th>
              <th 
                className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider cursor-pointer hover:bg-beige-100 transition-colors select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center">
                  Amount
                  {getSortIcon('amount')}
                </div>
              </th>
              <th 
                className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider cursor-pointer hover:bg-beige-100 transition-colors select-none"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center">
                  Category
                  {getSortIcon('category')}
                </div>
              </th>
              <th 
                className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider cursor-pointer hover:bg-beige-100 transition-colors select-none"
                onClick={() => handleSort('payment')}
              >
                <div className="flex items-center">
                  Payment
                  {getSortIcon('payment')}
                </div>
              </th>
              <th className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-gray-200">
            {sortedExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-beige-50 transition-colors">
                <td className="px-5 py-4 text-sm text-warm-gray-800">
                  {formatDate(expense.date)}
                </td>
                <td className="px-5 py-4 text-sm text-warm-gray-800">
                  <div className="flex items-center gap-2">
                    {expense.description}
                    {expense.is_recurring && (
                      <span className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs rounded-lg">
                        🔄
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-warm-gray-800">
                  <CurrencyDisplay 
                    amount={expense.amount} 
                    currency={expense.currency}
                    size="sm"
                  />
                </td>
                <td className="px-5 py-4 text-sm text-warm-gray-600">-</td>
                <td className="px-5 py-4 text-sm text-warm-gray-600">{expense.payment_method}</td>
                <td className="px-5 py-4 text-sm">
                  <div className="flex gap-3">
                    <button
                      onClick={() => onEdit(expense.id)}
                      className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(expense.id)}
                      className="text-red-500 hover:text-red-600 font-medium transition-colors"
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

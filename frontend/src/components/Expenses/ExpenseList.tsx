import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '../../utils/format';
import CurrencyDisplay from '../CurrencyDisplay';
import { categoriesApi } from '../../services/api';
import type { Expense, Category } from '../../types';

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

type SortField = 'date' | 'description' | 'category' | 'amount';
type SortDirection = 'asc' | 'desc';

// Get category display (icon or abbreviation)
const getCategoryDisplay = (category: Category | undefined): string => {
  if (!category) return '📁';
  if (category.icon) return category.icon;
  // Use first 2-3 letters as abbreviation
  return category.name.substring(0, 2).toUpperCase();
};

// Check if date is in the future
const isFutureDate = (dateString: string): boolean => {
  const expenseDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expenseDate.setHours(0, 0, 0, 0);
  return expenseDate > today;
};

const ExpenseList = ({ expenses, isLoading, onEdit, onDelete, hasMore = false, isLoadingMore = false, onLoadMore }: ExpenseListProps) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Load categories to match with expenses
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  // Create category lookup map
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, Category>();
    return new Map(categories.map(cat => [cat.id, cat]));
  }, [categories]);

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
        {sortedExpenses.map((expense) => {
          const category = expense.category_id ? categoryMap.get(expense.category_id) : undefined;
          const isFuture = isFutureDate(expense.date);
          
          return (
            <div key={expense.id} className="p-2 hover:bg-primary-50/30 transition-colors">
              {/* Top row: Description, Amount, Flags */}
              <div className="flex justify-between items-start gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                    <span className="font-semibold text-modern-text text-sm truncate">{expense.description}</span>
                    {expense.is_recurring && (
                      <span className="text-xs" title="Recurring">🔄</span>
                    )}
                    {isFuture && (
                      <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] rounded font-bold border border-yellow-300" title="Future expense">
                        FUTURE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-modern-text-light font-medium flex-wrap">
                    <span>{formatDate(expense.date)}</span>
                    {category && (
                      <span className="flex items-center gap-1" title={category.name}>
                        <span>{getCategoryDisplay(category)}</span>
                        <span className="text-[9px]">{category.name}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <CurrencyDisplay 
                    amount={expense.amount} 
                    currency={expense.currency}
                    size="sm"
                  />
                </div>
              </div>
              
              {/* Actions row */}
              <div className="flex justify-end items-center pt-1 border-t border-modern-border/20">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(expense.id)}
                    className="text-primary-600 hover:text-primary-700 transition-colors text-base"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="text-red-500 hover:text-red-600 transition-colors text-base"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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
              <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-modern-border/30">
            {sortedExpenses.map((expense) => {
              const category = expense.category_id ? categoryMap.get(expense.category_id) : undefined;
              const isFuture = isFutureDate(expense.date);
              
              return (
                <tr key={expense.id} className="hover:bg-primary-50/20 transition-colors">
                  <td className="px-5 py-3 text-sm text-modern-text font-medium">
                    <div className="flex items-center gap-2">
                      {formatDate(expense.date)}
                      {isFuture && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded font-semibold border border-yellow-300">
                          FUTURE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-modern-text font-semibold">
                    <div className="flex items-center gap-2">
                      {expense.description}
                      {expense.is_recurring && (
                        <span className="text-xs" title="Recurring">🔄</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-modern-text">
                    <CurrencyDisplay 
                      amount={expense.amount} 
                      currency={expense.currency}
                      size="sm"
                    />
                  </td>
                  <td className="px-5 py-3 text-sm text-modern-text-light font-medium">
                    {category ? (
                      <div className="flex items-center gap-1.5" title={category.name}>
                        <span>{getCategoryDisplay(category)}</span>
                        <span>{category.name.length > 15 ? category.name.substring(0, 15) + '...' : category.name}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm">
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="p-4 md:p-6 border-t border-modern-border/50 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold rounded-lg shadow-modern transition-all duration-200 hover:shadow-modern-lg disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                Load More Expenses (500 more)
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;

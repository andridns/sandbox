import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { expensesApi } from '../services/api';
import { toast } from 'react-hot-toast';
import ExpenseList from '../components/Expenses/ExpenseList';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import ExpenseFilters from '../components/Expenses/ExpenseFilters';
import type { ExpenseFilters as ExpenseFiltersType } from '../types';

const EXPENSES_PER_PAGE = 500;

const Expenses = () => {
  const [showFutureExpenses, setShowFutureExpenses] = useState(false);
  const [userFilters, setUserFilters] = useState<Omit<ExpenseFiltersType, 'skip' | 'limit'>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get today's date in YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Compute effective filters based on toggle state
  const baseFilters = useMemo(() => {
    const today = getTodayDateString();
    
    if (!showFutureExpenses) {
      // Hide future expenses: ensure end_date is today or earlier
      const userEndDate = userFilters.end_date;
      const endDateToUse = userEndDate && userEndDate <= today ? userEndDate : today;
      return { ...userFilters, end_date: endDateToUse };
    } else {
      // Show future expenses: remove end_date restriction if it's today or earlier
      // This allows future expenses to be shown
      const userEndDate = userFilters.end_date;
      if (userEndDate && userEndDate <= today) {
        // Remove the end_date restriction to show future expenses
        const { end_date, ...filtersWithoutEndDate } = userFilters;
        return filtersWithoutEndDate;
      }
      // If user set a future date, keep it as-is
      return userFilters;
    }
  }, [showFutureExpenses, userFilters]);

  // Initialize: hide future expenses by default
  useEffect(() => {
    const today = getTodayDateString();
    setUserFilters({ end_date: today });
  }, []);

  // Use infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['expenses', baseFilters],
    queryFn: ({ pageParam = 0 }) => {
      return expensesApi.getAll({
        ...baseFilters,
        skip: pageParam,
        limit: EXPENSES_PER_PAGE,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer expenses than requested, we've reached the end
      if (lastPage.length < EXPENSES_PER_PAGE) {
        return undefined;
      }
      // Otherwise, return the next skip value
      return allPages.length * EXPENSES_PER_PAGE;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const expenses = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

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
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (id: string) => {
    setEditingExpense(id);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleLoadMore = () => {
    fetchNextPage();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-primary-600">Explorer</h2>
        
        {/* Toggle for showing/hiding future expenses */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-warm-gray-700">Show Future Expenses</span>
          <button
            type="button"
            role="switch"
            aria-checked={showFutureExpenses}
            onClick={() => setShowFutureExpenses(!showFutureExpenses)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              showFutureExpenses ? 'bg-primary-600' : 'bg-warm-gray-300'
            }`}
            title={showFutureExpenses ? 'Hide future expenses' : 'Show future expenses'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                showFutureExpenses ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <ExpenseFilters
        filters={baseFilters}
        onFiltersChange={(newFilters) => {
          // Remove skip and limit from filters when they change
          const { skip, limit, ...rest } = newFilters;
          
          const today = getTodayDateString();
          
          // If user sets a future date while toggle is off, turn toggle on
          if (!showFutureExpenses && rest.end_date && rest.end_date > today) {
            setShowFutureExpenses(true);
          }
          
          // Update user filters (baseFilters will be recomputed via useMemo)
          setUserFilters(rest);
        }}
        onClearFilters={() => {
          // When filters are cleared, toggle "Show Future Expenses" to ON
          setShowFutureExpenses(true);
        }}
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
        expenses={expenses}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        hasMore={hasNextPage ?? false}
        isLoadingMore={isFetchingNextPage}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
};

export default Expenses;

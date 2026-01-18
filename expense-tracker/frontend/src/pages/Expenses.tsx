import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { expensesApi } from '../services/api';
import { toast } from 'react-hot-toast';
import ExpenseList from '../components/Expenses/ExpenseList';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import ExpenseFilters from '../components/Expenses/ExpenseFilters';
import type { ExpenseFilters as ExpenseFiltersType } from '../types';

const EXPENSES_PER_PAGE = 500;

const Expenses = () => {
  const [baseFilters, setBaseFilters] = useState<Omit<ExpenseFiltersType, 'skip' | 'limit'>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const queryClient = useQueryClient();

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
      <h2 className="text-2xl md:text-3xl font-bold text-primary-600">Explorer</h2>

      <ExpenseFilters 
        filters={baseFilters} 
        onFiltersChange={(newFilters) => {
          // Remove skip and limit from filters when they change
          const { skip, limit, ...rest } = newFilters;
          setBaseFilters(rest);
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

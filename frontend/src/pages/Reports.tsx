import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, categoriesApi, rentExpensesApi, expensesApi } from '../services/api';
import { toast } from 'react-hot-toast';
import TrendChart from '../components/Dashboard/TrendChart';
import CategoryBarChart from '../components/Reports/CategoryBarChart';
import { formatDate } from '../utils/format';
import CurrencyDisplay from '../components/CurrencyDisplay';
import RentExpenseTrendChart from '../components/RentExpenses/RentExpenseTrendChart';
import RentExpenseFilters from '../components/RentExpenses/RentExpenseFilters';
import RentExpenseDetailCard from '../components/RentExpenses/RentExpenseDetailCard';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import type { Category, Expense, RentExpenseCategory, RentExpenseTrend, RentExpense } from '../types';

type PeriodType = 'monthly' | 'quarterly' | 'semester' | 'yearly';
type TabType = 'daily' | 'rent';

const Reports = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('daily');

  // Get current year as string
  const getCurrentYear = () => {
    return new Date().getFullYear().toString();
  };

  // Daily Expenses State
  const [period, setPeriod] = useState<PeriodType>('yearly');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string | null>(getCurrentYear());
  const [allExpenses, setAllExpenses] = useState<Array<Expense & { amount_in_idr: number }>>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Rent Expenses State
  const [rentPeriodType, setRentPeriodType] = useState<'monthly' | 'quarterly' | 'semester' | 'yearly'>('yearly');
  const [selectedRentCategories, setSelectedRentCategories] = useState<RentExpenseCategory[]>([]);
  const [selectedRentPeriod, setSelectedRentPeriod] = useState<string | null>(null);
  const [rentUsageView, setRentUsageView] = useState<'cost' | 'electricity_usage' | 'water_usage'>('cost');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  // Daily Expenses Queries
  const { data: trends } = useQuery({
    queryKey: ['trends', period, selectedCategoryIds],
    queryFn: () => reportsApi.getTrends(period, undefined, selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined),
    enabled: activeTab === 'daily',
  });

  const { data: topExpenses, isLoading: isLoadingTopExpenses } = useQuery({
    queryKey: ['topExpenses', period, selectedPeriodValue, selectedCategoryIds],
    queryFn: () => reportsApi.getTopExpenses(period, selectedPeriodValue || undefined, undefined, selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined, 0, 500),
    enabled: activeTab === 'daily' && selectedPeriodValue !== null,
  });

  const { data: categoryBreakdown } = useQuery({
    queryKey: ['categoryBreakdown', period, selectedPeriodValue, selectedCategoryIds],
    queryFn: () => reportsApi.getCategoryBreakdown(undefined, undefined, period, selectedPeriodValue || undefined),
    enabled: activeTab === 'daily',
  });

  // Rent Expenses Queries
  const { data: rentTrends, error: rentTrendsError, isLoading: isLoadingRentTrends } = useQuery<RentExpenseTrend>({
    queryKey: ['rentTrends', rentPeriodType, selectedRentCategories, rentUsageView],
    queryFn: () => rentExpensesApi.getTrends(
      rentPeriodType,
      // Only pass categories if in cost view
      rentUsageView === 'cost' && selectedRentCategories.length > 0 ? selectedRentCategories : undefined,
      rentUsageView
    ),
    enabled: activeTab === 'rent',
  });

  // Fetch specific period's expense when selected
  const { data: selectedPeriodExpense, error: rentExpensesError, isLoading: isLoadingRentExpenses } = useQuery<RentExpense>({
    queryKey: ['rentExpense', selectedRentPeriod],
    queryFn: () => rentExpensesApi.getByPeriod(selectedRentPeriod!),
    enabled: activeTab === 'rent' && selectedRentPeriod !== null && rentUsageView === 'cost',
  });

  // Reset accumulated expenses when filters change
  useEffect(() => {
    if (topExpenses) {
      setAllExpenses(topExpenses.expenses);
      setHasMore(topExpenses.has_more);
    } else {
      setAllExpenses([]);
      setHasMore(false);
    }
  }, [topExpenses]);

  // Reset selected period when period type or categories change
  useEffect(() => {
    if (activeTab === 'daily') {
      // When period is yearly, default to current year
      if (period === 'yearly') {
        setSelectedPeriodValue(getCurrentYear());
      } else {
        setSelectedPeriodValue(null);
      }
      setAllExpenses([]);
      setHasMore(false);
    }
  }, [period, selectedCategoryIds, activeTab]);

  const handleDataPointClick = (periodValue: string) => {
    if (activeTab === 'daily') {
      setSelectedPeriodValue(periodValue);
    } else {
      setSelectedRentPeriod(periodValue);
    }
  };

  const getPeriodDisplayText = (): string => {
    if (!selectedPeriodValue) return '';

    if (period === 'yearly') {
      return `in ${selectedPeriodValue}`;
    } else if (period === 'quarterly') {
      // Format: "2025-Q1" -> "in Q1 2025"
      const parts = selectedPeriodValue.split('-Q');
      if (parts.length === 2) {
        return `in Q${parts[1]} ${parts[0]}`;
      }
      return `in ${selectedPeriodValue}`;
    } else if (period === 'semester') {
      // Format: "2025-S1" -> "in Semester 1 2025"
      const parts = selectedPeriodValue.split('-S');
      if (parts.length === 2) {
        return `in Semester ${parts[1]} ${parts[0]}`;
      }
      return `in ${selectedPeriodValue}`;
    } else {
      // Format: "2025-03" -> "in March 2025"
      const parts = selectedPeriodValue.split('-');
      if (parts.length === 2) {
        const year = parts[0];
        const month = parseInt(parts[1]);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        return `in ${monthNames[month - 1]} ${year}`;
      }
      return `in ${selectedPeriodValue}`;
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !selectedPeriodValue) return;

    setIsLoadingMore(true);
    try {
      const nextBatch = await reportsApi.getTopExpenses(
        period,
        selectedPeriodValue,
        undefined,
        selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        allExpenses.length,
        500
      );
      setAllExpenses(prev => [...prev, ...nextBatch.expenses]);
      setHasMore(nextBatch.has_more);
    } catch (error) {
      console.error('Failed to load more expenses:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['topExpenses'] });
      toast.success('Expense deleted');
    },
    onError: () => {
      toast.error('Failed to delete expense');
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          // Remove the deleted expense from the local state
          setAllExpenses(prev => prev.filter(exp => exp.id !== id));
        },
      });
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

  // Create category lookup map
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, Category>();
    return new Map(categories.map(cat => [cat.id, cat]));
  }, [categories]);

  // Get category display (icon or abbreviation)
  const getCategoryDisplay = (categoryId: string | null): string => {
    if (!categoryId) return '📁';
    const category = categoryMap.get(categoryId);
    if (!category) return '📁';
    if (category.icon) return category.icon;
    return category.name.substring(0, 2).toUpperCase();
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategoryIds(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleClearAllCategories = () => {
    setSelectedCategoryIds([]);
  };

  const getCategoryNames = (): string => {
    if (selectedCategoryIds.length === 0) return '';
    const names = selectedCategoryIds
      .map(id => categories?.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    return names;
  };

  // Get filter summary for collapsed view
  const getFilterSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`);
    if (selectedCategoryIds.length > 0) {
      const categoryNames = selectedCategoryIds
        .map(id => categories?.find(c => c.id === id)?.name)
        .filter(Boolean)
        .slice(0, 2);
      if (categoryNames.length > 0) {
        parts.push(`Categories: ${categoryNames.join(', ')}${selectedCategoryIds.length > 2 ? ` +${selectedCategoryIds.length - 2}` : ''}`);
      }
    }
    return parts.join(' • ');
  }, [period, selectedCategoryIds, categories]);

  const activeFiltersCount = useMemo(() => {
    return selectedCategoryIds.length > 0 ? 1 : 0;
  }, [selectedCategoryIds]);

  // Rent Expenses Handlers
  const handleRentCategoryToggle = (category: RentExpenseCategory) => {
    setSelectedRentCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleClearRentCategories = () => {
    setSelectedRentCategories([]);
  };

  const handleUsageViewChange = (view: 'cost' | 'electricity_usage' | 'water_usage') => {
    setRentUsageView(view);
    // Reset selected period when switching to usage view since usage data points may not be clickable
    if (view !== 'cost') {
      setSelectedRentPeriod(null);
    }
  };


  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-primary-600">Reports</h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-modern-border/30">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'daily'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-warm-gray-600 hover:text-warm-gray-800'
          }`}
        >
          Daily Expenses
        </button>
        <button
          onClick={() => setActiveTab('rent')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'rent'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-warm-gray-600 hover:text-warm-gray-800'
          }`}
        >
          Rent Expenses
        </button>
      </div>

      {/* Daily Expenses Tab */}
      {activeTab === 'daily' && (
        <>
          {showForm && (
            <ExpenseForm
              expenseId={editingExpense}
              onClose={handleFormClose}
              onSuccess={() => {
                handleFormClose();
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
                queryClient.invalidateQueries({ queryKey: ['topExpenses'] });
              }}
            />
          )}

          {/* Collapsible Filters */}
          <div className="glass rounded-2xl shadow-modern border border-modern-border/50 overflow-hidden">
            {/* Collapsible Header */}
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-warm-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <svg
                    className={`w-5 h-5 text-warm-gray-600 transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-warm-gray-700">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-semibold rounded-full">
                        {activeFiltersCount}
                      </span>
                    )}
                  </div>
                  {!isFiltersExpanded && (
                    <div className="text-xs text-warm-gray-500 mt-1 truncate">
                      {getFilterSummary}
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Expandable Content */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${isFiltersExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
              <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-4">
                {/* Period Toggle */}
                <div>
                  <label className="block text-sm font-semibold text-warm-gray-700 mb-3">Period</label>
                  <div className="flex gap-2 md:gap-3 flex-wrap">
                    <button
                      onClick={() => setPeriod('monthly')}
                      className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${period === 'monthly'
                        ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                        : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                        }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setPeriod('quarterly')}
                      className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${period === 'quarterly'
                        ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                        : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                        }`}
                    >
                      Quarterly
                    </button>
                    <button
                      onClick={() => setPeriod('semester')}
                      className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${period === 'semester'
                        ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                        : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                        }`}
                    >
                      Semester
                    </button>
                    <button
                      onClick={() => setPeriod('yearly')}
                      className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${period === 'yearly'
                        ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                        : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                        }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                {/* Category Filter Buttons */}
                <div>
                  <label className="block text-sm font-semibold text-warm-gray-700 mb-3">Category</label>
                  <div className="flex gap-2 md:gap-3 flex-wrap">
                    <button
                      onClick={handleClearAllCategories}
                      className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${selectedCategoryIds.length === 0
                        ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                        : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                        }`}
                    >
                      <span>All Categories</span>
                    </button>
                    {categories?.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryToggle(cat.id)}
                          className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${isSelected
                            ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                            : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                            }`}
                        >
                          <span>{cat.icon || '📁'}</span>
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <TrendChart
            data={trends}
            title={`Expense Trends${getCategoryNames() ? ` - ${getCategoryNames()}` : ''}`}
            onDataPointClick={handleDataPointClick}
          />

          {/* Category Bar Chart */}
          <CategoryBarChart
            data={categoryBreakdown}
            title={`Expenses by Category${getPeriodDisplayText() ? ` ${getPeriodDisplayText()}` : ''}${getCategoryNames() ? ` - ${getCategoryNames()}` : ''}`}
          />

          {/* Top Expenses */}
          {selectedPeriodValue && (
            <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
              <h3 className="text-lg md:text-xl font-semibold text-warm-gray-800 mb-4">
                Top Expenses {getPeriodDisplayText()} (by IDR Amount)
                {topExpenses && (
                  <span className="text-sm font-normal text-warm-gray-600 ml-2">
                    ({topExpenses.total_count} total)
                  </span>
                )}
              </h3>

              {isLoadingTopExpenses && allExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gradient-to-r from-modern-border/20 to-modern-border/10 rounded-xl"></div>
                    ))}
                  </div>
                </div>
              ) : allExpenses.length > 0 ? (
                <div className="space-y-2">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-modern-border/10 to-transparent">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-modern-text-light uppercase tracking-wider">
                            Original Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-modern-text-light uppercase tracking-wider">
                            Amount (IDR)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-modern-border/30">
                        {allExpenses.map((expense, index) => {
                          const category = expense.category_id ? categoryMap.get(expense.category_id) : undefined;
                          return (
                            <tr key={expense.id} className="hover:bg-primary-50/20 transition-colors">
                              <td className="px-4 py-3 text-sm font-bold text-modern-text">
                                #{index + 1}
                              </td>
                              <td className="px-4 py-3 text-sm text-modern-text font-medium">
                                {formatDate(expense.date)}
                              </td>
                              <td className="px-4 py-3 text-sm text-modern-text font-semibold">
                                {expense.description}
                              </td>
                              <td className="px-4 py-3 text-sm text-modern-text-light font-medium">
                                {category ? (
                                  <div className="flex items-center gap-1.5">
                                    <span>{getCategoryDisplay(expense.category_id)}</span>
                                    <span>{category.name}</span>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-modern-text font-medium text-right">
                                <CurrencyDisplay
                                  amount={expense.amount}
                                  currency={expense.currency}
                                  size="sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-modern-text text-right">
                                <CurrencyDisplay
                                  amount={expense.amount_in_idr}
                                  currency="IDR"
                                  size="sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleEdit(expense.id)}
                                    className="text-primary-600 hover:text-primary-700 font-semibold transition-colors hover:underline"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(expense.id)}
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

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {allExpenses.map((expense, index) => {
                      const category = expense.category_id ? categoryMap.get(expense.category_id) : undefined;
                      return (
                        <div key={expense.id} className="p-3 bg-gradient-to-r from-modern-border/10 to-transparent rounded-xl border border-modern-border/30">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-primary-600">#{index + 1}</span>
                                <span className="font-semibold text-modern-text text-sm truncate">{expense.description}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-modern-text-light">
                                <span>{formatDate(expense.date)}</span>
                                {category && (
                                  <span className="flex items-center gap-1">
                                    <span>{getCategoryDisplay(expense.category_id)}</span>
                                    <span>{category.name}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-modern-border/20">
                            <div className="text-xs text-modern-text-light">
                              <CurrencyDisplay
                                amount={expense.amount}
                                currency={expense.currency}
                                size="sm"
                              />
                            </div>
                            <div className="font-bold text-modern-text">
                              <CurrencyDisplay
                                amount={expense.amount_in_idr}
                                currency="IDR"
                                size="sm"
                              />
                            </div>
                          </div>
                          {/* Actions row */}
                          <div className="flex justify-end items-center pt-2 border-t border-modern-border/20 mt-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(expense.id)}
                                className="text-primary-600 hover:text-primary-700 transition-colors text-base"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
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

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="pt-4 border-t border-modern-border/50 flex justify-center">
                      <button
                        onClick={handleLoadMore}
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
                            Load More (Next 500)
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-modern-text-light text-sm">
                  No expenses found for the selected period and categories.
                </div>
              )}
            </div>
          )}

          {!selectedPeriodValue && (
            <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
              <div className="text-center py-8 text-modern-text-light text-sm">
                Click on a data point in the chart above to view top expenses for that period.
              </div>
            </div>
          )}
        </>
      )}

      {/* Rent Expenses Tab */}
      {activeTab === 'rent' && (
        <>
          {/* Filters */}
          <RentExpenseFilters
            periodType={rentPeriodType}
            selectedCategories={selectedRentCategories}
            usageView={rentUsageView}
            onPeriodTypeChange={setRentPeriodType}
            onCategoryToggle={handleRentCategoryToggle}
            onClearCategories={handleClearRentCategories}
            onUsageViewChange={handleUsageViewChange}
          />

          {/* Error Messages */}
          {(rentTrendsError || rentExpensesError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
              <p className="font-semibold mb-2">Error loading rent expenses:</p>
              {rentTrendsError && <p>Trends: {rentTrendsError instanceof Error ? rentTrendsError.message : 'Unknown error'}</p>}
              {rentExpensesError && <p>Expenses: {rentExpensesError instanceof Error ? rentExpensesError.message : 'Unknown error'}</p>}
            </div>
          )}

          {/* Loading States */}
          {(isLoadingRentTrends || isLoadingRentExpenses) && (
            <div className="text-center py-4 text-warm-gray-600 text-sm">
              Loading rent expense data...
            </div>
          )}

          {/* Trend Chart */}
          {rentTrends && (
            <RentExpenseTrendChart
              data={rentTrends}
              usageView={rentUsageView}
              title={`Rent Expense Trends${selectedRentCategories.length > 0 ? ` - ${selectedRentCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')).join(', ')}` : ''}`}
              onDataPointClick={handleDataPointClick}
            />
          )}

          {/* Rent Expense Detail Card - Only show in cost view */}
          {rentUsageView === 'cost' && selectedRentPeriod ? (
            isLoadingRentExpenses ? (
              <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
                <div className="text-center py-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gradient-to-r from-modern-border/20 to-modern-border/10 rounded-xl w-1/3 mx-auto"></div>
                    <div className="h-64 bg-gradient-to-r from-modern-border/20 to-modern-border/10 rounded-xl"></div>
                  </div>
                </div>
              </div>
            ) : selectedPeriodExpense ? (
              <RentExpenseDetailCard expense={selectedPeriodExpense} />
            ) : (
              <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
                <div className="text-center py-8 text-modern-text-light text-sm">
                  No rent expense data found for period {selectedRentPeriod}
                </div>
              </div>
            )
          ) : rentUsageView === 'cost' ? (
            <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
              <div className="text-center py-8 text-modern-text-light text-sm">
                Click on a data point in the chart above to view detailed breakdown for that period.
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default Reports;

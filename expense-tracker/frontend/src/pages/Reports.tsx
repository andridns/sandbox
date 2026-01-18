import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, categoriesApi } from '../services/api';
import TrendChart from '../components/Dashboard/TrendChart';
import { formatDate } from '../utils/format';
import CurrencyDisplay from '../components/CurrencyDisplay';
import type { Category, Expense } from '../types';

type PeriodType = 'monthly' | 'quarterly' | 'yearly';

const Reports = () => {
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string | null>(null);
  const [allExpenses, setAllExpenses] = useState<Array<Expense & { amount_in_idr: number }>>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const { data: trends } = useQuery({
    queryKey: ['trends', period, selectedCategoryIds],
    queryFn: () => reportsApi.getTrends(period, undefined, selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined),
  });

  const { data: topExpenses, isLoading: isLoadingTopExpenses } = useQuery({
    queryKey: ['topExpenses', period, selectedPeriodValue, selectedCategoryIds],
    queryFn: () => reportsApi.getTopExpenses(period, selectedPeriodValue || undefined, undefined, selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined, 0, 50),
    enabled: selectedPeriodValue !== null, // Only fetch when a period is selected
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
    setSelectedPeriodValue(null);
    setAllExpenses([]);
    setHasMore(false);
  }, [period, selectedCategoryIds]);

  const handleDataPointClick = (periodValue: string) => {
    setSelectedPeriodValue(periodValue);
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
        50
      );
      setAllExpenses(prev => [...prev, ...nextBatch.expenses]);
      setHasMore(nextBatch.has_more);
    } catch (error) {
      console.error('Failed to load more expenses:', error);
    } finally {
      setIsLoadingMore(false);
    }
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
        // Remove category from selection
        return prev.filter(id => id !== categoryId);
      } else {
        // Add category to selection
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

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-2xl md:text-3xl font-semibold text-warm-gray-800">Reports</h2>

      {/* Period Toggle */}
      <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
        <label className="block text-sm font-semibold text-warm-gray-700 mb-3">Period</label>
        <div className="flex gap-2 md:gap-3 flex-wrap">
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
              period === 'monthly'
                ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('quarterly')}
            className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
              period === 'quarterly'
                ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
            }`}
          >
            Quarterly
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
              period === 'yearly'
                ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
        <label className="block text-sm font-semibold text-warm-gray-700 mb-3">Category</label>
        <div className="flex gap-2 md:gap-3 flex-wrap">
          <button
            onClick={handleClearAllCategories}
            className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
              selectedCategoryIds.length === 0
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
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                  isSelected
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

      {/* Trend Chart */}
      <TrendChart 
        data={trends} 
        title={`Expense Trends${getCategoryNames() ? ` - ${getCategoryNames()}` : ''}`}
        onDataPointClick={handleDataPointClick}
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
                      Load More (Next 50)
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
    </div>
  );
};

export default Reports;

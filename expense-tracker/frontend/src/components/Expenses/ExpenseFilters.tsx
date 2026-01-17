import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../../services/api';
import type { ExpenseFilters } from '../../types';
import { MIN_AMOUNT_OPTIONS, getDateRangeOptions, getDateRange, type DateRangePreset } from '../../utils/constants';

interface ExpenseFiltersProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
}

const ExpenseFiltersComponent = ({ filters, onFiltersChange }: ExpenseFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<ExpenseFilters>(filters);
  const lastSentFilters = useRef<ExpenseFilters>(filters);
  
  // Get date range options (generated dynamically)
  const dateRangeOptions = useMemo(() => getDateRangeOptions(), []);

  // Initialize date range preset based on filters
  const getInitialDatePreset = (): DateRangePreset => {
    const { start_date, end_date } = filters;
    if (!start_date && !end_date) return 'all';
    
    const matchedPreset = dateRangeOptions.find((option) => {
      if (option.value === 'all') return false;
      const range = getDateRange(option.value);
      return range.start_date === start_date && range.end_date === end_date;
    });
    
    return matchedPreset?.value || 'custom';
  };
  
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(getInitialDatePreset());

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  // Sync localFilters when filters prop changes from outside (not from our own onFiltersChange)
  useEffect(() => {
    // Only sync if filters prop is different from what we last sent
    // This prevents syncing back our own changes
    const filtersChanged = 
      filters.category_id !== lastSentFilters.current.category_id ||
      filters.start_date !== lastSentFilters.current.start_date ||
      filters.end_date !== lastSentFilters.current.end_date ||
      filters.min_amount !== lastSentFilters.current.min_amount ||
      filters.max_amount !== lastSentFilters.current.max_amount ||
      filters.search !== lastSentFilters.current.search;
    
    if (filtersChanged) {
      setLocalFilters(filters);
      // Update lastSentFilters to prevent re-syncing
      lastSentFilters.current = filters;
    }
  }, [filters.category_id, filters.start_date, filters.end_date, filters.min_amount, filters.max_amount, filters.search]);

  // Detect current date range preset from filters
  useEffect(() => {
    const { start_date, end_date } = localFilters;
    
    if (!start_date && !end_date) {
      setDateRangePreset('all');
      return;
    }
    
    // Try to match against presets
    const matchedPreset = dateRangeOptions.find((option) => {
      if (option.value === 'all') return false;
      const range = getDateRange(option.value);
      return range.start_date === start_date && range.end_date === end_date;
    });
    
    setDateRangePreset(matchedPreset?.value || 'custom');
  }, [localFilters.start_date, localFilters.end_date, dateRangeOptions]);

  const handleChange = (key: keyof ExpenseFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
    lastSentFilters.current = newFilters;
    onFiltersChange(newFilters);
  };

  const handleMinAmountChange = (value: string) => {
    const minAmount = value === '' ? undefined : Number(value);
    const newFilters = {
      ...localFilters,
      min_amount: minAmount,
      max_amount: undefined, // Clear max_amount since we're only filtering by minimum
    };
    setLocalFilters(newFilters);
    lastSentFilters.current = newFilters;
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    const range = getDateRange(preset);
    const newFilters = {
      ...localFilters,
      start_date: range.start_date,
      end_date: range.end_date,
    };
    setLocalFilters(newFilters);
    lastSentFilters.current = newFilters;
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const newFilters = {};
    setLocalFilters(newFilters);
    setDateRangePreset('all');
    lastSentFilters.current = newFilters;
    onFiltersChange(newFilters);
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.category_id) count++;
    if (localFilters.min_amount) count++;
    if (dateRangePreset !== 'all') count++;
    return count;
  }, [localFilters, dateRangePreset]);

  return (
    <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
      {/* Primary Filters - Most Important */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-warm-gray-700 mb-2">Search</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-warm-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={localFilters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-10 pr-3 py-2.5 border border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm placeholder:text-warm-gray-400"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-warm-gray-700 mb-2">Category</label>
          <select
            value={localFilters.category_id || ''}
            onChange={(e) => handleChange('category_id', e.target.value)}
            className="w-full px-3 py-2.5 border border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23374151%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%27')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat cursor-pointer hover:border-warm-gray-300"
          >
            <option value="">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-xs font-semibold text-warm-gray-700 mb-2">Date Range</label>
          <select
            value={dateRangePreset}
            onChange={(e) => handleDateRangeChange(e.target.value as DateRangePreset)}
            className="w-full px-3 py-2.5 border border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23374151%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%27')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat cursor-pointer hover:border-warm-gray-300"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Amount */}
        <div>
          <label className="block text-xs font-semibold text-warm-gray-700 mb-2">Min Amount</label>
          <select
            value={localFilters.min_amount || ''}
            onChange={(e) => handleMinAmountChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23374151%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%27')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat cursor-pointer hover:border-warm-gray-300"
          >
            {MIN_AMOUNT_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="flex justify-end pt-3 border-t border-warm-gray-100">
        <button
          onClick={clearFilters}
          className={`w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeFiltersCount > 0
              ? 'text-warm-gray-700 bg-warm-gray-100 hover:bg-warm-gray-200 active:scale-95'
              : 'text-warm-gray-400 bg-warm-gray-50 cursor-not-allowed'
          }`}
          disabled={activeFiltersCount === 0}
        >
          {activeFiltersCount > 0 ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear ({activeFiltersCount})
            </span>
          ) : (
            'Clear'
          )}
        </button>
      </div>
    </div>
  );
};

export default ExpenseFiltersComponent;

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../../services/api';
import type { ExpenseFilters } from '../../types';
import { MIN_AMOUNT_OPTIONS, getDateRangeOptions, getDateRange, type DateRangePreset } from '../../utils/constants';

interface ExpenseFiltersProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
  onClearFilters?: () => void;
}

const ExpenseFiltersComponent = ({ filters, onFiltersChange, onClearFilters }: ExpenseFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<ExpenseFilters>(filters);
  const lastSentFilters = useRef<ExpenseFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);
  
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
      JSON.stringify(filters.category_ids || []) !== JSON.stringify(lastSentFilters.current.category_ids || []) ||
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
  }, [filters.category_ids, filters.category_id, filters.start_date, filters.end_date, filters.min_amount, filters.max_amount, filters.search]);

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

  // Get selected category IDs array (support both category_id for backward compatibility and category_ids)
  const getSelectedCategoryIds = (): string[] => {
    if (localFilters.category_ids && localFilters.category_ids.length > 0) {
      return localFilters.category_ids;
    }
    // Backward compatibility: if category_id is set, convert to array
    if (localFilters.category_id) {
      return [localFilters.category_id];
    }
    return [];
  };

  const handleCategoryToggle = (categoryId: string) => {
    const selectedIds = getSelectedCategoryIds();
    const isSelected = selectedIds.includes(categoryId);
    
    let newCategoryIds: string[];
    if (isSelected) {
      // Remove category from selection
      newCategoryIds = selectedIds.filter(id => id !== categoryId);
    } else {
      // Add category to selection
      newCategoryIds = [...selectedIds, categoryId];
    }
    
    const newFilters: ExpenseFilters = {
      ...localFilters,
      category_ids: newCategoryIds.length > 0 ? newCategoryIds : undefined,
      category_id: undefined, // Clear old single category_id
    };
    
    setLocalFilters(newFilters);
    lastSentFilters.current = newFilters;
    onFiltersChange(newFilters);
  };

  const handleClearAllCategories = () => {
    const newFilters: ExpenseFilters = {
      ...localFilters,
      category_ids: undefined,
      category_id: undefined,
    };
    
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
    // Call the optional onClearFilters callback if provided
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (localFilters.search) count++;
    const selectedCategoryIds = getSelectedCategoryIds();
    if (selectedCategoryIds.length > 0) count++;
    if (localFilters.min_amount) count++;
    if (dateRangePreset !== 'all') count++;
    return count;
  }, [localFilters, dateRangePreset]);

  // Get filter summary text for collapsed view
  const getFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (localFilters.search) parts.push(`Search: "${localFilters.search}"`);
    const selectedCategoryIds = getSelectedCategoryIds();
    if (selectedCategoryIds.length > 0) {
      const categoryNames = selectedCategoryIds
        .map(id => categories?.find(c => c.id === id)?.name)
        .filter(Boolean)
        .slice(0, 2);
      if (categoryNames.length > 0) {
        parts.push(`Categories: ${categoryNames.join(', ')}${selectedCategoryIds.length > 2 ? ` +${selectedCategoryIds.length - 2}` : ''}`);
      }
    }
    if (dateRangePreset !== 'all') {
      const rangeOption = dateRangeOptions.find(opt => opt.value === dateRangePreset);
      if (rangeOption) parts.push(`Date: ${rangeOption.label}`);
    }
    if (localFilters.min_amount) {
      const amountOption = MIN_AMOUNT_OPTIONS.find(opt => opt.value === localFilters.min_amount);
      if (amountOption) parts.push(`Min: ${amountOption.label}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'No filters applied';
  }, [localFilters, dateRangePreset, categories, dateRangeOptions]);

  return (
    <div className="glass rounded-2xl shadow-modern border border-modern-border/50 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-warm-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <svg
              className={`w-5 h-5 text-warm-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
            {!isExpanded && (
              <div className="text-xs text-warm-gray-500 mt-1 truncate">
                {getFilterSummary}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 md:px-5 pb-4 md:pb-5">
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
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="block text-xs font-semibold text-warm-gray-700 mb-2">Category</label>
          <div className="flex gap-2 md:gap-3 flex-wrap">
            <button
              onClick={handleClearAllCategories}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                getSelectedCategoryIds().length === 0
                  ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                  : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
              }`}
            >
              <span>All Categories</span>
            </button>
            {categories?.map((cat) => {
              const selectedIds = getSelectedCategoryIds();
              const isSelected = selectedIds.includes(cat.id);
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
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="block text-xs font-semibold text-warm-gray-700 mb-2">Min Amount</label>
          <div className="flex gap-2 md:gap-3 flex-wrap">
            {MIN_AMOUNT_OPTIONS.map((option) => (
              <button
                key={option.value || 'all'}
                onClick={() => handleMinAmountChange(option.value === undefined ? '' : option.value.toString())}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                  localFilters.min_amount === option.value
                    ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                    : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
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
      </div>
    </div>
  );
};

export default ExpenseFiltersComponent;

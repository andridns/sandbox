import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, tagsApi } from '../../services/api';
import type { ExpenseFilters } from '../../types';
import { PAYMENT_METHODS, MIN_AMOUNT_OPTIONS, getDateRangeOptions, getDateRange, type DateRangePreset } from '../../utils/constants';

interface ExpenseFiltersProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
}

const ExpenseFiltersComponent = ({ filters, onFiltersChange }: ExpenseFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<ExpenseFilters>(filters);
  const [tagQuery, setTagQuery] = useState('');
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

  const { data: tagSuggestions } = useQuery({
    queryKey: ['tag-suggestions', tagQuery],
    queryFn: () => tagsApi.getSuggestions(tagQuery),
    enabled: tagQuery.length > 0,
  });

  // Sync localFilters when filters prop changes from outside (not from our own onFiltersChange)
  useEffect(() => {
    // Only sync if filters prop is different from what we last sent
    // This prevents syncing back our own changes
    const filtersChanged = 
      filters.category_id !== lastSentFilters.current.category_id ||
      filters.start_date !== lastSentFilters.current.start_date ||
      filters.end_date !== lastSentFilters.current.end_date ||
      filters.tags !== lastSentFilters.current.tags ||
      filters.payment_method !== lastSentFilters.current.payment_method ||
      filters.min_amount !== lastSentFilters.current.min_amount ||
      filters.max_amount !== lastSentFilters.current.max_amount ||
      filters.search !== lastSentFilters.current.search;
    
    if (filtersChanged) {
      setLocalFilters(filters);
      // Update lastSentFilters to prevent re-syncing
      lastSentFilters.current = filters;
    }
  }, [filters.category_id, filters.start_date, filters.end_date, filters.tags, filters.payment_method, filters.min_amount, filters.max_amount, filters.search]);

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

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-apple">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div>
          <label className="block text-sm font-medium text-warm-gray-700 mb-2">Search</label>
          <input
            type="text"
            value={localFilters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search expenses..."
            className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-gray-700 mb-2">Category</label>
          <select
            value={localFilters.category_id || ''}
            onChange={(e) => handleChange('category_id', e.target.value)}
            className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
          >
            <option value="">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-gray-700 mb-2">Payment Method</label>
          <select
            value={localFilters.payment_method || ''}
            onChange={(e) => handleChange('payment_method', e.target.value)}
            className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
          >
            <option value="">All Methods</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-gray-700 mb-2">Date Range</label>
          <select
            value={dateRangePreset}
            onChange={(e) => handleDateRangeChange(e.target.value as DateRangePreset)}
            className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-gray-700 mb-2">Minimum Amount</label>
          <select
            value={localFilters.min_amount || ''}
            onChange={(e) => handleMinAmountChange(e.target.value)}
            className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
          >
            {MIN_AMOUNT_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-warm-gray-700 mb-2">Tags</label>
          <div className="relative">
            <input
              type="text"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              onBlur={() => {
                // Delay to allow click on suggestions
                setTimeout(() => {
                  if (tagQuery) {
                    handleChange('tags', tagQuery);
                  }
                }, 200);
              }}
              placeholder="Enter tags..."
              className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
            />
            {tagSuggestions && tagSuggestions.length > 0 && tagQuery && (
              <div className="absolute z-20 mt-1 w-full bg-white border-2 border-warm-gray-200 rounded-xl shadow-apple-lg p-2 max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {tagSuggestions.slice(0, 5).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        setTagQuery(tag);
                        handleChange('tags', tag);
                        setTagQuery('');
                      }}
                      className="px-2.5 py-1 bg-beige-100 text-warm-gray-700 text-xs rounded-lg hover:bg-beige-200 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 md:mt-6 flex justify-end">
        <button
          onClick={clearFilters}
          className="w-full sm:w-auto px-4 py-2.5 md:px-5 text-warm-gray-700 bg-beige-100 rounded-xl hover:bg-beige-200 transition-colors font-medium text-sm md:text-base"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default ExpenseFiltersComponent;

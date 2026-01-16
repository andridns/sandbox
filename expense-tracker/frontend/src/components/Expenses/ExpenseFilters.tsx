import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, tagsApi } from '../../services/api';
import type { ExpenseFilters } from '../../types';
import { PAYMENT_METHODS, MIN_AMOUNT_OPTIONS, DATE_RANGE_OPTIONS, getDateRange, type DateRangePreset } from '../../utils/constants';

interface ExpenseFiltersProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
}

const ExpenseFiltersComponent = ({ filters, onFiltersChange }: ExpenseFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<ExpenseFilters>(filters);
  const [tagQuery, setTagQuery] = useState('');
  
  // Initialize date range preset based on filters
  const getInitialDatePreset = (): DateRangePreset => {
    const { start_date, end_date } = filters;
    if (!start_date && !end_date) return 'all';
    
    const matchedPreset = DATE_RANGE_OPTIONS.find((option) => {
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

  // Sync localFilters when filters prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Detect current date range preset from filters
  useEffect(() => {
    const { start_date, end_date } = localFilters;
    
    if (!start_date && !end_date) {
      setDateRangePreset('all');
      return;
    }
    
    // Try to match against presets
    const matchedPreset = DATE_RANGE_OPTIONS.find((option) => {
      if (option.value === 'all') return false;
      const range = getDateRange(option.value);
      return range.start_date === start_date && range.end_date === end_date;
    });
    
    setDateRangePreset(matchedPreset?.value || 'custom');
  }, [localFilters.start_date, localFilters.end_date]);

  useEffect(() => {
    onFiltersChange(localFilters);
  }, [localFilters, onFiltersChange]);

  const handleChange = (key: keyof ExpenseFilters, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleMinAmountChange = (value: string) => {
    const minAmount = value === '' ? undefined : Number(value);
    setLocalFilters((prev) => ({
      ...prev,
      min_amount: minAmount,
      max_amount: undefined, // Clear max_amount since we're only filtering by minimum
    }));
  };

  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    const range = getDateRange(preset);
    setLocalFilters((prev) => ({
      ...prev,
      start_date: range.start_date,
      end_date: range.end_date,
    }));
  };

  const clearFilters = () => {
    setLocalFilters({});
    setDateRangePreset('all');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-apple">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div>
          <label className="block text-sm font-medium text-warm-gray-700 mb-2">Search</label>
          <input
            type="text"
            value={localFilters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search expenses..."
            className="w-full px-4 py-2.5 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-gray-700 mb-2">Category</label>
          <select
            value={localFilters.category_id || ''}
            onChange={(e) => handleChange('category_id', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all"
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
            className="w-full px-4 py-2.5 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all"
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
            className="w-full px-4 py-2.5 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all"
          >
            {DATE_RANGE_OPTIONS.map((option) => (
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
            className="w-full px-4 py-2.5 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all"
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
              onBlur={(e) => {
                // Delay to allow click on suggestions
                setTimeout(() => {
                  if (tagQuery) {
                    handleChange('tags', tagQuery);
                  }
                }, 200);
              }}
              placeholder="Enter tags..."
              className="w-full px-4 py-2.5 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all"
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

      <div className="mt-6 flex justify-end">
        <button
          onClick={clearFilters}
          className="px-5 py-2.5 text-warm-gray-700 bg-beige-100 rounded-xl hover:bg-beige-200 transition-colors font-medium"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default ExpenseFiltersComponent;

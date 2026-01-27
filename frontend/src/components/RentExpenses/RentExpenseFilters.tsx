import { useState, useMemo } from 'react';
import type { RentExpenseCategory } from '../../types';

interface RentExpenseFiltersProps {
  periodType: 'monthly' | 'quarterly' | 'semester' | 'yearly';
  selectedCategories: RentExpenseCategory[];
  usageView: 'cost' | 'electricity_usage' | 'water_usage';
  onPeriodTypeChange: (type: 'monthly' | 'quarterly' | 'semester' | 'yearly') => void;
  onCategoryToggle: (category: RentExpenseCategory) => void;
  onClearCategories: () => void;
  onUsageViewChange: (view: 'cost' | 'electricity_usage' | 'water_usage') => void;
}

const RentExpenseFilters = ({
  periodType,
  selectedCategories,
  usageView,
  onPeriodTypeChange,
  onCategoryToggle,
  onClearCategories,
  onUsageViewChange,
}: RentExpenseFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categories: { id: RentExpenseCategory; label: string; icon: string }[] = [
    { id: 'electricity', label: 'Electricity', icon: '⚡' },
    { id: 'water', label: 'Water', icon: '💧' },
    { id: 'service_charge', label: 'Service Charge', icon: '🏢' },
    { id: 'sinking_fund', label: 'Sinking Fund', icon: '💰' },
    { id: 'fitout', label: 'Fitout', icon: '🔧' },
  ];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (usageView === 'cost' && selectedCategories.length > 0) count++;
    if (usageView !== 'cost') count++;
    return count;
  }, [selectedCategories.length, usageView]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Period: ${periodType.charAt(0).toUpperCase() + periodType.slice(1)}`);
    if (usageView === 'cost' && selectedCategories.length > 0) {
      const categoryLabels = selectedCategories.map(c => {
        const cat = categories.find(cat => cat.id === c);
        return cat ? cat.label : c;
      });
      parts.push(`Categories: ${categoryLabels.join(', ')}`);
    }
    if (usageView !== 'cost') {
      if (usageView === 'electricity_usage') {
        parts.push('View: Electricity Usage (kWh)');
      } else if (usageView === 'water_usage') {
        parts.push('View: Water Usage (m³)');
      }
    }
    return parts.join(' • ');
  }, [periodType, selectedCategories, usageView, categories]);

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
                {filterSummary}
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
        <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-4">
        {/* Period Toggle */}
        <div>
          <label className="block text-sm font-semibold text-warm-gray-700 mb-3">Period</label>
          <div className="flex gap-2 md:gap-3 flex-wrap">
            <button
              onClick={() => onPeriodTypeChange('monthly')}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                periodType === 'monthly'
                  ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                  : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => onPeriodTypeChange('quarterly')}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                periodType === 'quarterly'
                  ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                  : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
              }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => onPeriodTypeChange('semester')}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                periodType === 'semester'
                  ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                  : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
              }`}
            >
              Semester
            </button>
            <button
              onClick={() => onPeriodTypeChange('yearly')}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                periodType === 'yearly'
                  ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                  : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Category Filter Buttons - Only show in cost view */}
        {usageView === 'cost' && (
          <div>
            <label className="block text-sm font-semibold text-warm-gray-700 mb-3">Category</label>
            <div className="flex gap-2 md:gap-3 flex-wrap">
              <button
                onClick={onClearCategories}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                  selectedCategories.length === 0
                    ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                    : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                }`}
              >
                <span>All Categories</span>
              </button>
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => onCategoryToggle(cat.id)}
                    className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                        : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Usage View Toggle */}
        <div>
          <label className="block text-sm font-semibold text-warm-gray-700 mb-3">View</label>
          <div className="flex gap-2 md:gap-3 flex-wrap">
            <button
              onClick={() => onUsageViewChange('cost')}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                usageView === 'cost'
                  ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                  : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
              }`}
            >
              Cost (IDR)
            </button>
            <button
              onClick={() => onUsageViewChange('electricity_usage')}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                usageView === 'electricity_usage'
                  ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                  : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
              }`}
            >
              <span>⚡</span>
              <span>Electricity Usage (kWh)</span>
            </button>
            <button
              onClick={() => onUsageViewChange('water_usage')}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                usageView === 'water_usage'
                  ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                  : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
              }`}
            >
              <span>💧</span>
              <span>Water Usage (m³)</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default RentExpenseFilters;

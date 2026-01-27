import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { expensesApi, categoriesApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/format';
import { CURRENCIES, OTHER_CURRENCIES } from '../../utils/constants';

// Smart parsing function: "100000 lunch" -> { amount: 100000, description: "lunch" }
const parseExpenseInput = (input: string): { amount: number | null; description: string } => {
  const trimmed = input.trim();
  if (!trimmed) return { amount: null, description: '' };

  // Try to match number at the start (supports formats like "100000", "100 000", "100.000", "100,000")
  const numberMatch = trimmed.match(/^([\d\s.,]+)/);
  
  if (numberMatch) {
    // Extract and clean the number
    const numberStr = numberMatch[1].replace(/[\s.,]/g, '');
    const amount = parseFloat(numberStr);
    
    if (!isNaN(amount) && amount > 0) {
      // Extract description (everything after the number)
      const description = trimmed.substring(numberMatch[0].length).trim();
      return { amount, description: description || '' };
    }
  }

  // If no number found, treat entire input as description
  return { amount: null, description: trimmed };
};

const QuickExpenseForm = () => {
  const [input, setInput] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showOtherCurrencies, setShowOtherCurrencies] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  // Set "Food & Dining" category as default when categories load
  useEffect(() => {
    if (categories && categories.length > 0 && !categoryId) {
      const foodDiningCategory = categories.find(cat => cat.name === 'Food & Dining');
      if (foodDiningCategory) {
        setCategoryId(foodDiningCategory.id);
      }
    }
  }, [categories, categoryId]);

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      setInput('');
      setCurrency('IDR');
      setDate(new Date().toISOString().split('T')[0]);
      // Reset to "Food & Dining" category
      const foodDiningCategory = categories?.find(cat => cat.name === 'Food & Dining');
      setCategoryId(foodDiningCategory?.id || null);
      toast.success('Expense added!');
      inputRef.current?.focus();
    },
    onError: () => {
      toast.error('Failed to add expense');
    },
  });

  const parsed = parseExpenseInput(input);
  const canSubmit = parsed.amount !== null && parsed.amount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) {
      toast.error('Please enter a valid amount');
      return;
    }

    createMutation.mutate({
      amount: parsed.amount!,
      currency: currency,
      description: parsed.description || 'Expense',
      category_id: categoryId,
      date: date,
      tags: [],
      is_recurring: false,
    });
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOtherCurrencies(false);
      }
    };

    if (showOtherCurrencies) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOtherCurrencies]);

  // Check if current currency is not IDR, JPY, or USD
  const isOtherCurrency = !['IDR', 'JPY', 'USD'].includes(currency);
  
  // Get current currency display info
  const getCurrentCurrencyInfo = () => {
    const allCurrencies = [...CURRENCIES, ...OTHER_CURRENCIES];
    return allCurrencies.find(c => c.code === currency);
  };

  // Get all currencies except IDR, JPY, USD for the "Other" dropdown, sorted alphabetically
  const getOtherCurrencies = () => {
    const mainCurrencies = CURRENCIES.filter(c => !['IDR', 'JPY', 'USD'].includes(c.code));
    const allOtherCurrencies = [...mainCurrencies, ...OTHER_CURRENCIES];
    return allOtherCurrencies.sort((a, b) => a.code.localeCompare(b.code));
  };

  const handleOtherCurrencySelect = (selectedCurrency: string) => {
    setCurrency(selectedCurrency);
    setShowOtherCurrencies(false);
  };

  return (
    <div className="glass rounded-2xl shadow-modern-lg border border-modern-border/50 p-3 md:p-4 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          {/* Text Input & Add Button */}
          <div className="mb-3">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                ref={inputRef}
                id="quick-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., 100000 lunch or 200.000 coffee"
                className="flex-1 px-3 py-2 md:px-4 md:py-3 text-base md:text-lg border-2 border-modern-border/50 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-modern-text placeholder-modern-text-light transition-all shadow-modern"
                autoFocus
              />
              <button
                type="submit"
                disabled={!canSubmit || createMutation.isPending}
                className="w-full md:w-auto px-4 py-2 md:px-6 md:py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-modern-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm md:text-base transition-all duration-200 shadow-modern hover:scale-[1.02] active:scale-[0.98]"
              >
                {createMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
            {parsed.amount && (
              <div className="mt-2 text-xs md:text-sm text-modern-text-light">
                <span className="font-bold text-modern-text">{formatCurrency(parsed.amount, currency)}</span>
                {parsed.description && <span className="ml-2 font-medium">• {parsed.description}</span>}
              </div>
            )}
          </div>

          {/* Currency Selection Buttons */}
          <div className="mb-3">
            <label className="block text-xs md:text-sm font-medium text-warm-gray-700 mb-2">
              Currency
            </label>
            <div className="flex gap-1.5 md:gap-2 flex-wrap relative">
              {/* IDR Button */}
              <button
                type="button"
                onClick={() => setCurrency('IDR')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                  currency === 'IDR'
                    ? 'bg-primary-600 text-white shadow-modern hover:bg-primary-700 hover:shadow-modern-lg'
                    : 'bg-modern-border/10 text-modern-text-light hover:bg-primary-50 hover:text-primary-600 border border-modern-border/30'
                }`}
              >
                IDR Rp
              </button>
              
              {/* JPY Button */}
              <button
                type="button"
                onClick={() => setCurrency('JPY')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                  currency === 'JPY'
                    ? 'bg-primary-600 text-white shadow-modern hover:bg-primary-700 hover:shadow-modern-lg'
                    : 'bg-modern-border/10 text-modern-text-light hover:bg-primary-50 hover:text-primary-600 border border-modern-border/30'
                }`}
              >
                JPY ¥
              </button>
              
              {/* USD Button */}
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                  currency === 'USD'
                    ? 'bg-primary-600 text-white shadow-modern hover:bg-primary-700 hover:shadow-modern-lg'
                    : 'bg-modern-border/10 text-modern-text-light hover:bg-primary-50 hover:text-primary-600 border border-modern-border/30'
                }`}
              >
                USD $
              </button>
            
              {/* Other Currencies Button */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowOtherCurrencies(!showOtherCurrencies)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                    isOtherCurrency
                      ? 'bg-primary-600 text-white shadow-modern hover:bg-primary-700 hover:shadow-modern-lg'
                      : 'bg-modern-border/10 text-modern-text-light hover:bg-primary-50 hover:text-primary-600 border border-modern-border/30'
                  }`}
                >
                  {isOtherCurrency 
                    ? `${getCurrentCurrencyInfo()?.code} ${getCurrentCurrencyInfo()?.symbol}`
                    : 'Other ▼'
                  }
                </button>
                
                {/* Dropdown */}
                {showOtherCurrencies && (
                  <div className="absolute top-full left-0 mt-2 bg-white border-2 border-modern-border/50 rounded-xl shadow-modern-lg z-50 max-h-64 overflow-y-auto min-w-[200px]">
                    <div className="p-2">
                      {getOtherCurrencies().map((curr) => (
                        <button
                          key={curr.code}
                          type="button"
                          onClick={() => handleOtherCurrencySelect(curr.code)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currency === curr.code
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-modern-text hover:bg-primary-50'
                          }`}
                        >
                          <span className="font-semibold">{curr.code}</span> {curr.symbol} - {curr.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="mb-3">
            <label className="block text-xs md:text-sm font-medium text-warm-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-2.5 border-2 border-modern-border/50 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-modern-text transition-all text-sm md:text-base shadow-modern"
            />
          </div>

          {/* Category Selection Buttons */}
          <div className="mb-3">
            <label className="block text-xs md:text-sm font-medium text-warm-gray-700 mb-2">
              Category
            </label>
            <div className="flex gap-1.5 md:gap-2 flex-wrap">
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1 ${
                    categoryId === cat.id
                      ? 'bg-primary-600 text-white shadow-modern hover:bg-primary-700 hover:shadow-modern-lg'
                      : 'bg-modern-border/10 text-modern-text-light hover:bg-primary-50 hover:text-primary-600 border border-modern-border/30'
                  }`}
                >
                  <span>{cat.icon || '📁'}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuickExpenseForm;

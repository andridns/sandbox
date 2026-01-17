import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { expensesApi, categoriesApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/format';
import { CURRENCIES, PAYMENT_METHODS } from '../../utils/constants';

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
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      setInput('');
      setCategoryId(null);
      setPaymentMethod('Cash');
      setCurrency('IDR');
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
      date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      tags: [],
      is_recurring: false,
    });
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="glass rounded-2xl shadow-modern-lg border border-modern-border/50 p-4 md:p-8 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="quick-input" className="block text-sm font-semibold text-modern-text-light mb-4 uppercase tracking-wide">
            Quick Add Expense
          </label>
          
          {/* Currency Selection Buttons */}
          <div className="flex gap-2 md:gap-3 mb-5 flex-wrap">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.code}
                type="button"
                onClick={() => setCurrency(curr.code)}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                  currency === curr.code
                    ? 'bg-primary-600 text-white shadow-modern hover:bg-primary-700 hover:shadow-modern-lg'
                    : 'bg-modern-border/10 text-modern-text-light hover:bg-primary-50 hover:text-primary-600 border border-modern-border/30'
                }`}
              >
                {curr.code} {curr.symbol}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              ref={inputRef}
              id="quick-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 100000 lunch or 200.000 coffee"
              className="flex-1 px-4 py-3 md:px-6 md:py-4 text-base md:text-xl border-2 border-modern-border/50 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-modern-text placeholder-modern-text-light transition-all shadow-modern"
              autoFocus
            />
            <button
              type="submit"
              disabled={!canSubmit || createMutation.isPending}
              className="w-full md:w-auto px-6 py-3 md:px-8 md:py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-modern-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base md:text-lg transition-all duration-200 shadow-modern hover:scale-[1.02] active:scale-[0.98]"
            >
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
          {parsed.amount && (
            <div className="mt-3 text-sm md:text-base text-modern-text-light">
              <span className="font-bold text-modern-text">{formatCurrency(parsed.amount, currency)}</span>
              {parsed.description && <span className="ml-2 font-medium">• {parsed.description}</span>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-warm-gray-200">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                Category
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full px-4 py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all"
              >
                <option value="">No category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>
      </form>
    </div>
  );
};

export default QuickExpenseForm;

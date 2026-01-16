import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { expensesApi, categoriesApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/format';

const PAYMENT_METHODS = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'GoPay',
  'OVO',
  'DANA',
  'LinkAja',
  'ShopeePay',
];

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

const CURRENCIES = [
  { code: 'IDR', name: 'Rupiah', symbol: 'Rp' },
  { code: 'JPY', name: 'Yen', symbol: '¥' },
  { code: 'USD', name: 'Dollar', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', name: 'Ringgit', symbol: 'RM' },
];

const QuickExpenseForm = () => {
  const [input, setInput] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      setShowAdvanced(false);
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="quick-input" className="block text-sm font-medium text-gray-700 mb-2">
            Quick Add Expense
          </label>
          
          {/* Currency Selection Buttons */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.code}
                type="button"
                onClick={() => setCurrency(curr.code)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currency === curr.code
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {curr.code} {curr.symbol}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="quick-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 100000 lunch or 200.000 coffee"
              className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!canSubmit || createMutation.isPending}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
            >
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
          {parsed.amount && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">{formatCurrency(parsed.amount, currency)}</span>
              {parsed.description && <span> • {parsed.description}</span>}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default QuickExpenseForm;

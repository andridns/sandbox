import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { expensesApi, categoriesApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import type { ExpenseCreate, ExpenseUpdate } from '../../types';
import { CURRENCIES, OTHER_CURRENCIES } from '../../utils/constants';

interface ExpenseFormProps {
  expenseId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ExpenseForm = ({ expenseId, onClose, onSuccess }: ExpenseFormProps) => {
  const [formData, setFormData] = useState<ExpenseCreate>({
    amount: 0,
    currency: 'IDR',
    description: '',
    category_id: null,
    date: new Date().toISOString().split('T')[0],
    tags: [],
    receipt_url: null,
    location: null,
    notes: null,
    is_recurring: false,
  });
  const [showOtherCurrencies, setShowOtherCurrencies] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  // Set "Food & Dining" category as default when categories load (only for new expenses)
  useEffect(() => {
    if (!expenseId && categories && categories.length > 0) {
      const foodDiningCategory = categories.find(cat => cat.name === 'Food & Dining');
      if (foodDiningCategory && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: foodDiningCategory.id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, expenseId]);

  const { data: expense } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expensesApi.getById(expenseId!),
    enabled: !!expenseId,
  });

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

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount,
        currency: expense.currency,
        description: expense.description,
        category_id: expense.category_id,
        date: expense.date,
        tags: expense.tags || [],
        receipt_url: null,
        location: null,
        notes: null,
        is_recurring: false,
      });
    }
  }, [expense]);

  const createMutation = useMutation({
    mutationFn: (data: ExpenseCreate) => expensesApi.create(data),
    onSuccess: () => {
      toast.success('Expense created successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to create expense');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseUpdate }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      toast.success('Expense updated successfully');
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      console.error('Error response:', error?.response?.data);
      
      let errorMessage = 'Failed to update expense';
      if (error?.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Pydantic validation errors
          const validationErrors = error.response.data.detail.map((d: any) => {
            const field = d.loc?.join('.') || 'field';
            const msg = d.msg || JSON.stringify(d);
            return `${field}: ${msg}`;
          });
          errorMessage = validationErrors.join(', ');
        } else {
          errorMessage = error.response.data.detail;
        }
      }
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required';
    }
    if (formData.description && formData.description.trim().length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }
    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (formData.currency && formData.currency.length > 3) {
      newErrors.currency = 'Currency code must be 3 characters or less';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (expenseId) {
      // Prepare update data with proper formatting
      // Form validation ensures amount > 0 and description is not empty
      // Convert empty strings to null for optional fields
      const updateData: ExpenseUpdate = {
        amount: formData.amount,
        currency: formData.currency,
        description: formData.description.trim(),
        category_id: formData.category_id || null,
        date: formData.date,
      };
      updateMutation.mutate({ id: expenseId, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Check if current currency is not IDR, JPY, or USD
  const currentCurrency = formData.currency || 'IDR';
  const isOtherCurrency = !['IDR', 'JPY', 'USD'].includes(currentCurrency);
  
  // Get current currency display info
  const getCurrentCurrencyInfo = () => {
    const allCurrencies = [...CURRENCIES, ...OTHER_CURRENCIES];
    return allCurrencies.find(c => c.code === currentCurrency);
  };

  // Get all currencies except IDR, JPY, USD for the "Other" dropdown, sorted alphabetically
  const getOtherCurrencies = () => {
    const mainCurrencies = CURRENCIES.filter(c => !['IDR', 'JPY', 'USD'].includes(c.code));
    const allOtherCurrencies = [...mainCurrencies, ...OTHER_CURRENCIES];
    return allOtherCurrencies.sort((a, b) => a.code.localeCompare(b.code));
  };

  const handleOtherCurrencySelect = (selectedCurrency: string) => {
    setFormData({ ...formData, currency: selectedCurrency });
    setShowOtherCurrencies(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-apple-lg max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-warm-gray-800">
              {expenseId ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <button
              onClick={onClose}
              className="text-warm-gray-500 hover:text-warm-gray-700 text-2xl md:text-3xl transition-colors"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  className={`w-full px-3 py-2.5 md:px-4 md:py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base ${
                    errors.amount ? 'border-red-400' : 'border-warm-gray-200'
                  }`}
                  required
                />
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Currency
                </label>
                <div className="flex gap-1.5 md:gap-2 flex-wrap relative">
                  {/* IDR Button */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: 'IDR' })}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                      currentCurrency === 'IDR'
                        ? 'bg-primary-600 text-white shadow-modern hover:bg-primary-700 hover:shadow-modern-lg'
                        : 'bg-modern-border/10 text-modern-text-light hover:bg-primary-50 hover:text-primary-600 border border-modern-border/30'
                    }`}
                  >
                    IDR Rp
                  </button>
                  
                  {/* JPY Button */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: 'JPY' })}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                      currentCurrency === 'JPY'
                        ? 'bg-primary-600 text-white shadow-modern hover:bg-primary-700 hover:shadow-modern-lg'
                        : 'bg-modern-border/10 text-modern-text-light hover:bg-primary-50 hover:text-primary-600 border border-modern-border/30'
                    }`}
                  >
                    JPY ¥
                  </button>
                  
                  {/* USD Button */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: 'USD' })}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 ${
                      currentCurrency === 'USD'
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
                                currentCurrency === curr.code
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`w-full px-3 py-2.5 md:px-4 md:py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base ${
                    errors.description ? 'border-red-400' : 'border-warm-gray-200'
                  }`}
                  required
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                )}
              </div>


              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                  required
                />
              </div>


            </div>

            {/* Category Selection Buttons */}
            <div className="pt-4 pb-2 border-t border-warm-gray-200">
              <label className="block text-sm font-medium text-warm-gray-700 mb-3">
                Category
              </label>
              <div className="flex gap-2 md:gap-3 flex-wrap">
                {categories?.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        category_id: cat.id,
                      })
                    }
                    className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                      formData.category_id === cat.id
                        ? 'bg-primary-600 text-white shadow-apple hover:bg-primary-700 hover:shadow-apple-lg'
                        : 'bg-warm-gray-100 text-warm-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-warm-gray-200'
                    }`}
                  >
                    <span>{cat.icon || '📁'}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 md:py-3 text-warm-gray-700 bg-beige-100 rounded-xl hover:bg-beige-200 transition-colors font-medium text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full sm:w-auto px-4 py-2.5 md:py-3 bg-primary-400 text-white rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm md:text-base shadow-apple hover:shadow-apple-lg"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : expenseId
                  ? 'Update'
                  : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;

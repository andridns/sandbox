import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { budgetsApi, categoriesApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import type { BudgetCreate } from '../../types';
import { CURRENCIES } from '../../utils/constants';

interface BudgetFormProps {
  budgetId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BudgetForm = ({ budgetId, onClose, onSuccess }: BudgetFormProps) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [formData, setFormData] = useState<BudgetCreate>({
    category_id: null,
    amount: 0,
    currency: 'IDR',
    period: 'monthly',
    start_date: startOfMonth.toISOString().split('T')[0],
    end_date: endOfMonth.toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const { data: budget } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => budgetsApi.getById(budgetId!),
    enabled: !!budgetId,
  });

  useEffect(() => {
    if (budget) {
      setFormData({
        category_id: budget.category_id,
        amount: budget.amount,
        currency: budget.currency,
        period: budget.period,
        start_date: budget.start_date,
        end_date: budget.end_date,
      });
    }
  }, [budget]);

  const createMutation = useMutation({
    mutationFn: (data: BudgetCreate) => budgetsApi.create(data),
    onSuccess: () => {
      toast.success('Budget created successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to create budget');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BudgetCreate> }) =>
      budgetsApi.update(id, data),
    onSuccess: () => {
      toast.success('Budget updated successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to update budget');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (budgetId) {
      updateMutation.mutate({ id: budgetId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handlePeriodChange = (period: 'monthly' | 'yearly') => {
    setFormData({ ...formData, period });
    const start = new Date(formData.start_date);
    let end: Date;

    if (period === 'yearly') {
      end = new Date(start.getFullYear(), 11, 31);
    } else {
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }

    setFormData({
      ...formData,
      period,
      end_date: end.toISOString().split('T')[0],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-xl md:rounded-lg shadow-xl max-w-lg w-full mx-2 md:mx-4 max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-warm-gray-800">
              {budgetId ? 'Edit Budget' : 'Add Budget'}
            </h2>
            <button
              onClick={onClose}
              className="text-warm-gray-500 hover:text-warm-gray-700 text-2xl md:text-3xl transition-colors"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Budget Type
                </label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category_id: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                >
                <option value="">Total Budget</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} Budget
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
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
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                Period *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePeriodChange('monthly')}
                  className={`flex-1 px-4 py-2.5 md:py-3 rounded-xl font-medium text-sm md:text-base transition-colors ${
                    formData.period === 'monthly'
                      ? 'bg-primary-400 text-white shadow-apple'
                      : 'bg-beige-100 text-warm-gray-700 hover:bg-beige-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('yearly')}
                  className={`flex-1 px-4 py-2.5 md:py-3 rounded-xl font-medium text-sm md:text-base transition-colors ${
                    formData.period === 'yearly'
                      ? 'bg-primary-400 text-white shadow-apple'
                      : 'bg-beige-100 text-warm-gray-700 hover:bg-beige-200'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  className={`w-full px-3 py-2.5 md:px-4 md:py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base ${
                    errors.end_date ? 'border-red-400' : 'border-warm-gray-200'
                  }`}
                  required
                />
                {errors.end_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
                )}
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
                  : budgetId
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

export default BudgetForm;

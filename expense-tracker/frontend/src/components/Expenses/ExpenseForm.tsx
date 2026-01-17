import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { expensesApi, categoriesApi, uploadApi, tagsApi } from '../../services/api';
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
    payment_method: 'Cash', // Default payment method
    receipt_url: null,
    location: null,
    notes: null,
    is_recurring: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  // Set "Other" category as default when categories load (only for new expenses)
  useEffect(() => {
    if (!expenseId && categories && categories.length > 0) {
      const otherCategory = categories.find(cat => cat.name === 'Other');
      if (otherCategory && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: otherCategory.id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, expenseId]);

  const { data: expense } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expensesApi.getById(expenseId!),
    enabled: !!expenseId,
  });

  const { data: tagSuggestions } = useQuery({
    queryKey: ['tag-suggestions', tagInput],
    queryFn: () => tagsApi.getSuggestions(tagInput),
    enabled: tagInput.length > 0,
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount,
        currency: expense.currency,
        description: expense.description,
        category_id: expense.category_id,
        date: expense.date,
        tags: expense.tags || [],
        payment_method: expense.payment_method,
        receipt_url: expense.receipt_url,
        location: expense.location || null,
        notes: expense.notes || null,
        is_recurring: expense.is_recurring,
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
    onError: () => {
      toast.error('Failed to update expense');
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
    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (expenseId) {
      updateMutation.mutate({ id: expenseId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTagAdd = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleTagRemove = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadApi.uploadReceipt(file);
      setFormData({ ...formData, receipt_url: result.url });
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload receipt');
    }
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
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                  <optgroup label="Other Currencies">
                    {OTHER_CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
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


              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value || null })
                  }
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Tags
                </label>
                <div className="relative mb-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTagAdd();
                        }
                      }}
                      placeholder="Add tag..."
                      className="flex-1 px-3 py-2.5 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                    />
                    <button
                      type="button"
                      onClick={handleTagAdd}
                      className="w-full sm:w-auto px-4 py-2.5 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-colors text-sm md:text-base font-medium"
                    >
                      Add
                    </button>
                  </div>
                  {tagSuggestions && tagSuggestions.length > 0 && tagInput && (
                    <div className="absolute z-20 mt-1 w-full bg-white border-2 border-warm-gray-200 rounded-xl shadow-apple-lg p-2 max-h-40 overflow-y-auto">
                      <div className="flex flex-wrap gap-1.5">
                        {tagSuggestions.slice(0, 5).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input blur
                              setTagInput(tag);
                              handleTagAdd();
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
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-primary-100 text-primary-800 text-sm rounded flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleTagRemove(tag)}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value || null })
                  }
                  rows={3}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                  Receipt
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
                />
                {formData.receipt_url && (
                  <p className="text-sm text-gray-600 mt-1">
                    Receipt uploaded: {formData.receipt_url}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) =>
                      setFormData({ ...formData, is_recurring: e.target.checked })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-warm-gray-700">
                    Recurring expense
                  </span>
                </label>
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

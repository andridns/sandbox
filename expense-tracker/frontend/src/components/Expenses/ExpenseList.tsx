import { useState } from 'react';
import { formatDate } from '../../utils/format';
import CurrencyDisplay from '../CurrencyDisplay';
import type { Expense } from '../../types';

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const ExpenseList = ({ expenses, isLoading, onEdit, onDelete }: ExpenseListProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-apple">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-beige-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-apple text-center">
        <p className="text-warm-gray-500">No expenses found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-apple-lg">
      <div className="p-6 border-b border-warm-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-warm-gray-800">
          {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-primary-400 text-white shadow-apple'
                : 'bg-beige-100 text-warm-gray-700 hover:bg-beige-200'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              viewMode === 'table'
                ? 'bg-primary-400 text-white shadow-apple'
                : 'bg-beige-100 text-warm-gray-700 hover:bg-beige-200'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="divide-y divide-warm-gray-200">
          {expenses.map((expense) => (
            <div key={expense.id} className="p-5 hover:bg-beige-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-warm-gray-800">{expense.description}</h4>
                    {expense.is_recurring && (
                      <span className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs rounded-lg font-medium">
                        Recurring
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-warm-gray-600 space-x-4">
                    <span>{formatDate(expense.date)}</span>
                    <span>{expense.payment_method}</span>
                    {expense.location && <span>📍 {expense.location}</span>}
                  </div>
                  {expense.tags && expense.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {expense.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-beige-100 text-warm-gray-700 text-xs rounded-lg"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-warm-gray-800">
                    <CurrencyDisplay 
                      amount={expense.amount} 
                      currency={expense.currency}
                      size="lg"
                    />
                  </p>
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => onEdit(expense.id)}
                      className="text-primary-500 hover:text-primary-600 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(expense.id)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-beige-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-5 py-4 text-left text-xs font-medium text-warm-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-beige-50 transition-colors">
                  <td className="px-5 py-4 text-sm text-warm-gray-800">
                    {formatDate(expense.date)}
                  </td>
                  <td className="px-5 py-4 text-sm text-warm-gray-800">
                    <div className="flex items-center gap-2">
                      {expense.description}
                      {expense.is_recurring && (
                        <span className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs rounded-lg">
                          🔄
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-warm-gray-600">-</td>
                  <td className="px-5 py-4 text-sm font-semibold text-warm-gray-800">
                    <CurrencyDisplay 
                      amount={expense.amount} 
                      currency={expense.currency}
                      size="sm"
                    />
                  </td>
                  <td className="px-5 py-4 text-sm text-warm-gray-600">{expense.payment_method}</td>
                  <td className="px-5 py-4 text-sm">
                    <div className="flex gap-3">
                      <button
                        onClick={() => onEdit(expense.id)}
                        className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="text-red-500 hover:text-red-600 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;

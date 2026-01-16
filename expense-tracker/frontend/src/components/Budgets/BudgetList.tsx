import CurrencyDisplay from '../CurrencyDisplay';
import type { Budget } from '../../types';

interface BudgetListProps {
  budgets: Budget[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const BudgetList = ({ budgets, isLoading, onEdit, onDelete }: BudgetListProps) => {
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

  if (budgets.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-apple text-center">
        <p className="text-warm-gray-500">No budgets found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-apple-lg">
      <div className="p-6 border-b border-warm-gray-200">
        <h3 className="text-lg font-semibold text-warm-gray-800">
          {budgets.length} {budgets.length === 1 ? 'budget' : 'budgets'}
        </h3>
      </div>

      <div className="divide-y divide-warm-gray-200">
        {budgets.map((budget) => (
          <div key={budget.id} className="p-5 hover:bg-beige-50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-warm-gray-800">
                    {budget.category_id ? 'Category Budget' : 'Total Budget'}
                  </h4>
                  <span className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs rounded-lg capitalize font-medium">
                    {budget.period}
                  </span>
                </div>
                <div className="text-sm text-warm-gray-600">
                  <p>
                    {new Date(budget.start_date).toLocaleDateString()} -{' '}
                    {new Date(budget.end_date).toLocaleDateString()}
                  </p>
                  <p className="mt-1">
                    Amount: <CurrencyDisplay 
                      amount={budget.amount} 
                      currency={budget.currency}
                      size="sm"
                    />
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onEdit(budget.id)}
                  className="text-primary-500 hover:text-primary-600 text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(budget.id)}
                  className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetList;

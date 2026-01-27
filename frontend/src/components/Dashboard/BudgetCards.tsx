import { useQuery } from '@tanstack/react-query';
import { budgetsApi } from '../../services/api';
import { format } from 'date-fns';
import CurrencyDisplay from '../CurrencyDisplay';
import type { Budget } from '../../types';

interface BudgetCardProps {
  budget: Budget;
  startDate: string;
  endDate: string;
}

const BudgetCard = ({ budget, startDate, endDate }: BudgetCardProps) => {
  const { data: spentData } = useQuery({
    queryKey: ['budget-spent', budget.id, startDate, endDate],
    queryFn: () => budgetsApi.getSpent(budget.id, {
      start_date: startDate,
      end_date: endDate,
    }),
  });

  const spent = spentData?.spent_amount || 0;
  const percentage = spentData ? spentData.percentage : 0;
  const remaining = (spentData?.remaining || budget.amount) - spent;
  const isOverBudget = spent > budget.amount;

  return (
    <div className="border-2 border-warm-gray-200 rounded-xl p-4 md:p-5 bg-beige-50">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-warm-gray-800 text-sm md:text-base">
            {budget.category_id ? 'Category Budget' : 'Total Budget'}
          </h4>
          <p className="text-xs md:text-sm text-warm-gray-600 mt-1">
            <CurrencyDisplay 
              amount={budget.amount} 
              currency={budget.currency}
              size="sm"
            />
          </p>
        </div>
        <span
          className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-xl text-xs md:text-sm font-medium ml-2 flex-shrink-0 ${
            isOverBudget
              ? 'bg-red-100 text-red-700'
              : percentage > 80
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-primary-100 text-primary-700'
          }`}
        >
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-warm-gray-200 rounded-full h-2 md:h-2.5 mb-3">
        <div
          className={`h-2 md:h-2.5 rounded-full transition-all ${
            isOverBudget
              ? 'bg-red-500'
              : percentage > 80
              ? 'bg-yellow-500'
              : 'bg-primary-400'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs md:text-sm text-warm-gray-600">
        <span>
          Spent: <CurrencyDisplay 
            amount={spent} 
            currency={budget.currency}
            size="sm"
          />
        </span>
        <span>
          {isOverBudget ? 'Over by ' : 'Remaining: '}
          <CurrencyDisplay 
            amount={Math.abs(remaining)} 
            currency={budget.currency}
            size="sm"
          />
        </span>
      </div>
    </div>
  );
};

const BudgetCards = () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const { data: budgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.getAll('monthly'),
  });

  const currentBudgets = budgets?.filter(
    (budget) =>
      new Date(budget.start_date) <= today && new Date(budget.end_date) >= today
  ) || [];

  if (currentBudgets.length === 0) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-apple">
        <h3 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 md:mb-4">Budgets</h3>
        <p className="text-sm md:text-base text-warm-gray-500">No budgets set for this month</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-apple">
      <h3 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-4 md:mb-5">Current Budgets</h3>
      <div className="space-y-3 md:space-y-4">
        {currentBudgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            startDate={format(startOfMonth, 'yyyy-MM-dd')}
            endDate={format(endOfMonth, 'yyyy-MM-dd')}
          />
        ))}
      </div>
    </div>
  );
};

export default BudgetCards;

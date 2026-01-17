import CurrencyDisplay from '../CurrencyDisplay';
import type { SummaryReport } from '../../types';

interface SummaryCardsProps {
  summary?: SummaryReport;
}

const SummaryCards = ({ summary }: SummaryCardsProps) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-apple animate-pulse">
            <div className="h-3 md:h-4 bg-beige-200 rounded-lg w-1/2 mb-3"></div>
            <div className="h-6 md:h-8 bg-beige-200 rounded-lg w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-apple border-l-4 border-primary-400">
        <h3 className="text-xs md:text-sm font-medium text-warm-gray-600 mb-2 md:mb-3">Total Expenses</h3>
        <p className="text-2xl md:text-3xl font-semibold text-warm-gray-800">
          <CurrencyDisplay 
            amount={summary.total_amount} 
            currency={summary.currency || 'IDR'}
            size="lg"
          />
        </p>
        <p className="text-xs md:text-sm text-warm-gray-500 mt-2">{summary.total_expenses} transactions</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-apple border-l-4 border-primary-300">
        <h3 className="text-xs md:text-sm font-medium text-warm-gray-600 mb-2 md:mb-3">Average Expense</h3>
        <p className="text-2xl md:text-3xl font-semibold text-warm-gray-800">
          <CurrencyDisplay 
            amount={summary.average_amount} 
            currency={summary.currency || 'IDR'}
            size="lg"
          />
        </p>
        <p className="text-xs md:text-sm text-warm-gray-500 mt-2">Per transaction</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-apple border-l-4 border-primary-200 sm:col-span-2 lg:col-span-1">
        <h3 className="text-xs md:text-sm font-medium text-warm-gray-600 mb-2 md:mb-3">Period</h3>
        <p className="text-xl md:text-2xl font-semibold text-warm-gray-800 capitalize">{summary.period}</p>
        <p className="text-xs md:text-sm text-warm-gray-500 mt-2">
          {new Date(summary.start_date).toLocaleDateString()} - {new Date(summary.end_date).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default SummaryCards;

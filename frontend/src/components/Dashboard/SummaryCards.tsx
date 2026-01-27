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
      <div className="glass p-4 md:p-6 rounded-2xl shadow-modern border border-modern-border/50 hover:shadow-modern-lg transition-all duration-300 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
        <div className="relative">
          <div className="w-1 h-12 bg-gradient-primary rounded-full mb-3"></div>
          <h3 className="text-xs md:text-sm font-semibold text-modern-text-light mb-2 md:mb-3 uppercase tracking-wide">Total Expenses</h3>
          <p className="text-2xl md:text-3xl font-bold text-modern-text">
            <CurrencyDisplay 
              amount={summary.total_amount} 
              currency={summary.currency || 'IDR'}
              size="lg"
            />
          </p>
          <p className="text-xs md:text-sm text-modern-text-light mt-2 font-medium">{summary.total_expenses} transactions</p>
        </div>
      </div>

      <div className="glass p-4 md:p-6 rounded-2xl shadow-modern border border-modern-border/50 hover:shadow-modern-lg transition-all duration-300 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
        <div className="relative">
          <div className="w-1 h-12 bg-gradient-accent rounded-full mb-3"></div>
          <h3 className="text-xs md:text-sm font-semibold text-modern-text-light mb-2 md:mb-3 uppercase tracking-wide">Average Expense</h3>
          <p className="text-2xl md:text-3xl font-bold text-modern-text">
            <CurrencyDisplay 
              amount={summary.average_amount} 
              currency={summary.currency || 'IDR'}
              size="lg"
            />
          </p>
          <p className="text-xs md:text-sm text-modern-text-light mt-2 font-medium">Per transaction</p>
        </div>
      </div>

      <div className="glass p-4 md:p-6 rounded-2xl shadow-modern border border-modern-border/50 hover:shadow-modern-lg transition-all duration-300 group relative overflow-hidden sm:col-span-2 lg:col-span-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative">
          <div className="w-1 h-12 bg-gradient-to-b from-primary-400 to-accent-400 rounded-full mb-3"></div>
          <h3 className="text-xs md:text-sm font-semibold text-modern-text-light mb-2 md:mb-3 uppercase tracking-wide">Period</h3>
          <p className="text-xl md:text-2xl font-bold text-modern-text capitalize">{summary.period}</p>
          <p className="text-xs md:text-sm text-modern-text-light mt-2 font-medium">
            {new Date(summary.start_date).toLocaleDateString()} - {new Date(summary.end_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;

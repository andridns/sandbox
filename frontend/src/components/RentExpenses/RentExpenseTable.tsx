import type { RentExpense } from '../../types';
import CurrencyDisplay from '../CurrencyDisplay';

interface RentExpenseTableProps {
  expenses: RentExpense[];
}

const RentExpenseTable = ({ expenses }: RentExpenseTableProps) => {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-modern-text-light text-sm">
        No rent expenses found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-modern-border/10 to-transparent">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">
              Period
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold text-modern-text-light uppercase tracking-wider">
              Total
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold text-modern-text-light uppercase tracking-wider">
              Electricity
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold text-modern-text-light uppercase tracking-wider">
              Water
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold text-modern-text-light uppercase tracking-wider">
              Service Charge
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold text-modern-text-light uppercase tracking-wider">
              Sinking Fund
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold text-modern-text-light uppercase tracking-wider">
              Fitout
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-modern-border/30">
          {expenses.map((expense) => {
            const serviceChargeTotal = expense.service_charge_idr + expense.ppn_service_charge_idr;
            return (
              <tr key={expense.id} className="hover:bg-primary-50/20 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-modern-text">
                  {expense.period}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-modern-text text-right">
                  <CurrencyDisplay amount={expense.total_idr} currency="IDR" size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-modern-text text-right">
                  <CurrencyDisplay amount={expense.electric_m1_total_idr} currency="IDR" size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-modern-text text-right">
                  <CurrencyDisplay amount={expense.water_m1_total_idr} currency="IDR" size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-modern-text text-right">
                  <CurrencyDisplay amount={serviceChargeTotal} currency="IDR" size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-modern-text text-right">
                  <CurrencyDisplay amount={expense.sinking_fund_idr} currency="IDR" size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-modern-text text-right">
                  <CurrencyDisplay amount={expense.fitout_idr} currency="IDR" size="sm" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RentExpenseTable;

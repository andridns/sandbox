import type { RentExpense } from '../../types';
import CurrencyDisplay from '../CurrencyDisplay';

interface RentExpenseDetailCardProps {
  expense: RentExpense;
}

const RentExpenseDetailCard = ({ expense }: RentExpenseDetailCardProps) => {
  const serviceChargeTotal = expense.service_charge_idr + expense.ppn_service_charge_idr;
  
  return (
    <div className="bg-white rounded-2xl shadow-apple border border-modern-border/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 md:p-6">
        <h3 className="text-xl md:text-2xl font-bold mb-1">Rent Expense Details</h3>
        <p className="text-primary-100 text-base md:text-lg">{expense.period}</p>
        <div className="mt-4 pt-4 border-t border-primary-500/30">
          <div className="flex items-baseline gap-2">
            <span className="text-primary-200 text-sm">Total:</span>
            <span className="text-white text-xl font-bold">
              <CurrencyDisplay amount={expense.total_idr} currency="IDR" size="lg" />
            </span>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto scroll-smooth">
        {/* Service Charge Section */}
        <div className="border-b border-modern-border/20 pb-4">
          <h4 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 flex items-center gap-2">
            <span>🏢</span>
            <span>Service Charge</span>
          </h4>
          <div className="space-y-2 pl-5 md:pl-7">
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Service Charge</span>
              <CurrencyDisplay amount={expense.service_charge_idr} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">PPN Service Charge</span>
              <CurrencyDisplay amount={expense.ppn_service_charge_idr} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-modern-border/10">
              <span className="font-semibold text-warm-gray-800">Subtotal</span>
              <span className="font-semibold">
                <CurrencyDisplay amount={serviceChargeTotal} currency="IDR" size="sm" />
              </span>
            </div>
          </div>
        </div>

        {/* Sinking Fund Section */}
        <div className="border-b border-modern-border/20 pb-4">
          <h4 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 flex items-center gap-2">
            <span>💰</span>
            <span>Sinking Fund</span>
          </h4>
          <div className="pl-5 md:pl-7">
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Sinking Fund</span>
              <CurrencyDisplay amount={expense.sinking_fund_idr} currency="IDR" size="sm" />
            </div>
          </div>
        </div>

        {/* Electricity Section */}
        <div className="border-b border-modern-border/20 pb-4">
          <h4 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 flex items-center gap-2">
            <span>⚡</span>
            <span>Electricity</span>
          </h4>
          <div className="space-y-2 pl-5 md:pl-7">
            {expense.electric_kwh !== null && (
              <div className="flex justify-between items-center">
                <span className="text-warm-gray-600">Usage (kWh)</span>
                <span className="text-warm-gray-800 font-medium">
                  {typeof expense.electric_kwh === 'number' 
                    ? expense.electric_kwh.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : expense.electric_kwh} kWh
                </span>
              </div>
            )}
            {expense.electric_tarif_per_kwh !== null && (
              <div className="flex justify-between items-center">
                <span className="text-warm-gray-600">Tariff per kWh</span>
                <CurrencyDisplay 
                  amount={typeof expense.electric_tarif_per_kwh === 'number' ? expense.electric_tarif_per_kwh : parseFloat(expense.electric_tarif_per_kwh.toString())} 
                  currency="IDR" 
                  size="sm" 
                />
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Usage Cost</span>
              <CurrencyDisplay amount={expense.electric_usage_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">PPN</span>
              <CurrencyDisplay amount={expense.electric_ppn_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Area Bersama (Common Area)</span>
              <CurrencyDisplay amount={expense.electric_area_bersama_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">PJU (Street Lighting)</span>
              <CurrencyDisplay amount={expense.electric_pju_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-modern-border/10">
              <span className="font-semibold text-warm-gray-800">Electricity Subtotal</span>
              <span className="font-semibold">
                <CurrencyDisplay amount={expense.electric_m1_total_idr} currency="IDR" size="sm" />
              </span>
            </div>
          </div>
        </div>

        {/* Water Section */}
        <div className="border-b border-modern-border/20 pb-4">
          <h4 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 flex items-center gap-2">
            <span>💧</span>
            <span>Water</span>
          </h4>
          <div className="space-y-2 pl-5 md:pl-7">
            {expense.water_m3 !== null && (
              <div className="flex justify-between items-center">
                <span className="text-warm-gray-600">Usage (m³)</span>
                <span className="text-warm-gray-800 font-medium">
                  {typeof expense.water_m3 === 'number'
                    ? expense.water_m3.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : expense.water_m3} m³
                </span>
              </div>
            )}
            {expense.water_tarif_per_m3 !== null && (
              <div className="flex justify-between items-center">
                <span className="text-warm-gray-600">Tariff per m³</span>
                <CurrencyDisplay 
                  amount={typeof expense.water_tarif_per_m3 === 'number' ? expense.water_tarif_per_m3 : parseFloat(expense.water_tarif_per_m3.toString())} 
                  currency="IDR" 
                  size="sm" 
                />
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Usage Potable (Drinking Water)</span>
              <CurrencyDisplay amount={expense.water_usage_potable_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Usage Non-Potable</span>
              <CurrencyDisplay amount={expense.water_non_potable_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Air Limbah (Wastewater)</span>
              <CurrencyDisplay amount={expense.water_air_limbah_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">PPN Air Limbah</span>
              <CurrencyDisplay amount={expense.water_ppn_air_limbah_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Pemeliharaan (Maintenance)</span>
              <CurrencyDisplay amount={expense.water_pemeliharaan_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-gray-600">Area Bersama (Common Area)</span>
              <CurrencyDisplay amount={expense.water_area_bersama_idr || 0} currency="IDR" size="sm" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-modern-border/10">
              <span className="font-semibold text-warm-gray-800">Water Subtotal</span>
              <span className="font-semibold">
                <CurrencyDisplay amount={expense.water_m1_total_idr} currency="IDR" size="sm" />
              </span>
            </div>
          </div>
        </div>

        {/* Fitout Section */}
        {expense.fitout_idr > 0 && (
          <div className="border-b border-modern-border/20 pb-4">
            <h4 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 flex items-center gap-2">
              <span>🔧</span>
              <span>Fitout</span>
            </h4>
            <div className="pl-5 md:pl-7">
              <div className="flex justify-between items-center">
                <span className="text-warm-gray-600">Fitout</span>
                <CurrencyDisplay amount={expense.fitout_idr} currency="IDR" size="sm" />
              </div>
            </div>
          </div>
        )}

        {/* Source Info */}
        {expense.source && (
          <div className="pt-4 border-t border-modern-border/20">
            <p className="text-xs text-warm-gray-500">
              Source: {expense.source}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RentExpenseDetailCard;

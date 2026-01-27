import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import type { RentExpenseBreakdown } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RentExpenseBreakdownChartProps {
  data?: RentExpenseBreakdown;
  title?: string;
}

const RentExpenseBreakdownChart = ({ data, title = "Rent Expense Breakdown" }: RentExpenseBreakdownChartProps) => {
  // Debug logging
  console.log('RentExpenseBreakdownChart received data:', data);

  if (!data || !data.breakdown || data.breakdown.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-apple">
        <h3 className="text-lg font-semibold text-warm-gray-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-warm-gray-500">No data available</p>
          {data && <p className="text-xs text-warm-gray-400 mt-2">Debug: data exists but breakdown is {data.breakdown ? `array with ${data.breakdown.length} items` : 'missing'}</p>}
        </div>
      </div>
    );
  }

  // Color palette for categories
  const categoryColors: Record<string, string> = {
    electricity: '#f59e0b', // Amber
    water: '#3b82f6', // Blue
    service_charge: '#8b5cf6', // Purple
    sinking_fund: '#ef4444', // Red
    fitout: '#10b981', // Green
  };

  const chartData = {
    labels: data.breakdown.map((item) => {
      // Format category names
      const formatted = item.category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return formatted;
    }),
    datasets: [
      {
        data: data.breakdown.map((item) => item.total),
        backgroundColor: data.breakdown.map((item) => 
          categoryColors[item.category] || '#6b7280'
        ),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
            }).format(value)} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-apple">
      <h3 className="text-lg font-semibold text-warm-gray-800 mb-4">{title}</h3>
      <div className="h-64">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

export default RentExpenseBreakdownChart;

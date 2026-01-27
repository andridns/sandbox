import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { CategoryBreakdown } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryChartProps {
  data?: CategoryBreakdown;
}

const CategoryChart = ({ data }: CategoryChartProps) => {
  if (!data || !data.breakdown || data.breakdown.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-apple">
        <h3 className="text-lg font-semibold text-warm-gray-800 mb-4">Spending by Category</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-warm-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.breakdown.map((item) => item.category_name),
    datasets: [
      {
        data: data.breakdown.map((item) => item.total),
        backgroundColor: [
          '#60a5fa', // Sky blue
          '#3b82f6', // Blue
          '#93c5fd', // Light blue
          '#2563eb', // Darker blue
          '#dbeafe', // Very light blue
          '#1d4ed8', // Deep blue
          '#bfdbfe', // Pale blue
          '#1e40af', // Navy blue
          '#eff6ff', // Sky blue 50
          '#1e3a8a', // Dark blue
        ],
      },
    ],
  };

  const options = {
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
      <h3 className="text-lg font-semibold text-warm-gray-800 mb-4">Spending by Category</h3>
      <div className="h-64">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

export default CategoryChart;

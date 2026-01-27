import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import type { CategoryBreakdown } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CategoryBarChartProps {
  data?: CategoryBreakdown;
  title?: string;
}

const CategoryBarChart = ({ data, title = "Expenses by Category" }: CategoryBarChartProps) => {
  if (!data || !data.breakdown || data.breakdown.length === 0) {
    return (
      <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
        <h3 className="text-lg md:text-xl font-semibold text-warm-gray-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-warm-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  // Sort breakdown by total descending (highest to lowest)
  const sortedBreakdown = [...data.breakdown].sort((a, b) => b.total - a.total);

  const chartData = {
    labels: sortedBreakdown.map((item) => item.category_name),
    datasets: [
      {
        label: 'Total Expense (IDR)',
        data: sortedBreakdown.map((item) => item.total),
        backgroundColor: '#60a5fa', // Sky blue
        borderColor: '#3b82f6', // Blue
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bars
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.x || 0;
            const total = sortedBreakdown.reduce((sum, item) => sum + item.total, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
            }).format(value)} (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            return new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              notation: 'compact',
            }).format(value);
          },
        },
      },
      y: {
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  return (
    <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
      <h3 className="text-lg md:text-xl font-semibold text-warm-gray-800 mb-4">{title}</h3>
      <div className="h-96">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default CategoryBarChart;

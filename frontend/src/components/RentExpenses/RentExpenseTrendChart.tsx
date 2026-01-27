import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import type { RentExpenseTrend } from '../../types';
import { useRef } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

interface RentExpenseTrendChartProps {
  data?: RentExpenseTrend;
  title?: string;
  usageView?: 'cost' | 'electricity_usage' | 'water_usage';
  onDataPointClick?: (period: string) => void;
}

const RentExpenseTrendChart = ({ data, title = "Rent Expense Trends", usageView = 'cost', onDataPointClick }: RentExpenseTrendChartProps) => {
  const chartRef = useRef<ChartJS<'line', number[], string>>(null);

  if (!data || !data.trends || data.trends.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-apple">
        <h3 className="text-lg font-semibold text-warm-gray-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-warm-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  // Determine label and unit based on usage view
  const getLabel = () => {
    if (usageView === 'electricity_usage') return 'Electricity Usage (kWh)';
    if (usageView === 'water_usage') return 'Water Usage (m³)';
    return 'Total Rent Expense';
  };

  const chartData = {
    labels: data.trends.map((item) => item.period),
    datasets: [
      {
        label: getLabel(),
        data: data.trends.map((item) => item.total),
        borderColor: '#10b981', // Green
        backgroundColor: 'rgba(16, 185, 129, 0.1)', // Light green
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    onClick: (_event, elements) => {
      // Only allow clicking when in cost view
      if (usageView === 'cost' && elements && elements.length > 0 && onDataPointClick) {
        const element = elements[0];
        const index = element.index;
        const labels = chartData.labels;
        if (labels && labels[index]) {
          onDataPointClick(labels[index]);
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y || 0;
            if (usageView === 'electricity_usage') {
              return `Usage: ${value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`;
            } else if (usageView === 'water_usage') {
              return `Usage: ${value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m³`;
            } else {
              return `Total: ${new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(value)}`;
            }
          },
        },
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x' as const,
        },
        pan: {
          enabled: true,
          mode: 'x' as const,
        },
      },
    },
    scales: {
      x: {
        type: 'category' as const,
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            if (usageView === 'electricity_usage') {
              return `${value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kWh`;
            } else if (usageView === 'water_usage') {
              return `${value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m³`;
            } else {
              return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                notation: 'compact',
              }).format(value);
            }
          },
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-apple">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-warm-gray-800">{title}</h3>
        <button
          onClick={handleResetZoom}
          className="px-3 py-1.5 text-xs font-medium text-warm-gray-700 bg-warm-gray-100 hover:bg-warm-gray-200 rounded-lg transition-colors"
        >
          Reset Zoom
        </button>
      </div>
      <div className="h-64">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      <p className="text-xs text-warm-gray-500 mt-2">
        💡 Drag to pan • Scroll or pinch to zoom • Double-click to reset
      </p>
    </div>
  );
};

export default RentExpenseTrendChart;

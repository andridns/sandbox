import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, exportApi } from '../services/api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import CategoryChart from '../components/Dashboard/CategoryChart';
import TrendChart from '../components/Dashboard/TrendChart';
import SummaryCards from '../components/Dashboard/SummaryCards';

const Reports = () => {
  const today = new Date();
  const [startDate, setStartDate] = useState(
    format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const { data: summary } = useQuery({
    queryKey: ['summary', startDate, endDate, period],
    queryFn: () => reportsApi.getSummary(startDate, endDate, period),
  });

  const { data: categoryBreakdown } = useQuery({
    queryKey: ['category-breakdown', startDate, endDate],
    queryFn: () => reportsApi.getCategoryBreakdown(startDate, endDate),
  });

  const { data: trends } = useQuery({
    queryKey: ['trends', startDate, endDate, period],
    queryFn: () => reportsApi.getTrends(startDate, endDate, period),
  });

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'csv':
          blob = await exportApi.exportCSV(startDate, endDate);
          filename = 'expenses.csv';
          break;
        case 'excel':
          blob = await exportApi.exportExcel(startDate, endDate);
          filename = 'expenses.xlsx';
          break;
        case 'pdf':
          blob = await exportApi.exportPDF(startDate, endDate);
          filename = 'expenses.pdf';
          break;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exported to ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to export to ${format.toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <h2 className="text-2xl md:text-3xl font-semibold text-warm-gray-800">Reports</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => handleExport('csv')}
            className="flex-1 sm:flex-none bg-warm-gray-600 text-white px-4 py-2.5 md:px-5 rounded-xl hover:bg-warm-gray-700 transition-all shadow-apple font-medium text-sm md:text-base"
          >
            CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex-1 sm:flex-none bg-warm-gray-600 text-white px-4 py-2.5 md:px-5 rounded-xl hover:bg-warm-gray-700 transition-all shadow-apple font-medium text-sm md:text-base"
          >
            Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex-1 sm:flex-none bg-warm-gray-600 text-white px-4 py-2.5 md:px-5 rounded-xl hover:bg-warm-gray-700 transition-all shadow-apple font-medium text-sm md:text-base"
          >
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-apple">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-2">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'monthly' | 'yearly')}
              className="w-full px-3 py-2.5 md:px-4 border-2 border-warm-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-warm-gray-800 transition-all text-sm md:text-base"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      <SummaryCards summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={categoryBreakdown} />
        <TrendChart data={trends} />
      </div>
    </div>
  );
};

export default Reports;

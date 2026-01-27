import { useState, useEffect } from 'react';
import { exportApi } from '../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  useEffect(() => {
    const fetchTransactionCount = async () => {
      try {
        setIsLoadingCount(true);
        const result = await exportApi.getCount();
        setTransactionCount(result.count);
      } catch (error: any) {
        console.error('Failed to fetch transaction count:', error);
        // Don't show error toast, just set to null
        setTransactionCount(null);
      } finally {
        setIsLoadingCount(false);
      }
    };

    fetchTransactionCount();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      toast.loading('Exporting data...');
      const blob = await exportApi.exportExcel();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Data exported successfully!');
      
      // Refresh the count after export (in case user wants to verify)
      const result = await exportApi.getCount();
      setTransactionCount(result.count);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-primary-600">Settings</h2>

      {/* Export Section */}
      <div className="glass rounded-xl shadow-modern border border-modern-border/50 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 md:mb-4">Export Data</h3>
        
        <div className="border border-modern-border/50 rounded-xl p-4 bg-modern-border/5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm md:text-base font-semibold text-modern-text mb-2">Export Expenses to Excel</h4>
              <p className="text-xs md:text-sm text-modern-text-light mb-4">
                Download all your expenses as an Excel file (.xlsx) for backup or analysis.
              </p>
              
              {!isLoadingCount && transactionCount !== null && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Total transactions in database:</span>{' '}
                    <span className="text-lg font-bold text-blue-900">{transactionCount.toLocaleString()}</span>
                  </p>
                </div>
              )}
              
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full sm:w-auto px-4 py-2.5 md:py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors text-sm md:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

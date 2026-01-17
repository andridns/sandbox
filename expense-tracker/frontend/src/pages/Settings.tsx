import { useState } from 'react';
import { adminApi, exportApi } from '../services/api';
import toast from 'react-hot-toast';
import ExcelImport from '../components/Import/ExcelImport';

const Settings = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await adminApi.deleteAllData();
      toast.success('All data deleted successfully');
      setShowConfirm(false);
      // Optionally reload the page or redirect
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete all data');
    } finally {
      setIsDeleting(false);
    }
  };

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

      {/* Import Section */}
      <div className="glass rounded-xl shadow-modern border border-modern-border/50 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-modern-text mb-3 md:mb-4">Import Data</h3>
        <ExcelImport />
      </div>

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

      {/* Danger Zone */}
      <div className="glass rounded-xl shadow-modern border border-modern-border/50 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-modern-text mb-3 md:mb-4">Danger Zone</h3>
        
        <div className="border border-red-200 rounded-xl p-4 bg-red-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm md:text-base font-semibold text-red-800 mb-2">Delete All Data</h4>
              <p className="text-xs md:text-sm text-red-700 mb-4">
                This will permanently delete all expenses, budgets, and custom categories. 
                Default categories will be preserved. This action cannot be undone.
              </p>
              
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full sm:w-auto px-4 py-2.5 md:py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm md:text-base font-medium"
                >
                  Delete All Data
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs md:text-sm font-semibold text-red-800">
                    Are you sure you want to delete all data? This action cannot be undone.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleDeleteAllData}
                      disabled={isDeleting}
                      className="w-full sm:w-auto px-4 py-2.5 md:py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm md:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={isDeleting}
                      className="w-full sm:w-auto px-4 py-2.5 md:py-3 bg-warm-gray-300 text-warm-gray-800 rounded-xl hover:bg-warm-gray-400 transition-colors text-sm md:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

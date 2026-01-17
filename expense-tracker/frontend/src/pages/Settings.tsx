import { useState } from 'react';
import { adminApi } from '../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-warm-gray-800 mb-4 md:mb-6">Settings</h2>

      <div className="bg-white rounded-xl md:rounded-lg shadow-apple md:shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 md:mb-4">Danger Zone</h3>
        
        <div className="border border-red-200 rounded-xl md:rounded-lg p-4 bg-red-50">
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
                  className="w-full sm:w-auto px-4 py-2.5 md:py-3 bg-red-600 text-white rounded-xl md:rounded-lg hover:bg-red-700 transition-colors text-sm md:text-base font-medium"
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
                      className="w-full sm:w-auto px-4 py-2.5 md:py-3 bg-red-600 text-white rounded-xl md:rounded-lg hover:bg-red-700 transition-colors text-sm md:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={isDeleting}
                      className="w-full sm:w-auto px-4 py-2.5 md:py-3 bg-warm-gray-300 text-warm-gray-800 rounded-xl md:rounded-lg hover:bg-warm-gray-400 transition-colors text-sm md:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

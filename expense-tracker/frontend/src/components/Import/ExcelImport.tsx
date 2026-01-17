import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importApi } from '../../services/api';
import { toast } from 'react-hot-toast';

const ExcelImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (file: File) => importApi.excelImport(file),
    onSuccess: (result) => {
      const { summary, errors } = result;
      
      // Show success message
      let successMsg = `Successfully imported ${summary.imported} of ${summary.total_rows} expenses!`;
      if (summary.categories_imported && summary.categories_imported > 0) {
        successMsg += ` ${summary.categories_imported} categories imported.`;
      }
      toast.success(successMsg, { duration: 5000 });
      
      // Show warnings if any
      if (summary.uncategorized > 0) {
        toast(`⚠️ ${summary.uncategorized} expenses were left uncategorized`, {
          icon: '⚠️',
          duration: 4000,
        });
      }
      
      if (errors.length > 0) {
        toast.error(`${errors.length} errors occurred during import`, {
          duration: 5000,
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      
      // Reset file
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to import Excel file');
    },
  });

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileExt = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExt)) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }
    
    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }
    
    importMutation.mutate(file);
  };

  return (
    <div className="space-y-4 md:space-y-6">
        {/* File Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 md:p-12 text-center transition-all ${
            isDragging
              ? 'border-primary-400 bg-primary-50'
              : 'border-warm-gray-300 hover:border-primary-300'
          }`}
        >
          {file ? (
            <div className="space-y-3 md:space-y-4">
              <div className="text-primary-500 text-3xl md:text-4xl">📄</div>
              <div>
                <p className="text-base md:text-lg font-medium text-warm-gray-800 break-words">{file.name}</p>
                <p className="text-xs md:text-sm text-warm-gray-500 mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-xs md:text-sm text-warm-gray-600 hover:text-warm-gray-800"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              <div className="text-warm-gray-400 text-4xl md:text-5xl">📊</div>
              <div>
                <p className="text-base md:text-lg font-medium text-warm-gray-700 mb-2">
                  Drag and drop your Excel file here
                </p>
                <p className="text-xs md:text-sm text-warm-gray-500">or</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-6 py-2.5 md:py-3 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-all shadow-apple font-medium text-sm md:text-base"
              >
                Browse Files
              </button>
              <p className="text-xs text-warm-gray-500 mt-3 md:mt-4">
                Supported formats: .xlsx, .xls (Max 10MB)
              </p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* File Format Info */}
        <div className="bg-beige-50 rounded-xl p-4 md:p-5 border border-warm-gray-200">
          <h3 className="text-xs md:text-sm font-semibold text-warm-gray-800 mb-2 md:mb-3">
            Excel File Format Requirements
          </h3>
          <ul className="text-xs md:text-sm text-warm-gray-600 space-y-1.5 md:space-y-2">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Required columns:</strong> Date, Amount, Description</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Optional columns:</strong> Category, Payment Method, Location, Notes, Currency, Tags</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Smart categorization:</strong> Expenses will be automatically categorized based on description</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Categories sheet:</strong> If your Excel file has a "Categories" sheet, categories will be imported automatically</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Date formats:</strong> YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, or Excel date serial numbers</span>
            </li>
          </ul>
        </div>

        {/* Import Button */}
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={!file || importMutation.isPending}
            className="w-full sm:w-auto px-6 md:px-8 py-2.5 md:py-3 bg-primary-400 text-white rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-apple hover:shadow-apple-lg font-medium text-sm md:text-base"
          >
            {importMutation.isPending ? 'Importing...' : 'Import Expenses'}
          </button>
        </div>

        {/* Import Results */}
        {importMutation.data && (
          <div className="mt-4 md:mt-6 border-t border-warm-gray-200 pt-4 md:pt-6">
            <h3 className="text-base md:text-lg font-semibold text-warm-gray-800 mb-3 md:mb-4">Import Results</h3>
            
            <div className={`grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6 ${importMutation.data.summary.categories_imported !== undefined ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
              <div className="bg-beige-50 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-warm-gray-600">Total Rows</p>
                <p className="text-xl md:text-2xl font-bold text-warm-gray-800">
                  {importMutation.data.summary.total_rows}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-warm-gray-600">Imported</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">
                  {importMutation.data.summary.imported}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-warm-gray-600">Failed</p>
                <p className="text-xl md:text-2xl font-bold text-red-600">
                  {importMutation.data.summary.failed}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-warm-gray-600">Uncategorized</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-600">
                  {importMutation.data.summary.uncategorized}
                </p>
              </div>
              {importMutation.data.summary.categories_imported !== undefined && (
                <div className="bg-blue-50 rounded-xl p-3 md:p-4">
                  <p className="text-xs md:text-sm text-warm-gray-600">Categories</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-600">
                    {importMutation.data.summary.categories_imported}
                  </p>
                </div>
              )}
            </div>

            {/* Category Matches */}
            {Object.keys(importMutation.data.category_matches).length > 0 && (
              <div className="mb-4 md:mb-6">
                <h4 className="text-xs md:text-sm font-semibold text-warm-gray-700 mb-2 md:mb-3">Category Matches</h4>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {Object.entries(importMutation.data.category_matches).map(([category, count]) => (
                    <span
                      key={category}
                      className="px-2.5 md:px-3 py-1 md:py-1.5 bg-primary-100 text-primary-700 rounded-lg text-xs md:text-sm font-medium"
                    >
                      {category}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {importMutation.data.errors.length > 0 && (
              <div>
                <h4 className="text-xs md:text-sm font-semibold text-red-700 mb-2 md:mb-3">
                  Errors ({importMutation.data.errors.length})
                </h4>
                <div className="bg-red-50 rounded-xl p-3 md:p-4 max-h-48 overflow-y-auto">
                  <ul className="space-y-1 text-xs md:text-sm text-red-700">
                    {importMutation.data.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                    {importMutation.data.errors.length > 10 && (
                      <li className="text-red-600 italic">
                        ... and {importMutation.data.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelImport;

import ExcelImport from '../components/Import/ExcelImport';

const Import = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-warm-gray-800">Import Expenses</h2>
      </div>

      <ExcelImport />
    </div>
  );
};

export default Import;

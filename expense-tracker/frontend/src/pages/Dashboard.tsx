import QuickExpenseForm from '../components/Dashboard/QuickExpenseForm';

const Dashboard = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h1 className="text-xl md:text-2xl font-bold text-primary-600 mb-3 md:mb-4">Add Expense</h1>
      <QuickExpenseForm />
    </div>
  );
};

export default Dashboard;

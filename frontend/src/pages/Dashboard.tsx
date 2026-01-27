import QuickExpenseForm from '../components/Dashboard/QuickExpenseForm';

const Dashboard = () => {
  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-primary-600">Add Expense</h2>
      <QuickExpenseForm />
    </div>
  );
};

export default Dashboard;

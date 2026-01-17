import QuickExpenseForm from '../components/Dashboard/QuickExpenseForm';

const Dashboard = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div className="mb-6 md:mb-8 text-center">
        <h1 className="text-2xl md:text-4xl font-bold text-primary-600 mb-2 md:mb-3">Add Expense</h1>
        <p className="text-base md:text-lg text-modern-text-light font-medium">Quickly add your expenses. Just type the amount and description.</p>
      </div>

      <QuickExpenseForm />
    </div>
  );
};

export default Dashboard;

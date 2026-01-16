import { Link, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Add Expense', icon: '➕' },
    { path: '/expenses', label: 'Expenses', icon: '💰' },
    { path: '/budgets', label: 'Budgets', icon: '📈' },
    { path: '/reports', label: 'Reports', icon: '📊' },
    { path: '/import', label: 'Import', icon: '📥' },
  ];

  return (
    <div className="min-h-screen bg-beige-50">
      {/* Header */}
      <header className="bg-white shadow-apple border-b border-warm-gray-200">
        <div className="container mx-auto px-6 py-5">
          <h1 className="text-2xl font-semibold text-warm-gray-800">Expense Tracker</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-apple border-b border-warm-gray-200">
        <div className="container mx-auto px-6">
          <div className="flex space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-5 py-4 text-sm font-medium transition-all duration-200 rounded-t-lg ${
                  location.pathname === item.path
                    ? 'text-primary-500 border-b-2 border-primary-400 bg-beige-50'
                    : 'text-warm-gray-600 hover:text-primary-500 hover:bg-beige-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

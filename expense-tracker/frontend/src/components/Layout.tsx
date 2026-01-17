import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const navItems = [
    { path: '/', label: 'Add Expense', icon: '➕' },
    { path: '/expenses', label: 'Expenses', icon: '💰' },
    { path: '/budgets', label: 'Budgets', icon: '📈' },
    { path: '/reports', label: 'Reports', icon: '📊' },
    { path: '/import', label: 'Import', icon: '📥' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-beige-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white shadow-apple border-b border-warm-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-5">
          <div className="flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-semibold text-warm-gray-800">Expense Tracker</h1>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="hidden sm:inline text-xs md:text-sm text-warm-gray-600">
                Welcome, {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-warm-gray-700 hover:text-primary-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white shadow-apple border-b border-warm-gray-200">
        <div className="container mx-auto px-6">
          <div className="flex space-x-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-5 py-4 text-sm font-medium transition-all duration-200 rounded-t-lg whitespace-nowrap ${
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-apple-lg border-t border-warm-gray-200 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-3 grid-rows-2 gap-1 px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 min-h-[60px] ${
                location.pathname === item.path
                  ? 'text-primary-500 bg-beige-50'
                  : 'text-warm-gray-600 active:bg-beige-100'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

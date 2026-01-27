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
    { path: '/expenses', label: 'Explorer', icon: '🔍' },
    { path: '/reports', label: 'Reports', icon: '📊' },
    { path: '/activity', label: 'Activity', icon: '📋' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-0">
      {/* Header */}
      <header className="glass shadow-modern sticky top-0 z-40 border-b border-modern-border/50">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-5">
          <div className="flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-bold text-primary-600">
              Expense Tracker
            </h1>
            <div className="flex items-center gap-3 md:gap-4">
              <span className="hidden sm:inline text-xs md:text-sm text-modern-text-light font-medium">
                Welcome, {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm text-modern-text-light hover:text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-all duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 md:h-5 md:w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden md:block glass shadow-modern border-b border-modern-border/50">
        <div className="container mx-auto px-6">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-5 py-4 text-sm font-semibold transition-all duration-200 rounded-t-xl whitespace-nowrap relative ${
                  location.pathname === item.path
                    ? 'text-primary-600 bg-gradient-to-b from-primary-50 to-transparent'
                    : 'text-modern-text-light hover:text-primary-600 hover:bg-primary-50/50'
                }`}
              >
                {location.pathname === item.path && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary rounded-full"></span>
                )}
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass shadow-modern-lg border-t border-modern-border/50 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-5 grid-rows-1 gap-1 px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 min-h-[60px] ${
                location.pathname === item.path
                  ? 'text-primary-600 bg-primary-50 shadow-modern'
                  : 'text-modern-text-light active:bg-primary-50/50'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-[11px] font-semibold text-center leading-tight">{item.label}</span>
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

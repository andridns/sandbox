import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { historyApi, type ExpenseHistory } from '../services/api';

const History = () => {
  const [skip, setSkip] = useState(0);
  const [limit] = useState(50);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [usernameFilter, setUsernameFilter] = useState('');

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['history', skip, limit, actionFilter, usernameFilter],
    queryFn: () => historyApi.getAll({
      skip,
      limit,
      action: actionFilter || undefined,
      username: usernameFilter || undefined,
    }),
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'update':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'delete':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-primary-600">Activity</h2>

      {/* Filters */}
      <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-xs font-semibold text-modern-text-light mb-2">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setSkip(0);
              }}
              className="w-full px-3 py-2 border border-modern-border/50 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-modern-text transition-all text-sm"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-modern-text-light mb-2">User</label>
            <input
              type="text"
              value={usernameFilter}
              onChange={(e) => {
                setUsernameFilter(e.target.value);
                setSkip(0);
              }}
              placeholder="Filter by username..."
              className="w-full px-3 py-2 border border-modern-border/50 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-modern-text placeholder-modern-text-light transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="glass rounded-2xl shadow-modern-lg border border-modern-border/50">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gradient-to-r from-modern-border/20 to-modern-border/10 rounded-xl"></div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 text-sm md:text-base font-medium">
              Error loading activity history. Please try again later.
            </p>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-modern-text-light text-sm md:text-base font-medium">No activity found</p>
          </div>
        ) : (
          <>
            <div className="p-4 md:p-6 border-b border-modern-border/50">
              <h3 className="text-base md:text-lg font-bold text-modern-text">
                {history.length} {history.length === 1 ? 'entry' : 'entries'}
              </h3>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-modern-border/30">
              {history.map((entry) => (
                <div key={entry.id} className="p-3 hover:bg-primary-50/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getActionIcon(entry.action)}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getActionColor(entry.action)}`}>
                        {entry.action.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] text-modern-text-light font-medium">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-modern-text-light mb-1">
                    <span className="font-semibold">{entry.username}</span>
                  </div>
                  {entry.description && (
                    <div className="text-xs text-modern-text font-medium mt-1">
                      {entry.description}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-modern-border/10 to-transparent">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">Time</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">Action</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">User</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-modern-border/30">
                  {history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-primary-50/20 transition-colors">
                      <td className="px-5 py-3 text-sm text-modern-text font-medium">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold border ${getActionColor(entry.action)}`}>
                          <span>{getActionIcon(entry.action)}</span>
                          {entry.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-modern-text font-semibold">
                        {entry.username}
                      </td>
                      <td className="px-5 py-3 text-sm text-modern-text-light font-medium">
                        {entry.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {history.length >= limit && (
              <div className="p-4 md:p-6 border-t border-modern-border/50 flex justify-center">
                <button
                  onClick={() => setSkip(skip + limit)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-semibold"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;

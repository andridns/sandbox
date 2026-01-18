import { useState, useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { historyApi, ExpenseHistory } from '../services/api';

interface ExpenseData {
  amount?: number;
  currency?: string;
  description?: string;
  date?: string;
  [key: string]: any;
}

const HISTORY_PER_PAGE = 500;

const History = () => {
  const [actionFilter, setActionFilter] = useState<string>('');
  const [usernameFilter, setUsernameFilter] = useState('');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['history', actionFilter, usernameFilter],
    queryFn: ({ pageParam = 0 }) => {
      return historyApi.getAll({
        skip: pageParam,
        limit: HISTORY_PER_PAGE,
        action: actionFilter || undefined,
        username: usernameFilter || undefined,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer items than requested, we've reached the end
      if (lastPage.length < HISTORY_PER_PAGE) {
        return undefined;
      }
      // Otherwise, return the next skip value
      return allPages.length * HISTORY_PER_PAGE;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const history = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

  const { data: uniqueUsernames = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['history', 'users'],
    queryFn: () => historyApi.getUniqueUsernames(),
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

  // Parse JSON data safely
  const parseExpenseData = (jsonString: string | null): ExpenseData | null => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  // Format currency amount
  const formatAmount = (amount: number | undefined, currency: string = 'USD'): string => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  // Get detailed change information for an entry
  const getChangeDetails = (entry: ExpenseHistory) => {
    const oldData = parseExpenseData(entry.old_data);
    const newData = parseExpenseData(entry.new_data);

    if (entry.action === 'create' && newData) {
      return {
        type: 'create',
        amount: formatAmount(newData.amount, newData.currency),
        description: newData.description || entry.description || 'New expense',
      };
    }

    if (entry.action === 'delete' && oldData) {
      return {
        type: 'delete',
        amount: formatAmount(oldData.amount, oldData.currency),
        description: oldData.description || entry.description || 'Deleted expense',
      };
    }

    if (entry.action === 'update' && oldData && newData) {
      const changes: string[] = [];
      
      if (oldData.amount !== newData.amount) {
        changes.push(`Amount: ${formatAmount(oldData.amount, oldData.currency)} → ${formatAmount(newData.amount, newData.currency)}`);
      }
      
      if (oldData.currency !== newData.currency) {
        changes.push(`Currency: ${oldData.currency} → ${newData.currency}`);
      }
      
      if (oldData.description !== newData.description) {
        const oldDesc = oldData.description || '(empty)';
        const newDesc = newData.description || '(empty)';
        changes.push(`Description: "${oldDesc}" → "${newDesc}"`);
      }
      
      if (oldData.date !== newData.date) {
        const oldDate = oldData.date ? new Date(oldData.date).toLocaleDateString() : '(empty)';
        const newDate = newData.date ? new Date(newData.date).toLocaleDateString() : '(empty)';
        changes.push(`Date: ${oldDate} → ${newDate}`);
      }

      return {
        type: 'update',
        changes,
        description: newData.description || oldData.description || 'Updated expense',
      };
    }

    return {
      type: entry.action,
      description: entry.description || '-',
    };
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-primary-600">Activity</h2>

      {/* Filters */}
      <div className="glass p-4 md:p-5 rounded-2xl shadow-modern border border-modern-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-xs font-semibold text-modern-text-light mb-2">Action</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setActionFilter('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  actionFilter === ''
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-modern-text border border-modern-border/50 hover:bg-primary-50'
                }`}
              >
                All Actions
              </button>
              <button
                onClick={() => {
                  setActionFilter('create');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  actionFilter === 'create'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-modern-text border border-modern-border/50 hover:bg-green-50'
                }`}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setActionFilter('update');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  actionFilter === 'update'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-modern-text border border-modern-border/50 hover:bg-blue-50'
                }`}
              >
                Update
              </button>
              <button
                onClick={() => {
                  setActionFilter('delete');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  actionFilter === 'delete'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white text-modern-text border border-modern-border/50 hover:bg-red-50'
                }`}
              >
                Delete
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-modern-text-light mb-2">User</label>
            <select
              value={usernameFilter}
              onChange={(e) => {
                setUsernameFilter(e.target.value);
              }}
              disabled={isLoadingUsers}
              className="w-full px-3 py-2 border border-modern-border/50 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white text-modern-text transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Users</option>
              {uniqueUsernames.map((username) => (
                <option key={username} value={username}>
                  {username}
                </option>
              ))}
            </select>
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
              {history.map((entry) => {
                const changeDetails = getChangeDetails(entry);
                return (
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
                    
                    {/* Show amount for create/delete */}
                    {(changeDetails.type === 'create' || changeDetails.type === 'delete') && (
                      <div className="text-xs font-semibold text-modern-text mb-1">
                        {changeDetails.amount}
                      </div>
                    )}
                    
                    {/* Show description */}
                    <div className="text-xs text-modern-text font-medium mt-1 mb-1">
                      {changeDetails.description}
                    </div>
                    
                    {/* Show specific changes for updates */}
                    {changeDetails.type === 'update' && changeDetails.changes && changeDetails.changes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {changeDetails.changes.map((change, idx) => (
                          <div key={idx} className="text-[10px] text-modern-text-light bg-blue-50/50 px-2 py-1 rounded border border-blue-200/50">
                            {change}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-modern-border/10 to-transparent">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">Time</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">Action</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">User</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-modern-text-light uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-modern-border/30">
                  {history.map((entry) => {
                    const changeDetails = getChangeDetails(entry);
                    return (
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
                        <td className="px-5 py-3 text-sm">
                          <div className="space-y-1">
                            {/* Show amount for create/delete */}
                            {(changeDetails.type === 'create' || changeDetails.type === 'delete') && (
                              <div className="font-semibold text-modern-text">
                                {changeDetails.amount}
                              </div>
                            )}
                            
                            {/* Show description */}
                            <div className="text-modern-text-light font-medium">
                              {changeDetails.description}
                            </div>
                            
                            {/* Show specific changes for updates */}
                            {changeDetails.type === 'update' && changeDetails.changes && changeDetails.changes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {changeDetails.changes.map((change, idx) => (
                                  <div key={idx} className="text-xs text-modern-text-light bg-blue-50/50 px-2 py-1 rounded border border-blue-200/50 inline-block mr-1">
                                    {change}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {hasNextPage && (
              <div className="p-4 md:p-6 border-t border-modern-border/50 flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold rounded-lg shadow-modern transition-all duration-200 hover:shadow-modern-lg disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isFetchingNextPage ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More Activity (500 more)
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
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

export const CURRENCIES = [
  { code: 'IDR', name: 'Rupiah', symbol: 'Rp' },
  { code: 'JPY', name: 'Yen', symbol: '¥' },
  { code: 'USD', name: 'Dollar', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', name: 'Ringgit', symbol: 'RM' },
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'GoPay',
  'OVO',
  'DANA',
  'LinkAja',
  'ShopeePay',
] as const;

export const MIN_AMOUNT_OPTIONS = [
  { label: 'All Amounts', value: undefined },
  { label: 'Rp 100.000', value: 100000 },
  { label: 'Rp 500.000', value: 500000 },
  { label: 'Rp 1.000.000', value: 1000000 },
  { label: 'Rp 4.000.000', value: 4000000 },
  { label: 'Rp 5.000.000', value: 5000000 },
  { label: 'Rp 8.000.000', value: 8000000 },
  { label: 'Rp 10.000.000', value: 10000000 },
] as const;

export type DateRangePreset = 
  | 'all'
  | 'last7days'
  | 'last30days'
  | 'previousMonth'
  | 'previous2Months'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export const getDateRange = (preset: DateRangePreset): { start_date?: string; end_date?: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'all':
      return {};
    
    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      };
    }
    
    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      };
    }
    
    case 'previousMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
      };
    }
    
    case 'previous2Months': {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
      };
    }
    
    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      };
    }
    
    case 'lastYear': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
      };
    }
    
    case 'custom':
    default:
      return {};
  }
};

export const DATE_RANGE_OPTIONS: Array<{ label: string; value: DateRangePreset }> = [
  { label: 'All Dates', value: 'all' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'Previous Month', value: 'previousMonth' },
  { label: 'Previous 2 Months', value: 'previous2Months' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Last Year', value: 'lastYear' },
] as const;

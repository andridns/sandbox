export const CURRENCIES = [
  { code: 'IDR', name: 'Rupiah', symbol: 'Rp' },
  { code: 'JPY', name: 'Yen', symbol: '¥' },
  { code: 'USD', name: 'Dollar', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', name: 'Ringgit', symbol: 'RM' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
] as const;

// Other currencies for the dropdown
export const OTHER_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'BND', name: 'Brunei Dollar', symbol: 'B$' },
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
  | `month-${number}` // month-0 = last month, month-1 = 2 months ago, etc.
  | `year-${number}` // year-0 = this year, year-1 = last year, etc.
  | 'custom';

export const getDateRange = (preset: DateRangePreset): { start_date?: string; end_date?: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === 'all') {
    return {};
  }

  if (preset === 'last7days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
    };
  }

  if (preset === 'last30days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
    };
  }

  // Handle month presets (month-0 = last month, month-1 = 2 months ago, etc.)
  if (preset.startsWith('month-')) {
    const monthsAgo = parseInt(preset.replace('month-', ''));
    const targetDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo - 1, 1);
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    };
  }

  // Handle year presets (year-0 = this year, year-1 = last year, etc.)
  if (preset.startsWith('year-')) {
    const yearsAgo = parseInt(preset.replace('year-', ''));
    const targetYear = today.getFullYear() - yearsAgo;
    
    if (yearsAgo === 0) {
      // This year: from January 1st to today
      const start = new Date(targetYear, 0, 1);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      };
    } else {
      // Previous years: entire year
      const start = new Date(targetYear, 0, 1);
      const end = new Date(targetYear, 11, 31);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
      };
    }
  }

  return {};
};

// Generate month name in Indonesian or English
const getMonthName = (date: Date, locale: string = 'en-US'): string => {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

// Generate dynamic date range options
export const getDateRangeOptions = (): Array<{ label: string; value: DateRangePreset }> => {
  const today = new Date();
  const options: Array<{ label: string; value: DateRangePreset }> = [
    { label: 'All Dates', value: 'all' },
    { label: 'Last 7 Days', value: 'last7days' },
    { label: 'Last 30 Days', value: 'last30days' },
  ];

  // Add months going backwards (up to 12 months ago)
  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i - 1, 1);
    const monthName = getMonthName(targetDate);
    options.push({
      label: monthName,
      value: `month-${i}` as DateRangePreset,
    });
  }

  // Add years going backwards (this year, last year, etc. - up to 10 years ago)
  const currentYear = today.getFullYear();
  for (let i = 0; i <= 10; i++) {
    const year = currentYear - i;
    if (i === 0) {
      options.push({ label: `This Year (${year})`, value: `year-${i}` as DateRangePreset });
    } else {
      options.push({ label: `${year}`, value: `year-${i}` as DateRangePreset });
    }
  }

  return options;
};

import { useQuery } from '@tanstack/react-query';

interface ConversionCache {
  [key: string]: {
    rate: number;
    timestamp: number;
  };
}

// Cache exchange rates for 1 hour
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const conversionCache: ConversionCache = {};

/**
 * Hook to convert currency to IDR
 */
export const useCurrencyToIDR = (amount: number, currency: string) => {
  const cacheKey = `${currency.toUpperCase()}_IDR`;
  const cached = conversionCache[cacheKey];
  const now = Date.now();

  // Check if we have a valid cached rate
  const useCache = cached && (now - cached.timestamp) < CACHE_DURATION;

  const { data: rates } = useQuery({
    queryKey: ['exchange-rates', currency],
    queryFn: async () => {
      // Fetch rates from free API
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${currency.toUpperCase()}`
      );
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      const data = await response.json();
      
      // Cache the rate
      conversionCache[cacheKey] = {
        rate: data.rates.IDR || 1,
        timestamp: now,
      };
      
      return data.rates;
    },
    enabled: !useCache && currency.toUpperCase() !== 'IDR',
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION,
  });

  // Calculate converted amount
  if (currency.toUpperCase() === 'IDR') {
    return amount;
  }

  if (useCache && cached) {
    return amount * cached.rate;
  }

  if (rates && rates.IDR) {
    return amount * rates.IDR;
  }

  // Fallback: return original amount if conversion fails
  return amount;
};

/**
 * Hook to get exchange rate for a currency pair
 */
export const useExchangeRate = (fromCurrency: string, toCurrency: string = 'IDR') => {
  const cacheKey = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
  const cached = conversionCache[cacheKey];
  const now = Date.now();
  const useCache = cached && (now - cached.timestamp) < CACHE_DURATION;

  const { data: rates } = useQuery({
    queryKey: ['exchange-rates', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
      );
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      const data = await response.json();
      
      const rate = data.rates[toCurrency.toUpperCase()] || 1;
      conversionCache[cacheKey] = {
        rate,
        timestamp: now,
      };
      
      return { rates: data.rates, rate };
    },
    enabled: !useCache && fromCurrency.toUpperCase() !== toCurrency.toUpperCase(),
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION,
  });

  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return 1;
  }

  if (useCache && cached) {
    return cached.rate;
  }

  return rates?.rate || 1;
};

import { formatCurrency } from '../utils/format';
import { useCurrencyToIDR } from '../hooks/useCurrencyConversion';

interface CurrencyDisplayProps {
  amount: number;
  currency: string;
  showOriginal?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CurrencyDisplay = ({
  amount,
  currency,
  showOriginal = true,
  className = '',
  size = 'md',
}: CurrencyDisplayProps) => {
  const idrAmount = useCurrencyToIDR(amount, currency);
  const isIDR = currency.toUpperCase() === 'IDR';

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  if (isIDR) {
    return (
      <span className={className}>
        {formatCurrency(amount, currency)}
      </span>
    );
  }

  return (
    <span className={className}>
      {showOriginal && (
        <span className={sizeClasses[size]}>
          {formatCurrency(amount, currency)}
        </span>
      )}
      {showOriginal && (
        <span className="text-warm-gray-500 mx-1.5">•</span>
      )}
      <span className={`${sizeClasses[size]} text-warm-gray-600`}>
        {formatCurrency(idrAmount, 'IDR')}
      </span>
    </span>
  );
};

export default CurrencyDisplay;

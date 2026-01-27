from decimal import Decimal
from typing import Dict, Optional
from datetime import datetime, timedelta
import httpx
from functools import lru_cache

# Cache exchange rates for 1 hour to avoid hitting API limits
_EXCHANGE_RATE_CACHE: Dict[str, tuple[datetime, Dict[str, float]]] = {}
CACHE_DURATION = timedelta(hours=1)

# Free API endpoint (no API key required)
EXCHANGE_RATE_API = "https://api.exchangerate-api.com/v4/latest/{base_currency}"


async def get_exchange_rates(base_currency: str) -> Dict[str, float]:
    """
    Get exchange rates for a base currency.
    Uses caching to avoid hitting API rate limits.
    """
    cache_key = base_currency.upper()
    now = datetime.now()
    
    # Check cache
    if cache_key in _EXCHANGE_RATE_CACHE:
        cached_time, rates = _EXCHANGE_RATE_CACHE[cache_key]
        if now - cached_time < CACHE_DURATION:
            return rates
    
    # Fetch from API
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            url = EXCHANGE_RATE_API.format(base_currency=base_currency.upper())
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            # Extract rates (API returns {"rates": {...}, "base": "USD", "date": "..."})
            rates = data.get("rates", {})
            
            # Cache the result
            _EXCHANGE_RATE_CACHE[cache_key] = (now, rates)
            
            return rates
    except Exception as e:
        # If API fails, check cache even if expired (better than nothing)
        if cache_key in _EXCHANGE_RATE_CACHE:
            _, rates = _EXCHANGE_RATE_CACHE[cache_key]
            return rates
        
        # If no cache and API fails, raise error
        raise Exception(f"Failed to fetch exchange rates: {str(e)}")


async def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str
) -> float:
    """
    Convert an amount from one currency to another.
    
    Args:
        amount: The amount to convert
        from_currency: Source currency code (e.g., 'USD')
        to_currency: Target currency code (e.g., 'IDR')
    
    Returns:
        Converted amount
    """
    # Same currency, no conversion needed
    if from_currency.upper() == to_currency.upper():
        return float(amount)
    
    # Get exchange rates from source currency
    rates = await get_exchange_rates(from_currency)
    
    # Get target currency rate
    target_rate = rates.get(to_currency.upper())
    if target_rate is None:
        raise ValueError(
            f"Currency {to_currency} not found in exchange rates. "
            f"Available currencies: {list(rates.keys())[:10]}..."
        )
    
    # Convert: amount * target_rate
    converted = float(Decimal(str(amount)) * Decimal(str(target_rate)))
    return converted


def convert_currency_sync(
    amount: float,
    from_currency: str,
    to_currency: str,
    rates_cache: Optional[Dict[str, float]] = None
) -> float:
    """
    Synchronous version for use in synchronous contexts.
    Requires pre-fetched rates cache.
    """
    if from_currency.upper() == to_currency.upper():
        return float(amount)
    
    if rates_cache is None:
        raise ValueError("rates_cache is required for sync conversion")
    
    target_rate = rates_cache.get(to_currency.upper())
    if target_rate is None:
        # Fallback: return original amount if conversion not possible
        return float(amount)
    
    converted = float(Decimal(str(amount)) * Decimal(str(target_rate)))
    return converted

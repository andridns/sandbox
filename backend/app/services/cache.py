from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import threading


class InMemoryCache:
    """Thread-safe in-memory cache with TTL support"""

    def __init__(self):
        self._cache: Dict[str, tuple[Any, datetime]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        with self._lock:
            if key in self._cache:
                value, expiry = self._cache[key]
                if datetime.now() < expiry:
                    return value
                else:
                    # Remove expired entry
                    del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set cache value with TTL (default 5 minutes)"""
        with self._lock:
            expiry = datetime.now() + timedelta(seconds=ttl_seconds)
            self._cache[key] = (value, expiry)

    def invalidate(self, pattern: str = None):
        """
        Invalidate cache entries.
        If pattern is None, clears all cache.
        If pattern is provided, removes all keys containing that pattern.
        """
        with self._lock:
            if pattern is None:
                self._cache.clear()
            else:
                keys_to_delete = [k for k in self._cache.keys() if pattern in k]
                for key in keys_to_delete:
                    del self._cache[key]

    def clear(self):
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()

    def size(self) -> int:
        """Get number of cached entries"""
        with self._lock:
            return len(self._cache)


# Global cache instance
cache = InMemoryCache()

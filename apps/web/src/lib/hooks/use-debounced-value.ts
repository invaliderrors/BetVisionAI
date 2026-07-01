// apps/web/src/lib/hooks/use-debounced-value.ts
// Debounce a rapidly-changing value (e.g. a typeahead query) so we don't fire a request on every
// keystroke. Returns the latest value only after it has been stable for `delayMs`.
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

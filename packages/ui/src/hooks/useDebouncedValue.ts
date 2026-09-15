import { useEffect, useState } from "react";

// For a search input driving a server query — typing shouldn't fire a
// request per keystroke. Generic (not string-specific) since a future
// caller might debounce something other than text.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

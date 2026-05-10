import { useEffect, useState } from 'react'

/**
 * Returns a debounced echo of `value` after `delayMs` of stillness. Used by
 * search inputs to avoid triggering one filter per keystroke. Cleans up the
 * pending timer on unmount and on every new value so the most recent value
 * always wins.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value)
      return
    }
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

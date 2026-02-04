import { useEffect, useState } from "react";

/**
 * Returns `true` after `ms` milliseconds while `isLoading` stays true.
 * Resets when loading completes.
 */
export function useLoadingTimeout(isLoading: boolean, ms = 15_000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const id = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(id);
  }, [isLoading, ms]);

  return timedOut;
}

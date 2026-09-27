import { useEffect, useState } from 'react';

/** Heure courante, rafraîchie périodiquement (les rendus React doivent rester purs). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

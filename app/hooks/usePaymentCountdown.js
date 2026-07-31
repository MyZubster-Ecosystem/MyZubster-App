import { useCallback, useEffect, useRef, useState } from 'react';

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;

export function formatRemaining(ms) {
  if (ms == null || ms <= 0) return '00:00';
  const totalSeconds = Math.max(0, Math.floor(ms / MS_IN_SECOND));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function usePaymentCountdown({ expiresAt, durationMs, onExpire }) {
  const computeRemaining = useCallback(() => {
    if (expiresAt) {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      return remaining;
    }
    if (durationMs != null) {
      return durationMs;
    }
    return null;
  }, [expiresAt, durationMs]);

  const [remaining, setRemaining] = useState(() => computeRemaining());
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    setRemaining(computeRemaining());
    setPaused(false);
  }, [computeRemaining]);

  useEffect(() => {
    if (remaining == null) return;
    if (paused) return;
    if (remaining <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (onExpireRef.current) onExpireRef.current();
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - MS_IN_SECOND;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          if (onExpireRef.current) onExpireRef.current();
          return 0;
        }
        return next;
      });
    }, MS_IN_SECOND);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [remaining, paused]);

  const formatted = remaining != null ? formatRemaining(remaining) : null;

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRemaining(computeRemaining());
    setPaused(false);
  }, [computeRemaining]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return { remaining, formatted, paused, reset, pause, resume };
}

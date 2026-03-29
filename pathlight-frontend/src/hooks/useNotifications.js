import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_VISIBLE = 3;

/**
 * Notification system hook.
 *
 * Each notification: { id, type, message, duration, progress }
 * type: 'error' | 'warning' | 'success' | 'info'
 *
 * @returns {{ notifications, addNotification, dismissNotification }}
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  // Map of id → interval handle for progress tracking
  const timersRef = useRef({});

  const dismissNotification = useCallback((id) => {
    // Clear interval if running
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((type, message, duration = 5000) => {
    const id = Date.now() + Math.random();
    const newNotif = { id, type, message, duration, progress: 0 };

    setNotifications((prev) => {
      // If already at max, dismiss oldest
      let next = [...prev, newNotif];
      while (next.length > MAX_VISIBLE) {
        const oldest = next[0];
        if (timersRef.current[oldest.id]) {
          clearInterval(timersRef.current[oldest.id]);
          delete timersRef.current[oldest.id];
        }
        next = next.slice(1);
      }
      return next;
    });

    // Progress ticks every 50ms from 0 → 1 over `duration`
    const tickMs = 50;
    const totalTicks = Math.ceil(duration / tickMs);
    let tick = 0;

    timersRef.current[id] = setInterval(() => {
      tick++;
      const progress = tick / totalTicks;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, progress: Math.min(progress, 1) } : n))
      );
      if (tick >= totalTicks) {
        clearInterval(timersRef.current[id]);
        delete timersRef.current[id];
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    }, tickMs);
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
      timersRef.current = {};
    };
  }, []);

  return { notifications, addNotification, dismissNotification };
}

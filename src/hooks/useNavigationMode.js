import { useState, useCallback } from 'react';

export function useNavigationMode() {
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
    // Lock screen orientation to portrait on mobile if supported
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock('portrait').catch(() => {});
    }
    // Request wake lock so screen doesn't sleep during navigation
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(() => {});
    }
  }, []);

  const exitNavigation = useCallback(() => {
    setIsNavigating(false);
    // Release wake lock
    // (wake lock auto-releases when tab loses visibility, 
    //  but good practice to release manually)
  }, []);

  return { isNavigating, startNavigation, exitNavigation };
}

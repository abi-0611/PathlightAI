import { useState, useEffect, useCallback } from 'react';

export function useReroute(currentLocation, activeRoute, onDeviation) {
  const [isDeviated, setIsDeviated] = useState(false);
  const [deviationDistance, setDeviationDistance] = useState(0);

  const checkDeviation = useCallback(() => {
    if (!currentLocation || !activeRoute) return;

    // Simple mock logic: if distance > 50m, trigger deviation
    // In a real app, this would use turf.js to calculate distance from point to line
    const distance = Math.random() * 100; // Mock distance
    setDeviationDistance(distance);

    if (distance > 50) {
      setIsDeviated(true);
      if (onDeviation) onDeviation(distance);
    } else {
      setIsDeviated(false);
    }
  }, [currentLocation, activeRoute, onDeviation]);

  useEffect(() => {
    const interval = setInterval(checkDeviation, 5000);
    return () => clearInterval(interval);
  }, [checkDeviation]);

  return { isDeviated, deviationDistance };
}

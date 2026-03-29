import { useState, useEffect, useCallback } from 'react';

// Minimum distance from route line before triggering reroute (meters)
const DEVIATION_THRESHOLD_M = 50;

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceToSegmentM(pLat, pLng, aLat, aLng, bLat, bLng) {
  const ax = aLng, ay = aLat, bx = bLng, by = bLat, px = pLng, py = pLat;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineM(pLat, pLng, aLat, aLng);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const closestLat = ay + t * dy;
  const closestLng = ax + t * dx;
  return haversineM(pLat, pLng, closestLat, closestLng);
}

function minDistanceToRoute(location, routeCoords) {
  let minDist = Infinity;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [aLng, aLat] = routeCoords[i];
    const [bLng, bLat] = routeCoords[i + 1];
    const d = distanceToSegmentM(location.lat, location.lng, aLat, aLng, bLat, bLng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function useReroute(currentLocation, activeRoute, onDeviation) {
  const [isDeviated, setIsDeviated] = useState(false);
  const [deviationDistance, setDeviationDistance] = useState(0);

  const checkDeviation = useCallback(() => {
    if (!currentLocation || !activeRoute?.geometry?.coordinates) return;

    const coords = activeRoute.geometry.coordinates;
    if (coords.length < 2) return;

    const distance = minDistanceToRoute(currentLocation, coords);
    setDeviationDistance(distance);

    if (distance > DEVIATION_THRESHOLD_M) {
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

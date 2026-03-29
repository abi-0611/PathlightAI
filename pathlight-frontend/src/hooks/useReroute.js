import { useState, useRef, useEffect, useCallback } from 'react';

const DEVIATION_THRESHOLD_M = 50;
const REROUTE_COOLDOWN_MS = 15000; // 15 seconds between reroutes

/**
 * Approximate distance (metres) from point p to segment a→b.
 * Uses local-plane projection (accurate enough within a few km).
 * p, a, b are [lng, lat].
 */
function pointToSegmentDistM(p, a, b) {
  const R = 6371000;
  const cosLat = Math.cos((p[1] * Math.PI) / 180);

  // Convert a and b into metres relative to p (origin)
  const ax = ((a[0] - p[0]) * Math.PI / 180) * R * cosLat;
  const ay = ((a[1] - p[1]) * Math.PI / 180) * R;
  const bx = ((b[0] - p[0]) * Math.PI / 180) * R * cosLat;
  const by = ((b[1] - p[1]) * Math.PI / 180) * R;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.sqrt(ax * ax + ay * ay);

  // Project origin onto segment, clamp to [0,1]
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.sqrt(projX * projX + projY * projY);
}

/**
 * Minimum distance (metres) from a GPS position to any segment of the route.
 */
function distanceToRoute(position, routeCoords) {
  let min = Infinity;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const d = pointToSegmentDistM(position, routeCoords[i], routeCoords[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Monitors GPS position against the active route.
 * When the user deviates more than DEVIATION_THRESHOLD_M from the route
 * and the cooldown has elapsed, calls `onReroute(currentGpsPosition)`.
 *
 * Returns { isOffRoute, isRerouting, deviationDistance }.
 */
export function useReroute(gpsPosition, routeGeoJSON, onReroute) {
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [deviationDistance, setDeviationDistance] = useState(0);
  const lastRerouteRef = useRef(0);
  const reroutingRouteRef = useRef(null); // track which route triggered rerouting

  useEffect(() => {
    if (!gpsPosition || !routeGeoJSON?.geometry?.coordinates) {
      setIsOffRoute(false);
      setDeviationDistance(0);
      return;
    }

    const coords = routeGeoJSON.geometry.coordinates;
    if (coords.length < 2) return;

    const dist = distanceToRoute(gpsPosition, coords);
    setDeviationDistance(Math.round(dist));

    const offRoute = dist > DEVIATION_THRESHOLD_M;
    setIsOffRoute(offRoute);

    if (offRoute && Date.now() - lastRerouteRef.current > REROUTE_COOLDOWN_MS) {
      lastRerouteRef.current = Date.now();
      reroutingRouteRef.current = routeGeoJSON;
      setIsRerouting(true);
      onReroute(gpsPosition);
    }
  }, [gpsPosition, routeGeoJSON, onReroute]);

  // Clear isRerouting when a NEW route arrives (different from the one that triggered it)
  useEffect(() => {
    if (isRerouting && routeGeoJSON && routeGeoJSON !== reroutingRouteRef.current) {
      setIsRerouting(false);
      reroutingRouteRef.current = null;
    }
  }, [routeGeoJSON, isRerouting]);

  return { isOffRoute, isRerouting, deviationDistance };
}

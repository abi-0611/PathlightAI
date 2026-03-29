import { useEffect, useRef, useCallback } from 'react';

// Bearing from point a [lng,lat] to point b [lng,lat]
function bearingDeg(a, b) {
  const lon1 = (a[0] * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lon2 = (b[0] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const dLon = lon2 - lon1;
  const x = Math.sin(dLon) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

// Zoom level based on distance to next turn
function getZoomForDistance(distanceM) {
  if (distanceM > 500) return { zoom: 16, pitch: 60 };
  if (distanceM > 200) return { zoom: 17, pitch: 62 };
  if (distanceM > 50)  return { zoom: 18, pitch: 65 };
  return { zoom: 18.5, pitch: 55 };
}

export function useNavigationCamera(mapRef, {
  isNavigating,
  gpsPosition,
  prevGpsPosition,    // previous GPS position for bearing calc
  distanceToNextTurn,
  nextTurnPoint,      // [lng, lat] of the next turn
}) {
  const lastCameraUpdateRef = useRef(0);
  const CAMERA_UPDATE_INTERVAL_MS = 750;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isNavigating || !gpsPosition) return;

    const now = Date.now();
    if (now - lastCameraUpdateRef.current < CAMERA_UPDATE_INTERVAL_MS) return;
    lastCameraUpdateRef.current = now;

    // Calculate heading
    let bearing = map.getBearing();
    if (prevGpsPosition) {
      const moved = /* haversine */ Math.hypot(
        gpsPosition.lng - prevGpsPosition.lng,
        gpsPosition.lat - prevGpsPosition.lat
      );
      if (moved > 0.00003) { // ~3 meters minimum movement
        bearing = bearingDeg([prevGpsPosition.lng, prevGpsPosition.lat], [gpsPosition.lng, gpsPosition.lat]);
      }
    } else if (nextTurnPoint) {
      bearing = bearingDeg([gpsPosition.lng, gpsPosition.lat], nextTurnPoint);
    }

    const { zoom, pitch } = getZoomForDistance(distanceToNextTurn ?? 999);

    map.easeTo({
      center: [gpsPosition.lng, gpsPosition.lat],
      bearing,
      zoom,
      pitch,
      duration: 800,
      easing: (t) => t * (2 - t),
      essential: true,
    });
  }, [gpsPosition, isNavigating, distanceToNextTurn, prevGpsPosition, nextTurnPoint, mapRef]);
}

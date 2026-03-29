import { useState, useEffect } from 'react';

// Find the index of the closest point on the route to the user's position
function findClosestSegmentIndex(position, coords) {
  let minDist = Infinity;
  let closestIdx = 0;
  const R = 6371000;
  const cosLat = Math.cos((position.lat * Math.PI) / 180);

  for (let i = 0; i < coords.length - 1; i++) {
    const ax = ((coords[i][0] - position.lng) * Math.PI / 180) * R * cosLat;
    const ay = ((coords[i][1] - position.lat) * Math.PI / 180) * R;
    const bx = ((coords[i+1][0] - position.lng) * Math.PI / 180) * R * cosLat;
    const by = ((coords[i+1][1] - position.lat) * Math.PI / 180) * R;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx*dx + dy*dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax*dx + ay*dy) / lenSq));
    const projX = ax + t*dx, projY = ay + t*dy;
    const d = Math.sqrt(projX*projX + projY*projY);
    if (d < minDist) { minDist = d; closestIdx = i; }
  }
  return closestIdx;
}

// Calculate total length of a coords array
function coordsLength(coords) {
  let total = 0;
  const R = 6371000;
  for (let i = 0; i < coords.length - 1; i++) {
    const dLat = ((coords[i+1][1] - coords[i][1]) * Math.PI) / 180;
    const dLon = ((coords[i+1][0] - coords[i][0]) * Math.PI) / 180;
    const lat1 = (coords[i][1] * Math.PI) / 180;
    const lat2 = (coords[i+1][1] * Math.PI) / 180;
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    total += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  }
  return total;
}

export function useRouteProgress(gpsPosition, routeGeoJSON) {
  const [splitIndex, setSplitIndex] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [progressFraction, setProgressFraction] = useState(0);

  useEffect(() => {
    if (!gpsPosition || !routeGeoJSON?.geometry?.coordinates) return;
    const coords = routeGeoJSON.geometry.coordinates;
    if (coords.length < 2) return;

    const idx = findClosestSegmentIndex(gpsPosition, coords);
    setSplitIndex(idx);

    const remainingCoords = coords.slice(idx);
    const remaining = coordsLength(remainingCoords);
    const total = routeGeoJSON.properties?.total_length_m || coordsLength(coords);
    setRemainingDistance(Math.round(remaining));
    setProgressFraction(Math.max(0, Math.min(1, 1 - remaining / total)));
  }, [gpsPosition, routeGeoJSON]);

  return { splitIndex, remainingDistance, progressFraction };
}

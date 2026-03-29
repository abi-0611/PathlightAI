import { useState, useEffect, useRef } from 'react';

function haversineM(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

export function useSpeedTracker(gpsPosition) {
  const [speedKmh, setSpeedKmh] = useState(0);
  const prevRef = useRef({ position: null, timestamp: null });
  const smoothedRef = useRef(0);

  useEffect(() => {
    if (!gpsPosition) return;
    const now = Date.now();
    const prev = prevRef.current;

    if (prev.position && prev.timestamp) {
      const distM = haversineM(prev.position, gpsPosition);
      const timeSec = (now - prev.timestamp) / 1000;
      if (timeSec > 0.5 && timeSec < 10) {
        const rawKmh = (distM / timeSec) * 3.6;
        // Exponential moving average for smooth display
        smoothedRef.current = smoothedRef.current * 0.7 + rawKmh * 0.3;
        setSpeedKmh(Math.round(smoothedRef.current));
      }
    }

    prevRef.current = { position: gpsPosition, timestamp: now };
  }, [gpsPosition]);

  return speedKmh;
}

import { useState, useCallback, useRef } from 'react';

// Use the Vite proxy (/api → http://localhost:8000) in dev to avoid CORS.
// VITE_API_BASE can override (e.g. for production deployments).
const API_BASE = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE
  : '/api';

export function useRouteData() {
  const [routes, setRoutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchRoutes = useCallback(async (start, end, preferences, isNight = true) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      start_lat: start.lat,
      start_lon: start.lng,
      end_lat: end.lat,
      end_lon: end.lng,
      w_light: ((preferences?.lighting ?? 80) / 100).toFixed(2),
      w_crowd: ((preferences?.population ?? 60) / 100).toFixed(2),
      w_speed: ((preferences?.speed ?? 40) / 100).toFixed(2),
      is_night: isNight ? 'true' : 'false',
      hour: new Date().getHours(),
    });

    try {
      const res = await fetch(`${API_BASE}/routes?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Route fetch failed: ${res.status}`);

      const data = await res.json();
      const alts = data.alternatives || [];

      // Map GeoJSON features to the shape expected by the components
      const formatted = alts.map((feature) => ({
        id: (feature.properties?.mode ?? 'route').toLowerCase().replace(/\s+/g, '_'),
        mode: feature.properties?.mode ?? 'Unknown',
        total_length_m: feature.properties?.total_length_m ?? 0,
        avg_crime_risk: feature.properties?.avg_crime_risk ?? 5,
        avg_lighting_score: feature.properties?.avg_lighting_score ?? 5,
        instructions: feature.properties?.instructions ?? [],
        geometry: feature.geometry,
      }));

      setRoutes(formatted);
      return formatted;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRoutes = useCallback(() => {
    abortRef.current?.abort();
    setRoutes(null);
    setError(null);
  }, []);

  return { routes, loading, error, fetchRoutes, clearRoutes };
}

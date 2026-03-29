import { useState, useCallback, useRef } from 'react';

const API_BASE = 'http://localhost:8000';

export function useRouteData() {
  const [alternatives, setAlternatives] = useState([]); // array of GeoJSON features
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [explanation, setExplanation] = useState(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [isFetchingExplain, setIsFetchingExplain] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Derived: currently selected route
  const routeGeoJSON = alternatives[selectedIndex] || null;
  const routeProps = routeGeoJSON?.properties || null;

  const fetchExplanation = useCallback(async (settings, props, signal) => {
    setIsFetchingExplain(true);
    try {
      const res = await fetch(`${API_BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          w_light: settings.wLight,
          w_crowd: settings.wCrowd,
          w_speed: settings.wSpeed,
          is_night: settings.isNight,
          hour: new Date().getHours(),
          avg_crime_risk: props?.avg_crime_risk ?? 5,
          avg_lighting_score: props?.avg_lighting_score ?? 5,
          total_length_m: props?.total_length_m ?? 500,
        }),
        signal,
      });
      if (!res.ok) throw new Error('Explain fetch failed');
      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setExplanation('Route calculated successfully. Stay safe on your journey.');
    } finally {
      setIsFetchingExplain(false);
    }
  }, []);

  const fetchRoute = useCallback(async (settings, startCoords, endCoords) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsFetchingRoute(true);
    setError(null);

    const params = new URLSearchParams({
      start_lat: startCoords[1],
      start_lon: startCoords[0],
      end_lat: endCoords[1],
      end_lon: endCoords[0],
      w_light: settings.wLight,
      w_crowd: settings.wCrowd,
      w_speed: settings.wSpeed,
      is_night: settings.isNight,
      hour: new Date().getHours(),
    });

    try {
      const res = await fetch(`${API_BASE}/routes?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Route fetch failed: ${res.status}`);
      const data = await res.json();
      const alts = data.alternatives || [];
      setAlternatives(alts);
      // Default to balanced (index 2) if available, else first
      const balancedIdx = alts.findIndex((a) => a.properties?.mode === 'Balanced');
      const defaultIdx = balancedIdx >= 0 ? balancedIdx : 0;
      setSelectedIndex(defaultIdx);
      // Fetch explanation for the default route
      if (alts[defaultIdx]) {
        fetchExplanation(settings, alts[defaultIdx].properties, controller.signal);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
    } finally {
      setIsFetchingRoute(false);
    }
  }, [fetchExplanation]);

  const selectRoute = useCallback((index) => {
    if (index >= 0 && index < alternatives.length) {
      setSelectedIndex(index);
    }
  }, [alternatives.length]);

  return {
    alternatives,
    selectedIndex,
    selectRoute,
    routeGeoJSON,
    routeProps,
    explanation,
    isFetchingRoute,
    isFetchingExplain,
    error,
    fetchRoute,
  };
}

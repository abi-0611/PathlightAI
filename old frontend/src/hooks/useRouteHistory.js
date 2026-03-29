import { useState, useCallback } from 'react';

const STORAGE_KEY = 'pathlight_route_history';
const MAX_ENTRIES = 20;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHistory(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full — silently drop oldest
  }
}

export function useRouteHistory() {
  const [history, setHistory] = useState(loadHistory);

  const addRoute = useCallback((routeGeoJSON, destination, explanation) => {
    if (!routeGeoJSON?.properties) return;
    const props = routeGeoJSON.properties;

    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      destination: destination?.label || 'Unknown',
      destinationCoords: destination ? [destination.lng, destination.lat] : null,
      startCoords: routeGeoJSON.geometry?.coordinates?.[0] || null,
      totalLengthM: props.total_length_m,
      avgCrimeRisk: props.avg_crime_risk,
      avgLightingScore: props.avg_lighting_score,
      hour: props.hour,
      isNight: props.is_night,
      darkness: props.darkness,
      crowdActivity: props.crowd_activity,
      nodeCount: props.node_count,
      explanation: explanation || null,
      // Store full GeoJSON for replay
      geojson: routeGeoJSON,
    };

    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      persistHistory(next);
      return next;
    });
  }, []);

  const removeRoute = useCallback((id) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addRoute, removeRoute, clearHistory };
}

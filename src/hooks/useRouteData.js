import { useState, useCallback } from 'react';

export function useRouteData() {
  const [routes, setRoutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRoutes = useCallback(async (start, end, preferences) => {
    setLoading(true);
    setError(null);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockRoutes = [
        {
          id: 'fastest',
          mode: 'Fastest',
          total_length_m: 4200,
          avg_crime_risk: 4.2,
          avg_lighting_score: 6.5,
          instructions: ['Head north', 'Turn right onto Main St', 'Arrive at destination'],
          geometry: { type: 'LineString', coordinates: [[start.lng, start.lat], [end.lng, end.lat]] }
        },
        {
          id: 'safest',
          mode: 'Safest',
          total_length_m: 4800,
          avg_crime_risk: 1.5,
          avg_lighting_score: 9.2,
          instructions: ['Head north', 'Turn left onto Safe Ave', 'Arrive at destination'],
          geometry: { type: 'LineString', coordinates: [[start.lng, start.lat], [start.lng, end.lat], [end.lng, end.lat]] }
        },
        {
          id: 'balanced',
          mode: 'Balanced',
          total_length_m: 4500,
          avg_crime_risk: 2.8,
          avg_lighting_score: 8.0,
          instructions: ['Head north', 'Continue straight', 'Arrive at destination'],
          geometry: { type: 'LineString', coordinates: [[start.lng, start.lat], [end.lng, start.lat], [end.lng, end.lat]] }
        }
      ];
      setRoutes(mockRoutes);
      return mockRoutes;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRoutes = useCallback(() => {
    setRoutes(null);
  }, []);

  return { routes, loading, error, fetchRoutes, clearRoutes };
}

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export const LAYER_TRAVELED_ID = 'pathlight-route-traveled';
export const SOURCE_TRAVELED_ID = 'pathlight-route-traveled-src';

export function updateRouteProgress(map, routeGeoJSON, splitIndex, isNight, activeRouteId) {
  if (!map || !routeGeoJSON || splitIndex === undefined || !activeRouteId) return;
  
  const coords = routeGeoJSON.geometry.coordinates;
  
  // Traveled segment (up to splitIndex)
  const traveledCoords = coords.slice(0, splitIndex + 1);
  // Remaining segment (from splitIndex)
  const remainingCoords = coords.slice(splitIndex);
  
  const sourceId = `route-source-${activeRouteId}`;
  const glowId = `route-glow-${activeRouteId}`;

  // Update main route source to only show remaining
  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData({
      ...routeGeoJSON,
      geometry: { type: 'LineString', coordinates: remainingCoords }
    });
  }
  
  // Add/update traveled (dimmed) layer
  const traveledData = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: traveledCoords },
    properties: {}
  };
  
  if (map.getSource(SOURCE_TRAVELED_ID)) {
    map.getSource(SOURCE_TRAVELED_ID).setData(traveledData);
  } else {
    map.addSource(SOURCE_TRAVELED_ID, { type: 'geojson', data: traveledData });
    map.addLayer({
      id: LAYER_TRAVELED_ID,
      type: 'line',
      source: SOURCE_TRAVELED_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#4B5563',   // gray — traveled portion
        'line-width': 4,
        'line-opacity': 0.6,
      },
    }, map.getLayer(glowId) ? glowId : undefined); // insert BELOW the main route glow
  }
}

export function useMapRoute(mapRef, routes, activeRouteId, isNight) {
  const routeLayersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current || !routes) return;
    const map = mapRef.current;

    // Clear existing routes
    routeLayersRef.current.forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });
    routeLayersRef.current = [];

    routes.forEach((route, index) => {
      const isActive = route.id === activeRouteId;
      const sourceId = `route-source-${route.id}`;
      const layerId = `route-layer-${route.id}`;
      const glowId = `route-glow-${route.id}`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: route.geometry
        });
      }

      const color = isActive 
        ? (isNight ? '#00E5CC' : '#FFB347') 
        : '#94A3B8';

      if (isActive) {
        map.addLayer({
          id: glowId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': color,
            'line-width': 12,
            'line-opacity': 0.2,
            'line-blur': 10
          }
        });
        routeLayersRef.current.push(glowId);
      }

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': color,
          'line-width': isActive ? 6 : 3,
          'line-opacity': isActive ? 1 : 0.5,
          'line-dasharray': isActive ? [1, 0] : [2, 2]
        }
      });
      routeLayersRef.current.push(layerId);
    });

    return () => {
      // Cleanup on unmount or route change
      routeLayersRef.current.forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      });
      if (map.getLayer(LAYER_TRAVELED_ID)) map.removeLayer(LAYER_TRAVELED_ID);
      if (map.getSource(SOURCE_TRAVELED_ID)) map.removeSource(SOURCE_TRAVELED_ID);
    };
  }, [mapRef, routes, activeRouteId, isNight]);
}

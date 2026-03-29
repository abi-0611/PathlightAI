import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

const SOURCE_ID = 'pathlight-route';
const LAYER_GLOW_ID = 'pathlight-route-glow';
const LAYER_MAIN_ID = 'pathlight-route-main';
const LAYER_DASH_ID = 'pathlight-route-dash';

// Alternative route layers
const ALT_COLORS = ['#6B7280', '#8B5CF6']; // gray, purple for alt routes
function altSourceId(i) { return `pathlight-alt-${i}`; }
function altLayerId(i) { return `pathlight-alt-line-${i}`; }

function removeAltLayers(map) {
  for (let i = 0; i < 2; i++) {
    try { if (map.getLayer(altLayerId(i))) map.removeLayer(altLayerId(i)); } catch {}
    try { if (map.getSource(altSourceId(i))) map.removeSource(altSourceId(i)); } catch {}
  }
}

function addAltLayers(map, alternatives, selectedIndex) {
  removeAltLayers(map);
  let altIdx = 0;
  for (let i = 0; i < alternatives.length; i++) {
    if (i === selectedIndex || altIdx >= 2) continue;
    const alt = alternatives[i];
    if (!alt?.geometry) continue;

    map.addSource(altSourceId(altIdx), { type: 'geojson', data: alt });
    map.addLayer({
      id: altLayerId(altIdx),
      type: 'line',
      source: altSourceId(altIdx),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ALT_COLORS[altIdx],
        'line-width': 3,
        'line-opacity': 0.4,
        'line-dasharray': [4, 3],
      },
    });
    altIdx++;
  }
}

function addRouteLayers(map, geojson, isNight) {
  if (map.getSource(SOURCE_ID)) {
    map.getSource(SOURCE_ID).setData(geojson);
    if (map.getLayer(LAYER_GLOW_ID)) {
      map.setPaintProperty(LAYER_GLOW_ID, 'line-color', isNight ? '#00E5CC' : '#FFB347');
    }
    if (map.getLayer(LAYER_MAIN_ID)) {
      map.setPaintProperty(LAYER_MAIN_ID, 'line-color', isNight ? '#00E5CC' : '#FF9500');
    }
    return false; // layers already existed
  }

  map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

  map.addLayer({
    id: LAYER_GLOW_ID,
    type: 'line',
    source: SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': isNight ? '#00E5CC' : '#FFB347',
      'line-width': 16,
      'line-opacity': 0.15,
      'line-blur': 8,
    },
  });

  map.addLayer({
    id: LAYER_MAIN_ID,
    type: 'line',
    source: SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': isNight ? '#00E5CC' : '#FF9500',
      'line-width': 4,
      'line-opacity': 0,
    },
  });

  map.addLayer({
    id: LAYER_DASH_ID,
    type: 'line',
    source: SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': 'white',
      'line-width': 2,
      'line-opacity': 0,
      'line-dasharray': [0, 4, 3],
    },
  });

  return true; // new layers added
}

function animateRouteDrawIn(map) {
  let step = 0;
  const totalSteps = 60;
  let id;

  function draw() {
    if (step > totalSteps) {
      // Show dash layer after draw-in completes
      if (map.getLayer(LAYER_DASH_ID)) map.setPaintProperty(LAYER_DASH_ID, 'line-opacity', 0.6);
      return;
    }
    const progress = step / totalSteps;
    const eased = 1 - Math.pow(1 - progress, 3);
    if (map.getLayer(LAYER_MAIN_ID)) {
      map.setPaintProperty(LAYER_MAIN_ID, 'line-opacity', eased * 0.95);
    }
    step++;
    id = requestAnimationFrame(draw);
  }

  id = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(id);
}

export function useMapRoute(mapRef, routeGeoJSON, isNight, alternatives = [], selectedIndex = 0) {
  const drawInCleanupRef = useRef(null);

  // Expose a function for re-adding layers after style change
  const reAddLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !routeGeoJSON) return;
    // Clean any prior layers (style.load wipes them)
    try { if (map.getLayer(LAYER_GLOW_ID)) map.removeLayer(LAYER_GLOW_ID); } catch {}
    try { if (map.getLayer(LAYER_MAIN_ID)) map.removeLayer(LAYER_MAIN_ID); } catch {}
    try { if (map.getLayer(LAYER_DASH_ID)) map.removeLayer(LAYER_DASH_ID); } catch {}
    try { if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID); } catch {}

    // Re-add alt routes first (so they render below the main route)
    if (alternatives.length > 1) addAltLayers(map, alternatives, selectedIndex);

    addRouteLayers(map, routeGeoJSON, isNight);
    if (map.getLayer(LAYER_MAIN_ID)) map.setPaintProperty(LAYER_MAIN_ID, 'line-opacity', 0.95);
    if (map.getLayer(LAYER_DASH_ID)) map.setPaintProperty(LAYER_DASH_ID, 'line-opacity', 0.6);
  }, [mapRef, routeGeoJSON, isNight, alternatives, selectedIndex]);

  // Add / update layers when route data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeGeoJSON) return;

    const setupLayers = () => {
      const isNew = addRouteLayers(map, routeGeoJSON, isNight);
      if (isNew) {
        drawInCleanupRef.current?.();
        drawInCleanupRef.current = animateRouteDrawIn(map);
      }
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }
  }, [routeGeoJSON, isNight, mapRef]);

  // Render alternative route lines (dimmed, dashed)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || alternatives.length <= 1) return;

    const setup = () => addAltLayers(map, alternatives, selectedIndex);

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.once('style.load', setup);
    }

    return () => {
      if (map.isStyleLoaded?.()) removeAltLayers(map);
    };
  }, [alternatives, selectedIndex, mapRef]);

  // Animate dashes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeGeoJSON) return;

    let step = 0;
    const dashArraySequence = [
      [0, 4, 3],
      [0.5, 4, 2.5],
      [1, 4, 2],
      [1.5, 4, 1.5],
      [2, 4, 1],
      [2.5, 4, 0.5],
      [3, 4, 0],
      [0, 0.5, 3, 3.5],
    ];
    let animationId;

    function animateDash(timestamp) {
      const newStep = Math.floor((timestamp / 100) % dashArraySequence.length);
      if (newStep !== step && map.getLayer(LAYER_DASH_ID)) {
        map.setPaintProperty(LAYER_DASH_ID, 'line-dasharray', dashArraySequence[newStep]);
        step = newStep;
      }
      animationId = requestAnimationFrame(animateDash);
    }

    animationId = requestAnimationFrame(animateDash);
    return () => cancelAnimationFrame(animationId);
  }, [routeGeoJSON, mapRef]);

  // Fit bounds to route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeGeoJSON) return;

    const coords = routeGeoJSON.geometry.coordinates;
    if (coords.length < 2) return;

    const bounds = coords.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );

    map.fitBounds(bounds, {
      padding: { top: 120, bottom: 280, left: 60, right: 380 },
      duration: 1200,
      easing: (t) => t * (2 - t),
    });
  }, [routeGeoJSON, mapRef]);

  return { reAddLayers };
}

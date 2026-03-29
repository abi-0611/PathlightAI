import { useRef, useState, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import VibePanel from './components/VibePanel';
import AIPopup from './components/AIPopup';
import LoadingScreen from './components/LoadingScreen';
import SearchBar from './components/SearchBar';
import TurnBanner from './components/TurnBanner';
import RouteHistory from './components/RouteHistory';
import RouteSelector from './components/RouteSelector';
import { useRouteData } from './hooks/useRouteData';
import { useMapRoute } from './hooks/useMapRoute';
import { useGeolocation } from './hooks/useGeolocation';
import { useRouteHistory } from './hooks/useRouteHistory';
import { useReroute } from './hooks/useReroute';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

// Guduvancheri center
const MAP_CENTER = [80.050384, 12.853091];
const ARRIVAL_THRESHOLD_M = 30;
const NAV_FOLLOW_ZOOM = 17;
const NAV_FOLLOW_PITCH = 58;
const NAV_CAMERA_UPDATE_MS = 900;
const NAV_MIN_MOVE_M = 4;
const VOICE_NEAR_M = 120;
const VOICE_NOW_M = 35;

/** Haversine distance in meters between two [lng, lat] points */
function distanceM(a, b) {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Bearing in degrees from [lng, lat] a to [lng, lat] b */
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

const LOADING_STEPS = [
  { at: 0, msg: 'Connecting to PathLight AI...' },
  { at: 30, msg: 'Loading street network...' },
  { at: 70, msg: 'Calibrating safety scores...' },
  { at: 100, msg: 'Ready' },
];

/* ── Error Toast ───────────────────────────── */
function ErrorToast({ message }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30
                    glass-card px-4 py-2.5 flex items-center gap-2
                    border-red-400/20 bg-red-900/30">
      <span className="text-red-400 text-xs">⚠</span>
      <span className="font-body text-red-300 text-xs">{message}</span>
    </div>
  );
}

export default function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isDayMode, setIsDayMode] = useState(false);
  const [sliderSettings, setSliderSettings] = useState(null);
  const [toastError, setToastError] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadMessage, setLoadMessage] = useState(LOADING_STEPS[0].msg);
  const [showLoading, setShowLoading] = useState(true);
  const [isTransitioningStyle, setIsTransitioningStyle] = useState(false);

  // Heatmap state
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const heatmapLoadedRef = useRef(false);

  // Route history
  const [historyOpen, setHistoryOpen] = useState(false);
  const { history, addRoute, removeRoute, clearHistory } = useRouteHistory();
  const lastSavedRouteRef = useRef(null);

  // Location state
  const [destination, setDestination] = useState(null); // { lng, lat, label }
  const { position: gpsPosition, error: gpsError, startWatching } = useGeolocation();
  const gpsRef = useRef(gpsPosition);
  useEffect(() => { gpsRef.current = gpsPosition; }, [gpsPosition]);

  // Markers
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const gpsMarkerRef = useRef(null);

  // Navigation state
  const [arrived, setArrived] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState(null);
  const [isNavFollowing, setIsNavFollowing] = useState(true);
  const lastNavCameraUpdateRef = useRef(0);
  const lastNavPositionRef = useRef(null);
  const voiceStateRef = useRef({ turnIndex: -1, stage: 0 });

  const {
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
  } = useRouteData();

  // Draw / animate route on map (with alt route lines)
  const { reAddLayers } = useMapRoute(mapRef, routeGeoJSON, !isDayMode, alternatives, selectedIndex);

  // Keep a stable ref to reAddLayers so the style-switch effect never
  // re-runs just because the route updated (prevents runaway setStyle calls)
  const reAddLayersRef = useRef(reAddLayers);
  useEffect(() => { reAddLayersRef.current = reAddLayers; }, [reAddLayers]);

  // Rate-limit guard: ignore style switches that happen < 600ms apart
  const lastStyleSwitchRef = useRef(0);

  // Stable callback for VibePanel
  const handleSettingsChange = useCallback((settings) => {
    setSliderSettings(settings);
    setIsDayMode(!settings.isNight);
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: MAP_CENTER,
      zoom: 14,
      pitch: 45,
      bearing: -15,
      antialias: true,
    });

    map.on('load', () => {
      map.setFog({
        color: 'rgb(12, 21, 35)',
        'high-color': 'rgb(20, 50, 100)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(5, 10, 20)',
        'star-intensity': 0.15,
      });
      setMapLoaded(true);
    });

    // Fallback: dismiss loading screen after 3s even if map stalls
    const loadTimeout = setTimeout(() => setMapLoaded(true), 3000);

    map.on('error', (e) => {
      console.error('Mapbox error:', e.error?.message || e);
      const msg = e.error?.message || '';
      if (e.error?.status === 401 || msg.includes('Unauthorized') || msg.includes('401')) {
        setToastError('Mapbox token is invalid or expired. Check VITE_MAPBOX_KEY in .env');
      }
      // Always unblock the loading screen on any map error
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      clearTimeout(loadTimeout);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Day / Night style switch — rate-limited, uses ref so route updates don't retrigger it
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Throttle: ignore if last switch was < 600ms ago
    const now = Date.now();
    if (now - lastStyleSwitchRef.current < 600) return;
    lastStyleSwitchRef.current = now;

    setIsTransitioningStyle(true);

    const onStyleLoad = () => {
      if (!isDayMode) {
        map.setFog({
          color: 'rgb(12, 21, 35)',
          'high-color': 'rgb(20, 50, 100)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(5, 10, 20)',
          'star-intensity': 0.3,
        });
      } else {
        map.setFog({
          color: 'rgb(230, 240, 255)',
          'high-color': 'rgb(180, 210, 255)',
          'horizon-blend': 0.02,
        });
      }
      // Use ref — not the callback directly — so this effect never re-runs on route change
      reAddLayersRef.current?.();
      setTimeout(() => setIsTransitioningStyle(false), 300);
    };

    map.once('style.load', onStyleLoad);
    map.setStyle(
      isDayMode
        ? 'mapbox://styles/mapbox/light-v11'
        : 'mapbox://styles/mapbox/dark-v11'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDayMode, mapLoaded]); // intentionally excludes reAddLayers — use the ref instead

  // ── Heatmap: fetch data and manage layer ──────────────────────────────────
  const addHeatmapLayer = useCallback((map, data) => {
    // Remove existing layer/source if present
    if (map.getLayer('danger-heatmap')) map.removeLayer('danger-heatmap');
    if (map.getSource('danger-heatmap')) map.removeSource('danger-heatmap');

    map.addSource('danger-heatmap', { type: 'geojson', data });
    map.addLayer({
      id: 'danger-heatmap',
      type: 'heatmap',
      source: 'danger-heatmap',
      paint: {
        'heatmap-weight': ['get', 'danger'],
        'heatmap-intensity': 1.2,
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 15, 15, 25, 18, 40],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, 'rgba(0,255,136,0.15)',
          0.4, 'rgba(255,255,0,0.3)',
          0.6, 'rgba(255,165,0,0.5)',
          0.8, 'rgba(255,60,60,0.65)',
          1.0, 'rgba(200,0,0,0.8)',
        ],
        'heatmap-opacity': 0.75,
      },
    });
  }, []);

  // Fetch heatmap data (once per toggle on, refetch when hour changes)
  useEffect(() => {
    if (!heatmapVisible || !mapLoaded) return;

    const hour = new Date().getHours();
    const fetchHeatmap = async () => {
      try {
        const res = await fetch(`http://localhost:8000/heatmap?hour=${hour}`);
        if (!res.ok) throw new Error('Heatmap fetch failed');
        const geojson = await res.json();
        setHeatmapData(geojson);
        heatmapLoadedRef.current = true;
      } catch (err) {
        console.error('Heatmap fetch error:', err);
        setToastError('Failed to load danger heatmap');
      }
    };
    fetchHeatmap();
  }, [heatmapVisible, mapLoaded]);

  // Add/remove heatmap layer when data or visibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (heatmapVisible && heatmapData) {
      // Wait for style to be loaded
      const apply = () => addHeatmapLayer(map, heatmapData);
      if (map.isStyleLoaded()) {
        apply();
      } else {
        map.once('style.load', apply);
      }
    } else {
      // Remove heatmap layer
      if (map.getLayer('danger-heatmap')) map.removeLayer('danger-heatmap');
      if (map.getSource('danger-heatmap')) map.removeSource('danger-heatmap');
    }
  }, [heatmapVisible, heatmapData, mapLoaded, addHeatmapLayer]);

  // Re-add heatmap after style switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatmapVisible || !heatmapData) return;

    const reAddHeatmap = () => {
      if (heatmapVisible && heatmapData) addHeatmapLayer(map, heatmapData);
    };
    map.on('style.load', reAddHeatmap);
    return () => map.off('style.load', reAddHeatmap);
  }, [heatmapVisible, heatmapData, addHeatmapLayer]);

  // Progressive loading simulation + guaranteed 3s hard dismiss
  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 12 + 4;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setLoadProgress(100);
        setLoadMessage('Ready');
        setTimeout(() => setShowLoading(false), 400);
        return;
      }
      const step = LOADING_STEPS.filter((s) => s.at <= p).pop();
      setLoadProgress(Math.round(p));
      if (step) setLoadMessage(step.msg);
    }, 100);
    // Hard cap: always dismiss after 3s no matter what
    const hardStop = setTimeout(() => {
      clearInterval(interval);
      setShowLoading(false);
    }, 3000);
    return () => { clearInterval(interval); clearTimeout(hardStop); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When map loads: update state (route fetch / style switch depends on this)
  // Loading screen is already dismissed by the timer above

  // Start GPS on mount
  useEffect(() => {
    startWatching();
  }, [startWatching]);

  // GPS error toast
  useEffect(() => {
    if (gpsError) setToastError(`GPS: ${gpsError}`);
  }, [gpsError]);

  const speakNavigation = useCallback((text, interrupt = false) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      if (interrupt) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis failures and continue visual navigation.
    }
  }, []);

  // Stop auto-follow if the user manually pans/rotates the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const disableFollow = () => setIsNavFollowing(false);
    map.on('dragstart', disableFollow);
    map.on('rotatestart', disableFollow);
    map.on('pitchstart', disableFollow);

    return () => {
      map.off('dragstart', disableFollow);
      map.off('rotatestart', disableFollow);
      map.off('pitchstart', disableFollow);
    };
  }, [mapLoaded]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update GPS marker on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !gpsPosition) return;

    if (!gpsMarkerRef.current) {
      // Create a pulsing blue dot for current position
      const el = document.createElement('div');
      el.className = 'gps-marker';
      el.innerHTML = `
        <div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;
                    box-shadow:0 0 12px rgba(66,133,244,0.6);position:relative;">
          <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(66,133,244,0.3);
                      animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        </div>`;
      gpsMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(gpsPosition)
        .setPopup(new mapboxgl.Popup({ offset: 15 }).setText('You are here'))
        .addTo(map);
    } else {
      gpsMarkerRef.current.setLngLat(gpsPosition);
    }
  }, [gpsPosition, mapLoaded]);

  // Continuously follow user location when navigation is active.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isNavFollowing) return;
    if (!gpsPosition || !destination || !routeProps?.instructions || arrived) return;

    const now = Date.now();
    if (now - lastNavCameraUpdateRef.current < NAV_CAMERA_UPDATE_MS) return;

    const prevPos = lastNavPositionRef.current;
    const movedM = prevPos ? distanceM(prevPos, gpsPosition) : Infinity;
    if (Number.isFinite(movedM) && movedM < NAV_MIN_MOVE_M) return;

    const nextInstruction = routeProps.instructions[
      Math.min(currentTurnIndex + 1, routeProps.instructions.length - 1)
    ];

    let bearing = map.getBearing();
    if (prevPos && Number.isFinite(movedM) && movedM >= NAV_MIN_MOVE_M) {
      bearing = bearingDeg(prevPos, gpsPosition);
    } else if (nextInstruction?.point) {
      bearing = bearingDeg(gpsPosition, nextInstruction.point);
    }

    lastNavCameraUpdateRef.current = now;
    lastNavPositionRef.current = gpsPosition;

    map.easeTo({
      center: gpsPosition,
      zoom: NAV_FOLLOW_ZOOM,
      pitch: NAV_FOLLOW_PITCH,
      bearing,
      duration: 850,
      easing: (t) => t * (2 - t),
      essential: true,
    });
  }, [
    gpsPosition,
    destination,
    routeProps,
    currentTurnIndex,
    arrived,
    mapLoaded,
    isNavFollowing,
  ]);

  // Spoken turn prompts for near and immediate actions.
  useEffect(() => {
    if (!destination || !routeProps?.instructions || !gpsPosition || arrived) return;

    const instructions = routeProps.instructions;
    const current = instructions[currentTurnIndex];
    if (!current) return;

    const dist = distanceToNextTurn ?? (current.point ? distanceM(gpsPosition, current.point) : null);
    const state = voiceStateRef.current;

    if (state.turnIndex !== currentTurnIndex) {
      voiceStateRef.current = { turnIndex: currentTurnIndex, stage: 0 };
      if (current.direction !== 'arrive') {
        speakNavigation(current.text, true);
      }
    }

    if (dist != null && current.direction !== 'arrive') {
      const roundedDist = Math.max(10, Math.round(dist / 10) * 10);
      if (dist <= VOICE_NOW_M && voiceStateRef.current.stage < 2) {
        speakNavigation(`Now ${current.text.toLowerCase()}`, true);
        voiceStateRef.current.stage = 2;
      } else if (dist <= VOICE_NEAR_M && voiceStateRef.current.stage < 1) {
        speakNavigation(`In ${roundedDist} meters, ${current.text.toLowerCase()}`);
        voiceStateRef.current.stage = 1;
      }
    }

    if (current.direction === 'arrive' && dist != null && dist <= ARRIVAL_THRESHOLD_M + 8) {
      if (voiceStateRef.current.stage < 3) {
        speakNavigation('You have arrived at your destination', true);
        voiceStateRef.current.stage = 3;
      }
    }
  }, [
    destination,
    routeProps,
    gpsPosition,
    currentTurnIndex,
    distanceToNextTurn,
    arrived,
    speakNavigation,
  ]);

  // Handle destination from search bar
  const handleDestinationSelect = useCallback((dest) => {
    setDestination(dest);
  }, []);

  // Handle clear destination
  const handleClearDestination = useCallback(() => {
    setDestination(null);
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
  }, []);

  // Handle map click — set destination
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleClick = (e) => {
      const { lng, lat } = e.lngLat;
      setDestination({ lng, lat, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [mapLoaded]);

  // Update destination marker when destination changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!destination) return;

    if (endMarkerRef.current) {
      endMarkerRef.current.setLngLat([destination.lng, destination.lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:14px;height:14px;border-radius:50%;background:#FF4444;border:3px solid white;
                          box-shadow:0 0 10px rgba(255,68,68,0.5);"></div>`;
      endMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new mapboxgl.Popup({ offset: 15 }).setText(destination.label))
        .addTo(map);
    }
  }, [destination, mapLoaded]);

  // Fetch route when destination or slider settings change (NOT on every GPS tick)
  useEffect(() => {
    if (!mapLoaded || !gpsRef.current || !destination) return;
    const settings = sliderSettings || { wLight: 0.7, wCrowd: 0.4, wSpeed: 0.5, isNight: true };
    fetchRoute(settings, gpsRef.current, [destination.lng, destination.lat]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, sliderSettings, mapLoaded, fetchRoute]);

  // Reroute on GPS deviation (>50 m off-route)
  const handleReroute = useCallback((currentPos) => {
    if (!destination) return;
    const settings = sliderSettings || { wLight: 0.7, wCrowd: 0.4, wSpeed: 0.5, isNight: true };
    fetchRoute(settings, currentPos, [destination.lng, destination.lat]);
  }, [destination, sliderSettings, fetchRoute]);

  const { isOffRoute, isRerouting } = useReroute(gpsPosition, routeGeoJSON, handleReroute);

  // Reset navigation state when destination changes
  useEffect(() => {
    setArrived(false);
    setCurrentTurnIndex(0);
    setDistanceToNextTurn(null);
    voiceStateRef.current = { turnIndex: -1, stage: 0 };
    lastNavPositionRef.current = null;
    lastNavCameraUpdateRef.current = 0;
    if (destination) {
      setIsNavFollowing(true);
    }
  }, [destination, routeGeoJSON]);

  // Arrival detection + turn-by-turn tracking
  useEffect(() => {
    if (!gpsPosition || !destination || arrived) return;

    // Check arrival
    const distToDest = distanceM(gpsPosition, [destination.lng, destination.lat]);
    if (distToDest <= ARRIVAL_THRESHOLD_M) {
      setArrived(true);
      // Auto-clear after 5 seconds
      const id = setTimeout(() => {
        setDestination(null);
        setArrived(false);
        if (endMarkerRef.current) {
          endMarkerRef.current.remove();
          endMarkerRef.current = null;
        }
      }, 5000);
      return () => clearTimeout(id);
    }

    // Track nearest upcoming turn instruction
    const instructions = routeProps?.instructions;
    if (!instructions || instructions.length < 2) return;

    // Find the next instruction that's still ahead (not behind us)
    let bestIdx = currentTurnIndex;
    let bestDist = Infinity;

    for (let i = Math.max(1, currentTurnIndex); i < instructions.length; i++) {
      const pt = instructions[i].point;
      const d = distanceM(gpsPosition, pt);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    // If we passed the current turn (within 15m), advance to next
    if (bestIdx === currentTurnIndex && bestDist < 15 && bestIdx < instructions.length - 1) {
      bestIdx = currentTurnIndex + 1;
      bestDist = distanceM(gpsPosition, instructions[bestIdx].point);
    }

    setCurrentTurnIndex(bestIdx);
    setDistanceToNextTurn(Math.round(bestDist));
  }, [gpsPosition, destination, arrived, routeProps, currentTurnIndex]);

  // Auto-save route to history when a new route is fetched
  useEffect(() => {
    if (!routeGeoJSON || !destination) return;
    // Only save if it's a different route (avoid duplicates on slider tweaks)
    const routeId = `${destination.lng},${destination.lat},${routeGeoJSON.properties?.node_count}`;
    if (lastSavedRouteRef.current === routeId) return;
    lastSavedRouteRef.current = routeId;
    addRoute(routeGeoJSON, destination, explanation);
  }, [routeGeoJSON, destination, explanation, addRoute]);

  // Replay a route from history
  const handleReplayRoute = useCallback((entry) => {
    setHistoryOpen(false);
    if (entry.destinationCoords) {
      setDestination({
        lng: entry.destinationCoords[0],
        lat: entry.destinationCoords[1],
        label: entry.destination,
      });
    }
    // Fly map to show the route
    if (mapRef.current && entry.destinationCoords) {
      mapRef.current.flyTo({
        center: entry.destinationCoords,
        zoom: 15,
        duration: 1000,
      });
    }
  }, []);

  // Show error toast, auto-dismiss after 5s
  useEffect(() => {
    if (!error) return;
    setToastError(error);
    const id = setTimeout(() => setToastError(null), 5000);
    return () => clearTimeout(id);
  }, [error]);

  // Responsive map pitch
  useEffect(() => {
    if (!mapLoaded) return;
    const handleResize = () => {
      const map = mapRef.current;
      if (!map) return;
      const pitch = window.innerWidth >= 1920 ? 50 : window.innerWidth <= 640 ? 30 : 45;
      map.easeTo({ pitch, duration: 500 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapLoaded]);

  // Parallax on panel hover (desktop only)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (window.innerWidth < 768) return;
      const xRatio = e.clientX / window.innerWidth - 0.5;
      const yRatio = e.clientY / window.innerHeight - 0.5;
      document.documentElement.style.setProperty('--parallax-x', `${xRatio * -4}px`);
      document.documentElement.style.setProperty('--parallax-y', `${yRatio * -2}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Day mode class on root
  useEffect(() => {
    document.documentElement.classList.toggle('day-mode', isDayMode);
  }, [isDayMode]);

  return (
    <div className="relative w-full h-full bg-obsidian-950 grain">
      {/* Map container — full screen */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Gradient vignette overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-obsidian-950/40 via-transparent to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-obsidian-950/20 via-transparent to-transparent" />

      {/* Search bar — top center */}
      <SearchBar
        onDestinationSelect={handleDestinationSelect}
        destination={destination}
        onClear={handleClearDestination}
      />

      {/* Rerouting banner */}
      {isRerouting && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20
                        glass-card px-4 py-2 flex items-center gap-2
                        border-amber-400/30 bg-amber-900/30 animate-pulse">
          <svg className="w-4 h-4 text-amber-400 animate-spin" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <span className="font-body text-amber-300 text-xs font-medium">Rerouting…</span>
        </div>
      )}

      {/* Off-route warning (shown when off-route but cooldown hasn't elapsed yet) */}
      {isOffRoute && !isRerouting && destination && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20
                        glass-card px-3 py-1.5 flex items-center gap-2
                        border-orange-400/20 bg-orange-900/20">
          <span className="text-orange-400 text-xs">⚠</span>
          <span className="font-body text-orange-300 text-[11px]">You are off route</span>
        </div>
      )}

      {/* Turn-by-turn navigation banner */}
      {destination && routeProps?.instructions && (
        <TurnBanner
          instruction={routeProps.instructions[currentTurnIndex]}
          nextInstruction={routeProps.instructions[currentTurnIndex + 1]}
          distanceToNext={distanceToNextTurn}
          arrived={arrived}
        />
      )}

      {/* App header — top left */}
      <header className="absolute top-[4.5rem] left-4 z-10 pointer-events-none">
        <div className="glass-card px-4 py-2.5 flex items-center gap-2.5" title="PathLight AI — Safe Routing Engine">
          <div className="w-2.5 h-2.5 rounded-full bg-pathlight-400 animate-pulse-slow shadow-[0_0_8px_rgba(0,229,204,0.8)]" />
          <span className="font-display font-bold text-white text-sm tracking-wide">PathLight</span>
          <span className="text-pathlight-400 font-display font-bold text-sm">AI</span>
        </div>
      </header>

      {/* Locate me button */}
      <button
        onClick={() => {
          if (gpsPosition && mapRef.current) {
            setIsNavFollowing(true);
            mapRef.current.flyTo({ center: gpsPosition, zoom: 15, duration: 1000 });
          }
        }}
        className="absolute bottom-32 right-4 sm:right-[22rem] 2xl:right-[26rem] z-10 glass-card w-10 h-10 flex items-center justify-center
                   hover:border-pathlight-400/30 transition-all duration-200 cursor-pointer
                   active:scale-95"
        title="Go to current location"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-pathlight-400" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
        </svg>
      </button>

      {/* Navigation follow toggle (Google Maps style recenter/follow) */}
      {destination && routeGeoJSON && !arrived && (
        <button
          onClick={() => setIsNavFollowing((v) => !v)}
          className={`absolute bottom-[17.5rem] right-4 sm:right-[22rem] 2xl:right-[26rem] z-10 glass-card w-10 h-10
                     flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95
                     ${isNavFollowing ? 'border-pathlight-400/50 bg-pathlight-400/10' : 'hover:border-pathlight-400/30'}`}
          title={isNavFollowing ? 'Following your movement' : 'Resume navigation follow'}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${isNavFollowing ? 'text-pathlight-400' : 'text-slate-400'}`}
               fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l4 8-8 2 2-8 2-2z" />
            <circle cx="12" cy="12" r="9" opacity="0.35" />
          </svg>
        </button>
      )}

      {/* Heatmap toggle button */}
      <button
        onClick={() => setHeatmapVisible((v) => !v)}
        className={`absolute bottom-[11.5rem] right-4 sm:right-[22rem] 2xl:right-[26rem] z-10 glass-card w-10 h-10 flex items-center justify-center
                   transition-all duration-200 cursor-pointer active:scale-95
                   ${heatmapVisible ? 'border-red-400/50 bg-red-900/30' : 'hover:border-pathlight-400/30'}`}
        title={heatmapVisible ? 'Hide danger heatmap' : 'Show danger heatmap'}
      >
        <svg viewBox="0 0 24 24" className={`w-5 h-5 ${heatmapVisible ? 'text-red-400' : 'text-pathlight-400'}`}
             fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C8 6 4 10.5 4 14a8 8 0 0016 0c0-3.5-4-8-8-12z" />
        </svg>
      </button>

      {/* Route history toggle button */}
      <button
        onClick={() => setHistoryOpen((v) => !v)}
        className={`absolute bottom-[14.5rem] right-4 sm:right-[22rem] 2xl:right-[26rem] z-10 glass-card w-10 h-10 flex items-center justify-center
                   transition-all duration-200 cursor-pointer active:scale-95
                   ${historyOpen ? 'border-pathlight-400/50 bg-pathlight-400/10' : 'hover:border-pathlight-400/30'}`}
        title="Route history"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-pathlight-400" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        {history.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pathlight-400 text-obsidian-950
                          text-[9px] font-bold flex items-center justify-center">
            {history.length > 9 ? '9+' : history.length}
          </span>
        )}
      </button>

      {/* Route selector — bottom center (when alternatives exist) */}
      {destination && alternatives.length > 1 && (
        <RouteSelector
          alternatives={alternatives}
          selectedIndex={selectedIndex}
          onSelect={selectRoute}
        />
      )}

      {/* Status banner when waiting for destination */}
      {!destination && mapLoaded && !showLoading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-card px-4 py-2.5">
          <p className="font-body text-slate-400 text-xs text-center">
            Search a place, paste coordinates, or click the map to set your destination
          </p>
        </div>
      )}

      {/* Vibe Panel — bottom right */}
      <VibePanel onSettingsChange={handleSettingsChange} isLoading={isFetchingRoute} />

      {/* AI Popup — top right */}
      <AIPopup
        explanation={explanation}
        isLoading={isFetchingExplain}
        routeProps={routeProps}
        isNight={!isDayMode}
      />

      {/* Error Toast */}
      {toastError && <ErrorToast message={toastError} />}

      {/* Route History Panel */}
      <RouteHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onReplay={handleReplayRoute}
        onRemove={removeRoute}
        onClear={clearHistory}
      />

      {/* Style transition overlay */}
      <div
        className={`absolute inset-0 z-40 bg-obsidian-950 pointer-events-none style-transition-overlay
                    ${isTransitioningStyle ? 'opacity-40' : 'opacity-0'}`}
      />

      {/* Cinematic loading screen */}
      {showLoading && <LoadingScreen progress={loadProgress} message={loadMessage} />}
    </div>
  );
}

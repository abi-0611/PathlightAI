/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Hooks
import { useRouteData } from './hooks/useRouteData';
import { useMapRoute, updateRouteProgress } from './hooks/useMapRoute';
import { useGeolocation } from './hooks/useGeolocation';
import { useRouteHistory } from './hooks/useRouteHistory';
import { useReroute } from './hooks/useReroute';
import { useParallax } from './hooks/useParallax';
import { useNotifications } from './hooks/useNotifications';
import { useNavigationMode } from './hooks/useNavigationMode';
import { useNavigationCamera } from './hooks/useNavigationCamera';
import { useRouteProgress } from './hooks/useRouteProgress';
import { useSpeedTracker } from './hooks/useSpeedTracker';

// Components
import { LoadingScreen } from './components/LoadingScreen';
import { SearchBar } from './components/SearchBar';
import { MapToolbar } from './components/MapToolbar';
import { VibePanel } from './components/VibePanel';
import { AIPopup } from './components/AIPopup';
import { RouteSelector } from './components/RouteSelector';
import { TurnBanner } from './components/TurnBanner';
import { RouteHistory } from './components/RouteHistory';
import { NotificationStack } from './components/NotificationStack';
import { BottomSheet } from './components/BottomSheet';
import { NavigationHUD } from './components/NavigationHUD';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || '';

// ── Constants ──────────────────────────────────────────────────────────────
const MAP_CENTER: [number, number] = [80.050384, 12.853091];
// Use the Vite proxy in dev (/api → http://localhost:8000) to avoid CORS.
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';
const ARRIVAL_THRESHOLD_M = 30;
const NAV_FOLLOW_ZOOM = 17;
const NAV_FOLLOW_PITCH = 58;
const NAV_CAMERA_UPDATE_MS = 900;
const NAV_MIN_MOVE_M = 4;
const VOICE_NEAR_M = 120;
const VOICE_NOW_M = 35;
const REROUTE_COOLDOWN_MS = 30_000;

type Pos = { lat: number; lng: number } | [number, number];

// ── Helpers ────────────────────────────────────────────────────────────────
function toLngLat(p: Pos): [number, number] {
  return Array.isArray(p) ? p : [p.lng, p.lat];
}

/** Haversine distance in meters — accepts {lat,lng} objects or [lng,lat] arrays */
function distanceM(a: Pos, b: Pos): number {
  const R = 6371000;
  const [aLng, aLat] = toLngLat(a);
  const [bLng, bLat] = toLngLat(b);
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Bearing in degrees from a to b */
function bearingDeg(a: Pos, b: Pos): number {
  const [aLng, aLat] = toLngLat(a);
  const [bLng, bLat] = toLngLat(b);
  const lon1 = (aLng * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lon2 = (bLng * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const gpsMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  /** Always-fresh GPS — for callbacks that must not go stale */
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevGpsRef = useRef<{ lat: number; lng: number } | null>(null);

  /** Deduplication for route history auto-save */
  const lastSavedRouteRef = useRef<string | null>(null);

  /** Voice staging: { turnIndex, stage } — 0=new, 1=near(120m), 2=now(35m), 3=arrive */
  const voiceStateRef = useRef({ turnIndex: -1, stage: 0 });

  /** Camera follow rate-limit */
  const lastNavCameraUpdateRef = useRef(0);
  const lastNavPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  /** Day/Night toggle debounce timer (600 ms) */
  const styleTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Reroute cooldown */
  const lastRerouteRef = useRef(0);

  // ── State ─────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isNight, setIsNight] = useState(true);
  const [preferences, setPreferences] = useState({ lighting: 80, population: 60, speed: 40 });
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [destination, setDestination] = useState<{
    lng: number;
    lat: number;
    label: string;
  } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [distanceToTurn, setDistanceToTurn] = useState<number | null>(null);
  const [isArrived, setIsArrived] = useState(false);
  const [heatmapData, setHeatmapData] = useState<object | null>(null);
  const [navStartTime, setNavStartTime] = useState<number | null>(null);

  // ── Custom Hooks ──────────────────────────────────────────────────────────
  useParallax(1.5);
  const { notifications, addNotification, removeNotification } = useNotifications();
  const {
    routes,
    loading: routesLoading,
    error: routeError,
    fetchRoutes,
    clearRoutes,
  } = useRouteData();
  const { location, error: geoError, startWatching } = useGeolocation();
  const { history, addHistoryItem } = useRouteHistory();
  const { isNavigating, startNavigation, exitNavigation } = useNavigationMode();

  const activeRoute = routes?.find((r) => r.id === activeRouteId) ?? null;

  // Derived instructions — computed from turn index (not stale state)
  const currentInstruction = activeRoute?.instructions?.[currentTurnIndex] ?? null;
  const nextInstruction = activeRoute?.instructions?.[currentTurnIndex + 1] ?? null;

  // Normalize to strings for TurnBanner (instructions may be strings or {text,point,direction})
  const currentText: string | null =
    typeof currentInstruction === 'string'
      ? currentInstruction
      : (currentInstruction as any)?.text ?? null;
  const nextText: string | null =
    typeof nextInstruction === 'string'
      ? nextInstruction
      : (nextInstruction as any)?.text ?? null;

  // ── Keep GPS refs always fresh ─────────────────────────────────────────────
  useEffect(() => {
    if (location) {
      prevGpsRef.current = gpsRef.current;
      gpsRef.current = location;
    }
  }, [location]);

  // ── Phase 6: Navigation Camera ────────────────────────────────────────────
  useNavigationCamera(mapRef, {
    isNavigating,
    gpsPosition: location,
    prevGpsPosition: prevGpsRef.current,
    distanceToNextTurn: distanceToTurn,
    nextTurnPoint: (currentInstruction as any)?.point,
  });

  // ── Phase 6: Route Progress ───────────────────────────────────────────────
  const { splitIndex, remainingDistance } = useRouteProgress(location, activeRoute);
  const speedKmh = useSpeedTracker(location);

  useEffect(() => {
    if (isNavigating && activeRoute && mapRef.current?.isStyleLoaded()) {
      updateRouteProgress(mapRef.current, activeRoute, splitIndex, isNight, activeRouteId);
    }
  }, [isNavigating, activeRoute, splitIndex, isNight, activeRouteId]);

  // ── speakNavigation helper ─────────────────────────────────────────────────
  const speakNavigation = useCallback((text: string, interrupt = false) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      if (interrupt) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis failures
    }
  }, []);

  // Cancel speech on unmount
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // ── Map Initialization ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return; // StrictMode guard

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: MAP_CENTER,
      zoom: 14,
      pitch: 45,
      bearing: -15,
      antialias: true,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      map.setFog({
        color: 'rgb(12, 21, 35)',
        'high-color': 'rgb(20, 50, 100)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(5, 10, 20)',
        'star-intensity': 0.3,
      });
      setMapLoaded(true);
    });

    // Start GPS immediately — don't wait for map load
    startWatching();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Day/Night Style Toggle (rate-limited 600 ms debounce) ─────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (styleTransitionTimerRef.current) clearTimeout(styleTransitionTimerRef.current);
    styleTransitionTimerRef.current = setTimeout(() => {
      map.once('style.load', () => {
        if (isNight) {
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
      });
      map.setStyle(
        isNight
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/light-v11'
      );
    }, 600);

    return () => {
      if (styleTransitionTimerRef.current) clearTimeout(styleTransitionTimerRef.current);
    };
  }, [isNight, mapLoaded]);

  // ── Heatmap: real API fetch + layer management ────────────────────────────
  const addHeatmapLayer = useCallback((map: mapboxgl.Map, data: object) => {
    if (map.getLayer('danger-heatmap')) map.removeLayer('danger-heatmap');
    if (map.getSource('danger-heatmap')) map.removeSource('danger-heatmap');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.addSource('danger-heatmap', { type: 'geojson', data: data as any });
    map.addLayer({
      id: 'danger-heatmap',
      type: 'heatmap',
      source: 'danger-heatmap',
      paint: {
        'heatmap-weight': ['get', 'danger'],
        'heatmap-intensity': 1.2,
        'heatmap-radius': [
          'interpolate', ['linear'], ['zoom'],
          11, 15, 15, 25, 18, 40,
        ],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0,   'rgba(0,0,0,0)',
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

  // Fetch heatmap data from real API
  useEffect(() => {
    if (!isHeatmapActive || !mapLoaded) return;
    const hour = new Date().getHours();
    fetch(`${API_BASE}/heatmap?hour=${hour}`)
      .then((r) => {
        if (!r.ok) throw new Error('Heatmap fetch failed');
        return r.json();
      })
      .then(setHeatmapData)
      .catch(() => addNotification('Failed to load danger heatmap', 'warning'));
  }, [isHeatmapActive, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply/remove heatmap layer when data or visibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (isHeatmapActive && heatmapData) {
      const apply = () => addHeatmapLayer(map, heatmapData);
      if (map.isStyleLoaded()) apply();
      else map.once('style.load', apply);
    } else {
      if (map.getLayer('danger-heatmap')) map.removeLayer('danger-heatmap');
      if (map.getSource('danger-heatmap')) map.removeSource('danger-heatmap');
    }
  }, [isHeatmapActive, heatmapData, mapLoaded, addHeatmapLayer]);

  // Re-add heatmap after style switch (style wipes all layers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isHeatmapActive || !heatmapData) return;

    const reAdd = () => {
      if (isHeatmapActive && heatmapData) addHeatmapLayer(map, heatmapData);
    };
    map.on('style.load', reAdd);
    return () => map.off('style.load', reAdd);
  }, [isHeatmapActive, heatmapData, addHeatmapLayer]);

  // ── GPS Marker ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    const addMarker = () => {
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.remove();
        gpsMarkerRef.current = null;
      }
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;
                    box-shadow:0 0 12px rgba(66,133,244,0.6);position:relative;">
          <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(66,133,244,0.3);
                      animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        </div>`;
      gpsMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .addTo(map);
    };

    if (!gpsMarkerRef.current) {
      addMarker();
    } else {
      gpsMarkerRef.current.setLngLat([location.lng, location.lat]);
    }

    // Re-create marker after style reload (style wipes DOM elements too)
    map.on('style.load', addMarker);
    return () => map.off('style.load', addMarker);
  }, [location]);

  // ── Auto-disable follow on user interaction ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const disable = () => setIsFollowing(false);
    map.on('dragstart', disable);
    map.on('rotatestart', disable);
    map.on('pitchstart', disable);
    return () => {
      map.off('dragstart', disable);
      map.off('rotatestart', disable);
      map.off('pitchstart', disable);
    };
  }, [mapLoaded]);

  // ── Map Click → Set Destination ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      setDestination({ lng, lat, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      setIsArrived(false);
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [mapLoaded]);

  // ── Destination Marker ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !destination) return;

    if (destMarkerRef.current) {
      destMarkerRef.current.setLngLat([destination.lng, destination.lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:14px;height:14px;border-radius:50%;background:#FF4444;border:3px solid white;
                          box-shadow:0 0 10px rgba(255,68,68,0.5);"></div>`;
      destMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new mapboxgl.Popup({ offset: 15 }).setText(destination.label))
        .addTo(map);
    }
  }, [destination, mapLoaded]);

  // ── Fetch Routes when Destination / Preferences / isNight change ──────────
  useEffect(() => {
    if (!destination || !mapLoaded) return;
    const start = gpsRef.current ?? { lat: MAP_CENTER[1], lng: MAP_CENTER[0] };

    fetchRoutes(start, destination, preferences, isNight).then((newRoutes) => {
      if (!newRoutes || newRoutes.length === 0) return;

      setActiveRouteId(newRoutes[0].id);
      setIsArrived(false);
      setCurrentTurnIndex(0);
      setDistanceToTurn(null);
      voiceStateRef.current = { turnIndex: -1, stage: 0 };
      lastNavPositionRef.current = null;
      lastNavCameraUpdateRef.current = 0;

      addNotification(
        `${newRoutes.length} route${newRoutes.length > 1 ? 's' : ''} found`,
        'success'
      );

      const bounds = new mapboxgl.LngLatBounds()
        .extend([start.lng, start.lat])
        .extend([destination.lng, destination.lat]);
      mapRef.current?.fitBounds(bounds, {
        padding: { top: 100, bottom: 300, left: 50, right: 400 },
        duration: 1500,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, preferences, isNight, mapLoaded]);

  // ── Reroute on GPS Deviation (with 30s cooldown) ──────────────────────────
  const handleDeviation = useCallback(
    (_distance: number) => {
      const now = Date.now();
      if (now - lastRerouteRef.current < REROUTE_COOLDOWN_MS) return;
      lastRerouteRef.current = now;

      if (!destination) return;
      const start = gpsRef.current ?? { lat: MAP_CENTER[1], lng: MAP_CENTER[0] };

      addNotification('Recalculating route…', 'warning');
      if (window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance('Recalculating'));
      }

      fetchRoutes(start, destination, preferences, isNight).then((newRoutes) => {
        if (newRoutes && newRoutes.length > 0) setActiveRouteId(newRoutes[0].id);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destination, preferences, isNight]
  );

  const { isDeviated } = useReroute(location, activeRoute, handleDeviation);

  // Draw routes on map (handles style.load internally)
  useMapRoute(mapRef, routes, activeRouteId, isNight);

  // ── Arrival Detection + Turn-by-Turn Tracking ─────────────────────────────
  useEffect(() => {
    if (!location || !destination || isArrived) return;

    // --- Arrival check ---
    const distToDest = distanceM(location, destination);
    if (distToDest <= ARRIVAL_THRESHOLD_M) {
      setIsArrived(true);
      speakNavigation('You have arrived at your destination', true);
      addNotification('You have arrived safely!', 'success');

      const id = setTimeout(() => {
        setDestination(null);
        setIsArrived(false);
        if (destMarkerRef.current) {
          destMarkerRef.current.remove();
          destMarkerRef.current = null;
        }
        clearRoutes();
        setActiveRouteId(null);
      }, 5000);
      return () => clearTimeout(id);
    }

    // --- Turn tracking ---
    const instructions = activeRoute?.instructions;
    if (!instructions || instructions.length < 2) return;

    let bestIdx = currentTurnIndex;
    let bestDist = Infinity;

    for (let i = Math.max(1, currentTurnIndex); i < instructions.length; i++) {
      const pt = (instructions[i] as any).point;
      if (!pt) continue;
      const d = distanceM(location, pt);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    // Advance past current turn if within 15 m
    if (
      bestIdx === currentTurnIndex &&
      bestDist < 15 &&
      bestIdx < instructions.length - 1
    ) {
      bestIdx = currentTurnIndex + 1;
      const nextPt = (instructions[bestIdx] as any)?.point;
      bestDist = nextPt ? distanceM(location, nextPt) : bestDist;
    }

    setCurrentTurnIndex(bestIdx);
    setDistanceToTurn(Math.round(bestDist));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, destination, isArrived, activeRoute]);

  // ── Voice Guidance (staged: new turn → 120 m → 35 m → arrive) ────────────
  useEffect(() => {
    if (!destination || !activeRoute?.instructions || !location || isArrived) return;

    const instructions = activeRoute.instructions as any[];
    const current = instructions[currentTurnIndex];
    if (!current) return;

    const dist =
      distanceToTurn ??
      (current.point ? distanceM(location, current.point) : null);
    const state = voiceStateRef.current;

    // New turn — reset stage and announce
    if (state.turnIndex !== currentTurnIndex) {
      voiceStateRef.current = { turnIndex: currentTurnIndex, stage: 0 };
      const text = current.text ?? current;
      if (current.direction !== 'arrive') speakNavigation(String(text), true);
    }

    if (dist != null && current.direction !== 'arrive') {
      const roundedDist = Math.max(10, Math.round(dist / 10) * 10);
      const text = String(current.text ?? current).toLowerCase();

      if (dist <= VOICE_NOW_M && voiceStateRef.current.stage < 2) {
        speakNavigation(`Now ${text}`, true);
        voiceStateRef.current.stage = 2;
      } else if (dist <= VOICE_NEAR_M && voiceStateRef.current.stage < 1) {
        speakNavigation(`In ${roundedDist} meters, ${text}`);
        voiceStateRef.current.stage = 1;
      }
    }

    if (
      current.direction === 'arrive' &&
      dist != null &&
      dist <= ARRIVAL_THRESHOLD_M + 8 &&
      voiceStateRef.current.stage < 3
    ) {
      speakNavigation('You have arrived at your destination', true);
      voiceStateRef.current.stage = 3;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, activeRoute, location, currentTurnIndex, distanceToTurn, isArrived]);

  // ── Nav Camera Follow (manual isFollowing mode) ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isFollowing) return;
    if (!location || !destination || !activeRoute?.instructions || isArrived) return;

    const now = Date.now();
    if (now - lastNavCameraUpdateRef.current < NAV_CAMERA_UPDATE_MS) return;

    const prevPos = lastNavPositionRef.current;
    const movedM = prevPos ? distanceM(prevPos, location) : Infinity;
    if (Number.isFinite(movedM) && movedM < NAV_MIN_MOVE_M) return;

    const instr = activeRoute.instructions as any[];
    const nextInstr = instr[Math.min(currentTurnIndex + 1, instr.length - 1)];

    let bearing = map.getBearing();
    if (prevPos && Number.isFinite(movedM) && movedM >= NAV_MIN_MOVE_M) {
      bearing = bearingDeg(prevPos, location);
    } else if (nextInstr?.point) {
      bearing = bearingDeg(location, nextInstr.point);
    }

    lastNavCameraUpdateRef.current = now;
    lastNavPositionRef.current = location;

    map.easeTo({
      center: [location.lng, location.lat],
      zoom: NAV_FOLLOW_ZOOM,
      pitch: NAV_FOLLOW_PITCH,
      bearing,
      duration: 850,
      easing: (t) => t * (2 - t),
      essential: true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, destination, activeRoute, currentTurnIndex, isArrived, mapLoaded, isFollowing]);

  // ── Route History Auto-save ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeRoute || !destination) return;

    const routeId = `${destination.lng},${destination.lat},${activeRoute.id}`;
    if (lastSavedRouteRef.current === routeId) return;
    lastSavedRouteRef.current = routeId;

    addHistoryItem({
      ...activeRoute,
      destination: destination.label,
      destinationCoords: [destination.lng, destination.lat],
      timestamp: Date.now(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute, destination]);

  // ── Route Error Notification ──────────────────────────────────────────────
  useEffect(() => {
    if (routeError) addNotification(routeError, 'error');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeError]);

  // ── GPS Error Notification ────────────────────────────────────────────────
  useEffect(() => {
    if (geoError) addNotification(`GPS: ${geoError}`, 'warning');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoError]);

  // ── Responsive Map Pitch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded) return;
    const handleResize = () => {
      const map = mapRef.current;
      if (!map) return;
      const pitch =
        window.innerWidth >= 1920 ? 50 : window.innerWidth <= 640 ? 30 : 45;
      map.easeTo({ pitch, duration: 500 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapLoaded]);

  // ── Day mode class on <html> ──────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('day-mode', !isNight);
  }, [isNight]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback(
    (dest: { lng: number; lat: number; name?: string; label?: string }) => {
      setDestination({
        lng: dest.lng,
        lat: dest.lat,
        label:
          dest.label ||
          dest.name ||
          `${dest.lat.toFixed(5)}, ${dest.lng.toFixed(5)}`,
      });
      setIsArrived(false);
    },
    []
  );

  const handleClearDestination = useCallback(() => {
    setDestination(null);
    clearRoutes();
    setActiveRouteId(null);
    setIsArrived(false);
    setCurrentTurnIndex(0);
    setDistanceToTurn(null);
    voiceStateRef.current = { turnIndex: -1, stage: 0 };
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
  }, [clearRoutes]);

  const handleRouteSelect = useCallback((id: string) => {
    setActiveRouteId(id);
    setCurrentTurnIndex(0);
    setDistanceToTurn(null);
    voiceStateRef.current = { turnIndex: -1, stage: 0 };
  }, []);

  const handleStartNavigation = useCallback(() => {
    startNavigation();
    setNavStartTime(Date.now());
    setIsFollowing(true);
    if (currentText) speakNavigation(currentText);
  }, [startNavigation, currentText, speakNavigation]);

  const handleExitNavigation = useCallback(() => {
    exitNavigation();
    setNavStartTime(null);
    setIsFollowing(false);
    const map = mapRef.current;
    if (map && location) {
      map.easeTo({
        center: [location.lng, location.lat],
        zoom: 15,
        pitch: 0,
        bearing: 0,
        duration: 1000,
      });
    }
  }, [exitNavigation, location]);

  const handleReplayRoute = useCallback((entry: any) => {
    setIsHistoryOpen(false);
    if (entry.destinationCoords) {
      setDestination({
        lng: entry.destinationCoords[0],
        lat: entry.destinationCoords[1],
        label: entry.destination || 'Saved Destination',
      });
    }
    if (mapRef.current && entry.destinationCoords) {
      mapRef.current.flyTo({ center: entry.destinationCoords, zoom: 15, duration: 1000 });
    }
  }, []);

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080C14] text-white font-sans">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="absolute inset-0 z-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Grain Overlay */}
      <svg className="fixed inset-0 z-[9999] pointer-events-none opacity-[0.035] w-full h-full">
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {isLoading && <LoadingScreen onDismiss={() => setIsLoading(false)} />}

      {!isLoading && (
        <>
          {/* Off-route / Deviation Banner */}
          {isDeviated && destination && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 glass px-4 py-2 flex items-center gap-2 border-orange-400/20 bg-orange-900/20 animate-pulse">
              <span className="text-orange-400 text-xs">⚠</span>
              <span className="text-orange-300 text-xs font-medium">
                Recalculating route…
              </span>
            </div>
          )}

          {/* Top Left Branding */}
          {!isNavigating && (
            <div className="absolute top-6 left-6 z-50 hidden md:flex items-center gap-3 animate-fade-right">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5CC] to-[#00B3A0] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,204,0.3)]">
                <svg
                  className="w-6 h-6 text-[#080C14]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <h1 className="font-display font-bold text-xl leading-none tracking-tight">
                  PathLight
                </h1>
                <p className="text-[10px] font-mono text-[#00E5CC] tracking-widest uppercase mt-1">
                  AI Safe Routing
                </p>
              </div>
            </div>
          )}

          {/* Search Bar */}
          {!isNavigating && (
            <SearchBar onSearch={handleSearch} isSearching={routesLoading} />
          )}

          {/* Turn Banner — shown whenever a destination and route are active */}
          {destination && activeRoute?.instructions && (
            <TurnBanner
              instruction={currentText}
              nextInstruction={nextText}
              distance={distanceToTurn ?? 0}
              isArrived={isArrived}
            />
          )}

          {/* AI Explanation Popup */}
          {!isNavigating && <AIPopup route={activeRoute} isNight={isNight} />}

          {/* Desktop VibePanel */}
          {!isNavigating && (
            <div className="hidden md:flex absolute bottom-6 right-6 z-40 flex-col items-end gap-4">
              <VibePanel
                isNight={isNight}
                setIsNight={setIsNight}
                preferences={preferences}
                setPreferences={setPreferences}
              />
            </div>
          )}

          {/* Mobile Sheet Toggle */}
          {!isNavigating && (
            <button
              className="md:hidden absolute bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#00E5CC] text-[#080C14] flex items-center justify-center shadow-[0_0_30px_rgba(0,229,204,0.4)] animate-bounce-in"
              onClick={() => setIsMobileSheetOpen(true)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </button>
          )}

          {/* Map Toolbar */}
          {!isNavigating && (
            <MapToolbar
              onLocate={() => {
                if (location && mapRef.current) {
                  setIsFollowing(true);
                  mapRef.current.flyTo({
                    center: [location.lng, location.lat],
                    zoom: 15,
                    duration: 1000,
                  });
                } else {
                  addNotification('Waiting for GPS…', 'info');
                }
              }}
              onToggleFollow={() => setIsFollowing((v) => !v)}
              isFollowing={isFollowing}
              onToggleHistory={() => setIsHistoryOpen(true)}
              onToggleHeatmap={() => setIsHeatmapActive((v) => !v)}
              isHeatmapActive={isHeatmapActive}
            />
          )}

          {/* Route Selector */}
          {!isNavigating && destination && routes && routes.length > 0 && (
            <RouteSelector
              routes={routes}
              activeRouteId={activeRouteId}
              onSelect={handleRouteSelect}
              onStartNavigation={handleStartNavigation}
            />
          )}

          {/* No-destination hint */}
          {!destination && mapLoaded && !isNavigating && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass px-4 py-2.5">
              <p className="text-[#94A3B8] text-xs text-center">
                Search a place or tap the map to set your destination
              </p>
            </div>
          )}

          {/* Route History */}
          <RouteHistory
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            history={history}
            onSelect={handleReplayRoute}
            onRemove={() => {}}
          />

          {/* Notification Stack */}
          <NotificationStack
            notifications={notifications}
            onDismiss={removeNotification}
          />

          {/* Mobile Bottom Sheet */}
          <BottomSheet
            isOpen={isMobileSheetOpen}
            onClose={() => setIsMobileSheetOpen(false)}
          >
            <VibePanel
              isNight={isNight}
              setIsNight={setIsNight}
              preferences={preferences}
              setPreferences={setPreferences}
            />
          </BottomSheet>

          {/* Navigation HUD (Phase 6) */}
          {isNavigating && activeRoute && (
            <NavigationHUD
              instruction={currentText}
              nextInstruction={nextText}
              distanceToNext={distanceToTurn ?? 0}
              arrived={isArrived}
              routeProps={activeRoute}
              gpsPosition={location}
              destination={destination}
              onExit={handleExitNavigation}
              isNight={isNight}
              speedKmh={speedKmh}
              remainingDistance={remainingDistance}
              navStartTime={navStartTime}
              isRerouting={isDeviated}
            />
          )}
        </>
      )}
    </div>
  );
}

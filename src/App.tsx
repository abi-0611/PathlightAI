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

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || 'pk.eyJ1IjoiYWJpcHViZzIwMDYiLCJhIjoiY2x6cnh1eXU2MDF1ZDJxcG13ZzJ4ZzJ4ZCJ9.1'; // Fallback for preview

export default function App() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const gpsMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isNight, setIsNight] = useState(true);
  const [preferences, setPreferences] = useState({ lighting: 80, population: 60, speed: 40 });
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState(null);
  const [nextInstruction, setNextInstruction] = useState(null);
  const [distanceToTurn, setDistanceToTurn] = useState(0);
  const [isArrived, setIsArrived] = useState(false);

  // Custom Hooks
  useParallax(1.5);
  const { notifications, addNotification, removeNotification } = useNotifications();
  const { routes, loading: routesLoading, fetchRoutes, clearRoutes } = useRouteData();
  const { location, error: geoError, watching, startWatching, stopWatching } = useGeolocation();
  const { history, addHistoryItem, removeHistoryItem, clearHistory } = useRouteHistory();
  const { isNavigating, startNavigation, exitNavigation } = useNavigationMode();
  
  const activeRoute = routes?.find(r => r.id === activeRouteId);
  
  const [navStartTime, setNavStartTime] = useState(null);
  const prevGpsRef = useRef(null);

  useEffect(() => {
    if (location) {
      prevGpsRef.current = location;
    }
  }, [location]);

  useNavigationCamera(mapRef, {
    isNavigating,
    gpsPosition: location,
    prevGpsPosition: prevGpsRef.current,
    distanceToNextTurn: distanceToTurn,
    nextTurnPoint: currentInstruction?.point
  });

  const { splitIndex, remainingDistance, progressFraction } = useRouteProgress(location, activeRoute);
  const speedKmh = useSpeedTracker(location);

  useEffect(() => {
    if (isNavigating && activeRoute && mapRef.current?.isStyleLoaded()) {
      updateRouteProgress(mapRef.current, activeRoute, splitIndex, isNight, activeRouteId);
    }
  }, [isNavigating, activeRoute, splitIndex, isNight, activeRouteId]);

  const handleDeviation = useCallback((distance) => {
    addNotification(`Deviated by ${Math.round(distance)}m. Rerouting...`, 'warning');
    if (isNavigating) {
      const msg = new SpeechSynthesisUtterance("Recalculating...");
      window.speechSynthesis.speak(msg);
    }
  }, [addNotification, isNavigating]);
  
  const { isDeviated } = useReroute(location, activeRoute, handleDeviation);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: isNight ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [80.0603, 12.8459], // Guduvancheri
      zoom: 13,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', () => {
      // Initial cinematic animation
      map.flyTo({
        pitch: 45,
        duration: 2000,
        essential: true
      });

      // Add heatmap layer (hidden initially)
      map.addSource('crime-heatmap', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] } // Mock empty data
      });

      map.addLayer({
        id: 'crime-heatmap-layer',
        type: 'heatmap',
        source: 'crime-heatmap',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': 1,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(255,0,0,0)',
            0.2, 'rgba(255,179,71,0.5)',
            1, 'rgba(255,77,77,0.8)'
          ],
          'heatmap-radius': 30,
          'heatmap-opacity': 0
        }
      });

      startWatching();
    });

    return () => map.remove();
  }, []); // Run once

  // Handle Day/Night toggle
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    mapRef.current.setStyle(isNight ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
  }, [isNight]);

  // Handle Heatmap toggle
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getLayer('crime-heatmap-layer')) return;
    mapRef.current.setPaintProperty(
      'crime-heatmap-layer',
      'heatmap-opacity',
      isHeatmapActive ? 0.75 : 0
    );
  }, [isHeatmapActive]);

  // Handle GPS Marker
  useEffect(() => {
    if (!mapRef.current || !location) return;

    if (!gpsMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'relative w-6 h-6 flex items-center justify-center';
      el.innerHTML = `
        <div class="absolute inset-0 bg-[#4285F4] rounded-full opacity-30 animate-ping-slow"></div>
        <div class="absolute inset-0 bg-[#4285F4] rounded-full opacity-20 animate-ping-slow" style="animation-delay: 1s"></div>
        <div class="relative w-3 h-3 bg-[#4285F4] rounded-full border-2 border-white shadow-lg"></div>
      `;
      gpsMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .addTo(mapRef.current);
    } else {
      gpsMarkerRef.current.setLngLat([location.lng, location.lat]);
    }

    if (isFollowing) {
      mapRef.current.easeTo({
        center: [location.lng, location.lat],
        bearing: location.heading || 0,
        pitch: 60,
        duration: 1000
      });
    }
  }, [location, isFollowing]);

  // Handle Destination Search
  const handleSearch = async (dest) => {
    setDestination(dest);
    setIsArrived(false);
    
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'relative w-8 h-8 flex items-center justify-center -translate-y-1/2 group';
    el.innerHTML = `
      <div class="absolute inset-0 bg-[#FF4D4D] rounded-full opacity-20 animate-ping-slow"></div>
      <svg class="w-8 h-8 text-[#FF4D4D] drop-shadow-lg group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `;

    destMarkerRef.current = new mapboxgl.Marker(el, { anchor: 'bottom' })
      .setLngLat([dest.lng, dest.lat])
      .addTo(mapRef.current);

    // Fetch routes
    const start = location || { lng: 80.0603, lat: 12.8459 }; // Fallback to Guduvancheri
    const newRoutes = await fetchRoutes(start, dest, preferences);
    
    if (newRoutes && newRoutes.length > 0) {
      setActiveRouteId(newRoutes[0].id);
      addNotification('3 routes found. Safest route selected.', 'success');
      
      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds()
        .extend([start.lng, start.lat])
        .extend([dest.lng, dest.lat]);
      
      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 300, left: 50, right: 400 },
        duration: 1500
      });

      // Mock navigation start
      setCurrentInstruction(newRoutes[0].instructions[0]);
      setNextInstruction(newRoutes[0].instructions[1]);
      setDistanceToTurn(350);
    }
  };

  // Draw Routes
  useMapRoute(mapRef, routes, activeRouteId, isNight);

  // Handle Route Selection
  const handleRouteSelect = (id) => {
    setActiveRouteId(id);
    const route = routes.find(r => r.id === id);
    if (route) {
      setCurrentInstruction(route.instructions[0]);
      setNextInstruction(route.instructions[1]);
      setDistanceToTurn(Math.floor(Math.random() * 500) + 100);
    }
  };

  const handleStartNavigation = () => {
    startNavigation();
    setNavStartTime(Date.now());
    if (currentInstruction) {
      const msg = new SpeechSynthesisUtterance(currentInstruction);
      window.speechSynthesis.speak(msg);
    }
  };

  const handleExitNavigation = () => {
    exitNavigation();
    setNavStartTime(null);
    if (mapRef.current && location) {
      mapRef.current.easeTo({
        center: [location.lng, location.lat],
        zoom: 15,
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
    }
  };

  // Voice Guidance for Turns
  const lastAnnouncedDistanceRef = useRef(null);
  useEffect(() => {
    if (!isNavigating || !currentInstruction) return;
    
    // Announce at ~200m
    if (distanceToTurn <= 200 && distanceToTurn > 180 && lastAnnouncedDistanceRef.current !== 200) {
      lastAnnouncedDistanceRef.current = 200;
      const msg = new SpeechSynthesisUtterance(`In 200 meters, ${currentInstruction}`);
      window.speechSynthesis.speak(msg);
    }
    // Announce at ~50m
    else if (distanceToTurn <= 50 && distanceToTurn > 30 && lastAnnouncedDistanceRef.current !== 50) {
      lastAnnouncedDistanceRef.current = 50;
      const msg = new SpeechSynthesisUtterance(currentInstruction);
      window.speechSynthesis.speak(msg);
    }
  }, [distanceToTurn, currentInstruction, isNavigating]);

  // Mock Arrival
  useEffect(() => {
    if (activeRoute && distanceToTurn < 20 && !isArrived) {
      setIsArrived(true);
      setCurrentInstruction('Arrived at destination');
      setNextInstruction(null);
      addNotification('You have arrived safely!', 'success', 8000);
      
      // Save to history
      addHistoryItem({
        ...activeRoute,
        destinationName: destination?.name || 'Unknown'
      });
    }
  }, [distanceToTurn, activeRoute, isArrived, destination, addHistoryItem, addNotification]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080C14] text-white font-sans">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 z-0" />
      
      {/* Grain Overlay */}
      <svg className="fixed inset-0 z-[9999] pointer-events-none opacity-[0.035] w-full h-full">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {isLoading && <LoadingScreen onDismiss={() => setIsLoading(false)} />}

      {!isLoading && (
        <>
          {/* Top Left Branding */}
          {!isNavigating && (
            <div className="absolute top-6 left-6 z-50 hidden md:flex items-center gap-3 animate-fade-right">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5CC] to-[#00B3A0] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,204,0.3)]">
                <svg className="w-6 h-6 text-[#080C14]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <h1 className="font-display font-bold text-xl leading-none tracking-tight">PathLight</h1>
                <p className="text-[10px] font-mono text-[#00E5CC] tracking-widest uppercase mt-1">AI Safe Routing</p>
              </div>
            </div>
          )}

          {!isNavigating && <SearchBar onSearch={handleSearch} isSearching={routesLoading} />}
          
          {!isNavigating && (
            <TurnBanner 
              instruction={currentInstruction}
              nextInstruction={nextInstruction}
              distance={distanceToTurn}
              isArrived={isArrived}
            />
          )}

          {!isNavigating && <AIPopup route={activeRoute} isNight={isNight} />}

          {/* Bottom Right Controls (Desktop) */}
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

          {/* Mobile Controls Toggle */}
          {!isNavigating && (
            <button 
              className="md:hidden absolute bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#00E5CC] text-[#080C14] flex items-center justify-center shadow-[0_0_30px_rgba(0,229,204,0.4)] animate-bounce-in"
              onClick={() => setIsMobileSheetOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          )}

          {!isNavigating && (
            <MapToolbar 
              onLocate={() => {
                if (location) {
                  mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 15 });
                } else {
                  addNotification('Locating...', 'info', 2000);
                }
              }}
              onToggleFollow={() => setIsFollowing(!isFollowing)}
              isFollowing={isFollowing}
              onToggleHistory={() => setIsHistoryOpen(true)}
              onToggleHeatmap={() => setIsHeatmapActive(!isHeatmapActive)}
              isHeatmapActive={isHeatmapActive}
            />
          )}

          {!isNavigating && (
            <RouteSelector 
              routes={routes} 
              activeRouteId={activeRouteId} 
              onSelect={handleRouteSelect} 
              onStartNavigation={handleStartNavigation}
            />
          )}

          {!isNavigating && (
            <RouteHistory 
              isOpen={isHistoryOpen}
              onClose={() => setIsHistoryOpen(false)}
              history={history}
              onSelect={(route) => {
                setActiveRouteId(route.id);
                // Mock replay logic
                setCurrentInstruction(route.instructions[0]);
                setNextInstruction(route.instructions[1]);
                setDistanceToTurn(route.total_length_m);
                setIsArrived(false);
              }}
              onRemove={removeHistoryItem}
            />
          )}

          {isNavigating && (
            <NavigationHUD
              instruction={currentInstruction}
              nextInstruction={nextInstruction}
              distanceToNext={distanceToTurn}
              routeProps={activeRoute}
              gpsPosition={location}
              destination={destination}
              arrived={isArrived}
              onExit={handleExitNavigation}
              isNight={isNight}
              speedKmh={speedKmh}
              remainingDistance={remainingDistance}
              navStartTime={navStartTime}
              isRerouting={isDeviated}
            />
          )}

          <NotificationStack 
            notifications={notifications} 
            onDismiss={removeNotification} 
          />

          {/* Mobile Bottom Sheet */}
          {!isNavigating && (
            <BottomSheet isOpen={isMobileSheetOpen} onClose={() => setIsMobileSheetOpen(false)}>
              <VibePanel 
                isNight={isNight} 
                setIsNight={setIsNight}
                preferences={preferences}
                setPreferences={setPreferences}
              />
              <div className="mt-6">
                <AIPopup route={activeRoute} isNight={isNight} />
              </div>
            </BottomSheet>
          )}
        </>
      )}
    </div>
  );
}


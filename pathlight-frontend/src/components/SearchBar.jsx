import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Navigation, X, Clock, Hash } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY;
const PROXIMITY = [80.050384, 12.853091]; // Guduvancheri center for biasing results

const CATEGORY_ICONS = {
  restaurant: '🍽️',
  cafe: '☕',
  shop: '🛒',
  hospital: '🏥',
  school: '🏫',
  hotel: '🏨',
  park: '🌳',
  temple: '🛕',
  bus: '🚌',
  station: '🚉',
  atm: '🏧',
  pharmacy: '💊',
};

function getCategoryIcon(text) {
  const lower = (text || '').toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '📍';
}

function parseCoordinates(text) {
  // Try parsing "lat, lng" or "lat lng" format
  const cleaned = text.trim().replace(/[°'"NSEW]/gi, '').trim();
  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 2) {
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (!isNaN(a) && !isNaN(b)) {
      // If first number looks like latitude (~12) and second like longitude (~80)
      if (a >= -90 && a <= 90 && b >= -180 && b <= 180) {
        return { lat: a, lng: b, label: `${a.toFixed(5)}, ${b.toFixed(5)}` };
      }
      // Maybe reversed (lng, lat)
      if (b >= -90 && b <= 90 && a >= -180 && a <= 180) {
        return { lat: b, lng: a, label: `${b.toFixed(5)}, ${a.toFixed(5)}` };
      }
    }
  }
  return null;
}

export default memo(function SearchBar({ onDestinationSelect, destination, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchPlaces = useCallback(async (text) => {
    if (!text || text.length < 2) {
      setResults([]);
      return;
    }

    // Check for coordinate input first
    const coords = parseCoordinates(text);
    if (coords) {
      setResults([{
        id: 'coords',
        label: coords.label,
        sublabel: 'Custom coordinates',
        lng: coords.lng,
        lat: coords.lat,
        icon: '📌',
      }]);
      setIsOpen(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&proximity=${PROXIMITY[0]},${PROXIMITY[1]}` +
        `&bbox=${PROXIMITY[0] - 0.06},${PROXIMITY[1] - 0.06},${PROXIMITY[0] + 0.06},${PROXIMITY[1] + 0.06}` +
        `&limit=8` +
        `&types=poi,address,place,neighborhood,locality`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Geocoding failed');
      const data = await res.json();

      const items = (data.features || []).map((f) => ({
        id: f.id,
        label: f.text || f.place_name,
        sublabel: f.place_name || '',
        lng: f.center[0],
        lat: f.center[1],
        icon: getCategoryIcon(f.properties?.category || f.text || ''),
      }));

      setResults(items);
      setIsOpen(items.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(val), 300);
  };

  const handleSelect = (item) => {
    setQuery(item.label);
    setIsOpen(false);
    onDestinationSelect({ lng: item.lng, lat: item.lat, label: item.label });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onClear?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[90vw] max-w-md">
      {/* Search input */}
      <div className="glass-card flex items-center gap-2 px-3 py-2.5 transition-all duration-200
                      focus-within:border-pathlight-400/30 focus-within:shadow-[0_0_20px_rgba(0,229,204,0.1)]">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={destination ? destination.label : 'Search destination or paste coordinates...'}
          className="flex-1 bg-transparent text-white text-sm font-body placeholder:text-slate-500
                     outline-none caret-pathlight-400"
        />
        {isLoading && (
          <div className="w-4 h-4 border-2 border-pathlight-400/30 border-t-pathlight-400 rounded-full animate-spin" />
        )}
        {(query || destination) && !isLoading && (
          <button onClick={handleClear} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="mt-1.5 glass-card py-1.5 max-h-72 overflow-y-auto animate-fade-up"
        >
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left
                         hover:bg-white/[0.06] transition-colors duration-150"
            >
              <span className="text-lg mt-0.5 shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-white text-sm font-body font-medium truncate">{item.label}</p>
                <p className="text-slate-500 text-xs font-body truncate mt-0.5">{item.sublabel}</p>
              </div>
            </button>
          ))}

          {/* Tip for clicking map */}
          <div className="px-3 py-2 border-t border-white/[0.06] mt-1">
            <p className="text-slate-500 text-[10px] font-body flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Or click anywhere on the map to set destination
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

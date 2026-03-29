import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY;
const PROXIMITY = [80.050384, 12.853091];

/* ── Category config ─────────────────── */
const CATEGORY_MAP = {
  restaurant: { icon: '🍽️', bg: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' },
  cafe:       { icon: '☕',  bg: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' },
  hospital:   { icon: '🏥', bg: 'linear-gradient(135deg,#4ECDC4,#556270)' },
  school:     { icon: '🏫', bg: 'linear-gradient(135deg,#667eea,#764ba2)' },
  park:       { icon: '🌳', bg: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  temple:     { icon: '🛕', bg: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  shop:       { icon: '🛒', bg: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' },
  hotel:      { icon: '🏨', bg: 'linear-gradient(135deg,#667eea,#764ba2)' },
  bus:        { icon: '🚌', bg: 'linear-gradient(135deg,#2C3E50,#4CA1AF)' },
  station:    { icon: '🚉', bg: 'linear-gradient(135deg,#2C3E50,#4CA1AF)' },
  atm:        { icon: '🏧', bg: 'linear-gradient(135deg,#2C3E50,#4CA1AF)' },
  pharmacy:   { icon: '💊', bg: 'linear-gradient(135deg,#4ECDC4,#556270)' },
};

function getCategoryConfig(text) {
  const lower = (text || '').toLowerCase();
  for (const [key, cfg] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return cfg;
  }
  return { icon: '📍', bg: 'linear-gradient(135deg,#2C3E50,#4CA1AF)' };
}

/* ── Traveling dots loader ─────────────── */
function TravelingDots() {
  return (
    <div className="flex gap-1 items-center shrink-0">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 5,
            height: 5,
            background: 'var(--c-teal)',
            animation: 'breathe 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Result item ─────────────────────── */
const ResultItem = memo(function ResultItem({ item, isActive, onClick, delay }) {
  const cfg = item.isCoord
    ? { icon: '📌', bg: 'linear-gradient(135deg,var(--c-teal),#00A896)' }
    : getCategoryConfig(item.label);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left relative"
      style={{
        animation: `fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards`,
        animationDelay: `${delay}ms`,
        opacity: 0,
        background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
        transition: 'background 150ms ease',
      }}
    >
      {/* Active left border strip */}
      <div
        className="absolute left-0 top-2 bottom-2 rounded-full"
        style={{
          width: isActive ? 3 : 0,
          background: 'var(--c-teal)',
          transition: 'width 150ms ease',
        }}
      />
      {/* Category icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
        style={{ background: cfg.bg }}
      >
        {cfg.icon}
      </div>
      {/* Text */}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium truncate"
          style={{
            color: 'var(--c-text-1)',
            fontFamily: item.isCoord ? 'JetBrains Mono, monospace' : undefined,
          }}
        >
          {item.label}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--c-text-3)' }}>
          {item.sublabel}
        </p>
      </div>
    </button>
  );
});

function parseCoordinates(text) {
  const cleaned = text.trim().replace(/[°'"NSEW]/gi, '').trim();
  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 2) {
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (!isNaN(a) && !isNaN(b)) {
      if (a >= -90 && a <= 90 && b >= -180 && b <= 180)
        return { lat: a, lng: b, label: `${a.toFixed(5)}, ${b.toFixed(5)}` };
      if (b >= -90 && b <= 90 && a >= -180 && a <= 180)
        return { lat: b, lng: a, label: `${b.toFixed(5)}, ${a.toFixed(5)}` };
    }
  }
  return null;
}

export default memo(function SearchBar({ onDestinationSelect, destination, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchPlaces = useCallback(async (text) => {
    if (!text || text.length < 2) { setResults([]); return; }
    const coords = parseCoordinates(text);
    if (coords) {
      setResults([{ id: 'coords', label: coords.label, sublabel: 'Custom coordinates',
        lng: coords.lng, lat: coords.lat, isCoord: true }]);
      setIsOpen(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&proximity=${PROXIMITY[0]},${PROXIMITY[1]}` +
        `&bbox=${PROXIMITY[0]-0.06},${PROXIMITY[1]-0.06},${PROXIMITY[0]+0.06},${PROXIMITY[1]+0.06}` +
        `&limit=8&types=poi,address,place,neighborhood,locality`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Geocoding failed');
      const data = await res.json();
      const items = (data.features || []).map((f) => ({
        id: f.id, label: f.text || f.place_name,
        sublabel: f.place_name || '', lng: f.center[0], lat: f.center[1],
      }));
      setResults(items);
      setIsOpen(items.length > 0);
      setActiveIndex(-1);
    } catch { setResults([]); } finally { setIsLoading(false); }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(val), 300);
  };

  const handleSelect = (item) => {
    setQuery(item.label);
    setIsOpen(false);
    setActiveIndex(-1);
    onDestinationSelect({ lng: item.lng, lat: item.lat, label: item.label });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    onClear?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      const target = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (target) handleSelect(target);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 w-[90vw] max-w-lg">
      {/* Input card */}
      <div
        className="glass flex items-center gap-2.5 px-3.5 py-3"
        style={{
          borderColor: isFocused ? 'var(--c-border-act)' : undefined,
          boxShadow: isFocused
            ? '0 0 24px rgba(0,229,204,0.12), 0 4px 32px rgba(0,0,0,0.45)'
            : undefined,
          transition: 'border-color 250ms var(--ease-spring), box-shadow 250ms var(--ease-spring)',
        }}
      >
        <Search
          className="w-4 h-4 shrink-0"
          style={{
            color: isFocused ? 'var(--c-teal)' : 'var(--c-text-3)',
            transform: isFocused ? 'rotate(15deg)' : 'rotate(0deg)',
            transition: 'color 300ms var(--ease-spring), transform 300ms var(--ease-spring)',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { setIsFocused(true); if (results.length > 0) setIsOpen(true); }}
          onBlur={() => setIsFocused(false)}
          placeholder={destination ? destination.label : 'Search destination or paste coordinates…'}
          className="flex-1 bg-transparent text-sm font-body outline-none"
          style={{ color: 'var(--c-text-1)', caretColor: 'var(--c-teal)' }}
        />
        {isLoading && <TravelingDots />}
        {(query || destination) && !isLoading && (
          <button
            onClick={handleClear}
            className="shrink-0"
            style={{ color: 'var(--c-text-3)', transition: 'color 200ms ease, transform 200ms ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.color='var(--c-text-1)'; e.currentTarget.style.transform='rotate(90deg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color='var(--c-text-3)'; e.currentTarget.style.transform='rotate(0deg)'; }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="glass mt-1.5 py-1.5 overflow-y-auto relative"
          style={{
            maxHeight: 288,
            animation: 'fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
            opacity: 0,
          }}
        >
          {results.map((item, idx) => (
            <ResultItem
              key={item.id}
              item={item}
              isActive={idx === activeIndex}
              onClick={() => handleSelect(item)}
              delay={idx * 30}
            />
          ))}
          {/* Bottom gradient fade */}
          <div
            className="sticky bottom-0 left-0 right-0 h-7 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(13,21,32,0.9), transparent)' }}
          />
        </div>
      )}
    </div>
  );
});

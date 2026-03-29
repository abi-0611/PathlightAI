import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function SearchBar({ onSearch, isSearching }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  // Mock search results
  useEffect(() => {
    if (query.length > 2) {
      const timer = setTimeout(() => {
        setResults([
          { id: '1', text: `${query} Station`, type: 'transit' },
          { id: '2', text: `${query} Park`, type: 'park' },
          { id: '3', text: `123 ${query} St`, type: 'address' }
        ]);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSelect = (result) => {
    setQuery(result.text);
    setResults([]);
    setFocused(false);
    onSearch({ lng: 80.0603, lat: 12.8459, name: result.text }); // Mock coordinates for Guduvancheri
  };

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-full max-w-lg z-50 animate-fade-down">
      <div className={clsx(
        "glass relative flex items-center px-4 py-3 transition-all duration-300",
        focused && "border-[#00E5CC] shadow-[0_0_20px_rgba(0,229,204,0.15)]"
      )}>
        {isSearching ? (
          <Loader2 className="w-5 h-5 text-[#00E5CC] animate-spin shrink-0" />
        ) : (
          <Search className={clsx(
            "w-5 h-5 shrink-0 transition-colors duration-300",
            focused ? "text-[#00E5CC]" : "text-[#94A3B8]"
          )} />
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search destination..."
          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-[#475569] ml-3 font-medium text-lg caret-[#00E5CC]"
        />

        {query && (
          <button 
            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
            className="p-1 hover:bg-white/10 rounded-full text-[#94A3B8] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {focused && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass overflow-hidden flex flex-col animate-fade-up">
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className="flex items-center px-4 py-3 hover:bg-white/5 transition-colors text-left border-l-2 border-transparent hover:border-[#00E5CC] group"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-hover:bg-[#00E5CC]/10 transition-colors">
                {r.type === 'transit' ? <Navigation className="w-4 h-4 text-[#00E5CC]" /> : <MapPin className="w-4 h-4 text-[#94A3B8] group-hover:text-[#00E5CC]" />}
              </div>
              <span className="text-white font-medium">{r.text}</span>
            </button>
          ))}
          <div className="h-4 bg-gradient-to-t from-[#0D1520] to-transparent pointer-events-none absolute bottom-0 left-0 right-0"></div>
        </div>
      )}
    </div>
  );
}

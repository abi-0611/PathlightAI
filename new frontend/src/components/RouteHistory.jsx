import React, { useEffect, useRef } from 'react';
import { Clock, Navigation, X, Play, Shield, Zap, Scale } from 'lucide-react';
import clsx from 'clsx';

export function RouteHistory({ isOpen, onClose, history, onSelect, onRemove }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    Fastest: Zap,
    Safest: Shield,
    Balanced: Scale
  };

  const colors = {
    Fastest: 'text-[#FFB347] border-[#FFB347]/30 bg-[#FFB347]/10',
    Safest: 'text-[#C8FF57] border-[#C8FF57]/30 bg-[#C8FF57]/10',
    Balanced: 'text-[#00E5CC] border-[#00E5CC]/30 bg-[#00E5CC]/10'
  };

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#080C14]/60 backdrop-blur-sm transition-opacity duration-500 animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div 
        ref={panelRef}
        className="relative w-full max-w-md h-full glass-panel border-l-0 border-y-0 rounded-none rounded-r-3xl flex flex-col animate-slide-right shadow-[32px_0_64px_rgba(0,0,0,0.5)]"
        tabIndex={-1}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-2xl text-white flex items-center gap-3">
              <Clock className="w-6 h-6 text-[#00E5CC]" />
              Route History
            </h2>
            <p className="text-sm text-[#94A3B8] mt-1">Your past safe journeys</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-up">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                <Navigation className="w-10 h-10 text-[#475569]" />
              </div>
              <h3 className="font-display font-semibold text-white text-lg mb-2">No history yet</h3>
              <p className="text-[#94A3B8] text-sm">Your safe journeys will appear here once you start navigating.</p>
            </div>
          ) : (
            history.map((route, i) => {
              const Icon = icons[route.mode] || Scale;
              const colorClass = colors[route.mode] || colors.Balanced;
              const [textColor, borderColor, bgColor] = colorClass.split(' ');

              const timeAgo = Math.round((Date.now() - route.timestamp) / 60000);
              const timeString = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.round(timeAgo / 60)}h ago`;
              const timeColor = timeAgo < 60 ? 'text-[#C8FF57]' : 'text-[#FFB347]';

              return (
                <div 
                  key={route.id + route.timestamp}
                  className="group relative glass rounded-2xl p-4 transition-all duration-300 hover:bg-white/5 overflow-hidden animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Hover Sweep */}
                  <div className="absolute inset-y-0 left-0 w-1 bg-[#00E5CC] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-display font-semibold text-white truncate text-lg">
                        {route.destinationName || 'Unknown Destination'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={clsx("text-xs font-mono font-medium", timeColor)}>{timeString}</span>
                        <span className="w-1 h-1 rounded-full bg-[#475569]"></span>
                        <span className="text-xs text-[#94A3B8]">{(route.total_length_m / 1000).toFixed(1)} km</span>
                      </div>
                    </div>
                    
                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", bgColor, textColor)}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                      <Shield className="w-3.5 h-3.5 text-[#C8FF57]" />
                      <span className="text-xs font-medium text-white">{route.avg_crime_risk}/10</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                      <Zap className="w-3.5 h-3.5 text-[#00E5CC]" />
                      <span className="text-xs font-medium text-white">{route.avg_lighting_score}/10</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { onSelect(route); onClose(); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#00E5CC]/10 text-[#00E5CC] hover:bg-[#00E5CC] hover:text-[#080C14] transition-colors font-medium text-sm group/btn"
                    >
                      <Play className="w-4 h-4 group-hover/btn:fill-current" />
                      Replay Route
                    </button>
                    <button 
                      onClick={() => onRemove(route.id)}
                      className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[#94A3B8] hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

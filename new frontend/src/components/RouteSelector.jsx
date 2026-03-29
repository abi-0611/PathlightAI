import React from 'react';
import { Zap, Shield, Scale, Navigation } from 'lucide-react';
import clsx from 'clsx';

export function RouteSelector({ routes, activeRouteId, onSelect, onStartNavigation }) {
  if (!routes || routes.length === 0) return null;

  const icons = {
    fastest: Zap,
    safest: Shield,
    balanced: Scale
  };

  const colors = {
    fastest: 'text-[#FFB347] border-[#FFB347]/30 bg-[#FFB347]/10',
    safest: 'text-[#C8FF57] border-[#C8FF57]/30 bg-[#C8FF57]/10',
    balanced: 'text-[#00E5CC] border-[#00E5CC]/30 bg-[#00E5CC]/10'
  };

  return (
    <div className="absolute bottom-32 md:bottom-10 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl flex flex-col items-center">
      <div className="w-full overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
        <div className="flex gap-4 min-w-max px-2">
          {routes.map((route, i) => {
            const isActive = route.id === activeRouteId;
            const Icon = icons[route.id] || Scale;
            const colorClass = colors[route.id] || colors.balanced;
            const [textColor, borderColor, bgColor] = colorClass.split(' ');

            return (
              <button
                key={route.id}
                onClick={() => onSelect(route.id)}
                className={clsx(
                  "relative glass-panel rounded-2xl p-4 w-64 snap-center transition-all duration-500 ease-spring group text-left overflow-hidden",
                  isActive ? "scale-105 shadow-2xl border-opacity-100" : "scale-100 opacity-80 hover:opacity-100",
                  isActive && borderColor
                )}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Active Background Sweep */}
                <div 
                  className={clsx(
                    "absolute inset-0 transition-transform duration-500 ease-spring origin-left",
                    bgColor,
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 opacity-50"
                  )}
                ></div>

                <div className="relative z-10 flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center bg-white/10", textColor)}>
                      <Icon className={clsx("w-5 h-5", isActive && "animate-bounce-in")} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-white text-lg">{route.mode}</h4>
                      <p className="text-xs font-mono text-[#94A3B8]">{(route.total_length_m / 1000).toFixed(1)} km</p>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-2 text-xs font-medium text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{route.avg_crime_risk}/10</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{route.avg_lighting_score}/10</span>
                  </div>
                </div>

                {/* Safety Bar */}
                <div className="relative z-10 h-1 w-full bg-white/10 rounded-full mt-4 overflow-hidden">
                  <div 
                    className={clsx("h-full transition-all duration-1000 ease-out", textColor.replace('text-', 'bg-'))}
                    style={{ width: `${(route.avg_lighting_score / 10) * 100}%` }}
                  ></div>
                </div>

                {/* Active Underline */}
                <div 
                  className={clsx(
                    "absolute bottom-0 left-0 h-1 transition-all duration-500 ease-spring",
                    textColor.replace('text-', 'bg-'),
                    isActive ? "w-full" : "w-0"
                  )}
                ></div>
              </button>
            );
          })}
        </div>
      </div>
      
      {onStartNavigation && (
        <button
          onClick={onStartNavigation}
          className="mt-1 w-full max-w-xs mx-auto flex items-center justify-center gap-2.5
                     py-3 rounded-2xl font-sans font-semibold text-sm
                     bg-[#C8FF57] text-[#080C14]
                     hover:brightness-110 active:scale-95
                     transition-all duration-200 ease-out
                     shadow-[0_4px_20px_rgba(200,255,87,0.35)] animate-fade-up"
          style={{ animationDelay: '300ms' }}
        >
          <Navigation className="w-4 h-4" />
          Start Navigation
        </button>
      )}
    </div>
  );
}

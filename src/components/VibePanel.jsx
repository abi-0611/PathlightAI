import React, { useState, useEffect } from 'react';
import { Settings2, Sun, Moon, Zap, Shield, Users } from 'lucide-react';
import clsx from 'clsx';

export function VibePanel({ isNight, setIsNight, preferences, setPreferences }) {
  const [activeSlider, setActiveSlider] = useState(null);

  const sliders = [
    { id: 'lighting', icon: Zap, label: 'Well-Lit Streets', color: '#00E5CC', hint: 'Prioritize bright areas' },
    { id: 'population', icon: Users, label: 'Populated Areas', color: '#C8FF57', hint: 'Avoid deserted paths' },
    { id: 'speed', icon: Zap, label: 'Speed Priority', color: '#FFB347', hint: 'Get there faster' }
  ];

  return (
    <div className="glass-panel w-full md:w-80 p-5 flex flex-col gap-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#00E5CC]" />
            Route DNA
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">Personalize your path</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00E5CC] animate-ping-slow"></div>
          <span className="text-xs font-mono text-[#00E5CC]">Live</span>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-[#00E5CC]/30 to-transparent"></div>

      {/* Sliders */}
      <div className="flex flex-col gap-5">
        {sliders.map((slider) => (
          <div key={slider.id} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-[#00E5CC]/30 transition-colors">
                  <slider.icon className="w-4 h-4 text-[#94A3B8] group-hover:text-white transition-colors" />
                </div>
                <span className="font-display font-medium text-sm text-white">{slider.label}</span>
              </div>
              <span className="font-mono text-sm text-[#00E5CC]">{preferences[slider.id]}%</span>
            </div>

            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00E5CC]/50 to-[#00E5CC] transition-all duration-200"
                style={{ width: `${preferences[slider.id]}%` }}
              ></div>
              <input
                type="range"
                min="0"
                max="100"
                value={preferences[slider.id]}
                onChange={(e) => setPreferences(prev => ({ ...prev, [slider.id]: parseInt(e.target.value) }))}
                onMouseDown={() => setActiveSlider(slider.id)}
                onMouseUp={() => setActiveSlider(null)}
                onTouchStart={() => setActiveSlider(slider.id)}
                onTouchEnd={() => setActiveSlider(null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            
            <p className={clsx(
              "text-xs text-[#475569] mt-1.5 transition-opacity duration-300",
              activeSlider === slider.id ? "opacity-100" : "opacity-0"
            )}>
              {slider.hint}
            </p>
          </div>
        ))}
      </div>

      {/* Day/Night Toggle */}
      <div className="relative flex p-1 bg-white/5 rounded-xl border border-white/5">
        <button
          onClick={() => setIsNight(false)}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-300 z-10",
            !isNight ? "text-[#080C14]" : "text-[#94A3B8] hover:text-white"
          )}
        >
          <Sun className={clsx("w-4 h-4", !isNight && "animate-spin-slow")} />
          Day
        </button>
        <button
          onClick={() => setIsNight(true)}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-300 z-10",
            isNight ? "text-[#080C14]" : "text-[#94A3B8] hover:text-white"
          )}
        >
          <Moon className={clsx("w-4 h-4", isNight && "animate-breathe")} />
          Night
        </button>
        
        {/* Active Indicator */}
        <div 
          className={clsx(
            "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-500 ease-spring",
            isNight ? "left-[calc(50%+2px)] bg-gradient-to-r from-[#00E5CC] to-[#00B3A0]" : "left-1 bg-gradient-to-r from-[#FFB347] to-[#FF9E1B]"
          )}
        ></div>
      </div>

      {/* Footer Badges */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 text-xs font-mono text-[#94A3B8]">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#00E5CC]" /> H</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3 text-[#C8FF57]" /> M</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#FFB347]" /> L</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { LocateFixed, Navigation, Clock, Flame } from 'lucide-react';
import clsx from 'clsx';

export function MapToolbar({ onLocate, onToggleFollow, isFollowing, onToggleHistory, onToggleHeatmap, isHeatmapActive }) {
  const buttons = [
    { icon: LocateFixed, label: 'Locate Me', onClick: onLocate, active: false },
    { icon: Navigation, label: 'Follow', onClick: onToggleFollow, active: isFollowing },
    { icon: Clock, label: 'History', onClick: onToggleHistory, active: false },
    { icon: Flame, label: 'Danger Heatmap', onClick: onToggleHeatmap, active: isHeatmapActive, color: 'text-[#FF4D4D]' }
  ];

  return (
    <div className="absolute right-6 bottom-32 md:bottom-32 lg:bottom-40 z-40 flex flex-col gap-2 glass p-1 animate-slide-left">
      {buttons.map((btn, i) => (
        <button
          key={i}
          onClick={btn.onClick}
          className={clsx(
            "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group",
            btn.active ? "bg-[#00E5CC] text-[#080C14]" : "hover:bg-white/10 text-[#94A3B8] hover:text-white"
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <btn.icon className={clsx("w-5 h-5", btn.color && !btn.active && btn.color)} />
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 glass px-3 py-1.5 whitespace-nowrap text-sm font-medium text-white">
            {btn.label}
          </div>
        </button>
      ))}
    </div>
  );
}

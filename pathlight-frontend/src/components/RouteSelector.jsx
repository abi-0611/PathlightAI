import { memo } from 'react';

const MODE_CONFIG = {
  Fastest:  { icon: '⚡', color: 'text-yellow-400', bgActive: 'bg-yellow-400/15 border-yellow-400/40' },
  Safest:   { icon: '🛡️', color: 'text-green-400',  bgActive: 'bg-green-400/15 border-green-400/40' },
  Balanced: { icon: '⚖️', color: 'text-pathlight-400', bgActive: 'bg-pathlight-400/15 border-pathlight-400/40' },
};

function formatDist(m) {
  if (!m) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

function formatTime(m) {
  if (!m) return '—';
  const mins = Math.round((m / 1000) * 12); // avg walk speed ~5km/h → 12 min/km
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function RouteSelector({ alternatives, selectedIndex, onSelect }) {
  if (!alternatives || alternatives.length <= 1) return null;

  return (
    <div className="absolute bottom-[17rem] left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
      {alternatives.map((alt, idx) => {
        const props = alt.properties;
        const mode = props?.mode || 'Unknown';
        const cfg = MODE_CONFIG[mode] || MODE_CONFIG.Balanced;
        const isActive = idx === selectedIndex;

        return (
          <button
            key={mode}
            onClick={() => onSelect(idx)}
            className={`glass-card px-3 py-2 flex flex-col items-center gap-1 transition-all duration-200
                       cursor-pointer active:scale-95 min-w-[5.5rem]
                       ${isActive
                         ? cfg.bgActive + ' shadow-lg'
                         : 'hover:border-white/20 opacity-70 hover:opacity-100'
                       }`}
          >
            {/* Mode icon + label */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{cfg.icon}</span>
              <span className={`font-display font-bold text-[11px] ${isActive ? cfg.color : 'text-slate-400'}`}>
                {mode}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 text-[9px] font-body text-slate-500">
              <span>{formatDist(props?.total_length_m)}</span>
              <span className="text-slate-700">·</span>
              <span>{formatTime(props?.total_length_m)}</span>
            </div>

            {/* Safety indicator */}
            <div className="flex items-center gap-1 text-[9px] font-body">
              <span className="text-slate-600">🔦</span>
              <span className={isActive ? 'text-slate-300' : 'text-slate-500'}>
                {props?.avg_lighting_score?.toFixed(1)}
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-600">🛡</span>
              <span className={`${
                props?.avg_crime_risk <= 3 ? 'text-green-400' :
                props?.avg_crime_risk <= 6 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {props?.avg_crime_risk?.toFixed(1)}
              </span>
            </div>

            {/* Active indicator dot */}
            {isActive && (
              <div className={`w-1 h-1 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(RouteSelector);

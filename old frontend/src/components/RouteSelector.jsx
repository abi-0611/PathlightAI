import { memo, useState, useEffect } from 'react';

const MODE_CONFIG = {
  Fastest:  { icon: '⚡', color: 'var(--c-amber)',  glow: 'rgba(255,179,71,0.3)',  bg: 'rgba(255,179,71,0.12)', border: 'rgba(255,179,71,0.4)'  },
  Safest:   { icon: '🛡️', color: '#22c55e',         glow: 'rgba(34,197,94,0.3)',   bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)'   },
  Balanced: { icon: '⚖️', color: 'var(--c-teal)',   glow: 'var(--c-teal-30)',      bg: 'var(--c-teal-dim)',     border: 'var(--c-border-act)'   },
};

function formatDist(m) {
  if (!m) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

function formatTime(m) {
  if (!m) return '—';
  const mins = Math.round((m / 1000) * 12);
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/* ── Safety bar ────────────────────────────── */
function SafetyBar({ crimeRisk }) {
  const [width, setWidth] = useState('0%');
  const fillColor =
    crimeRisk <= 3 ? '#22c55e' :
    crimeRisk <= 6 ? 'var(--c-amber)' :
    'var(--c-red)';
  const targetWidth = `${(1 - crimeRisk / 10) * 100}%`;

  useEffect(() => {
    const t = setTimeout(() => setWidth(targetWidth), 60);
    return () => clearTimeout(t);
  }, [targetWidth]);

  return (
    <div className="w-full h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div
        className="h-full rounded-full"
        style={{ width, background: fillColor, transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)' }}
      />
    </div>
  );
}

/* ── Route card ────────────────────────────── */
function RouteCard({ alt, idx, isActive, onSelect }) {
  const props = alt.properties;
  const mode = props?.mode || 'Balanced';
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.Balanced;
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (isActive) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 400);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  return (
    <button
      onClick={() => onSelect(idx)}
      className="glass snap-center flex flex-col items-center gap-1.5 px-3 py-2.5 min-w-[88px] rounded-2xl cursor-pointer"
      style={{
        opacity: isActive ? 1 : 0.65,
        border: isActive ? `1px solid ${cfg.border}` : undefined,
        background: isActive ? cfg.bg : undefined,
        boxShadow: isActive ? `0 0 20px ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.4)` : undefined,
        transform: isActive ? 'scaleY(1.06)' : 'scaleY(1)',
        transformOrigin: 'bottom',
        animation: bouncing ? 'bounceIn 0.4s var(--ease-spring) forwards' : undefined,
        transition: 'opacity 250ms ease, transform 300ms var(--ease-spring), box-shadow 300ms ease',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.opacity = '0.65'; }}
    >
      {/* Row 1: Icon + Label */}
      <div className="flex items-center gap-1.5">
        <span style={{ animation: bouncing ? 'bounceIn 0.3s var(--ease-spring) forwards' : undefined }}>
          {cfg.icon}
        </span>
        <span
          className="font-display font-bold text-[11px]"
          style={{ color: isActive ? cfg.color : 'var(--c-text-3)' }}
        >
          {mode}
        </span>
      </div>

      {/* Row 2: Distance · Time */}
      <div className="flex items-center gap-1.5 text-[9px] font-body" style={{ color: 'var(--c-text-3)' }}>
        <span>{formatDist(props?.total_length_m)}</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        <span>{formatTime(props?.total_length_m)}</span>
      </div>

      {/* Row 3: Safety bar */}
      <SafetyBar crimeRisk={props?.avg_crime_risk ?? 5} />

      {/* Row 4: Active indicator dot */}
      {isActive && (
        <div
          className="w-1 h-1 rounded-full"
          style={{ background: cfg.color, animation: 'bounceIn 0.3s var(--ease-spring) forwards' }}
        />
      )}
    </button>
  );
}

export default memo(function RouteSelector({ alternatives, selectedIndex, onSelect }) {
  if (!alternatives || alternatives.length <= 1) return null;

  return (
    <div
      className="fixed bottom-[17rem] sm:bottom-[16rem] left-1/2 -translate-x-1/2 z-10
                 overflow-x-auto snap-x snap-mandatory flex gap-2 px-4 max-w-full"
      style={{ scrollbarWidth: 'none' }}
    >
      {alternatives.map((alt, idx) => (
        <RouteCard
          key={alt.properties?.mode || idx}
          alt={alt}
          idx={idx}
          isActive={idx === selectedIndex}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

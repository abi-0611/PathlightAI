import { useState, useEffect, useMemo, memo } from 'react';
import { Sun, Users, Zap, ChevronDown } from 'lucide-react';

/* ── Slider Control ────────────────────────── */
function SliderControl({ label, icon: Icon, value, onChange, hint, delay = 0 }) {
  const badgeColor = `hsl(${value * 1.7 + 160}, 100%, ${40 + value * 0.3}%)`;
  return (
    <div
      className="group px-5 py-3"
      style={{ animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${delay}ms` }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              background: 'rgba(0,229,204,0.08)',
              boxShadow: value > 60 ? '0 0 12px rgba(0,229,204,0.25)' : 'none',
            }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--c-teal)' }} />
          </div>
          <span className="text-sm font-medium font-body" style={{ color: 'var(--c-text-2)' }}>
            {label}
          </span>
        </div>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-full tabular-nums transition-all duration-300"
          style={{
            color: badgeColor,
            background: `${badgeColor}15`,
            border: `1px solid ${badgeColor}30`,
          }}
        >
          {value}%
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pathlight-slider w-full"
        style={{ '--slider-percent': `${value}%` }}
      />

      {/* Tick marks */}
      <div className="flex justify-between mt-1 px-0.5">
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="w-px h-1 rounded-full"
            style={{ background: value >= tick ? 'var(--c-teal-30)' : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>

      {/* Hint crossfade */}
      <p
        key={hint}
        className="font-body text-xs mt-1.5 leading-relaxed"
        style={{
          color: 'var(--c-text-3)',
          animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {hint}
      </p>
    </div>
  );
}

/* ── Day / Night Toggle ────────────────────── */
function DayNightToggle({ isNight, onChange }) {
  return (
    <div
      className="mx-5 my-3 p-1 rounded-xl flex items-center gap-1"
      style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Day button */}
      <button
        onClick={() => onChange(false)}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-body font-medium transition-all duration-300 active:scale-95"
        style={
          !isNight
            ? {
                background: 'linear-gradient(135deg,#FF9500,#FFB347)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(255,149,0,0.4)',
                transform: 'scale(1.03)',
              }
            : { color: 'var(--c-text-3)' }
        }
      >
        <span
          style={{
            display: 'inline-block',
            animation: !isNight ? 'spin 8s linear infinite' : 'none',
          }}
        >
          ☀️
        </span>
        <span>Day</span>
      </button>

      {/* Night button */}
      <button
        onClick={() => onChange(true)}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-body font-medium transition-all duration-300 active:scale-95"
        style={
          isNight
            ? {
                background: 'linear-gradient(135deg,#00A896,#00E5CC)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(0,229,204,0.3)',
                transform: 'scale(1.03)',
              }
            : { color: 'var(--c-text-3)' }
        }
      >
        <span
          style={{
            display: 'inline-block',
            animation: isNight ? 'breathe 2s ease-in-out infinite' : 'none',
          }}
        >
          🌙
        </span>
        <span>Night</span>
      </button>
    </div>
  );
}

/* ── Hint helpers ──────────────────────────── */
function lightHint(v) {
  if (v < 30) return 'Taking fastest path regardless of lighting';
  if (v < 70) return 'Balancing speed with well-lit streets';
  return 'Maximum priority on well-lit streets';
}
function crowdHint(v) {
  if (v < 30) return 'Quieter streets are fine';
  if (v < 70) return 'Prefer busier streets for added security';
  return 'Stick to the most populated areas';
}
function speedHint(v) {
  if (v < 30) return 'Safety over speed — take the safest route';
  if (v < 70) return 'Balance between fastest and safest';
  return 'Get there fast — minimal detours';
}

/* ─── Vibe summary badge ──────────────────── */
function VibeBadge({ icon, label, level }) {
  const colors = { High: 'var(--c-teal)', Med: 'var(--c-amber)', Low: 'rgba(148,163,184,0.6)' };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-body font-medium px-2 py-0.5 rounded-full"
      style={{
        color: colors[level] || 'var(--c-text-3)',
        background: `${colors[level] || 'rgba(148,163,184,0.1)'}18`,
        border: `1px solid ${colors[level] || 'rgba(148,163,184,0.1)'}40`,
      }}
    >
      {icon} {level}
    </span>
  );
}

/* ── Vibe Panel ────────────────────────────── */
export default memo(function VibePanel({ onSettingsChange, isLoading }) {
  const [wLight, setWLight] = useState(70);
  const [wCrowd, setWCrowd] = useState(40);
  const [wSpeed, setWSpeed] = useState(50);
  const [isNight, setIsNight] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Reactive background tint
  const bgTint = useMemo(() => {
    const safetyScore = (wLight + wCrowd) / 2;
    const speedScore = wSpeed;
    return safetyScore > speedScore
      ? `rgba(0,229,204,${(0.04 * safetyScore) / 100})`
      : `rgba(255,179,71,${(0.04 * speedScore) / 100})`;
  }, [wLight, wCrowd, wSpeed]);

  // Vibe summary levels
  const lightLevel = wLight >= 65 ? 'High' : wLight >= 35 ? 'Med' : 'Low';
  const crowdLevel = wCrowd >= 65 ? 'High' : wCrowd >= 35 ? 'Med' : 'Low';
  const speedLevel = wSpeed >= 65 ? 'High' : wSpeed >= 35 ? 'Med' : 'Low';

  // Debounced settings propagation
  useEffect(() => {
    const id = setTimeout(() => {
      onSettingsChange({ wLight: wLight / 100, wCrowd: wCrowd / 100, wSpeed: wSpeed / 100, isNight });
    }, 500);
    return () => clearTimeout(id);
  }, [wLight, wCrowd, wSpeed, isNight, onSettingsChange]);

  return (
    <div
      className={`
        fixed z-20
        bottom-6 right-6
        sm:bottom-4 sm:right-4
        max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:rounded-t-3xl max-sm:rounded-b-none
        glass hover:border-white/15
        w-80 max-sm:w-full max-sm:max-h-[65vh] max-sm:overflow-y-auto 2xl:w-96
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        overflow-hidden
        ${isPanelExpanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}
      `}
      style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Reactive bg tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: bgTint, transition: 'background 600ms ease', zIndex: 0 }}
      />
      <div className="relative z-10">
        {/* Mobile drag handle */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mt-2 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            {/* Live status dot */}
            <div className="relative w-2 h-2">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: isLoading ? 'var(--c-amber)' : 'var(--c-teal)',
                  animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                  opacity: 0.6,
                }}
              />
              <div
                className="relative rounded-full w-2 h-2"
                style={{ background: isLoading ? 'var(--c-amber)' : 'var(--c-teal)' }}
              />
            </div>
            <div>
              <h2 className="font-display font-bold text-base" style={{ color: 'var(--c-text-1)' }}>
                Vibe Check
              </h2>
              <p className="font-body text-xs mt-0.5" style={{ color: 'var(--c-text-3)' }}>
                {isLoading ? 'Calculating…' : '3 routes ready'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <ChevronDown
              className="w-4 h-4 transition-transform duration-300"
              style={{ color: 'var(--c-text-3)', transform: isPanelExpanded ? 'rotate(0)' : 'rotate(180deg)' }}
            />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* Sliders */}
        <SliderControl label="Well-Lit Streets"  icon={Sun}   value={wLight} onChange={setWLight} hint={lightHint(wLight)} delay={0}   />
        <SliderControl label="Populated Areas"   icon={Users} value={wCrowd} onChange={setWCrowd} hint={crowdHint(wCrowd)} delay={60}  />
        <SliderControl label="Speed Priority"    icon={Zap}   value={wSpeed} onChange={setWSpeed} hint={speedHint(wSpeed)} delay={120} />

        {/* Divider */}
        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* Day / Night Toggle */}
        <DayNightToggle isNight={isNight} onChange={setIsNight} />

        {/* Footer */}
        <div
          className="px-5 pb-4 pt-2 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {isLoading ? (
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'var(--c-teal)',
                    animation: 'breathe 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
              <span className="font-body text-xs ml-2" style={{ color: 'var(--c-text-3)' }}>
                Calculating…
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <VibeBadge icon="💡" label="Light" level={lightLevel} />
              <VibeBadge icon="👥" label="Crowd" level={crowdLevel} />
              <VibeBadge icon="⚡" label="Speed" level={speedLevel} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

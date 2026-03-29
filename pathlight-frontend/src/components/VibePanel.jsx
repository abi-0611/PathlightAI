import { useState, useEffect, memo } from 'react';
import { Sun, Users, Zap, ChevronDown } from 'lucide-react';

/* ── Slider Control ────────────────────────── */
function SliderControl({ label, icon: Icon, value, onChange, hint }) {
  return (
    <div className="group px-5 py-3 animate-fade-up" style={{ animationFillMode: 'both' }}>
      {/* Label row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pathlight-400/10 flex items-center justify-center
                          group-hover:bg-pathlight-400/20 transition-colors duration-200">
            <Icon className="w-3.5 h-3.5 text-pathlight-400" />
          </div>
          <span className="font-body text-slate-300 text-sm font-medium">{label}</span>
        </div>
        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-pathlight-400/10
                         text-pathlight-400 tabular-nums transition-all duration-200">
          {value}%
        </span>
      </div>

      {/* Slider input */}
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pathlight-slider w-full"
        style={{ '--slider-percent': `${value}%` }}
      />

      {/* Hint text */}
      <p className="font-body text-slate-500 text-xs mt-1.5 leading-relaxed">{hint}</p>
    </div>
  );
}

/* ── Day / Night Toggle ────────────────────── */
function DayNightToggle({ isNight, onChange }) {
  return (
    <div className="mx-5 my-3 p-1 rounded-xl bg-obsidian-800/60 border border-white/5
                    flex items-center gap-1">
      <button
        onClick={() => onChange(false)}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg
                    text-sm font-body font-medium transition-all duration-300
                    ${!isNight
                      ? 'bg-ember-500 text-white shadow-lg shadow-ember-500/30 scale-[1.03]'
                      : 'text-slate-500 hover:text-slate-300 hover:scale-[1.02]'}
                    active:scale-[0.97]`}
      >
        ☀️ <span>Day</span>
      </button>
      <button
        onClick={() => onChange(true)}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg
                    text-sm font-body font-medium transition-all duration-300
                    ${isNight
                      ? 'bg-pathlight-500 text-white shadow-lg shadow-pathlight-500/30 scale-[1.03]'
                      : 'text-slate-500 hover:text-slate-300 hover:scale-[1.02]'}
                    active:scale-[0.97]`}
      >
        🌙 <span>Night</span>
      </button>
    </div>
  );
}

/* ── Hint Helpers ──────────────────────────── */
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

/* ── Vibe Panel ────────────────────────────── */
export default memo(function VibePanel({ onSettingsChange, isLoading }) {
  const [wLight, setWLight] = useState(70);
  const [wCrowd, setWCrowd] = useState(40);
  const [wSpeed, setWSpeed] = useState(50);
  const [isNight, setIsNight] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Debounced settings propagation
  useEffect(() => {
    const id = setTimeout(() => {
      onSettingsChange({
        wLight: wLight / 100,
        wCrowd: wCrowd / 100,
        wSpeed: wSpeed / 100,
        isNight,
      });
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
        glass-card hover:border-white/15
        w-80 max-sm:w-full max-sm:max-h-[65vh] max-sm:overflow-y-auto 2xl:w-96
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        animate-slide-up
        ${isPanelExpanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}
      `}
    >
      {/* Mobile drag handle */}
      <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mt-2 mb-1" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h2 className="font-display font-bold text-white text-base">Vibe Check</h2>
          <p className="font-body text-slate-400 text-xs mt-0.5">Tune your route preferences</p>
        </div>
        <button
          onClick={() => setIsPanelExpanded(!isPanelExpanded)}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
              isPanelExpanded ? '' : 'rotate-180'
            }`}
          />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/5" />

      {/* Sliders */}
      <div style={{ '--stagger': '80ms' }}>
        <div style={{ animationDelay: '0ms' }}>
          <SliderControl
            label="Well-Lit Streets"
            icon={Sun}
            value={wLight}
            onChange={setWLight}
            hint={lightHint(wLight)}
          />
        </div>
        <div style={{ animationDelay: '80ms' }}>
          <SliderControl
            label="Populated Areas"
            icon={Users}
            value={wCrowd}
            onChange={setWCrowd}
            hint={crowdHint(wCrowd)}
          />
        </div>
        <div style={{ animationDelay: '160ms' }}>
          <SliderControl
            label="Speed Priority"
            icon={Zap}
            value={wSpeed}
            onChange={setWSpeed}
            hint={speedHint(wSpeed)}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/5" />

      {/* Day / Night Toggle */}
      <DayNightToggle isNight={isNight} onChange={setIsNight} />

      {/* Footer */}
      <div className="px-5 pb-4 pt-2 flex items-center justify-between border-t border-white/5">
        <span className="font-body text-slate-500 text-xs">
          {isLoading ? 'Calculating route...' : 'Route ready'}
        </span>
        {isLoading && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-pathlight-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

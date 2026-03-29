import { useState, useEffect, memo } from 'react';
import { X } from 'lucide-react';

/* ── Count-Up Hook ─────────────────────────── */
function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start;
    let id;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

/* ── Loading Skeleton ──────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 shimmer rounded-full w-full" />
      <div className="h-3 shimmer rounded-full w-4/5" />
      <div className="h-3 shimmer rounded-full w-3/5" />
    </div>
  );
}

/* ── Stat Badge ────────────────────────────── */
function StatBadge({ label, rawValue, formatter, icon, highlight }) {
  const animated = useCountUp(rawValue);
  return (
    <div
      className={`rounded-xl p-2.5 text-center border transition-all duration-200
                  hover:-translate-y-0.5 hover:shadow-lg
                  ${highlight
                    ? 'bg-pathlight-400/10 border-pathlight-400/20 hover:shadow-pathlight-400/20'
                    : 'bg-white/[0.04] border-white/[0.08]'}`}
    >
      <div className="text-base mb-1">{icon}</div>
      <div className={`font-mono text-xs font-medium ${highlight ? 'text-pathlight-400' : 'text-slate-400'}`}>
        {formatter(animated)}
      </div>
      <div className="font-body text-slate-600 text-[10px] mt-0.5">{label}</div>
    </div>
  );
}

/* ── Explanation Content ───────────────────── */
function ExplanationContent({ explanation, routeProps, isNight }) {
  return (
    <>
      <p className="font-body text-slate-300 text-sm leading-relaxed mb-4">{explanation}</p>

      {routeProps && (
        <div className="grid grid-cols-3 gap-2">
          <StatBadge
            label="Distance"
            rawValue={routeProps.total_length_m / 1000}
            formatter={(v) => `${v.toFixed(2)}km`}
            icon="📍"
          />
          <StatBadge
            label="Lighting"
            rawValue={routeProps.avg_lighting_score ?? 0}
            formatter={(v) => `${v.toFixed(1)}/10`}
            icon="💡"
            highlight={routeProps.avg_lighting_score > 6}
          />
          <StatBadge
            label="Safety"
            rawValue={10 - (routeProps.avg_crime_risk ?? 0)}
            formatter={(v) => `${v.toFixed(1)}/10`}
            icon="🛡️"
            highlight={routeProps.avg_crime_risk < 5}
          />
        </div>
      )}

      {isNight && (
        <div className="mt-3 flex items-center gap-1.5 text-amber-400/70">
          <span className="text-xs">🌙</span>
          <span className="font-body text-xs">Night mode — lighting prioritized 3×</span>
        </div>
      )}
    </>
  );
}

/* ── AI Popup ──────────────────────────────── */
export default memo(function AIPopup({ explanation, isLoading, routeProps, isNight }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading || explanation) setIsVisible(true);
  }, [isLoading, explanation]);

  return (
    <div
      className={`
        fixed top-4 right-4 z-20
        w-80 max-w-[calc(100vw-2rem)]
        max-sm:top-auto max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:w-full
        max-sm:rounded-t-3xl max-sm:rounded-b-none
        2xl:w-96
        glass-card p-5
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isVisible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-8 opacity-0 pointer-events-none'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pathlight-400/15 flex items-center justify-center">
            <span className="text-base">✨</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-sm">PathLight Insights</h3>
            <p className="font-body text-slate-500 text-xs">AI Safety Analysis</p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="group w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 group-hover:rotate-90" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-pathlight-400/30 via-white/10 to-transparent mb-3" />

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <ExplanationContent explanation={explanation} routeProps={routeProps} isNight={isNight} />
      )}
    </div>
  );
});

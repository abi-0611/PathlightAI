import { useState, useEffect, memo } from 'react';
import { X } from 'lucide-react';
import StatCard from './StatCard';

/* ── Loading Skeleton ──────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="h-3 shimmer rounded-full w-full" />
      <div className="h-3 shimmer rounded-full w-4/5" />
      <div className="h-3 shimmer rounded-full w-3/5" />
    </div>
  );
}

/* ── Word-by-word reveal ───────────────────── */
function RevealText({ text }) {
  const words = (text || '').split(' ');
  return (
    <p
      key={text}
      className="font-body text-sm leading-relaxed mb-4"
      style={{ color: 'var(--c-text-2)' }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            marginRight: '0.25em',
            animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
            animationDelay: `${i * 0.03}s`,
            opacity: 0,
          }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}

/* ── AI Popup ──────────────────────────────── */
export default memo(function AIPopup({ explanation, isLoading, routeProps, isNight, asMobileTab }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading || explanation) setIsVisible(true);
  }, [isLoading, explanation]);

  const safetyVal = routeProps ? parseFloat((10 - (routeProps.avg_crime_risk ?? 0)).toFixed(1)) : 0;
  const lightVal  = routeProps ? parseFloat((routeProps.avg_lighting_score ?? 0).toFixed(1)) : 0;
  const distKm    = routeProps ? parseFloat((routeProps.total_length_m / 1000).toFixed(2)) : 0;

  const containerBase = `
    w-80 max-w-[calc(100vw-2rem)] 2xl:w-96
    glass p-5
    transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
  `;

  const fixedStyle = `
    fixed top-4 right-4 z-20
    max-sm:top-auto max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:w-full
    max-sm:rounded-t-3xl max-sm:rounded-b-none
    ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none'}
  `;

  return (
    <div className={`${containerBase} ${asMobileTab ? '' : fixedStyle}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Rotating conic-gradient icon */}
          <div
            className="w-7 h-7 rounded-lg overflow-hidden relative flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,229,204,0.08)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'conic-gradient(var(--c-teal), #667eea, var(--c-teal))',
                animation: 'spin 4s linear infinite',
                opacity: 0.5,
              }}
            />
            <span className="relative z-10 text-sm">✨</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-sm" style={{ color: 'var(--c-text-1)' }}>
              PathLight Insights
            </h3>
            <p className="font-body text-xs" style={{ color: 'var(--c-text-3)' }}>
              AI Safety Analysis
            </p>
          </div>
        </div>
        {!asMobileTab && (
          <button
            onClick={() => setIsVisible(false)}
            className="group w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-200"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <X
              className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-90"
              style={{ color: 'var(--c-text-3)' }}
            />
          </button>
        )}
      </div>

      {/* Gradient divider */}
      <div
        className="h-px mb-3"
        style={{ background: 'linear-gradient(to right, var(--c-teal-30), rgba(255,255,255,0.06), transparent)' }}
      />

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {explanation && <RevealText text={explanation} />}

          {routeProps && (
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                label="Distance"
                value={distKm.toFixed(2)}
                unit="km"
                icon="📍"
                pct={Math.min((distKm / 5) * 100, 100)}
              />
              <StatCard
                label="Lighting"
                value={lightVal.toFixed(1)}
                unit="/10"
                icon="💡"
                pct={lightVal * 10}
                highlight={lightVal > 6}
              />
              <StatCard
                label="Safety"
                value={safetyVal.toFixed(1)}
                unit="/10"
                icon="🛡️"
                pct={safetyVal * 10}
                highlight={safetyVal > 5}
              />
            </div>
          )}

          {isNight && (
            <div
              className="mt-3 flex items-center gap-2"
              style={{ color: 'var(--c-amber)' }}
            >
              <span className="text-xs">🌙</span>
              <span className="font-body text-xs" style={{ color: 'var(--c-text-3)' }}>
                Night mode — lighting prioritized
              </span>
              <span
                className="font-mono text-[10px] ml-auto px-1.5 py-0.5 rounded-full"
                style={{
                  color: 'var(--c-teal)',
                  background: 'var(--c-teal-30)',
                  border: '1px solid rgba(0,229,204,0.3)',
                }}
              >
                3×
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
});

import { memo, useRef, useEffect, useState } from 'react';
import { Clock, X, RotateCcw } from 'lucide-react';

function formatTime(isoStr) {
  try {
    const diffMin = Math.floor((Date.now() - new Date(isoStr)) / 60000);
    if (diffMin < 1) return { text: 'Just now', color: 'var(--c-teal)' };
    if (diffMin < 60) return { text: `${diffMin}m ago`, color: 'var(--c-teal)' };
    const h = Math.floor(diffMin / 60);
    if (h < 24) return { text: `${h}h ago`, color: 'var(--c-amber)' };
    const d = Math.floor(h / 24);
    return { text: `${d}d ago`, color: 'var(--c-text-3)' };
  } catch {
    return { text: '', color: 'var(--c-text-3)' };
  }
}

function formatDistance(m) {
  if (!m) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function getSafetyBadge(crimeRisk) {
  if (crimeRisk <= 3) return { label: 'Safe',     bg: 'rgba(34,197,94,0.15)',  color: '#22c55e'        };
  if (crimeRisk <= 6) return { label: 'Moderate', bg: 'rgba(255,179,71,0.15)', color: 'var(--c-amber)' };
  return                     { label: 'Caution',  bg: 'rgba(255,77,77,0.15)',  color: 'var(--c-red)'   };
}

const MODE_ICONS = { Fastest: '⚡', Safest: '🛡️', Balanced: '⚖️' };

/* ── History card ────────────────────────────── */
function HistoryCard({ entry, onReplay, onRemove, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [hoverReplay, setHoverReplay] = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  const time = formatTime(entry.timestamp);
  const badge = getSafetyBadge(entry.avgCrimeRisk);

  // IntersectionObserver scroll entrance
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="history-card glass p-3 space-y-2 relative overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(16px)',
        transition: `opacity 300ms cubic-bezier(0.16,1,0.3,1) ${index * 60}ms,
                     transform 300ms cubic-bezier(0.16,1,0.3,1) ${index * 60}ms`,
      }}
      onMouseEnter={() => setShowRemove(true)}
      onMouseLeave={() => setShowRemove(false)}
    >
      {/* Row 1: Destination + remove */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="font-body text-xs font-medium truncate flex-1"
          style={{ color: 'var(--c-text-1)' }}
          title={entry.destination}
        >
          📍 {entry.destination}
        </p>
        <button
          onClick={() => onRemove(entry.id)}
          className="shrink-0 transition-all duration-200"
          style={{
            opacity: showRemove ? 1 : 0,
            color: 'var(--c-text-3)',
            pointerEvents: showRemove ? 'auto' : 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--c-red)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-text-3)')}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Row 2: Time + day/night + mode */}
      <div className="flex items-center gap-2">
        <span
          className="font-body text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ color: time.color, background: `${time.color}15`, border: `1px solid ${time.color}25` }}
        >
          {time.text}
        </span>
        <span className="text-[10px]">{entry.isNight ? '🌙' : '☀️'}</span>
        <span className="text-[10px]">{MODE_ICONS[entry.mode] || '⚖️'}</span>
      </div>

      {/* Row 3: Stats */}
      <div className="flex items-center gap-2 font-body text-[10px]" style={{ color: 'var(--c-text-3)' }}>
        <span>{formatDistance(entry.totalLengthM)}</span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
        <span>💡 {entry.avgLightingScore?.toFixed(1)}/10</span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
        <span
          className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {/* Row 4: Explanation preview */}
      {entry.explanation && (
        <p className="font-body text-[10px] line-clamp-2 italic" style={{ color: 'var(--c-text-3)' }}>
          "{entry.explanation}"
        </p>
      )}

      {/* Row 5: Replay button */}
      <button
        onClick={() => onReplay(entry)}
        className="w-full py-1.5 rounded-xl flex items-center justify-center gap-1.5 font-body text-[10px] font-medium transition-all duration-200"
        style={{
          border: `1px solid ${hoverReplay ? 'var(--c-border-act)' : 'var(--c-border)'}`,
          color: 'var(--c-teal)',
          background: hoverReplay ? 'var(--c-teal-dim)' : 'transparent',
        }}
        onMouseEnter={() => setHoverReplay(true)}
        onMouseLeave={() => setHoverReplay(false)}
      >
        <RotateCcw
          className="w-3 h-3"
          style={{ animation: hoverReplay ? 'spin 0.5s ease forwards' : 'none' }}
        />
        Replay this route
      </button>
    </div>
  );
}

/* ── Empty state ─────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
      <div className="relative w-12 h-12">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ border: '2px solid rgba(255,255,255,0.1)', animation: 'spin 8s linear infinite' }}
        >
          <div
            className="w-0.5 h-4 rounded-full"
            style={{
              background: 'linear-gradient(to bottom, var(--c-teal), transparent)',
              animation: 'spin 3s ease-in-out infinite alternate',
            }}
          />
        </div>
        <div
          className="absolute inset-0 w-12 h-12 rounded-full"
          style={{
            border: '1px solid rgba(0,229,204,0.2)',
            animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
            opacity: 0.4,
          }}
        />
      </div>
      <div>
        <p className="font-display font-bold text-sm" style={{ color: 'var(--c-text-2)' }}>No routes yet</p>
        <p className="font-body text-xs mt-1" style={{ color: 'var(--c-text-3)' }}>
          Your safe journeys will appear here
        </p>
      </div>
    </div>
  );
}

export default memo(function RouteHistory({ isOpen, onClose, history, onReplay, onRemove, onClear }) {
  return (
    <>
      {/* ::before sweep styles injected once */}
      <style>{`
        .history-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 0;
          background: var(--c-teal);
          border-radius: 16px 0 0 16px;
          transition: width 200ms var(--ease-spring);
        }
        .history-card:hover::before { width: 3px; }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 250ms ease',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 left-0 z-40 h-full w-72 sm:w-80 flex flex-col"
        style={{
          background: 'rgba(8,12,20,0.96)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid var(--c-border)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: isOpen
            ? 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)'
            : 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: 'var(--c-teal)' }} />
            <h2 className="font-display font-bold text-sm" style={{ color: 'var(--c-text-1)' }}>
              Route History
            </h2>
            {history.length > 0 && (
              <span
                className="font-body text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--c-teal-dim)',
                  color: 'var(--c-teal)',
                  border: '1px solid var(--c-border-act)',
                }}
              >
                {history.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--c-text-3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--c-text-1)';
              e.currentTarget.querySelector('svg').style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--c-text-3)';
              e.currentTarget.querySelector('svg').style.transform = 'rotate(0deg)';
            }}
          >
            <X className="w-3.5 h-3.5" style={{ transition: 'transform 200ms ease' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--c-teal-30) transparent' }}
        >
          {history.length === 0 ? (
            <EmptyState />
          ) : (
            history.map((entry, i) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                index={i}
                onReplay={onReplay}
                onRemove={onRemove}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 px-3 py-3 shrink-0"
            style={{ borderTop: '1px solid var(--c-border)', background: 'rgba(8,12,20,0.9)' }}
          >
            <button
              className="w-full py-1.5 rounded-lg font-body text-[10px] transition-all duration-200"
              style={{ color: 'rgba(255,77,77,0.6)' }}
              onClick={onClear}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,77,77,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Clear all history
            </button>
          </div>
        )}
      </div>
    </>
  );
});

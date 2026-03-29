import { memo } from 'react';

function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function formatDistance(m) {
  if (!m) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function safetyBadge(crimeRisk) {
  if (crimeRisk <= 3) return { label: 'Safe', color: 'text-green-400 bg-green-400/10' };
  if (crimeRisk <= 6) return { label: 'Moderate', color: 'text-yellow-400 bg-yellow-400/10' };
  return { label: 'Caution', color: 'text-red-400 bg-red-400/10' };
}

function RouteCard({ entry, onReplay, onRemove }) {
  const badge = safetyBadge(entry.avgCrimeRisk);
  return (
    <div className="glass-card p-3 space-y-2 hover:border-pathlight-400/20 transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-body text-white text-xs font-medium truncate" title={entry.destination}>
            📍 {entry.destination}
          </p>
          <p className="font-body text-slate-500 text-[10px] mt-0.5">
            {formatTime(entry.timestamp)} · {entry.isNight ? '🌙 Night' : '☀️ Day'}
          </p>
        </div>
        <button
          onClick={() => onRemove(entry.id)}
          className="text-slate-600 hover:text-red-400 text-xs transition-colors flex-shrink-0 cursor-pointer"
          title="Remove"
        >
          ✕
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 text-[10px] font-body">
        <span className="text-slate-400">{formatDistance(entry.totalLengthM)}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">🔦 {entry.avgLightingScore?.toFixed(1)}/10</span>
        <span className="text-slate-600">·</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Explanation preview */}
      {entry.explanation && (
        <p className="font-body text-slate-500 text-[10px] line-clamp-2 italic">
          "{entry.explanation}"
        </p>
      )}

      {/* Replay button */}
      <button
        onClick={() => onReplay(entry)}
        className="w-full py-1.5 rounded-lg bg-pathlight-400/10 text-pathlight-400 text-[10px] font-body
                   font-medium hover:bg-pathlight-400/20 transition-colors cursor-pointer"
      >
        ↻ Replay this route
      </button>
    </div>
  );
}

function RouteHistory({ isOpen, onClose, history, onReplay, onRemove, onClear }) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 left-0 z-40 h-full w-72 bg-obsidian-950/95 backdrop-blur-xl
                    border-r border-white/5 transform transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-sm">🕑</span>
            <h2 className="font-display font-bold text-white text-sm">Route History</h2>
            {history.length > 0 && (
              <span className="text-[10px] font-body text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-7rem)] px-3 py-3 space-y-2 scrollbar-thin">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <span className="text-2xl mb-2">🗺️</span>
              <p className="font-body text-slate-500 text-xs">No routes yet</p>
              <p className="font-body text-slate-600 text-[10px] mt-1">
                Your completed routes will appear here
              </p>
            </div>
          ) : (
            history.map((entry) => (
              <RouteCard
                key={entry.id}
                entry={entry}
                onReplay={onReplay}
                onRemove={onRemove}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 px-3 py-3 border-t border-white/5 bg-obsidian-950/90">
            <button
              onClick={onClear}
              className="w-full py-1.5 rounded-lg text-red-400/70 text-[10px] font-body
                         hover:bg-red-400/10 transition-colors cursor-pointer"
            >
              Clear all history
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default memo(RouteHistory);

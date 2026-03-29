import { memo, useState } from 'react';
import { Navigation, Crosshair, Clock, Flame } from 'lucide-react';

const TOOLTIPS = {
  locate:   'Go to my location',
  follow:   'Navigation follow',
  history:  'Route history',
  heatmap:  'Danger heatmap',
};

function ToolbarButton({ id, icon: Icon, active, danger, pulse, badge, tooltip, onClick, hoveredId, setHoveredId }) {
  const isHovered = hoveredId === id;

  return (
    <div className="relative flex items-center">
      {/* Tooltip — slides in from right, shown to the left */}
      {isHovered && tooltip && (
        <div
          className="absolute right-full mr-2 glass px-2 py-1 whitespace-nowrap pointer-events-none"
          style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1) forwards', opacity: 0 }}
        >
          <span className="font-body text-xs" style={{ color: 'var(--c-text-2)' }}>{tooltip}</span>
        </div>
      )}

      <button
        onClick={onClick}
        onMouseEnter={() => setHoveredId(id)}
        onMouseLeave={() => setHoveredId(null)}
        className="relative flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95"
        style={{
          width: 44,
          height: 44,
          background: active
            ? (danger ? 'rgba(255,77,77,0.12)' : 'var(--c-teal-dim)')
            : 'transparent',
          border: active
            ? `1px solid ${danger ? 'rgba(255,77,77,0.4)' : 'var(--c-border-act)'}`
            : '1px solid transparent',
          color: active
            ? (danger ? 'var(--c-red)' : 'var(--c-teal)')
            : 'var(--c-text-3)',
        }}
        title={tooltip}
      >
        <Icon
          className="w-5 h-5"
          style={{
            animation: pulse ? 'breathe 3s ease-in-out infinite' : 'none',
          }}
        />
        {/* Badge */}
        {badge > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold"
            style={{
              fontSize: 9,
              background: 'var(--c-teal)',
              color: 'var(--c-base)',
            }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
    </div>
  );
}

export default memo(function MapToolbar({
  gpsPosition,
  destination,
  routeGeoJSON,
  arrived,
  isNavFollowing,
  heatmapVisible,
  historyCount,
  historyOpen,
  onLocateMe,
  onToggleFollow,
  onToggleHistory,
  onToggleHeatmap,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const showFollow = !!(destination && routeGeoJSON && !arrived);

  return (
    <div
      className="fixed z-10 glass flex flex-col gap-1 p-1.5"
      style={{
        right: 16,
        bottom: 144,
      }}
    >
      {/* Locate Me */}
      <ToolbarButton
        id="locate"
        icon={Navigation}
        active={false}
        pulse={!!gpsPosition}
        tooltip={TOOLTIPS.locate}
        onClick={onLocateMe}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
      />

      {/* Nav Follow — only when navigating */}
      {showFollow && (
        <ToolbarButton
          id="follow"
          icon={Crosshair}
          active={isNavFollowing}
          tooltip={TOOLTIPS.follow}
          onClick={onToggleFollow}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      )}

      {/* Route History */}
      <ToolbarButton
        id="history"
        icon={Clock}
        active={historyOpen}
        badge={historyCount}
        tooltip={TOOLTIPS.history}
        onClick={onToggleHistory}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
      />

      {/* Danger Heatmap */}
      <ToolbarButton
        id="heatmap"
        icon={Flame}
        active={heatmapVisible}
        danger={heatmapVisible}
        tooltip={TOOLTIPS.heatmap}
        onClick={onToggleHeatmap}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
      />
    </div>
  );
});

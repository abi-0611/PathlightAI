import { memo, useEffect, useRef, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';

export default memo(function StatCard({
  label,
  value,
  rawValue,
  formatter,
  icon,
  highlight = false,
  unit,
  maxValue,
}) {
  const animated = useCountUp(rawValue ?? 0, 900, rawValue != null);
  const displayValue = formatter ? formatter(animated) : (unit ? `${animated.toFixed(1)}${unit}` : animated.toFixed(1));

  // Animate fill bar
  const [fillWidth, setFillWidth] = useState(0);
  const hasFill = rawValue != null && maxValue != null && maxValue > 0;

  useEffect(() => {
    if (!hasFill) return;
    const pct = Math.min((rawValue / maxValue) * 100, 100);
    const id = setTimeout(() => setFillWidth(pct), 80);
    return () => clearTimeout(id);
  }, [rawValue, maxValue, hasFill]);

  return (
    <div
      className="rounded-xl p-3 text-center flex flex-col items-center transition-all duration-200"
      style={{
        border: `1px solid ${highlight ? 'var(--c-border-act)' : 'var(--c-border)'}`,
        background: highlight ? 'var(--c-teal-dim)' : 'rgba(255,255,255,0.04)',
        cursor: 'default',
        transition: 'transform 0.2s var(--ease-spring), box-shadow 0.2s var(--ease-smooth)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = highlight
          ? '0 0 12px rgba(0,229,204,0.3)'
          : '0 4px 16px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Icon */}
      <div className="text-xl mb-1">{icon}</div>

      {/* Animated value */}
      <div
        className="font-mono text-sm font-medium"
        style={{ color: highlight ? 'var(--c-teal)' : 'var(--c-text-2)' }}
      >
        {displayValue}
      </div>

      {/* Label */}
      <div
        className="font-body text-[10px] mt-0.5"
        style={{ color: 'var(--c-text-3)' }}
      >
        {label}
      </div>

      {/* Animated fill bar */}
      {hasFill && (
        <div
          className="w-full mt-1.5 rounded-full overflow-hidden"
          style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillWidth}%`,
              background: 'var(--c-teal)',
              transition: 'width 0.9s var(--ease-spring)',
            }}
          />
        </div>
      )}
    </div>
  );
});

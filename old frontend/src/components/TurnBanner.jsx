import { memo, useState, useEffect, useRef } from 'react';
import { ArrowUp, CornerUpLeft, CornerUpRight, RotateCcw, MapPin, ChevronRight } from 'lucide-react';

const DIRECTION_CONFIG = {
  'straight':     { Icon: ArrowUp,       color: 'var(--c-teal)',  label: 'Continue'     },
  'slight left':  { Icon: CornerUpLeft,  color: '#60a5fa',        label: 'Slight left'  },
  'left':         { Icon: CornerUpLeft,  color: '#60a5fa',        label: 'Turn left'    },
  'sharp left':   { Icon: CornerUpLeft,  color: '#60a5fa',        label: 'Sharp left'   },
  'slight right': { Icon: CornerUpRight, color: 'var(--c-amber)', label: 'Slight right' },
  'right':        { Icon: CornerUpRight, color: 'var(--c-amber)', label: 'Turn right'   },
  'sharp right':  { Icon: CornerUpRight, color: 'var(--c-amber)', label: 'Sharp right'  },
  'U-turn':       { Icon: RotateCcw,     color: 'var(--c-red)',   label: 'U-turn'       },
  'arrive':       { Icon: MapPin,        color: '#22c55e',        label: 'Arrive'       },
};

function formatDistance(meters) {
  if (!meters || meters < 1) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/* ── Cross-fade distance number ─────────────── */
function FadingDist({ value }) {
  const [displayed, setDisplayed] = useState(value);
  const [visible, setVisible] = useState(true);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    setVisible(false);
    const t = setTimeout(() => {
      setDisplayed(value);
      setVisible(true);
      prev.current = value;
    }, 150);
    return () => clearTimeout(t);
  }, [value]);

  const raw = parseFloat(displayed) || 0;
  const distColor =
    raw < 50  ? 'var(--c-red)'   :
    raw < 200 ? 'var(--c-amber)' :
    'var(--c-text-1)';

  return (
    <span
      className="font-mono text-2xl font-bold tabular-nums shrink-0"
      style={{ color: distColor, opacity: visible ? 1 : 0, transition: 'opacity 150ms ease, color 400ms ease' }}
    >
      {displayed}
    </span>
  );
}

/* ── Arrival card ────────────────────────────── */
function ArrivalCard() {
  return (
    <>
      <style>{`
        @keyframes drawCircle { from { stroke-dashoffset: 151; } to { stroke-dashoffset: 0; } }
        @keyframes drawCheck  { from { stroke-dashoffset: 30;  } to { stroke-dashoffset: 0; } }
        @keyframes arrivalPop { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes drainBar   { from { width: 100%; } to { width: 0%; } }
      `}</style>
      <div
        className="glass px-5 py-5 flex flex-col items-center gap-3 overflow-hidden relative"
        style={{
          border: '1px solid rgba(34,197,94,0.3)',
          background: 'rgba(34,197,94,0.06)',
          animation: 'arrivalPop 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        <svg viewBox="0 0 52 52" className="w-12 h-12">
          <circle cx="26" cy="26" r="24" fill="none" stroke="#22c55e" strokeWidth="2"
            style={{ strokeDasharray: 151, strokeDashoffset: 0, animation: 'drawCircle 0.5s ease forwards' }} />
          <path d="M14 26 L22 34 L38 18" fill="none" stroke="#22c55e" strokeWidth="2.5"
            style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'drawCheck 0.4s 0.4s ease forwards' }} />
        </svg>
        <div className="text-center">
          <p className="font-display font-bold text-base" style={{ color: 'var(--c-text-1)' }}>
            You have arrived!
          </p>
          <p className="font-body text-xs mt-1" style={{ color: '#22c55e' }}>
            Stay safe 🎉
          </p>
        </div>
        <div
          className="absolute bottom-0 left-0 h-[2px] rounded-full"
          style={{ background: '#22c55e', animation: 'drainBar 5s linear forwards' }}
        />
      </div>
    </>
  );
}

export default memo(function TurnBanner({ instruction, nextInstruction, distanceToNext, arrived }) {
  const [animate, setAnimate] = useState(false);
  const prevDir = useRef(null);

  useEffect(() => {
    const dir = instruction?.direction;
    if (dir && dir !== prevDir.current) {
      setAnimate(false);
      requestAnimationFrame(() => {
        setAnimate(true);
        prevDir.current = dir;
      });
    }
  }, [instruction?.direction]);

  if (arrived) {
    return (
      <div className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 z-20 w-[90vw] max-w-md">
        <ArrivalCard />
      </div>
    );
  }

  if (!instruction) return null;

  const config = DIRECTION_CONFIG[instruction.direction] || DIRECTION_CONFIG['straight'];
  const { Icon } = config;
  const rawDist = distanceToNext ?? instruction.distance_m ?? 0;
  const distText = formatDistance(rawDist);
  const progress = instruction.distance_m > 0
    ? Math.max(0, Math.min(1, 1 - (rawDist / instruction.distance_m)))
    : 0;

  const nextCfg = nextInstruction
    ? DIRECTION_CONFIG[nextInstruction.direction] || DIRECTION_CONFIG['straight']
    : null;
  const NextIcon = nextCfg?.Icon;

  return (
    <div
      className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 z-20 w-[90vw] max-w-md"
      style={{ animation: 'fadeDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards' }}
    >
      <div className="glass overflow-hidden">
        {/* Main instruction row */}
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Direction icon circle */}
          <div
            className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${config.color}1a` }}
          >
            <Icon
              className="w-6 h-6"
              style={{
                color: config.color,
                animation: animate ? 'bounceIn 0.3s var(--ease-spring) forwards' : undefined,
              }}
            />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-base truncate" style={{ color: 'var(--c-text-1)' }}>
              {instruction.text}
            </p>
            {distText && (
              <p className="font-body text-xs mt-0.5" style={{ color: 'var(--c-text-2)' }}>
                In {distText} ahead
              </p>
            )}
          </div>

          {/* Large distance */}
          {distText && <FadingDist value={distText} />}
        </div>

        {/* Progress bar */}
        <div className="h-[2px] w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full"
            style={{
              width: `${progress * 100}%`,
              background: config.color,
              transition: 'width 300ms ease',
            }}
          />
        </div>

        {/* Next turn preview */}
        {nextInstruction && NextIcon && (
          <div
            className="px-4 py-2 flex items-center gap-2"
            style={{ borderTop: '1px solid var(--c-border)', background: 'rgba(255,255,255,0.03)' }}
          >
            <ChevronRight className="w-3 h-3" style={{ color: 'var(--c-text-3)' }} />
            <span className="font-body text-[10px]" style={{ color: 'var(--c-text-3)' }}>Then</span>
            <NextIcon className="w-3 h-3" style={{ color: nextCfg.color }} />
            <span className="font-body text-xs truncate" style={{ color: 'var(--c-text-2)' }}>
              {nextInstruction.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

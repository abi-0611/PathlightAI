import { memo } from 'react';
import { Navigation, ArrowUp, CornerUpLeft, CornerUpRight, RotateCcw, MapPin, ChevronRight } from 'lucide-react';

const DIRECTION_CONFIG = {
  'straight':      { icon: ArrowUp,        color: 'text-pathlight-400', label: 'Go straight' },
  'slight left':   { icon: CornerUpLeft,   color: 'text-blue-400',      label: 'Slight left' },
  'left':          { icon: CornerUpLeft,    color: 'text-blue-400',      label: 'Turn left' },
  'sharp left':    { icon: CornerUpLeft,    color: 'text-blue-400',      label: 'Sharp left' },
  'slight right':  { icon: CornerUpRight,   color: 'text-amber-400',     label: 'Slight right' },
  'right':         { icon: CornerUpRight,   color: 'text-amber-400',     label: 'Turn right' },
  'sharp right':   { icon: CornerUpRight,   color: 'text-amber-400',     label: 'Sharp right' },
  'U-turn':        { icon: RotateCcw,       color: 'text-red-400',       label: 'U-turn' },
  'arrive':        { icon: MapPin,          color: 'text-emerald-400',   label: 'Arrive' },
};

function formatDistance(meters) {
  if (meters < 1) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default memo(function TurnBanner({ instruction, nextInstruction, distanceToNext, arrived }) {
  if (arrived) {
    return (
      <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-20 w-[90vw] max-w-sm animate-fade-up">
        <div className="glass-card px-4 py-4 flex items-center gap-3 border-emerald-400/20 bg-emerald-900/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm">You have arrived!</p>
            <p className="font-body text-emerald-400/80 text-xs mt-0.5">You've reached your destination safely</p>
          </div>
        </div>
      </div>
    );
  }

  if (!instruction) return null;

  const config = DIRECTION_CONFIG[instruction.direction] || DIRECTION_CONFIG['straight'];
  const Icon = config.icon;
  const distText = formatDistance(distanceToNext ?? instruction.distance_m);
  const nextConfig = nextInstruction
    ? DIRECTION_CONFIG[nextInstruction.direction] || DIRECTION_CONFIG['straight']
    : null;
  const NextIcon = nextConfig?.icon;

  return (
    <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-20 w-[90vw] max-w-sm animate-fade-up">
      <div className="glass-card overflow-hidden">
        {/* Main turn instruction */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-sm truncate">{instruction.text}</p>
            {distText && (
              <p className="font-body text-slate-400 text-xs mt-0.5">
                {distText} ahead
              </p>
            )}
          </div>
          {distText && (
            <span className="font-mono text-pathlight-400 text-lg font-bold shrink-0">
              {distText}
            </span>
          )}
        </div>

        {/* Next turn preview */}
        {nextInstruction && NextIcon && (
          <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2 bg-white/[0.02]">
            <ChevronRight className="w-3 h-3 text-slate-500" />
            <span className="text-slate-500 text-[10px] font-body">Then</span>
            <NextIcon className={`w-3 h-3 ${nextConfig.color}`} />
            <span className="text-slate-400 text-xs font-body truncate">{nextInstruction.text}</span>
          </div>
        )}
      </div>
    </div>
  );
});

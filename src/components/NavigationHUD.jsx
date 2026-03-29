import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, CheckCircle2, MapPin, X, Shield, Zap, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { useCountUp } from '../hooks/useCountUp';

export function NavigationHUD({
  instruction,
  nextInstruction,
  distanceToNext,
  arrived,
  routeProps,
  gpsPosition,
  destination,
  onExit,
  isNight,
  speedKmh,
  remainingDistance,
  navStartTime,
  isRerouting
}) {
  const animatedDistance = useCountUp(distanceToNext || 0, 500);
  const [showArrival, setShowArrival] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);

  useEffect(() => {
    if (arrived) {
      setShowArrival(true);
    }
  }, [arrived]);

  const getIcon = (text) => {
    if (!text) return ArrowUp;
    const lower = text.toLowerCase();
    if (lower.includes('right')) return ArrowRight;
    if (lower.includes('left')) return ArrowLeft;
    if (lower.includes('arrive')) return CheckCircle2;
    return ArrowUp;
  };

  const Icon = getIcon(instruction);
  const isClose = distanceToNext < 100;
  const isMedium = distanceToNext >= 100 && distanceToNext <= 300;
  
  const iconColor = isClose ? 'text-[#FF4D4D]' : (isMedium ? 'text-[#FFB347]' : 'text-[#00E5CC]');
  const distColor = isClose ? 'text-[#FF4D4D] drop-shadow-[0_0_8px_rgba(255,77,77,0.5)]' : (isMedium ? 'text-[#FFB347]' : 'text-white');

  const ModeIcon = routeProps?.mode === 'Fastest' ? Zap : (routeProps?.mode === 'Safest' ? Shield : Scale);
  const modeColor = routeProps?.mode === 'Fastest' ? 'text-[#FFB347]' : (routeProps?.mode === 'Safest' ? 'text-[#C8FF57]' : 'text-[#00E5CC]');

  const speedColor = speedKmh > 80 ? 'text-[#FF4D4D]' : (speedKmh > 40 ? 'text-[#FFB347]' : 'text-white');

  // Calculate ETA and remaining time
  const remainingKm = remainingDistance ? remainingDistance / 1000 : 0;
  const currentSpeedForEta = Math.max(speedKmh || 15, 15); // Assume at least 15km/h for ETA
  const remainingHours = remainingKm / currentSpeedForEta;
  const remainingMins = Math.ceil(remainingHours * 60);
  
  const etaDate = new Date(Date.now() + remainingMins * 60000);
  const etaString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Mock upcoming turns
  const upcomingTurns = routeProps?.instructions?.slice(1, 4) || [];

  return (
    <>
      {/* REROUTING STRIP */}
      {isRerouting && (
        <div className="fixed top-0 left-0 right-0 z-40 h-1.5 bg-[#FFB347] animate-pulse"></div>
      )}

      {/* TOP STRIP */}
      <div 
        className="fixed top-0 left-0 right-0 z-30 pt-safe pb-4 px-4 md:px-8 flex flex-col animate-fade-down"
        style={{ 
          background: 'linear-gradient(180deg, rgba(8,12,20,0.97) 0%, rgba(8,12,20,0.85) 80%, transparent 100%)',
          animationDelay: '200ms'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              {isRerouting ? (
                <div className="w-7 h-7 border-4 border-[#FFB347] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Icon className={clsx("w-7 h-7 animate-bounce-in", iconColor)} key={instruction} />
              )}
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl md:text-2xl text-white">
                {isRerouting ? 'Rerouting...' : instruction}
              </h2>
              <p className="text-sm text-slate-400 font-medium">
                {isRerouting ? 'Finding new route' : 'onto unnamed road'}
              </p>
              {!isRerouting && nextInstruction && (
                <p className="text-xs text-slate-500 mt-1">Then: {nextInstruction}</p>
              )}
            </div>
          </div>
          {!isRerouting && (
            <div className="text-right">
              <div className={clsx("font-mono font-bold text-3xl md:text-4xl transition-colors duration-300", distColor)}>
                {animatedDistance.toFixed(0)}
              </div>
              <div className="text-lg text-slate-400 font-medium">m</div>
            </div>
          )}
        </div>

        {/* Expandable Panel Toggle */}
        <button 
          onClick={() => setShowUpcoming(!showUpcoming)}
          className="mx-auto mt-2 p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          {showUpcoming ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {/* Upcoming Turns Panel */}
        {showUpcoming && (
          <div className="mt-4 flex flex-col gap-3 bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Upcoming</h3>
            {upcomingTurns.map((turn, idx) => {
              const TurnIcon = getIcon(turn);
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <TurnIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{turn}</p>
                  </div>
                  <div className="text-sm font-mono text-slate-400">
                    {Math.floor(Math.random() * 500) + 100}m
                  </div>
                </div>
              );
            })}
            {upcomingTurns.length === 0 && (
              <p className="text-sm text-slate-400">No upcoming turns</p>
            )}
          </div>
        )}
      </div>

      {/* SPEED DISPLAY */}
      <div className="fixed bottom-32 left-5 z-30 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-[#080C14]/90 border border-white/10 backdrop-blur-md shadow-lg animate-fade-in">
        <span className={clsx("font-mono font-bold text-2xl leading-none", speedColor)}>{speedKmh || 0}</span>
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">km/h</span>
      </div>

      {/* BOTTOM BAR */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-30 pt-6 pb-safe pb-6 px-5 flex items-center justify-between animate-fade-up"
        style={{ 
          background: 'linear-gradient(0deg, rgba(8,12,20,0.97) 0%, rgba(8,12,20,0.85) 70%, transparent 100%)',
          animationDelay: '200ms'
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[#00E5CC]">{remainingMins} <span className="text-sm font-medium text-slate-400">min</span></span>
            <span className="text-lg font-medium text-white">{remainingKm.toFixed(1)} <span className="text-sm text-slate-400">km</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-medium">ETA {etaString}</span>
            <div className="w-1 h-1 rounded-full bg-slate-600"></div>
            <div className="flex items-center gap-1">
              <ModeIcon className={clsx("w-3 h-3", modeColor)} />
              <span className={clsx("text-xs font-bold", modeColor)}>{routeProps?.mode || 'Balanced'}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onExit}
          className="w-14 h-14 rounded-full bg-[#FF4D4D]/20 border border-[#FF4D4D]/30 flex items-center justify-center text-[#FF4D4D] hover:bg-[#FF4D4D] hover:text-white active:scale-95 transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* ARRIVAL OVERLAY */}
      {showArrival && (
        <div className="fixed inset-0 z-50 bg-[#080C14]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-scale-in">
          <div className="w-24 h-24 rounded-full bg-[#C8FF57]/20 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-[#C8FF57] animate-bounce-in" />
          </div>
          
          <h1 className="font-display font-bold text-3xl text-white mb-2">You have arrived!</h1>
          <p className="text-[#94A3B8] text-lg mb-8 text-center">{destination?.name}</p>

          <div className="glass-panel p-5 rounded-2xl w-full max-w-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white" />
                <span className="text-sm font-mono text-white">{(routeProps?.total_length_m / 1000).toFixed(1)} km</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00E5CC]" />
                <span className="text-sm font-mono text-white">{routeProps?.avg_lighting_score}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#C8FF57]" />
                <span className="text-sm font-mono text-white">{routeProps?.avg_crime_risk}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ModeIcon className={clsx("w-4 h-4", modeColor)} />
              {routeProps?.mode} route
            </div>
          </div>

          <button 
            onClick={() => {
              setShowArrival(false);
              onExit();
            }}
            className="w-full max-w-xs py-4 rounded-2xl bg-[#00E5CC] text-[#080C14] font-bold text-lg hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,229,204,0.3)]"
          >
            Done
          </button>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { useCountUp } from '../hooks/useCountUp';

export function TurnBanner({ instruction, distance, nextInstruction, isArrived }) {
  const [show, setShow] = useState(false);
  const animatedDistance = useCountUp(distance || 0, 500);

  useEffect(() => {
    if (instruction) setShow(true);
    else setShow(false);
  }, [instruction]);

  if (!show) return null;

  const getIcon = (text) => {
    if (!text) return ArrowUp;
    const lower = text.toLowerCase();
    if (lower.includes('right')) return ArrowRight;
    if (lower.includes('left')) return ArrowLeft;
    if (lower.includes('arrive')) return CheckCircle2;
    return ArrowUp;
  };

  const Icon = getIcon(instruction);
  const NextIcon = getIcon(nextInstruction);

  const isClose = distance < 50;
  const colorClass = isArrived ? 'text-[#C8FF57]' : (isClose ? 'text-[#FF4D4D]' : 'text-[#00E5CC]');

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-50 animate-fade-down">
      <div className={clsx(
        "glass-panel overflow-hidden transition-all duration-500 ease-spring",
        isArrived ? "bg-[#C8FF57]/10 border-[#C8FF57]/30 scale-105" : ""
      )}>
        <div className="p-4 md:p-6 flex items-center gap-4 md:gap-6">
          <div className={clsx(
            "w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10 transition-transform duration-500 ease-spring",
            colorClass
          )}>
            <Icon className={clsx("w-8 h-8 md:w-10 md:h-10", isArrived && "animate-bounce-in")} />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-xl md:text-2xl text-white truncate">
              {instruction}
            </h2>
            {!isArrived && (
              <p className="text-sm md:text-base text-[#94A3B8] font-medium mt-1">
                in <span className={clsx("font-mono font-bold", colorClass)}>{animatedDistance.toFixed(0)}m</span>
              </p>
            )}
          </div>

          {!isArrived && (
            <div className="hidden md:flex flex-col items-end shrink-0 pl-6 border-l border-white/10">
              <span className="text-xs font-mono text-[#475569] uppercase tracking-wider mb-1">Next</span>
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <NextIcon className="w-4 h-4" />
                <span className="text-sm font-medium truncate max-w-[120px]">{nextInstruction || 'Destination'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!isArrived && (
          <div className="h-1 w-full bg-white/5">
            <div 
              className={clsx("h-full transition-all duration-500 ease-out", colorClass.replace('text-', 'bg-'))}
              style={{ width: `${Math.max(0, 100 - (distance / 500) * 100)}%` }}
            ></div>
          </div>
        )}

        {/* Confetti (CSS only) */}
        {isArrived && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[#C8FF57] animate-fade-up"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 500}ms`,
                  animationDuration: `${1000 + Math.random() * 1000}ms`
                }}
              ></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

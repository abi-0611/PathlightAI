import React, { useEffect, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import clsx from 'clsx';

export function StatCard({ title, value, unit, icon: Icon, colorClass, max = 10, isPercentage = false }) {
  const animatedValue = useCountUp(value, 1200);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    // Delay fill animation slightly for effect
    const timer = setTimeout(() => {
      setFill(isPercentage ? value : (value / max) * 100);
    }, 100);
    return () => clearTimeout(timer);
  }, [value, max, isPercentage]);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fill / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3 glass rounded-xl relative overflow-hidden group">
      <div className={clsx("absolute inset-0 opacity-5 transition-opacity duration-300 group-hover:opacity-10", colorClass.replace('text-', 'bg-'))}></div>
      
      <div className="relative w-12 h-12 mb-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24" cy="24" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          <circle
            cx="24" cy="24" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={clsx("transition-all duration-1000 ease-out", colorClass)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={clsx("w-5 h-5", colorClass)} />
        </div>
      </div>

      <div className="text-center">
        <div className="font-mono text-xl font-medium text-white tracking-tight">
          {animatedValue.toFixed(isPercentage ? 0 : 1)}
          <span className="text-xs text-[#94A3B8] ml-0.5">{unit}</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold mt-0.5">
          {title}
        </div>
      </div>
    </div>
  );
}

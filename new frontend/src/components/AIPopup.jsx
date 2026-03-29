import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Zap, Clock } from 'lucide-react';
import { StatCard } from './StatCard';
import clsx from 'clsx';

export function AIPopup({ route, isNight }) {
  if (!route) return null;

  const [text, setText] = useState('');
  const fullText = `This route prioritizes well-lit main roads while avoiding known high-risk areas. Expect a slightly longer journey for maximum safety.`;

  useEffect(() => {
    setText('');
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.substring(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [route]);

  return (
    <div className="absolute top-24 right-6 w-80 glass-panel p-5 animate-fade-left z-40 hidden lg:block">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5CC]/20 to-transparent flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(0,229,204,0.4)_360deg)] animate-gradient-rotate"></div>
          <Sparkles className="w-5 h-5 text-[#00E5CC] relative z-10 animate-pulse" />
        </div>
        <div>
          <h3 className="font-display font-bold text-white text-lg leading-tight">PathLight Insights</h3>
          <p className="text-xs text-[#00E5CC] font-mono tracking-wider uppercase">AI Safety Analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard 
          title="Safety" 
          value={route.avg_crime_risk} 
          unit="/10" 
          icon={Shield} 
          colorClass="text-[#C8FF57]" 
          max={10} 
        />
        <StatCard 
          title="Lighting" 
          value={route.avg_lighting_score} 
          unit="/10" 
          icon={Zap} 
          colorClass="text-[#00E5CC]" 
          max={10} 
        />
        <StatCard 
          title="Time" 
          value={Math.round(route.total_length_m / 80)} // Rough estimate
          unit="m" 
          icon={Clock} 
          colorClass="text-[#FFB347]" 
          max={60} 
        />
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00E5CC]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <p className="text-sm text-[#94A3B8] leading-relaxed font-medium relative z-10">
          {text}
          <span className="inline-block w-1.5 h-4 bg-[#00E5CC] ml-1 animate-pulse align-middle"></span>
        </p>
      </div>

      {isNight && (
        <div className="mt-4 flex items-center justify-center gap-2 py-2 bg-[#162440]/50 rounded-lg border border-[#00E5CC]/20 animate-fade-up">
          <Moon className="w-4 h-4 text-[#00E5CC] animate-breathe" />
          <span className="text-xs font-mono text-[#00E5CC] tracking-widest uppercase">Lighting × 3</span>
        </div>
      )}
    </div>
  );
}

// Simple Moon icon since it's not imported above
function Moon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  );
}

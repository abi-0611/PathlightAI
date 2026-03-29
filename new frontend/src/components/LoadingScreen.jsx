import React, { useEffect, useState } from 'react';

export function LoadingScreen({ onDismiss }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing systems...');

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(onDismiss, 500);
          return 100;
        }
        return p + Math.random() * 15;
      });
    }, 200);

    const statuses = [
      'Loading map tiles...',
      'Connecting to PathLight AI...',
      'Calibrating safety models...',
      'Ready.'
    ];
    let statusIndex = 0;
    const statusTimer = setInterval(() => {
      statusIndex++;
      if (statusIndex < statuses.length) setStatus(statuses[statusIndex]);
    }, 800);

    return () => {
      clearInterval(timer);
      clearInterval(statusTimer);
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080C14] text-white overflow-hidden animate-fade-down" style={{ animationDuration: '0.5s', animationDirection: 'reverse', animationFillMode: 'forwards' }}>
      <div className="absolute inset-0 bg-grid-dots opacity-30 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(0,229,204,0.1)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center">
        <h1 className="font-display text-5xl font-extrabold tracking-tighter mb-8 flex">
          {'PathLight'.split('').map((char, i) => (
            <span key={i} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}>
              {char}
            </span>
          ))}
          <span className="text-[#00E5CC] ml-2 animate-ping-slow relative">
            AI
            <span className="absolute inset-0 text-[#00E5CC] blur-md opacity-50">AI</span>
          </span>
        </h1>

        <div className="w-64 h-0.5 bg-white/10 rounded-full overflow-hidden relative mb-4">
          <div 
            className="absolute top-0 left-0 h-full bg-[#00E5CC] shadow-[0_0_10px_#00E5CC] transition-all duration-200 ease-out"
            style={{ width: `${Math.min(100, progress)}%` }}
          ></div>
          <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-[#00E5CC] to-transparent animate-scan"></div>
        </div>

        <p className="font-mono text-xs text-[#94A3B8] animate-type-in overflow-hidden whitespace-nowrap">
          {status}
        </p>
      </div>
    </div>
  );
}

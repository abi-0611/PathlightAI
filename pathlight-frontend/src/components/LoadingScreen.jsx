import { memo } from 'react';

export default memo(function LoadingScreen({ progress, message }) {
  const isExiting = progress >= 100;

  return (
    <div
      className={`fixed inset-0 z-50 bg-obsidian-950 flex flex-col items-center justify-center
                  transition-all duration-600 ease-out
                  ${isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-64 h-64 rounded-full bg-pathlight-500/5 blur-3xl pointer-events-none" />

      {/* Logo animation */}
      <div className="flex items-center gap-1.5 mb-12">
        {'PathLight'.split('').map((char, i) => (
          <span
            key={i}
            className="font-display font-bold text-4xl text-white"
            style={{
              animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
              animationDelay: `${i * 0.05}s`,
              opacity: 0,
            }}
          >
            {char}
          </span>
        ))}
        <span
          className="font-display font-bold text-4xl text-pathlight-400 ml-1"
          style={{ animation: 'fadeUp 0.5s ease forwards', animationDelay: '0.5s', opacity: 0 }}
        >
          AI
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-0.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-pathlight-600 to-pathlight-400 rounded-full
                     transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status message */}
      <p className="font-body text-slate-500 text-xs mt-4 h-4 transition-all duration-300">
        {message}
      </p>
    </div>
  );
});

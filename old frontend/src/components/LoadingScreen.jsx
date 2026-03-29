import { memo } from 'react';

export default memo(function LoadingScreen({ progress, message }) {
  const isExiting = progress >= 100;

  return (
    <div
      className="fixed inset-0 z-50 grid-dots flex flex-col items-center justify-center"
      style={{
        background: 'var(--c-base)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(1.04)' : 'scale(1)',
        pointerEvents: isExiting ? 'none' : 'auto',
      }}
    >
      {/* Radial ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(0,229,204,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Logo — characters animate in one by one */}
      <div className="flex items-end gap-0.5 mb-3 relative z-10">
        {'PathLight'.split('').map((char, i) => (
          <span
            key={i}
            className="font-display text-5xl text-white"
            style={{
              fontWeight: 800,
              animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
              animationDelay: `${i * 0.05}s`,
              opacity: 0,
            }}
          >
            {char}
          </span>
        ))}
        <span
          className="font-display text-5xl ml-1.5"
          style={{
            fontWeight: 800,
            color: 'var(--c-teal)',
            animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards, breathe 3s ease-in-out 1s infinite',
            animationDelay: '0.5s, 1s',
            opacity: 0,
            textShadow: '0 0 24px var(--c-teal)',
          }}
        >
          AI
        </span>
      </div>

      {/* Scanning line */}
      <div className="relative w-full max-w-xs h-0.5 my-8 overflow-hidden z-10">
        <div
          className="absolute top-0 left-0 h-full w-full opacity-40"
          style={{
            background: 'var(--c-teal)',
            boxShadow: '0 0 12px var(--c-teal)',
            animation: 'scanLine 1.8s linear infinite',
          }}
        />
      </div>

      {/* Progress bar */}
      <div
        className="w-full max-w-xs rounded-full overflow-hidden z-10"
        style={{ height: 2, background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--c-teal) 0%, #00ffee 100%)',
            boxShadow: '0 0 8px var(--c-teal)',
            transition: 'width 500ms ease-out',
          }}
        />
      </div>

      {/* Status message — fixed height prevents layout shift */}
      <div className="h-5 mt-4 flex items-center z-10">
        <p
          key={message}
          className="font-mono text-xs"
          style={{
            color: 'var(--c-text-3)',
            animation: 'typeIn 0.6s steps(20) forwards',
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
});

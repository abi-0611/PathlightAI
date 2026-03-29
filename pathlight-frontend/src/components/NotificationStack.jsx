import { memo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const TYPE_CONFIG = {
  error:   { Icon: AlertCircle,   color: 'var(--c-red)',   border: '#FF4D4D' },
  warning: { Icon: AlertTriangle, color: 'var(--c-amber)',  border: '#FFB347' },
  success: { Icon: CheckCircle,   color: '#22c55e',        border: '#22c55e' },
  info:    { Icon: Info,          color: 'var(--c-teal)',  border: 'var(--c-teal)' },
};

const NotifCard = memo(function NotifCard({ notif, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
  const Icon = cfg.Icon;

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => onDismiss(notif.id), 300);
  };

  return (
    <div
      className="glass relative overflow-hidden cursor-pointer select-none"
      style={{
        minWidth: 280,
        maxWidth: 360,
        animation: dismissed
          ? 'fadeDown 0.3s ease-out forwards'
          : 'fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        opacity: 0,
      }}
      onClick={handleDismiss}
    >
      {/* Left type border strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: cfg.border }}
      />

      {/* Content */}
      <div className="flex items-center gap-3 px-4 py-3 pl-5">
        <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
        <p className="font-body text-sm text-white/90 flex-1 leading-snug">
          {notif.message}
        </p>
        <button
          className="ml-1 shrink-0 rounded-md p-0.5 hover:bg-white/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>

      {/* Progress drain bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-100"
        style={{
          width: `${(1 - notif.progress) * 100}%`,
          background: cfg.border,
          opacity: 0.7,
        }}
      />
    </div>
  );
});

export default memo(function NotificationStack({ notifications, onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-2 items-center">
      {notifications.slice(0, 3).map((notif) => (
        <NotifCard key={notif.id} notif={notif} onDismiss={onDismiss} />
      ))}
    </div>
  );
});

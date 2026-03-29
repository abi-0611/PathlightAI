import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import clsx from 'clsx';

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info
};

const colors = {
  success: 'text-[#C8FF57] border-[#C8FF57]/30 bg-[#C8FF57]/10',
  warning: 'text-[#FFB347] border-[#FFB347]/30 bg-[#FFB347]/10',
  error: 'text-[#FF4D4D] border-[#FF4D4D]/30 bg-[#FF4D4D]/10',
  info: 'text-[#00E5CC] border-[#00E5CC]/30 bg-[#00E5CC]/10'
};

export function NotificationStack({ notifications, onDismiss }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map((n, i) => {
        const Icon = icons[n.type];
        const colorClass = colors[n.type];

        return (
          <div
            key={n.id}
            className={clsx(
              "glass px-4 py-3 flex items-center gap-3 min-w-[300px] pointer-events-auto animate-fade-up border-l-4",
              colorClass.split(' ')[1] // Get border color
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", colorClass.split(' ')[2])}>
              <Icon className={clsx("w-4 h-4", colorClass.split(' ')[0])} />
            </div>
            
            <p className="text-sm font-medium text-white flex-1">{n.message}</p>
            
            <button
              onClick={() => onDismiss(n.id)}
              className="p-1 hover:bg-white/10 rounded-full text-[#94A3B8] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress bar */}
            {n.duration > 0 && (
              <div className="absolute bottom-0 left-0 h-0.5 bg-white/10 w-full">
                <div 
                  className={clsx("h-full transition-all ease-linear", colorClass.split(' ')[0].replace('text-', 'bg-'))}
                  style={{ 
                    width: '0%', 
                    transitionDuration: `${n.duration}ms` 
                  }}
                  ref={el => {
                    if (el) {
                      // Trigger reflow to start animation
                      void el.offsetWidth;
                      el.style.width = '100%';
                    }
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

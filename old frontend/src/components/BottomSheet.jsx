import { memo } from 'react';
import { X } from 'lucide-react';

export default memo(function BottomSheet({
  isOpen,
  onClose,
  dragY = 0,
  isDragging = false,
  touchHandlers = {},
  children,
  title,
  maxHeightClass = 'max-h-[65vh]',
}) {
  const translateY = isOpen ? dragY : '100%';

  return (
    <>
      {/* Backdrop */}
      <div
        className="sm:hidden fixed inset-0 z-20 bg-black/40 backdrop-blur-sm"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 rounded-t-3xl"
        style={{
          background: 'rgba(8, 12, 20, 0.92)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderTop: '1px solid var(--c-border)',
          transform: typeof translateY === 'number'
            ? `translateY(${translateY}px)`
            : `translateY(${translateY})`,
          transition: isDragging ? 'none' : 'transform 0.4s var(--ease-spring)',
        }}
      >
        {/* Drag handle area */}
        <div
          className="cursor-grab active:cursor-grabbing px-4 pt-1 pb-2"
          {...touchHandlers}
        >
          <div className="w-10 h-1 rounded-full mx-auto mt-2 mb-1" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Header */}
        {title && (
          <>
            <div className="flex items-center justify-between px-4 pb-3">
              <h2 className="font-display font-bold text-sm text-white">{title}</h2>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" style={{ color: 'var(--c-text-3)' }} />
              </button>
            </div>
            <div className="h-px mx-4 mb-2" style={{ background: 'var(--c-border)' }} />
          </>
        )}

        {/* Content */}
        <div className={`overflow-y-auto px-4 pb-6 ${maxHeightClass}`}>
          {children}
        </div>
      </div>
    </>
  );
});

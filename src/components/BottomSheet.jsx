import React, { useEffect, useRef } from 'react';
import { useBottomSheet } from '../hooks/useBottomSheet';
import clsx from 'clsx';

export function BottomSheet({ isOpen, onClose, children, title = '' }) {
  const { translateY, sheetRef } = useBottomSheet(isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#080C14]/60 backdrop-blur-sm transition-opacity duration-500 animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Sheet */}
      <div 
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 h-[65vh] glass-panel rounded-t-3xl border-b-0 flex flex-col animate-slide-up shadow-[0_-16px_64px_rgba(0,0,0,0.5)]"
        style={{ transform: `translateY(${Math.max(0, translateY)}px)` }}
      >
        {/* Drag Handle */}
        <div className="w-full h-8 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0">
          <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>

        {title && (
          <div className="px-6 pb-4 border-b border-white/5">
            <h2 className="font-display font-bold text-xl text-white">{title}</h2>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

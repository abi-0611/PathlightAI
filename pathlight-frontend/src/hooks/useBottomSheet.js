import { useState, useRef, useCallback } from 'react';

/**
 * Mobile bottom sheet drag hook.
 *
 * @param {boolean} defaultOpen - initial open state (default false)
 * @returns {{
 *   isOpen: boolean,
 *   dragY: number,
 *   isDragging: boolean,
 *   open: () => void,
 *   close: () => void,
 *   touchHandlers: { onTouchStart, onTouchMove, onTouchEnd }
 * }}
 */
export function useBottomSheet(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setDragY(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setDragY(0);
    setIsDragging(false);
  }, []);

  const onTouchStart = useCallback((e) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    // Only allow downward drag, capped at 200px
    const clamped = Math.max(0, Math.min(delta, 200));
    setDragY(clamped);
  }, []);

  const onTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragY > 80) {
      close();
    } else {
      setDragY(0);
    }
    startYRef.current = null;
  }, [dragY, close]);

  return {
    isOpen,
    dragY,
    isDragging,
    open,
    close,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}

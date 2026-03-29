import { useState, useCallback, useRef, useEffect } from 'react';

export function useBottomSheet(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [translateY, setTranslateY] = useState(0);
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isOpen) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0) {
      setTranslateY(diff);
    }
  }, [isOpen]);

  const handleTouchEnd = useCallback(() => {
    if (!isOpen) return;
    const diff = currentY.current - startY.current;
    if (diff > 100) {
      setIsOpen(false);
    }
    setTranslateY(0);
  }, [isOpen]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.addEventListener('touchstart', handleTouchStart);
      sheet.addEventListener('touchmove', handleTouchMove);
      sheet.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      if (sheet) {
        sheet.removeEventListener('touchstart', handleTouchStart);
        sheet.removeEventListener('touchmove', handleTouchMove);
        sheet.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isOpen, setIsOpen, translateY, sheetRef };
}

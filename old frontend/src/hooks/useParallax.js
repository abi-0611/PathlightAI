import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Listens to document mousemove and updates CSS custom properties
 * --px / --py on document.documentElement for parallax panel movement.
 *
 * @param {number} intensity - movement strength (default 5)
 * @returns {{ xRatio: number, yRatio: number }}
 */
export function useParallax(intensity = 5) {
  const [ratios, setRatios] = useState({ xRatio: 0, yRatio: 0 });
  const rafRef = useRef(null);
  const latestRef = useRef({ xRatio: 0, yRatio: 0 });

  const handleMove = useCallback((e) => {
    const xRatio = e.clientX / window.innerWidth - 0.5;
    const yRatio = e.clientY / window.innerHeight - 0.5;
    latestRef.current = { xRatio, yRatio };

    if (rafRef.current) return; // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const { xRatio: x, yRatio: y } = latestRef.current;
      // Halve intensity on mobile
      const eff = window.innerWidth < 768 ? intensity * 0.5 : intensity;
      document.documentElement.style.setProperty('--px', `${x * -eff}px`);
      document.documentElement.style.setProperty('--py', `${y * -(eff * 0.6)}px`);
      setRatios({ xRatio: x, yRatio: y });
    });
  }, [intensity]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', handleMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [handleMove]);

  return ratios;
}

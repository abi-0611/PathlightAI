import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to `target` using cubic ease-out.
 *
 * @param {number} target    - the destination value to animate to
 * @param {number} duration  - animation duration in ms (default 900)
 * @param {boolean} enabled  - if false, returns `target` immediately (default true)
 * @returns {number} current animated value
 */
export function useCountUp(target, duration = 900, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : (target ?? 0));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!enabled || target == null) {
      setValue(target ?? 0);
      return;
    }

    // Cancel any running animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    let startTs = null;

    function step(ts) {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    }

    // Reset to 0 before animating on each target change
    setValue(0);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, duration, enabled]);

  return value;
}

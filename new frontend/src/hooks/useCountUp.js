import { useState, useEffect } from 'react';

export function useCountUp(target, duration = 900) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endValue = parseFloat(target);
    if (isNaN(endValue)) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setCount(easeOut * endValue);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

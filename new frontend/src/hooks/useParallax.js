import { useEffect } from 'react';

export function useParallax(intensity = 1) {
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Calculate mouse position relative to center of screen (-1 to 1)
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      
      // Update CSS variables
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--px', `${-x * 5 * intensity}px`);
        document.documentElement.style.setProperty('--py', `${-y * 5 * intensity}px`);
      });
    };

    // Only apply on desktop
    if (window.innerWidth >= 1024) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [intensity]);
}

// src/AnimatedGradient.tsx

import { useEffect, useRef } from 'react';

export const AnimatedGradient = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Only run once
    if (initialized.current) return;
    
    // Wait a tick for canvas to be in DOM, then initialize
    // This mirrors the Bootstrap approach where script runs right after canvas
    setTimeout(() => {
      if (window.Gradient && canvasRef.current) {
        try {
          const gradient = new window.Gradient();
          gradient.initGradient('.gradient-canvas');
          initialized.current = true;
          console.log('Gradient initialized successfully');
        } catch (error) {
          console.error('Failed to initialize gradient:', error);
        }
      } else {
        console.error('Gradient not available. Check if animated-gradient.js loaded.');
      }
    }, 0);
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="gradient-canvas" 
      style={{ height: '100%', width: '100%' }}
    />
  );
};

// Extend window type
declare global {
  interface Window {
    Gradient: any;
  }
}
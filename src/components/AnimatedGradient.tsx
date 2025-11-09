// src/AnimatedGradient.tsx

import { useEffect, useRef } from 'react';

// Extend Window interface to include Gradient
declare global {
  interface Window {
    Gradient?: any;
  }
}

interface AnimatedGradientProps {
  className?: string;
}

export const AnimatedGradient: React.FC<AnimatedGradientProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientRef = useRef<any>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Function to check if Gradient is available and initialize
    const initGradient = () => {
      // Prevent multiple initializations
      if (hasInitialized.current) return;
      
      // Check if Gradient class is available
      if (typeof window.Gradient !== 'undefined' && canvasRef.current) {
        try {
          // Create and initialize gradient
          gradientRef.current = new window.Gradient();
          gradientRef.current.initGradient('#gradient-canvas');
          hasInitialized.current = true;
        } catch (error) {
          console.error('Error initializing gradient:', error);
        }
      } else {
        // If Gradient not available yet, try again shortly
        setTimeout(initGradient, 100);
      }
    };

    // Start initialization
    initGradient();

    // Cleanup function
    return () => {
      if (gradientRef.current && typeof gradientRef.current.pause === 'function') {
        try {
          gradientRef.current.pause();
        } catch (error) {
          console.error('Error pausing gradient:', error);
        }
      }
      hasInitialized.current = false;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="gradient-canvas"
      className={`gradient-canvas ${className}`}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
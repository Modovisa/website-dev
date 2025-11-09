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

  useEffect(() => {
    // Load the gradient script dynamically if not already loaded
    const loadGradientScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if script already exists
        if (document.getElementById('gradient-script')) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.id = 'gradient-script';
        script.src = '/animated-gradient.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load gradient script'));
        document.head.appendChild(script);
      });
    };

    // Initialize gradient once script is loaded
    const initGradient = async () => {
      try {
        await loadGradientScript();
        
        // Wait for Gradient class to be available
        if (window.Gradient && canvasRef.current && !gradientRef.current) {
          gradientRef.current = new window.Gradient();
          gradientRef.current.initGradient('#gradient-canvas');
        }
      } catch (error) {
        console.error('Error initializing gradient:', error);
      }
    };

    initGradient();

    // Cleanup function
    return () => {
      if (gradientRef.current && gradientRef.current.pause) {
        gradientRef.current.pause();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="gradient-canvas"
      className={`gradient-canvas ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        // CSS variables for gradient colors (same as Bootstrap version)
        ['--gradient-color-1' as any]: '#a960ee',
        ['--gradient-color-2' as any]: '#ff333d',
        ['--gradient-color-3' as any]: '#90e0ff',
        ['--gradient-color-4' as any]: '#ffcb57',
      }}
    />
  );
};
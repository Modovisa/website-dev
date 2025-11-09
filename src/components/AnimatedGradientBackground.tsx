// src/components/AnimatedGradientBackground.tsx

import { useEffect, useRef } from "react";

interface AnimatedGradientBackgroundProps {
  children: React.ReactNode;
  layout?: "full" | "split-half" | "split-3-5"; // full page, half page, or 3/5 page
  contentSide?: "left" | "right" | "center"; // which side for content
}

// TypeScript declaration for Gradient
declare global {
  interface Window {
    Gradient: any;
  }
}

export const AnimatedGradientBackground = ({
  children,
  layout = "full",
  contentSide = "center",
}: AnimatedGradientBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientInitialized = useRef(false);

  // Initialize gradient - same as homepage
  useEffect(() => {
    if (gradientInitialized.current) return;

    const initGradient = () => {
      if (typeof window.Gradient !== "undefined" && canvasRef.current) {
        try {
          const gradient = new window.Gradient();
          gradient.initGradient(".gradient-canvas");
          gradientInitialized.current = true;
          console.log("✅ Gradient initialized on auth page");
        } catch (error) {
          console.error("❌ Gradient init error:", error);
        }
      } else {
        setTimeout(initGradient, 100);
      }
    };

    initGradient();
  }, []);

  // Determine container classes based on layout
  const getContainerClasses = () => {
    if (layout === "full") {
      return "min-h-screen";
    }
    // For split layouts, we'll use grid
    return "min-h-screen grid grid-cols-1 md:grid-cols-2";
  };

  const getContentClasses = () => {
    if (layout === "full") {
      return "relative z-10 flex items-center justify-center p-4 min-h-screen";
    }

    // Split layouts
    const baseClasses = "relative z-10 flex items-center justify-center p-4";
    
    if (layout === "split-3-5") {
      // 3/5 split: content takes 3 columns, gradient takes 2
      return contentSide === "left"
        ? `${baseClasses} md:col-span-3`
        : `${baseClasses} md:col-span-3 md:order-2`;
    }

    // split-half: 50/50
    return baseClasses;
  };

  const getGradientAreaClasses = () => {
    if (layout === "full") {
      return "absolute inset-0";
    }

    // Split layouts - gradient only shows on one side
    const baseClasses = "relative min-h-screen";
    
    if (layout === "split-3-5") {
      // Gradient takes 2 columns
      return contentSide === "left"
        ? `${baseClasses} md:col-span-2 hidden md:block`
        : `${baseClasses} md:col-span-2 md:order-1 hidden md:block`;
    }

    // split-half
    return `${baseClasses} hidden md:block`;
  };

  if (layout === "full") {
    // Full page gradient background
    return (
      <div className={getContainerClasses()}>
        {/* Animated gradient canvas - full page */}
        <div className={getGradientAreaClasses()}>
          <canvas
            ref={canvasRef}
            className="gradient-canvas"
            style={{ height: "100%", width: "100%" }}
          />
        </div>

        {/* Content overlay */}
        <div className={getContentClasses()}>{children}</div>
      </div>
    );
  }

  // Split layouts (half or 3/5)
  return (
    <div className={getContainerClasses()}>
      {contentSide === "left" ? (
        <>
          {/* Content on left */}
          <div className={getContentClasses()}>{children}</div>
          
          {/* Gradient on right */}
          <div className={getGradientAreaClasses()}>
            <canvas
              ref={canvasRef}
              className="gradient-canvas"
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </>
      ) : (
        <>
          {/* Gradient on left */}
          <div className={getGradientAreaClasses()}>
            <canvas
              ref={canvasRef}
              className="gradient-canvas"
              style={{ height: "100%", width: "100%" }}
            />
          </div>
          
          {/* Content on right */}
          <div className={getContentClasses()}>{children}</div>
        </>
      )}
    </div>
  );
};
// src/pages/NotFound.tsx

import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <AnimatedGradientBackground layout="full">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="glass-card w-full max-w-lg rounded-3xl border border-white/20 bg-white/10 p-10 text-center shadow-2xl backdrop-blur-xl">
          <h1 className="mb-3 text-6xl font-bold text-black drop-shadow-sm">
            404
          </h1>
          <p className="mb-2 text-xl font-semibold text-black/90">
            Page not found
          </p>
          <p className="mb-6 text-sm text-black/70">
            The page{" "}
            <span className="font-mono break-all">{location.pathname}</span>{" "}
            doesn&apos;t exist or may have moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-medium text-primary shadow-md transition hover:bg-white/90"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </AnimatedGradientBackground>
  );
};

export default NotFound;

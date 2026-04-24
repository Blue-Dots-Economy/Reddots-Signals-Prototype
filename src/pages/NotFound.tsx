import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const YELLOW = "#DC143C";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(${YELLOW} 1px, transparent 1px)`,
        backgroundSize: '32px 32px'
      }} />

      <div className="text-center animate-fade-in px-6 relative z-10">
        <div
          className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-6 animate-float"
          style={{ background: `${YELLOW}15` }}
        >
          <span className="text-4xl font-extrabold" style={{ color: YELLOW }}>
            ?
          </span>
        </div>
        <h1 className="text-7xl font-extrabold text-foreground tracking-tight">
          4<span style={{ color: YELLOW, textShadow: `0 0 40px ${YELLOW}40` }}>0</span>4
        </h1>
        <p className="mt-4 text-lg text-muted-foreground font-medium">
          This page doesn't exist
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg active:scale-95"
          style={{ background: `linear-gradient(135deg, ${YELLOW}, #9F0E2E)`, boxShadow: `0 4px 14px rgba(220,20,60,0.3)` }}
        >
          ← Back to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;

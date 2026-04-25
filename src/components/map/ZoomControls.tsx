import { Plus, Minus, LocateFixed } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls = ({ onZoomIn, onZoomOut, onReset }: Props) => {
  const isMobile = useIsMobile();

  // Position above nav island (nav is at bottom: safe + 1rem, ~52px tall).
  // We need: safe + 1rem (nav offset) + nav-height + breathing room (~16px).
  const bottomOffset = "calc(env(safe-area-inset-bottom) + 1rem + 52px + 16px)";

  return (
    <div
      className="fixed right-3 sm:right-4 z-[1050] flex flex-col gap-2 animate-fade-in"
      style={{ bottom: bottomOffset }}
    >
      {/* Hide +/- on mobile — pinch-to-zoom is natural there */}
      {!isMobile && (
        <div className="flex flex-col rounded-xl overflow-hidden shadow-lg border border-border glass">
          <button
            onClick={onZoomIn}
            className="tap-44 bg-card/80 hover:bg-secondary text-foreground flex items-center justify-center transition-all duration-200 active:bg-muted active:scale-95"
            aria-label="Zoom in"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={onZoomOut}
            className="tap-44 bg-card/80 hover:bg-secondary text-foreground flex items-center justify-center transition-all duration-200 active:bg-muted active:scale-95"
            aria-label="Zoom out"
          >
            <Minus size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}
      {/* Re-center button */}
      <button
        onClick={onReset}
        className="tap-44 glass text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-200 active:scale-90 shadow-lg rounded-full"
        aria-label="Reset view"
      >
        <LocateFixed size={isMobile ? 20 : 18} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default ZoomControls;

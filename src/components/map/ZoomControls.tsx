import { Plus, Minus, LocateFixed } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls = ({ onZoomIn, onZoomOut, onReset }: Props) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {/* Hide +/- on mobile — pinch-to-zoom is natural there (Google Maps style) */}
      {!isMobile && (
        <div className="flex flex-col rounded-xl overflow-hidden shadow-lg border border-border glass">
          <button
            onClick={onZoomIn}
            className="bg-card/80 hover:bg-secondary text-foreground w-10 h-10 flex items-center justify-center transition-all duration-200 active:bg-muted active:scale-95"
            aria-label="Zoom in"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={onZoomOut}
            className="bg-card/80 hover:bg-secondary text-foreground w-10 h-10 flex items-center justify-center transition-all duration-200 active:bg-muted active:scale-95"
            aria-label="Zoom out"
          >
            <Minus size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}
      {/* Re-center button */}
      <button
        onClick={onReset}
        className={`glass text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-200 active:scale-90 shadow-lg ${
          isMobile
            ? "w-11 h-11 rounded-full"
            : "w-10 h-10 rounded-xl mt-0.5"
        }`}
        aria-label="Reset view"
      >
        <LocateFixed size={isMobile ? 20 : 18} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default ZoomControls;

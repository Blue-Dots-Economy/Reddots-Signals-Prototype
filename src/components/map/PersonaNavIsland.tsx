import { Cross, AlertTriangle, Map as MapIcon, List } from "lucide-react";
import type { RedDotsView } from "@/lib/phoneAuth";

export type ViewMode = "map" | "list";

const RED = "#DC143C";
const GREY = "#4A4A4A";

interface Props {
  activeView: RedDotsView;
  onSwitchView: (view: RedDotsView) => void;
  viewMode: ViewMode;
  onSwitchMode: (mode: ViewMode) => void;
}

const PersonaNavIsland = ({ activeView, onSwitchView, viewMode, onSwitchMode }: Props) => {
  const accent = activeView === "services" ? RED : GREY;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[1100] floating-nav flex items-center gap-1 max-w-[92vw]"
      style={{ bottom: `calc(env(safe-area-inset-bottom) + 1rem)`, touchAction: "manipulation" }}
    >
      {/* Services tab */}
      <button
        onClick={() => onSwitchView("services")}
        aria-label="Services"
        className="tap-44 rounded-full px-3 sm:px-4 lg:px-5 text-[14px] sm:text-[15px] lg:text-[15px] font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
        style={
          activeView === "services"
            ? { background: RED, color: "white", boxShadow: "0 2px 8px rgba(220,20,60,0.35)" }
            : { background: "transparent", color: "hsl(var(--muted-foreground))" }
        }
      >
        <Cross size={16} strokeWidth={2.4} />
        <span>Services</span>
      </button>

      {/* Accidents tab */}
      <button
        onClick={() => onSwitchView("accidents")}
        aria-label="Accidents"
        className="tap-44 rounded-full px-3 sm:px-4 lg:px-5 text-[14px] sm:text-[15px] lg:text-[15px] font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
        style={
          activeView === "accidents"
            ? { background: GREY, color: "white", boxShadow: "0 2px 8px rgba(74,74,74,0.35)" }
            : { background: "transparent", color: "hsl(var(--muted-foreground))" }
        }
      >
        <AlertTriangle size={16} strokeWidth={2.4} />
        <span>Accidents</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-border/60 mx-0.5" aria-hidden />

      {/* Map / List sub-toggle (icon-only) */}
      <button
        onClick={() => onSwitchMode("map")}
        aria-label="Map view"
        className="tap-44 rounded-full transition-all duration-200 flex items-center justify-center"
        style={
          viewMode === "map"
            ? { background: `${accent}1F`, color: accent }
            : { background: "transparent", color: "hsl(var(--muted-foreground))" }
        }
      >
        <MapIcon size={16} strokeWidth={2.4} />
      </button>
      <button
        onClick={() => onSwitchMode("list")}
        aria-label="List view"
        className="tap-44 rounded-full transition-all duration-200 flex items-center justify-center"
        style={
          viewMode === "list"
            ? { background: `${accent}1F`, color: accent }
            : { background: "transparent", color: "hsl(var(--muted-foreground))" }
        }
      >
        <List size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
};

export default PersonaNavIsland;

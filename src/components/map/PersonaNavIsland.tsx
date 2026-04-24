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
      className="fixed left-1/2 -translate-x-1/2 z-[1100] floating-nav flex items-center gap-1"
      style={{ bottom: `calc(env(safe-area-inset-bottom) + 1rem)` }}
    >
      {/* Services tab */}
      <button
        onClick={() => onSwitchView("services")}
        aria-label="Services"
        className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 min-h-[40px]"
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
        className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 min-h-[40px]"
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
      <div className="w-px h-5 bg-border/60 mx-0.5" />

      {/* Map / List sub-toggle (icon-only) */}
      <button
        onClick={() => onSwitchMode("map")}
        aria-label="Map view"
        className="rounded-full p-2 transition-all duration-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
        style={
          viewMode === "map"
            ? { background: `${accent}1F`, color: accent }
            : { background: "transparent", color: "hsl(var(--muted-foreground))" }
        }
      >
        <MapIcon size={15} strokeWidth={2.4} />
      </button>
      <button
        onClick={() => onSwitchMode("list")}
        aria-label="List view"
        className="rounded-full p-2 transition-all duration-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
        style={
          viewMode === "list"
            ? { background: `${accent}1F`, color: accent }
            : { background: "transparent", color: "hsl(var(--muted-foreground))" }
        }
      >
        <List size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
};

export default PersonaNavIsland;

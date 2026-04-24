import { Map, List, Link } from "lucide-react";

export type PersonaView = "map" | "list" | "connections";

const BLUE = "#DC143C";

interface Props {
  activeView: PersonaView;
  onSwitchView: (view: PersonaView) => void;
  connectionCount?: number;
}

const tabs: { key: PersonaView; label: string; icon: typeof Map }[] = [
  { key: "map", label: "Map", icon: Map },
  { key: "list", label: "List", icon: List },
  { key: "connections", label: "Connections", icon: Link },
];

const PersonaNavIsland = ({ activeView, onSwitchView, connectionCount }: Props) => (
  <div
    className="fixed left-1/2 -translate-x-1/2 z-[1100] floating-nav"
    style={{ bottom: `calc(env(safe-area-inset-bottom) + 1rem)` }}
  >
    {tabs.map(({ key, label, icon: Icon }) => (
      <button
        key={key}
        onClick={() => onSwitchView(key)}
        aria-label={label}
        className="relative rounded-full px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 min-h-[40px]"
        style={
          activeView === key
            ? { background: BLUE, color: "white", boxShadow: "0 2px 8px rgba(220,20,60,0.3)" }
            : { background: "transparent", color: "hsl(var(--muted-foreground))" }
        }
      >
        <Icon size={16} className="sm:w-4 sm:h-4" />
        <span>{label}</span>
        {key === "connections" && connectionCount !== undefined && connectionCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: "#EF4444" }}
          >
            {connectionCount}
          </span>
        )}
      </button>
    ))}
  </div>
);

export default PersonaNavIsland;

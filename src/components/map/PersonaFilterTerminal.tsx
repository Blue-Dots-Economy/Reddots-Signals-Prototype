import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Check, GripVertical, Minus, Filter } from "lucide-react";
import type { PersonaType } from "@/lib/phoneAuth";
import type { ChatFilters } from "@/components/chat/PersonaChat";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  persona: PersonaType;
  initialFilters: ChatFilters;
  onFiltersChange: (filters: ChatFilters) => void;
  visibleCount: number;
  totalCount: number;
  entityLabel: string;
}

const PERSONA_FILTER_CONFIG: Record<PersonaType, {
  sectorLabel?: string;
  sectorOptions?: string[];
  distanceOptions: { label: string; value: number }[];
}> = {
  school_student: {
    sectorLabel: "Sector",
    sectorOptions: ["Food & Hospitality", "Retail & Fashion", "Electrical & Hardware", "Automobile", "Healthcare", "Manufacturing", "Other"],
    distanceOptions: [
      { label: "2 km radius", value: 2 },
      { label: "5 km radius", value: 5 },
      { label: "10 km radius", value: 10 },
    ],
  },
  msme_hiring_interns: {
    distanceOptions: [
      { label: "2 km radius", value: 2 },
      { label: "5 km radius", value: 5 },
      { label: "10 km radius", value: 10 },
    ],
  },
  iti_student: {
    sectorLabel: "Sector",
    sectorOptions: ["Electrical", "Automobile", "Tool Room & CNC", "Manufacturing", "Maintenance & Repair", "Retail & Sales", "Food & Hospitality"],
    distanceOptions: [
      { label: "3 km radius", value: 3 },
      { label: "5 km radius", value: 5 },
      { label: "10 km radius", value: 10 },
    ],
  },
  msme_hiring_iti: {
    sectorLabel: "Student Interest",
    sectorOptions: ["Retail & Sales", "Food & Hospitality", "Tool Room & CNC", "Automobile", "Maintenance & Repair", "Electrical", "Manufacturing"],
    distanceOptions: [
      { label: "3 km radius", value: 3 },
      { label: "5 km radius", value: 5 },
      { label: "10 km radius", value: 10 },
    ],
  },
};

const PersonaFilterTerminal = ({ persona, initialFilters, onFiltersChange, visibleCount, totalCount, entityLabel }: Props) => {
  const config = PERSONA_FILTER_CONFIG[persona];
  const isMobile = useIsMobile();
  const [activeSectors, setActiveSectors] = useState<Set<string>>(new Set(initialFilters.sector || []));
  const [activeDistance, setActiveDistance] = useState<number | null>(initialFilters.distance ?? null);
  const [collapsed, setCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 16, y: 56 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const sectorRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef<HTMLDivElement>(null); // kept for click-outside handler

  // Sync with external filter resets (e.g. "Clear all filters" on map overlay)
  useEffect(() => {
    setActiveSectors(new Set(initialFilters.sector || []));
    setActiveDistance(initialFilters.distance ?? null);
  }, [initialFilters]);

  const updateFilters = useCallback((sectors: Set<string>, distance: number | null) => {
    onFiltersChange({
      sector: sectors.size > 0 ? [...sectors] : undefined,
      distance: distance ?? undefined,
    });
  }, [onFiltersChange]);

  const toggleSector = (val: string) => {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      updateFilters(next, activeDistance);
      return next;
    });
  };

  const selectAllSectors = () => {
    if (!config.sectorOptions) return;
    const all = new Set(config.sectorOptions);
    setActiveSectors(all);
    updateFilters(all, activeDistance);
  };

  const unselectAllSectors = () => {
    setActiveSectors(new Set());
    updateFilters(new Set(), activeDistance);
  };

  const setDistance = (val: number) => {
    setActiveDistance(val);
    updateFilters(activeSectors, val);
    setOpenDropdown(null);
  };

  const clearAll = () => {
    setActiveSectors(new Set());
    setActiveDistance(null);
    updateFilters(new Set(), null);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [isDragging]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node) && openDropdown === "sector") setOpenDropdown(null);
      if (distanceRef.current && !distanceRef.current.contains(e.target as Node) && openDropdown === "distance") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const sectorLabel = activeSectors.size === 0
    ? `All ${config.sectorLabel || "Sector"}`
    : activeSectors.size === 1
      ? Array.from(activeSectors)[0]
      : `${activeSectors.size} selected`;

  const distanceLabel = activeDistance ? `${activeDistance} km radius` : "No limit";

  // ─── COLLAPSED ───
  if (collapsed) {
    if (isMobile) {
      return (
        <div className="fixed left-3 right-3 z-[1000]" style={{ top: `calc(env(safe-area-inset-top) + 0.75rem)` }}>
          <button onClick={() => setCollapsed(false)} className="map-panel py-2.5 px-4 flex items-center gap-2 w-full justify-center min-h-[44px]">
            <Filter size={16} className="opacity-70" />
            <span className="text-xs font-semibold uppercase opacity-80">Filters</span>
            {(activeSectors.size > 0 || activeDistance !== null) && (
              <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-white/20">
                {(activeSectors.size > 0 ? 1 : 0) + (activeDistance !== null ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      );
    }
    return (
      <div ref={panelRef} style={{ position: "fixed", left: position.x, top: position.y }} className="z-[1000] map-panel p-3 flex items-center gap-2 cursor-pointer" onClick={() => setCollapsed(false)}>
        <div onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e); }} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
        <Filter size={16} className="opacity-70" />
        <span className="text-xs font-semibold uppercase opacity-70">Filters</span>
      </div>
    );
  }

  // ─── EXPANDED ───
  // Mobile: anchored top, full-width, non-draggable. Desktop: draggable floating panel.
  const containerStyle: React.CSSProperties = isMobile
    ? { position: "fixed", left: 12, right: 12, top: `calc(env(safe-area-inset-top) + 0.75rem)` }
    : { position: "fixed", left: position.x, top: position.y };

  return (
    <div ref={panelRef} style={containerStyle} className={`z-[1000] map-panel p-3 sm:p-4 ${isMobile ? "" : "w-72 max-w-[320px]"} space-y-3 sm:space-y-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isMobile && (
            <div onMouseDown={handleMouseDown} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
          )}
          <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">Filters</h3>
        </div>
        <button onClick={() => setCollapsed(true)} className="tap-44 inline-flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity" aria-label="Minimize filters"><Minus size={18} /></button>
      </div>

      {/* Sector Dropdown */}
      {config.sectorOptions && (
        <div ref={sectorRef} className="relative space-y-1.5">
          <p className="text-xs uppercase tracking-wider opacity-50">{config.sectorLabel}</p>
          <button onClick={() => setOpenDropdown(openDropdown === "sector" ? null : "sector")} className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm hover:bg-white/15 transition-colors">
            <span className="truncate opacity-80">{sectorLabel}</span>
            <ChevronDown size={14} className={`opacity-50 transition-transform ${openDropdown === "sector" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "sector" && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-20 max-h-60 overflow-y-auto">
              <div className="flex border-b border-white/10">
                <button onClick={selectAllSectors} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">Select All</button>
                <button onClick={unselectAllSectors} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">Unselect All</button>
              </div>
              {config.sectorOptions.map((opt) => (
                <button key={opt} onClick={() => toggleSector(opt)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${activeSectors.has(opt) ? "bg-[#DC143C] border-[#DC143C]" : "border-white/30"}`}>
                    {activeSectors.has(opt) && <Check size={10} className="text-white" />}
                  </div>
                  <span className="opacity-80">{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Distance Slider */}
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wider opacity-50">Distance</p>
        <div className="px-1">
          <input
            type="range"
            min={0}
            max={config.distanceOptions.length}
            step={1}
            value={activeDistance === null ? config.distanceOptions.length : config.distanceOptions.findIndex(o => o.value === activeDistance)}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              if (idx === config.distanceOptions.length) {
                setActiveDistance(null);
                updateFilters(activeSectors, null);
              } else {
                const val = config.distanceOptions[idx].value;
                setActiveDistance(val);
                updateFilters(activeSectors, val);
              }
            }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#DC143C]"
            style={{ background: `linear-gradient(to right, #DC143C ${((activeDistance === null ? config.distanceOptions.length : config.distanceOptions.findIndex(o => o.value === activeDistance)) / config.distanceOptions.length) * 100}%, rgba(255,255,255,0.15) 0%)` }}
          />
          <div className="flex justify-between mt-1">
            {config.distanceOptions.map((opt) => (
              <span key={opt.value} className="text-[10px] opacity-40">{opt.value} km</span>
            ))}
            <span className="text-[10px] opacity-40">No limit</span>
          </div>
        </div>
        <p className="text-xs opacity-60 font-medium">{distanceLabel}</p>
      </div>

      <p className="text-xs opacity-40" style={{ fontSize: 12 }}>Showing {visibleCount} of {totalCount} {entityLabel}</p>
      <button onClick={clearAll} className="text-xs underline opacity-50 hover:opacity-100 transition-opacity">Clear All Filters</button>
    </div>
  );
};

export default PersonaFilterTerminal;

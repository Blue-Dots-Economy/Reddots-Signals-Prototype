import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Check, GripVertical, Minus, Filter, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { RedDotFilters } from "@/pages/LaunchPage";
import type { RedDotsView } from "@/lib/phoneAuth";

const RED = "#DC143C";
const GREY = "#4A4A4A";

interface Props {
  activeView: RedDotsView;
  activeFilters: RedDotFilters;
  onFiltersChange: (filters: RedDotFilters) => void;
  visibleCount: number;
  totalCount: number;
}

const SERVICE_CATEGORIES = [
  { value: "hospital", label: "Hospital" },
  { value: "ambulance", label: "Ambulance" },
  { value: "mechanic", label: "Mechanic" },
  { value: "tow", label: "Tow Truck" },
  { value: "ssm", label: "SSM Volunteer" },
  { value: "fuel", label: "Fuel Station" },
];
const SERVICE_TYPES = ["Government", "Private", "Volunteer"];
const RISK_LEVELS = ["CRITICAL", "HIGH", "MODERATE"];
const ROAD_CLASSES = ["National Highway", "State Highway", "Major District Road", "Local Road"];
const DISTANCE_OPTIONS = [2, 5, 10, 25];

const PersonaFilterTerminal = ({ activeView, activeFilters, onFiltersChange, visibleCount, totalCount }: Props) => {
  const isMobile = useIsMobile();
  const accent = activeView === "accidents" ? GREY : RED;
  const [collapsed, setCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 16, y: 56 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const updateFilter = useCallback(
    (patch: Partial<RedDotFilters>) => onFiltersChange({ ...activeFilters, ...patch }),
    [activeFilters, onFiltersChange]
  );

  const toggleArrayValue = (key: "category" | "type" | "risk" | "roadClass", val: string) => {
    const cur = new Set(activeFilters[key] || []);
    if (cur.has(val)) cur.delete(val); else cur.add(val);
    updateFilter({ [key]: cur.size > 0 ? [...cur] : undefined } as Partial<RedDotFilters>);
  };

  const setDistance = (val: number | null) => {
    updateFilter({ distance: val ?? undefined });
    setOpenDropdown(null);
  };

  const clearAll = () => onFiltersChange({});

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!openDropdown) return;
      const ref = dropdownRefs.current[openDropdown];
      if (ref && !ref.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const filterCount =
    (activeFilters.category?.length ? 1 : 0) +
    (activeFilters.type?.length ? 1 : 0) +
    (activeFilters.risk?.length ? 1 : 0) +
    (activeFilters.roadClass?.length ? 1 : 0) +
    (activeFilters.distance ? 1 : 0) +
    (activeFilters.open24x7 ? 1 : 0);

  // ─── COLLAPSED ───
  if (collapsed) {
    if (isMobile) {
      return (
        <div className="fixed left-3 right-3 z-[1000]" style={{ top: `calc(env(safe-area-inset-top) + 0.75rem)` }}>
          <button onClick={() => setCollapsed(false)} className="map-panel py-2.5 px-4 flex items-center gap-2 w-full justify-center min-h-[44px]">
            <Filter size={16} className="opacity-70" />
            <span className="text-xs font-semibold uppercase opacity-80">Filters</span>
            {filterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-white/20">
                {filterCount}
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

  const containerStyle: React.CSSProperties = isMobile
    ? { position: "fixed", left: 12, right: 12, top: `calc(env(safe-area-inset-top) + 0.75rem)` }
    : { position: "fixed", left: position.x, top: position.y };

  // Helper to render a multi-select dropdown
  const MultiSelect = ({
    id, label, options, active, onToggle,
  }: {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    active: string[] | undefined;
    onToggle: (v: string) => void;
  }) => {
    const set = new Set(active || []);
    const heading =
      set.size === 0 ? `All ${label}` : set.size === 1 ? options.find(o => o.value === Array.from(set)[0])?.label || Array.from(set)[0] : `${set.size} selected`;
    return (
      <div ref={(el) => { dropdownRefs.current[id] = el; }} className="relative space-y-1.5">
        <p className="text-xs uppercase tracking-wider opacity-50">{label}</p>
        <button
          onClick={() => setOpenDropdown(openDropdown === id ? null : id)}
          className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm hover:bg-white/15 transition-colors"
        >
          <span className="truncate opacity-80">{heading}</span>
          <ChevronDown size={14} className={`opacity-50 transition-transform ${openDropdown === id ? "rotate-180" : ""}`} />
        </button>
        {openDropdown === id && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-20 max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button key={opt.value} onClick={() => onToggle(opt.value)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors">
                <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0" style={{
                  background: set.has(opt.value) ? accent : "transparent",
                  borderColor: set.has(opt.value) ? accent : "rgba(255,255,255,0.3)",
                }}>
                  {set.has(opt.value) && <Check size={10} className="text-white" />}
                </div>
                <span className="opacity-80">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={panelRef} style={containerStyle} className={`z-[1000] map-panel p-3 sm:p-4 ${isMobile ? "" : "w-72 max-w-[320px]"} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isMobile && (
            <div onMouseDown={handleMouseDown} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
          )}
          <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">Filters</h3>
        </div>
        <button onClick={() => setCollapsed(true)} className="tap-44 inline-flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity" aria-label="Minimize filters"><Minus size={18} /></button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
        <input
          type="text"
          value={activeFilters.search || ""}
          onChange={(e) => updateFilter({ search: e.target.value || undefined })}
          placeholder={activeView === "services" ? "Search hospitals, mechanics, areas..." : "Search hotspots, areas..."}
          className="w-full pl-8 pr-2 py-2 bg-white/10 border border-white/10 rounded-lg text-xs placeholder:opacity-50 focus:outline-none focus:border-white/30"
        />
      </div>

      {activeView === "services" ? (
        <>
          <MultiSelect
            id="category" label="Category" options={SERVICE_CATEGORIES}
            active={activeFilters.category} onToggle={(v) => toggleArrayValue("category", v)}
          />
          <MultiSelect
            id="type" label="Type"
            options={SERVICE_TYPES.map(v => ({ value: v, label: v }))}
            active={activeFilters.type} onToggle={(v) => toggleArrayValue("type", v)}
          />
          <label className="flex items-center justify-between text-xs cursor-pointer pt-1">
            <span className="opacity-70">Open 24×7 only</span>
            <input
              type="checkbox"
              checked={!!activeFilters.open24x7}
              onChange={(e) => updateFilter({ open24x7: e.target.checked || undefined })}
              className="w-4 h-4 rounded accent-current"
              style={{ accentColor: accent }}
            />
          </label>
        </>
      ) : (
        <>
          <MultiSelect
            id="risk" label="Risk Level"
            options={RISK_LEVELS.map(v => ({ value: v, label: v }))}
            active={activeFilters.risk} onToggle={(v) => toggleArrayValue("risk", v)}
          />
          <MultiSelect
            id="roadClass" label="Road Class"
            options={ROAD_CLASSES.map(v => ({ value: v, label: v }))}
            active={activeFilters.roadClass} onToggle={(v) => toggleArrayValue("roadClass", v)}
          />
        </>
      )}

      {/* Distance slider */}
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wider opacity-50">Distance</p>
        <div className="px-1">
          <input
            type="range"
            min={0}
            max={DISTANCE_OPTIONS.length}
            step={1}
            value={activeFilters.distance == null ? DISTANCE_OPTIONS.length : DISTANCE_OPTIONS.indexOf(activeFilters.distance)}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              if (idx === DISTANCE_OPTIONS.length) setDistance(null);
              else setDistance(DISTANCE_OPTIONS[idx]);
            }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: accent }}
          />
          <div className="flex justify-between mt-1">
            {DISTANCE_OPTIONS.map((d) => (<span key={d} className="text-[10px] opacity-40">{d}km</span>))}
            <span className="text-[10px] opacity-40">All</span>
          </div>
        </div>
        <p className="text-xs opacity-60 font-medium">
          {activeFilters.distance ? `${activeFilters.distance} km radius` : "No distance limit"}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs opacity-60" style={{ fontSize: 12 }}>
          Showing {visibleCount} of {totalCount} Red Dots
        </p>
        {filterCount > 0 && (
          <button onClick={clearAll} className="text-[11px] underline opacity-60 hover:opacity-100 transition-opacity">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonaFilterTerminal;

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown, Check, GripVertical, Minus, Filter, Search, X,
  Hospital, Ambulance, Wrench, Truck, Users, Fuel, AlertTriangle,
} from "lucide-react";
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

const SERVICE_CATEGORIES: { value: string; label: string; icon: any }[] = [
  { value: "hospital", label: "Hospital", icon: Hospital },
  { value: "ambulance", label: "Ambulance", icon: Ambulance },
  { value: "mechanic", label: "Mechanic", icon: Wrench },
  { value: "tow", label: "Tow", icon: Truck },
  { value: "ssm", label: "SSM", icon: Users },
  { value: "fuel", label: "Fuel", icon: Fuel },
];
const SERVICE_TYPES = ["Government", "Private", "Volunteer"];
const RISK_LEVELS: { value: string; label: string; color: string }[] = [
  { value: "CRITICAL", label: "Critical", color: "#7F1D1D" },
  { value: "HIGH", label: "High", color: "#DC143C" },
  { value: "MODERATE", label: "Moderate", color: "#F59E0B" },
];
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
              <span
                className="ml-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5 text-white"
                style={{ background: accent }}
              >
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
        {filterCount > 0 && (
          <span className="inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5 text-white" style={{ background: accent }}>
            {filterCount}
          </span>
        )}
      </div>
    );
  }

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed", left: 12, right: 12,
        top: `calc(env(safe-area-inset-top) + 0.75rem)`,
        maxHeight: `calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 96px)`,
      }
    : { position: "fixed", left: position.x, top: position.y };

  // Multi-select dropdown (used for Type / Road Class)
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
        <p className="text-[10px] uppercase tracking-wider opacity-50 font-semibold">{label}</p>
        <button
          onClick={() => setOpenDropdown(openDropdown === id ? null : id)}
          className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm hover:bg-white/15 transition-colors min-h-[40px]"
        >
          <span className="truncate opacity-80">{heading}</span>
          <ChevronDown size={14} className={`opacity-50 transition-transform ${openDropdown === id ? "rotate-180" : ""}`} />
        </button>
        {openDropdown === id && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-20 max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onToggle(opt.value)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-white/10 transition-colors min-h-[40px]"
              >
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

  // ─── Active filter chips (compact summary, removable) ───
  const activeChips: { key: string; label: string; onRemove: () => void; color?: string }[] = [];
  (activeFilters.category || []).forEach((v) => activeChips.push({
    key: `cat-${v}`,
    label: SERVICE_CATEGORIES.find(c => c.value === v)?.label || v,
    onRemove: () => toggleArrayValue("category", v),
  }));
  (activeFilters.type || []).forEach((v) => activeChips.push({
    key: `type-${v}`, label: v, onRemove: () => toggleArrayValue("type", v),
  }));
  (activeFilters.risk || []).forEach((v) => {
    const meta = RISK_LEVELS.find(r => r.value === v);
    activeChips.push({
      key: `risk-${v}`, label: meta?.label || v, color: meta?.color,
      onRemove: () => toggleArrayValue("risk", v),
    });
  });
  (activeFilters.roadClass || []).forEach((v) => activeChips.push({
    key: `road-${v}`, label: v, onRemove: () => toggleArrayValue("roadClass", v),
  }));
  if (activeFilters.distance) activeChips.push({
    key: "dist", label: `${activeFilters.distance} km`, onRemove: () => setDistance(null),
  });
  if (activeFilters.open24x7) activeChips.push({
    key: "24x7", label: "24×7", onRemove: () => updateFilter({ open24x7: undefined }),
  });

  return (
    <div ref={panelRef} style={containerStyle} className={`z-[1000] map-panel p-3 sm:p-4 ${isMobile ? "" : "w-72 max-w-[320px]"} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {!isMobile && (
            <div onMouseDown={handleMouseDown} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
          )}
          <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">Filters</h3>
          {filterCount > 0 && (
            <span className="inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5 text-white" style={{ background: accent }}>
              {filterCount}
            </span>
          )}
        </div>
        <button onClick={() => setCollapsed(true)} className="tap-44 inline-flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity" aria-label="Minimize filters">
          <Minus size={18} />
        </button>
      </div>

      {/* Scrollable body — keeps mobile usable when keyboard or many filters appear */}
      <div className="space-y-3 overflow-y-auto pr-0.5 -mr-0.5 flex-1 min-h-0">
        {/* Active chips row */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((c) => (
              <button
                key={c.key}
                onClick={c.onRemove}
                className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full pl-2 pr-1.5 py-1 text-white hover:opacity-90 transition-opacity"
                style={{ background: c.color || accent }}
              >
                <span className="truncate max-w-[140px]">{c.label}</span>
                <X size={11} className="opacity-90" />
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={activeFilters.search || ""}
            onChange={(e) => updateFilter({ search: e.target.value || undefined })}
            placeholder={activeView === "services" ? "Search hospitals, mechanics, areas..." : "Search hotspots, areas..."}
            className="w-full pl-8 pr-2 py-2 bg-white/10 border border-white/10 rounded-lg text-xs placeholder:opacity-50 focus:outline-none focus:border-white/30 min-h-[40px]"
          />
        </div>

        {activeView === "services" ? (
          <>
            {/* Category icon chips */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider opacity-50 font-semibold">Category</p>
              <div className="grid grid-cols-3 gap-1.5">
                {SERVICE_CATEGORIES.map(({ value, label, icon: Icon }) => {
                  const isOn = (activeFilters.category || []).includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleArrayValue("category", value)}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg border text-[10px] font-medium transition-colors py-2 min-h-[52px]"
                      style={{
                        background: isOn ? accent : "rgba(255,255,255,0.06)",
                        borderColor: isOn ? accent : "rgba(255,255,255,0.1)",
                        color: isOn ? "#fff" : "rgba(255,255,255,0.75)",
                      }}
                    >
                      <Icon size={16} />
                      <span className="leading-none">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <MultiSelect
              id="type" label="Type"
              options={SERVICE_TYPES.map(v => ({ value: v, label: v }))}
              active={activeFilters.type} onToggle={(v) => toggleArrayValue("type", v)}
            />

            <label className="flex items-center justify-between text-xs cursor-pointer min-h-[36px]">
              <span className="opacity-70">Open 24×7 only</span>
              <input
                type="checkbox"
                checked={!!activeFilters.open24x7}
                onChange={(e) => updateFilter({ open24x7: e.target.checked || undefined })}
                className="w-4 h-4 rounded"
                style={{ accentColor: accent }}
              />
            </label>
          </>
        ) : (
          <>
            {/* Dot Type toggle: Hotspots / Potholes / All */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider opacity-50 font-semibold">Dot Type</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: undefined as any, label: "All", color: "#94A3B8" },
                  { value: "hotspot", label: "Hotspots", color: RED },
                  { value: "pothole", label: "Potholes", color: GREY },
                ].map(({ value, label, color }) => {
                  const isOn = activeFilters.dotType === value || (!activeFilters.dotType && value === undefined);
                  return (
                    <button
                      key={label}
                      onClick={() => updateFilter({ dotType: value })}
                      className="rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-colors min-h-[36px] flex items-center justify-center gap-1.5"
                      style={{
                        background: isOn ? color : "rgba(255,255,255,0.06)",
                        borderColor: isOn ? color : "rgba(255,255,255,0.15)",
                        color: isOn ? "#fff" : color,
                      }}
                    >
                      {value && <span className="w-2 h-2 rounded-full inline-block" style={{ background: isOn ? "#fff" : color }} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Risk level pill toggle */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider opacity-50 font-semibold flex items-center gap-1">
                <AlertTriangle size={11} className="opacity-60" /> Risk Level
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {RISK_LEVELS.map(({ value, label, color }) => {
                  const isOn = (activeFilters.risk || []).includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleArrayValue("risk", value)}
                      className="rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-colors min-h-[36px]"
                      style={{
                        background: isOn ? color : "rgba(255,255,255,0.06)",
                        borderColor: isOn ? color : "rgba(255,255,255,0.15)",
                        color: isOn ? "#fff" : color,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <MultiSelect
              id="roadClass" label="Road Class"
              options={ROAD_CLASSES.map(v => ({ value: v, label: v }))}
              active={activeFilters.roadClass} onToggle={(v) => toggleArrayValue("roadClass", v)}
            />
          </>
        )}

        {/* Distance slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider opacity-50 font-semibold">Distance</p>
            <p className="text-[11px] opacity-70 font-medium">
              {activeFilters.distance ? `${activeFilters.distance} km` : "Any"}
            </p>
          </div>
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
        </div>
      </div>

      {/* Footer — fixed at bottom of panel */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 flex-shrink-0">
        <p className="text-[11px] opacity-70 font-medium">
          {visibleCount} <span className="opacity-50">of</span> {totalCount}
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

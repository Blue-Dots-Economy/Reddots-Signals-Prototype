import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Search, Filter, X, GripVertical, Minus, Loader2, ChevronDown, Check } from "lucide-react";

const YELLOW = "#DC143C";

interface FilterDimension {
  label: string;
  options: string[];
  active: Set<string>;
  onToggle: (val: string) => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;
}

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: () => void;
  filters: FilterDimension[];
  onClearAll: () => void;
  visibleCount: number;
  totalCount: number;
  isSearching: boolean;
  searchResultCount: number | null;
  searchHistory: string[];
  onHistorySelect: (query: string) => void;
  inline?: boolean;
  searchPlaceholder?: string;
  entityLabel?: string;
  distanceKm?: number | null;
  onDistanceChange?: (km: number | null) => void;
}

const DISTANCE_OPTIONS = [
  { label: "No limit", value: null },
  { label: "10 km radius", value: 10 },
  { label: "15 km radius", value: 15 },
  { label: "25 km radius", value: 25 },
] as const;

function formatLabel(val: string): string {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const UnifiedFilterPanel = ({
  search, onSearchChange, onSearchSubmit,
  filters, onClearAll, visibleCount, totalCount,
  isSearching, searchResultCount, searchHistory, onHistorySelect,
  inline = false, searchPlaceholder = "Search...", entityLabel = "items",
  distanceKm = null, onDistanceChange,
}: Props) => {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [collapsed, setCollapsed] = useState(isMobile);
  const [showHistory, setShowHistory] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | string | null>(null);
  const distanceDropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 16, y: typeof window !== "undefined" && window.innerWidth < 640 ? 90 : 56 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [isDragging]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowHistory(false);
      dropdownRefs.current.forEach((ref, i) => {
        if (ref && !ref.contains(e.target as Node) && openDropdown === i) setOpenDropdown(null);
      });
      if (distanceDropdownRef.current && !distanceDropdownRef.current.contains(e.target as Node) && openDropdown === "distance") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const distanceLabel = distanceKm ? `${distanceKm} km radius` : "No limit";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim()) { onSearchSubmit(); setShowHistory(false); }
  };

  const getSelectedLabel = (f: FilterDimension) => {
    if (f.active.size === 0) return "None selected";
    if (f.active.size === f.options.length) return `All ${f.label}`;
    if (f.active.size === 1) return formatLabel(Array.from(f.active)[0]);
    return `${f.active.size} selected`;
  };

  // ─── INLINE MODE ───
  if (inline) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f, idx) => f.options.length > 0 && (
            <div key={idx} ref={(el) => { dropdownRefs.current[idx] = el; }} className="relative">
              <button onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)} className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                <Filter size={12} className="text-muted-foreground" />
                <span className="text-foreground">{getSelectedLabel(f)}</span>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${openDropdown === idx ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === idx && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg overflow-hidden shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                  <div className="flex border-b border-border">
                    <button onClick={f.onSelectAll} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-muted transition-colors text-muted-foreground">Select All</button>
                    <button onClick={f.onUnselectAll} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-muted transition-colors text-muted-foreground">Unselect All</button>
                  </div>
                  {f.options.map((opt) => (
                    <button key={opt} onClick={() => f.onToggle(opt)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${f.active.has(opt) ? "bg-primary border-primary" : "border-border"}`}>
                        {f.active.has(opt) && <Check size={10} className="text-primary-foreground" />}
                      </div>
                      <span className="text-foreground">{formatLabel(opt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {onDistanceChange && (
            <div ref={distanceDropdownRef} className="relative">
              <button onClick={() => setOpenDropdown(openDropdown === "distance" ? null : "distance")} className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                <Filter size={12} className="text-muted-foreground" />
                <span className="text-foreground">{distanceLabel}</span>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${openDropdown === "distance" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "distance" && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg overflow-hidden shadow-lg z-20 min-w-[160px]">
                  {DISTANCE_OPTIONS.map((opt) => (
                    <button key={String(opt.value)} onClick={() => { onDistanceChange(opt.value); setOpenDropdown(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${distanceKm === opt.value ? "bg-primary border-primary" : "border-border"}`}>
                        {distanceKm === opt.value && <Check size={10} className="text-primary-foreground" />}
                      </div>
                      <span className="text-foreground">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={onClearAll} className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors">Clear</button>
        </div>
        {!isSearching && searchResultCount !== null && <p className="text-[11px] text-muted-foreground">{searchResultCount > 0 ? `${searchResultCount} matched` : "No matches"}</p>}
      </div>
    );
  }

  // ─── COLLAPSED ───
  if (collapsed) {
    return (
      <div ref={panelRef} style={{ position: "fixed", left: position.x, top: position.y }} className="z-[1000] map-panel p-3 flex items-center gap-2 cursor-pointer" onClick={() => setCollapsed(false)}>
        <div onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e); }} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
        <Filter size={16} className="opacity-70" />
        <span className="text-xs font-semibold uppercase opacity-70">Filters</span>
      </div>
    );
  }

  // ─── EXPANDED (floating on map) ───
  return (
    <div ref={panelRef} style={{ position: "fixed", left: position.x, top: position.y }} className="z-[1000] map-panel p-3 sm:p-4 w-[calc(100vw-32px)] sm:w-72 max-w-[320px] space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div onMouseDown={handleMouseDown} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
          <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">Filters</h3>
        </div>
        <button onClick={() => setCollapsed(true)} className="opacity-40 hover:opacity-100 transition-opacity" aria-label="Minimize filters"><Minus size={16} /></button>
      </div>


      {/* Filter Dropdowns */}
      {filters.map((f, idx) => f.options.length > 0 && (
        <div key={idx} ref={(el) => { dropdownRefs.current[idx] = el; }} className="relative space-y-1.5">
          <p className="text-xs uppercase tracking-wider opacity-50">{f.label}</p>
          <button onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)} className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm hover:bg-white/15 transition-colors">
            <span className="truncate opacity-80">{getSelectedLabel(f)}</span>
            <ChevronDown size={14} className={`opacity-50 transition-transform ${openDropdown === idx ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === idx && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-20 max-h-60 overflow-y-auto">
              <div className="flex border-b border-white/10">
                <button onClick={f.onSelectAll} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">Select All</button>
                <button onClick={f.onUnselectAll} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">Unselect All</button>
              </div>
              {f.options.map((opt) => (
                <button key={opt} onClick={() => f.onToggle(opt)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${f.active.has(opt) ? "bg-[#DC143C] border-[#DC143C]" : "border-white/30"}`}>
                    {f.active.has(opt) && <Check size={10} className="text-white" />}
                  </div>
                  <span className="opacity-80">{formatLabel(opt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {onDistanceChange && (
        <div ref={distanceDropdownRef} className="relative space-y-1.5">
          <p className="text-xs uppercase tracking-wider opacity-50">Distance</p>
          <button onClick={() => setOpenDropdown(openDropdown === "distance" ? null : "distance")} className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm hover:bg-white/15 transition-colors">
            <span className="truncate opacity-80">{distanceLabel}</span>
            <ChevronDown size={14} className={`opacity-50 transition-transform ${openDropdown === "distance" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "distance" && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-20">
              {DISTANCE_OPTIONS.map((opt) => (
                <button key={String(opt.value)} onClick={() => { onDistanceChange(opt.value); setOpenDropdown(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${distanceKm === opt.value ? "bg-[#DC143C] border-[#DC143C]" : "border-white/30"}`}>
                    {distanceKm === opt.value && <Check size={10} className="text-white" />}
                  </div>
                  <span className="opacity-80">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs opacity-40" style={{ fontSize: 12 }}>Showing {visibleCount} of {totalCount} {entityLabel}</p>
      <button onClick={onClearAll} className="text-xs underline opacity-50 hover:opacity-100 transition-opacity">Clear All Filters</button>
    </div>
  );
};

export default UnifiedFilterPanel;

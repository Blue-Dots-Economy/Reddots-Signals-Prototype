import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Search, Filter, X, GripVertical, Minus, Loader2, ChevronDown, Check } from "lucide-react";

const YELLOW = "#DC143C";

interface DotData {
  pillar: string;
  skills?: string;
}

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: () => void;
  activePillars: Set<string>;
  onTogglePillar: (pillar: string) => void;
  onSelectAllPillars: () => void;
  onUnselectAllPillars: () => void;
  activeSubcategories: Set<string>;
  onToggleSubcategory: (sub: string) => void;
  onSelectAllSubcategories: () => void;
  onUnselectAllSubcategories: () => void;
  onClearAll: () => void;
  visibleCount: number;
  totalCount: number;
  isSearching: boolean;
  searchResultCount: number | null;
  searchHistory: string[];
  onHistorySelect: (query: string) => void;
  dots: DotData[];
  inline?: boolean;
}

function formatLabel(val: string): string {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const FilterPanel = ({
  search, onSearchChange, onSearchSubmit,
  activePillars, onTogglePillar, onSelectAllPillars, onUnselectAllPillars,
  activeSubcategories, onToggleSubcategory, onSelectAllSubcategories, onUnselectAllSubcategories,
  onClearAll, visibleCount, totalCount,
  isSearching, searchResultCount, searchHistory, onHistorySelect,
  dots, inline = false,
}: Props) => {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [collapsed, setCollapsed] = useState(isMobile);
  const [showHistory, setShowHistory] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 56 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);

  const pillarOptions = useMemo(() => {
    const set = new Set<string>();
    dots.forEach((d) => set.add(d.pillar));
    return Array.from(set).sort();
  }, [dots]);

  // Subcategories: derived from skills of dots whose pillar is active
  const subcategoryOptions = useMemo(() => {
    const set = new Set<string>();
    dots.forEach((d) => {
      if (activePillars.has(d.pillar) && d.skills) {
        set.add(d.skills);
      }
    });
    return Array.from(set).sort();
  }, [dots, activePillars]);

  const categoryLabel = useMemo(() => {
    if (activePillars.size === 0) return "None selected";
    if (activePillars.size === pillarOptions.length) return "All Categories";
    if (activePillars.size === 1) return formatLabel(Array.from(activePillars)[0]);
    return `${activePillars.size} selected`;
  }, [activePillars, pillarOptions]);

  const subcategoryLabel = useMemo(() => {
    if (subcategoryOptions.length === 0) return "No subcategories";
    if (activeSubcategories.size === 0) return "None selected";
    if (activeSubcategories.size === subcategoryOptions.length) return "All Subcategories";
    if (activeSubcategories.size === 1) return Array.from(activeSubcategories)[0];
    return `${activeSubcategories.size} selected`;
  }, [activeSubcategories, subcategoryOptions]);

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
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCategoryDropdown(false);
      if (subRef.current && !subRef.current.contains(e.target as Node)) setShowSubcategoryDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim()) { onSearchSubmit(); setShowHistory(false); }
  };

  if (inline) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          {pillarOptions.length > 0 && (
            <div ref={catRef} className="relative">
              <button onClick={() => { setShowCategoryDropdown((p) => !p); setShowSubcategoryDropdown(false); }} className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                <Filter size={12} className="text-muted-foreground" />
                <span className="text-foreground">{categoryLabel}</span>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
              </button>
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg overflow-hidden shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                  <div className="flex border-b border-border">
                    <button onClick={onSelectAllPillars} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-muted transition-colors text-muted-foreground">Select All</button>
                    <button onClick={onUnselectAllPillars} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-muted transition-colors text-muted-foreground">Unselect All</button>
                  </div>
                  {pillarOptions.map((p) => (
                    <button key={p} onClick={() => onTogglePillar(p)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${activePillars.has(p) ? "bg-primary border-primary" : "border-border"}`}>
                        {activePillars.has(p) && <Check size={10} className="text-primary-foreground" />}
                      </div>
                      <span className="text-foreground">{formatLabel(p)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Subcategory */}
          {subcategoryOptions.length > 0 && (
            <div ref={subRef} className="relative">
              <button onClick={() => { setShowSubcategoryDropdown((p) => !p); setShowCategoryDropdown(false); }} className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                <span className="text-foreground">{subcategoryLabel}</span>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${showSubcategoryDropdown ? "rotate-180" : ""}`} />
              </button>
              {showSubcategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg overflow-hidden shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                  <div className="flex border-b border-border">
                    <button onClick={onSelectAllSubcategories} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-muted transition-colors text-muted-foreground">Select All</button>
                    <button onClick={onUnselectAllSubcategories} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-muted transition-colors text-muted-foreground">Unselect All</button>
                  </div>
                  {subcategoryOptions.map((s) => (
                    <button key={s} onClick={() => onToggleSubcategory(s)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${activeSubcategories.has(s) ? "bg-primary border-primary" : "border-border"}`}>
                        {activeSubcategories.has(s) && <Check size={10} className="text-primary-foreground" />}
                      </div>
                      <span className="text-foreground">{s}</span>
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

  if (collapsed) {
    return (
      <div ref={panelRef} style={{ position: "fixed", left: position.x, top: position.y }} className="z-[1000] map-panel p-3 flex items-center gap-2 cursor-pointer" onClick={() => setCollapsed(false)}>
        <div onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e); }} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
        <Filter size={16} className="opacity-70" />
        <span className="text-xs font-semibold uppercase opacity-70">Filters</span>
      </div>
    );
  }

  return (
    <div ref={panelRef} style={{ position: "fixed", left: position.x, top: position.y }} className="z-[1000] map-panel p-3 sm:p-4 w-[calc(100vw-32px)] sm:w-72 max-w-[320px] space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div onMouseDown={handleMouseDown} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
          <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">Filters</h3>
        </div>
        <button onClick={() => setCollapsed(true)} className="opacity-40 hover:opacity-100 transition-opacity" aria-label="Minimize filters"><Minus size={16} /></button>
      </div>


      {/* Category Dropdown */}
      {pillarOptions.length > 0 && (
        <div ref={catRef} className="relative space-y-1.5">
          <p className="text-xs uppercase tracking-wider opacity-50">Category</p>
          <button onClick={() => { setShowCategoryDropdown((p) => !p); setShowSubcategoryDropdown(false); }} className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm hover:bg-white/15 transition-colors">
            <span className="truncate opacity-80">{categoryLabel}</span>
            <ChevronDown size={14} className={`opacity-50 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
          </button>
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-20 max-h-60 overflow-y-auto">
              <div className="flex border-b border-white/10">
                <button onClick={onSelectAllPillars} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">Select All</button>
                <button onClick={onUnselectAllPillars} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">Unselect All</button>
              </div>
              {pillarOptions.map((p) => (
                <button key={p} onClick={() => onTogglePillar(p)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${activePillars.has(p) ? "bg-[#DC143C] border-[#DC143C]" : "border-white/30"}`}>
                    {activePillars.has(p) && <Check size={10} className="text-white" />}
                  </div>
                  <span className="opacity-80">{formatLabel(p)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subcategory Dropdown */}
      {subcategoryOptions.length > 0 && (
        <div ref={subRef} className="relative space-y-1.5">
          <p className="text-xs uppercase tracking-wider opacity-50">Subcategory</p>
          <button onClick={() => { setShowSubcategoryDropdown((p) => !p); setShowCategoryDropdown(false); }} className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm hover:bg-white/15 transition-colors">
            <span className="truncate opacity-80">{subcategoryLabel}</span>
            <ChevronDown size={14} className={`opacity-50 transition-transform ${showSubcategoryDropdown ? "rotate-180" : ""}`} />
          </button>
          {showSubcategoryDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-20 max-h-60 overflow-y-auto">
              <div className="flex border-b border-white/10">
                <button onClick={onSelectAllSubcategories} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">Select All</button>
                <button onClick={onUnselectAllSubcategories} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">Unselect All</button>
              </div>
              {subcategoryOptions.map((s) => (
                <button key={s} onClick={() => onToggleSubcategory(s)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${activeSubcategories.has(s) ? "bg-[#DC143C] border-[#DC143C]" : "border-white/30"}`}>
                    {activeSubcategories.has(s) && <Check size={10} className="text-white" />}
                  </div>
                  <span className="opacity-80">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs opacity-40" style={{ fontSize: 12 }}>Showing {visibleCount} of {totalCount} Blue Dots</p>
      <button onClick={onClearAll} className="text-xs underline opacity-50 hover:opacity-100 transition-opacity">Clear All Filters</button>

      {dots.length === 0 && (
        <p className="text-xs opacity-40 italic pt-2 border-t border-white/10">
          No dots to display. Add dots to get started.
        </p>
      )}
    </div>
  );
};

export default FilterPanel;

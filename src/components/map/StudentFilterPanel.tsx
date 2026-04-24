import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Search, Filter, X, GripVertical, Minus, Loader2, ChevronDown, Check } from "lucide-react";

const YELLOW = "#2563EB";

interface TutorDotData {
  subject: string;
}

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: () => void;
  activeSubjects: Set<string>;
  onToggleSubject: (subject: string) => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;
  onClearAll: () => void;
  visibleCount: number;
  totalCount: number;
  isSearching: boolean;
  searchResultCount: number | null;
  searchHistory: string[];
  onHistorySelect: (query: string) => void;
  dots: TutorDotData[];
  inline?: boolean;
}

function formatLabel(val: string): string {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const StudentFilterPanel = ({
  search, onSearchChange, onSearchSubmit,
  activeSubjects, onToggleSubject, onSelectAll, onUnselectAll,
  onClearAll, visibleCount, totalCount,
  isSearching, searchResultCount, searchHistory, onHistorySelect,
  dots, inline = false,
}: Props) => {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [collapsed, setCollapsed] = useState(isMobile);
  const [showHistory, setShowHistory] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 56 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    dots.forEach((d) => set.add(d.subject));
    return Array.from(set).sort();
  }, [dots]);

  const allSelected = subjectOptions.length > 0 && activeSubjects.size === subjectOptions.length;

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim()) { onSearchSubmit(); setShowHistory(false); }
  };

  const selectedLabel = allSelected
    ? "All Subjects"
    : activeSubjects.size === 1
      ? formatLabel([...activeSubjects][0])
      : `${activeSubjects.size} selected`;

  if (inline) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {subjectOptions.length > 0 && (
            <div ref={dropdownRef} className="relative">
              <button onClick={() => setShowDropdown((p) => !p)} className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                <Filter size={12} className="text-muted-foreground" />
                <span className="text-foreground">{selectedLabel}</span>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`} />
              </button>
              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg overflow-hidden shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                  <div className="flex border-b border-border">
                    <button onClick={onSelectAll} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-muted transition-colors text-muted-foreground">Select All</button>
                    <button onClick={onUnselectAll} className="flex-1 text-[10px] uppercase tracking-wider py-1.5 text-center hover:bg-muted transition-colors text-muted-foreground">Unselect All</button>
                  </div>
                  {subjectOptions.map((key) => (
                    <button key={key} onClick={() => onToggleSubject(key)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${activeSubjects.has(key) ? "bg-primary border-primary" : "border-border"}`}>
                        {activeSubjects.has(key) && <Check size={10} className="text-primary-foreground" />}
                      </div>
                      <span className="text-foreground">{formatLabel(key)}</span>
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
    <div ref={panelRef} style={{ position: "fixed", left: position.x, top: position.y }} className="z-[1000] map-panel p-3 sm:p-4 w-[calc(100vw-32px)] sm:w-72 max-w-[300px] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div onMouseDown={handleMouseDown} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"><GripVertical size={16} /></div>
          <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">Tutor Filters</h3>
        </div>
        <button onClick={() => setCollapsed(true)} className="opacity-40 hover:opacity-100 transition-opacity" aria-label="Minimize filters"><Minus size={16} /></button>
      </div>


      {/* Subject Dropdown */}
      {subjectOptions.length > 0 && (
        <div ref={dropdownRef} className="relative space-y-1.5">
          <p className="text-xs uppercase tracking-wider opacity-50">Subject</p>
          <button
            onClick={() => setShowDropdown((p) => !p)}
            className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm hover:bg-white/15 transition-colors"
          >
            <span className="truncate opacity-80">{selectedLabel}</span>
            <ChevronDown size={14} className={`opacity-50 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-10 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
                <button onClick={onSelectAll} className="text-[10px] uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity">Select All</button>
                <button onClick={onUnselectAll} className="text-[10px] uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity">Unselect All</button>
              </div>
              {subjectOptions.map((key) => (
                <button
                  key={key}
                  onClick={() => onToggleSubject(key)}
                  className="w-full flex items-center gap-2 text-left text-xs px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${activeSubjects.has(key) ? "bg-[#2563EB] border-[#2563EB]" : "border-white/30"}`}>
                    {activeSubjects.has(key) && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </span>
                  <span className="opacity-80">{formatLabel(key)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs opacity-40" style={{ fontSize: 12 }}>Showing {visibleCount} of {totalCount} Tutors</p>
      <button onClick={onClearAll} className="text-xs underline opacity-50 hover:opacity-100 transition-opacity">Clear All Filters</button>
    </div>
  );
};

export default StudentFilterPanel;

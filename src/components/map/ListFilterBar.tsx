import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { PersonaType } from "@/lib/phoneAuth";
import type { ChatFilters } from "@/components/chat/PersonaChat";

const AMBER = "#D97706";

const PERSONA_FILTER_CONFIG: Record<PersonaType, {
  sectorLabel?: string;
  sectorOptions?: string[];
  distanceOptions: number[];
}> = {
  school_student: {
    sectorLabel: "Sector",
    sectorOptions: ["Food & Hospitality", "Retail & Fashion", "Electrical & Hardware", "Automobile", "Healthcare", "Manufacturing", "Other"],
    distanceOptions: [2, 5, 10],
  },
  iti_student: {
    sectorLabel: "Sector",
    sectorOptions: ["Electrical", "Automobile", "Tool Room & CNC", "Manufacturing", "Maintenance & Repair", "Retail & Sales", "Food & Hospitality"],
    distanceOptions: [3, 5, 10],
  },
  msme_hiring_interns: {
    distanceOptions: [2, 5, 10],
  },
  msme_hiring_iti: {
    sectorLabel: "Student Interest",
    sectorOptions: ["Retail & Sales", "Food & Hospitality", "Tool Room & CNC", "Automobile", "Maintenance & Repair", "Electrical", "Manufacturing"],
    distanceOptions: [3, 5, 10],
  },
};

interface Props {
  persona: PersonaType;
  activeFilters: ChatFilters;
  onFiltersChange: (f: ChatFilters) => void;
}

const ListFilterBar = ({ persona, activeFilters, onFiltersChange }: Props) => {
  const config = PERSONA_FILTER_CONFIG[persona];
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const sectorRef = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLDivElement>(null);

  const activeSectors = new Set(activeFilters.sector || []);
  const activeDistance = activeFilters.distance ?? null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openDropdown === "sector" && sectorRef.current && !sectorRef.current.contains(e.target as Node)) setOpenDropdown(null);
      if (openDropdown === "dist" && distRef.current && !distRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const toggleSector = (val: string) => {
    const next = new Set(activeSectors);
    if (next.has(val)) next.delete(val); else next.add(val);
    onFiltersChange({ ...activeFilters, sector: next.size > 0 ? [...next] : undefined });
  };

  const setDist = (val: number) => {
    onFiltersChange({ ...activeFilters, distance: val });
    setOpenDropdown(null);
  };

  const clearAll = () => onFiltersChange({});

  const hasFilters = (activeFilters.sector && activeFilters.sector.length > 0) || activeFilters.distance;

  const sectorLabel = activeSectors.size === 0
    ? `All ${config.sectorLabel || "Sector"}`
    : activeSectors.size === 1
      ? Array.from(activeSectors)[0]
      : `${activeSectors.size} selected`;

  const distLabel = activeDistance ? `${activeDistance} km` : "DIST";

  return (
    <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto no-scrollbar pb-2.5">
      <div className="flex items-center gap-2 w-max sm:w-auto sm:flex-wrap">
        {/* Sector pill */}
        {config.sectorOptions && (
          <div ref={sectorRef} className="relative flex-shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "sector" ? null : "sector")}
              className="flex items-center gap-1.5 border border-border rounded-full px-3.5 py-2 text-xs font-medium text-foreground bg-background hover:bg-muted transition-colors min-h-[36px]"
            >
              <span className="truncate max-w-[140px]">{sectorLabel}</span>
              <ChevronDown size={12} className={`transition-transform ${openDropdown === "sector" ? "rotate-180" : ""}`} />
            </button>
            {openDropdown === "sector" && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                {config.sectorOptions.map((opt) => (
                  <button key={opt} onClick={() => toggleSector(opt)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors min-h-[40px]">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${activeSectors.has(opt) ? "bg-primary border-primary" : "border-border"}`}>
                      {activeSectors.has(opt) && <Check size={10} className="text-primary-foreground" />}
                    </div>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Distance pill */}
        <div ref={distRef} className="relative flex-shrink-0">
          <button
            onClick={() => setOpenDropdown(openDropdown === "dist" ? null : "dist")}
            className="flex items-center gap-1.5 border border-border rounded-full px-3.5 py-2 text-xs font-medium text-foreground bg-background hover:bg-muted transition-colors min-h-[36px]"
          >
            <span>{distLabel}</span>
            <ChevronDown size={12} className={`transition-transform ${openDropdown === "dist" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "dist" && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-lg z-20">
              {config.distanceOptions.map((d) => (
                <button key={d} onClick={() => setDist(d)} className={`w-full text-left px-3 py-2.5 text-xs hover:bg-muted transition-colors min-h-[40px] ${activeDistance === d ? "font-bold text-primary" : ""}`}>
                  {d} km radius
                </button>
              ))}
              <button onClick={() => { onFiltersChange({ ...activeFilters, distance: undefined }); setOpenDropdown(null); }} className={`w-full text-left px-3 py-2.5 text-xs hover:bg-muted transition-colors min-h-[40px] ${!activeDistance ? "font-bold text-primary" : ""}`}>
                No limit
              </button>
            </div>
          )}
        </div>

        {/* Clear */}
        {hasFilters && (
          <button onClick={clearAll} className="flex-shrink-0 text-xs font-medium text-primary hover:underline px-2 min-h-[36px]">
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default ListFilterBar;

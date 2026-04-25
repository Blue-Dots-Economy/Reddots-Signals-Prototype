import { useState } from "react";
import { Phone, Navigation, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { haversineKm } from "@/lib/distance";
import DotCardPanel from "./DotCardPanel";
import type { UserProfile, RedDotsView } from "@/lib/phoneAuth";
import type { RedDot, RedDotFilters } from "@/pages/LaunchPage";

const RED = "#DC143C";
const GREY = "#4A4A4A";

const CATEGORY_LABELS: Record<string, string> = {
  hospital: "Hospital",
  ambulance: "Ambulance",
  mechanic: "Mechanic",
  tow: "Tow Truck",
  ssm: "SSM Volunteer",
  fuel: "Fuel Station",
};

interface Props {
  profile: UserProfile;
  activeView: RedDotsView;
  dots: RedDot[];
  filteredDots: RedDot[];
  activeFilters: RedDotFilters;
  onFiltersChange: (f: RedDotFilters) => void;
}

function isEmpty(val?: string | null) {
  if (!val) return true;
  const v = val.trim().toLowerCase();
  return v === "" || v === "-" || v === "na" || v === "n/a";
}

function firstPhone(raw?: string | null): string {
  if (!raw) return "";
  const segs = raw.split(/[\/,\n\s]+/);
  for (const s of segs) {
    const digits = s.replace(/\D/g, "");
    if (digits.length >= 3 && digits.length <= 4) return digits;
    if (digits.length >= 10) return digits.slice(-10);
  }
  return raw.trim();
}

function riskColors(level: string) {
  const l = (level || "").toUpperCase();
  if (l === "CRITICAL") return { bg: "#7F1D1D", fg: "white" };
  if (l === "HIGH") return { bg: "#DC143C", fg: "white" };
  if (l === "MODERATE") return { bg: "#F59E0B", fg: "white" };
  return { bg: "#94A3B8", fg: "white" };
}

const PersonaListView = ({ profile, activeView, dots, filteredDots, activeFilters, onFiltersChange }: Props) => {
  const [selectedDot, setSelectedDot] = useState<RedDot | null>(null);
  const accent = activeView === "accidents" ? GREY : RED;

  const sorted = [...filteredDots].sort(
    (a, b) => haversineKm(profile.lat, profile.lng, a.lat, a.lng) - haversineKm(profile.lat, profile.lng, b.lat, b.lng)
  );

  return (
    <div className="min-h-[100dvh] bg-background pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] px-3 sm:px-6 safe-px">
      <div className="max-w-5xl mx-auto">
        {/* Sticky Search */}
        <div
          className="sticky z-[10] -mx-3 sm:-mx-6 px-3 sm:px-6 py-2 bg-background/95 backdrop-blur-md"
          style={{ top: `calc(env(safe-area-inset-top) + 3rem)` }}
        >
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={activeFilters.search || ""}
              onChange={(e) => onFiltersChange({ ...activeFilters, search: e.target.value || undefined })}
              placeholder={activeView === "services" ? "Search hospitals, mechanics, areas..." : "Search hotspots, areas..."}
              className="w-full pl-10 pr-10 h-11 bg-card border border-border rounded-xl text-[15px] placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            {activeFilters.search && (
              <button
                onClick={() => onFiltersChange({ ...activeFilters, search: undefined })}
                aria-label="Clear search"
                className="tap-44 absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full"
              >
                <span className="text-lg">×</span>
              </button>
            )}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No Red Dots match your filters.</p>
            <button
              onClick={() => onFiltersChange({})}
              className="mt-3 text-xs font-semibold text-white px-4 py-2 rounded-lg"
              style={{ background: accent }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((dot) => {
              const dist = haversineKm(profile.lat, profile.lng, dot.lat, dot.lng).toFixed(1);

              if (dot.kind === "service") {
                const phone = firstPhone(dot.contact);
                const directions = `https://www.google.com/maps/dir/?api=1&destination=${dot.lat},${dot.lng}`;
                return (
                  <div
                    key={dot.id}
                    onClick={() => setSelectedDot(dot)}
                    className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground leading-tight">{dot.name}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: RED }}>
                            {CATEGORY_LABELS[dot.category || ""] || dot.category}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{dist} km</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {!isEmpty(dot.area) && <p>📍 {dot.area}</p>}
                      {!isEmpty(dot.availability) && <p>🕒 {dot.availability}</p>}
                      {!isEmpty(dot.speciality) && <p>🛠 {dot.speciality}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <a
                        href={phone ? `tel:${phone}` : undefined}
                        onClick={(e) => { e.stopPropagation(); if (!phone) e.preventDefault(); }}
                        className={`flex items-center justify-center gap-1.5 text-xs font-bold text-white py-2 rounded-lg ${phone ? "" : "opacity-50 pointer-events-none"}`}
                        style={{ background: RED }}
                      >
                        <Phone size={12} /> Call
                      </a>
                      <a
                        href={directions}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg border-2"
                        style={{ borderColor: RED, color: RED }}
                      >
                        <Navigation size={12} /> Directions
                      </a>
                    </div>
                  </div>
                );
              }

              // Hotspot
              const colors = riskColors(dot.riskLevel || "");
              return (
                <div
                  key={dot.id}
                  onClick={() => setSelectedDot(dot)}
                  className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground leading-tight">{dot.name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.fg }}>
                          {(dot.riskLevel || "UNKNOWN").toUpperCase()}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{dist} km · {dot.area}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 my-2 text-center">
                    {dot.totalAccidents && (
                      <div className="bg-muted/50 rounded-lg py-1.5">
                        <p className="text-sm font-bold text-foreground">{dot.totalAccidents}</p>
                        <p className="text-[10px] text-muted-foreground">accidents</p>
                      </div>
                    )}
                    {dot.deaths && (
                      <div className="bg-muted/50 rounded-lg py-1.5">
                        <p className="text-sm font-bold text-foreground">{dot.deaths}</p>
                        <p className="text-[10px] text-muted-foreground">deaths</p>
                      </div>
                    )}
                    {dot.fatalityRate && (
                      <div className="bg-muted/50 rounded-lg py-1.5">
                        <p className="text-sm font-bold text-foreground">{dot.fatalityRate}</p>
                        <p className="text-[10px] text-muted-foreground">fatality</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success("Hazard report submitted", {
                        description: `Thanks — we've logged this near ${dot.name}.`,
                      });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white py-2 rounded-lg mt-2"
                    style={{ background: GREY }}
                  >
                    <AlertTriangle size={12} /> Report a hazard here
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDot && (
        <DotCardPanel dot={selectedDot} activeView={activeView} onClose={() => setSelectedDot(null)} />
      )}
    </div>
  );
};

export default PersonaListView;

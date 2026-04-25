import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { loadProfile, clearProfile, setProfileView, type UserProfile, type RedDotsView } from "@/lib/phoneAuth";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/distance";
import { selectDistributedTopN } from "@/lib/mapSelection";
import ChatRouting from "@/components/ChatRouting";
import PersonaMap from "@/components/map/PersonaMap";
import PersonaListView from "@/components/map/PersonaListView";
import PersonaNavIsland, { type ViewMode } from "@/components/map/PersonaNavIsland";

export interface RedDotFilters {
  // Services
  category?: string[];        // hospital, ambulance, mechanic, tow, ssm, fuel
  type?: string[];            // Government, Private, Volunteer
  open24x7?: boolean;
  // Accidents
  risk?: string[];            // CRITICAL, HIGH, MODERATE
  roadClass?: string[];       // National Highway, State Highway, etc.
  dotType?: "hotspot" | "pothole"; // undefined = All
  // Shared
  distance?: number;
  search?: string;
}

export interface RedDot {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  contact?: string;
  description?: string | null;
  // Service fields (sourced from student_dots)
  category?: string;          // hospital | ambulance | mechanic | tow | ssm | fuel
  type?: string;              // Government | Private | Volunteer
  availability?: string;      // 24x7 | Day-time
  speciality?: string;
  costRange?: string;
  goldenHour?: string;
  // Accident fields (sourced from centre_dots)
  totalAccidents?: string;
  deaths?: string;
  injured?: string;
  fatalityRate?: string;
  riskLevel?: string;         // CRITICAL | HIGH | MODERATE
  roadClass?: string;
  topCollision?: string;
  // What kind of dot this is
  kind: "service" | "hotspot" | "pothole";
  iconKey?: string;
  raw: Record<string, any>;
}

const mapServiceRow = (r: any): RedDot => ({
  id: r.id,
  name: r.name,
  area: r.area,
  lat: r.lat,
  lng: r.lng,
  contact: r.contact,
  description: r.description,
  category: r.category || r.icon || "hospital",
  type: r.pillar || "Private",
  availability: r.availability,
  speciality: r.skills,
  costRange: r.needs,
  goldenHour: r.other_help,
  kind: "service",
  iconKey: r.icon,
  raw: r,
});

const mapHotspotRow = (r: any): RedDot => ({
  id: r.id,
  name: r.name,
  area: r.area,
  lat: r.lat,
  lng: r.lng,
  contact: r.contact,
  description: r.description,
  totalAccidents: r.openings,
  deaths: r.job_role_salary,
  injured: r.work_experience_years,
  fatalityRate: r.rating,
  riskLevel: r.relevance,
  roadClass: r.nature_of_job,
  topCollision: r.services,
  kind: "hotspot",
  iconKey: "warning",
  raw: r,
});

const mapPotholeRow = (r: any): RedDot => ({
  id: r.id,
  name: r.name,
  area: r.area,
  lat: r.lat,
  lng: r.lng,
  contact: r.contact,
  description: r.description,
  riskLevel: r.severity,
  roadClass: r.road_class,
  kind: "pothole",
  iconKey: "pothole",
  raw: r,
});

const LaunchPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [activeView, setActiveView] = useState<RedDotsView | null>(() => loadProfile()?.view ?? null);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [activeFilters, setActiveFilters] = useState<RedDotFilters>({});
  const [services, setServices] = useState<RedDot[]>([]);
  const [hotspots, setHotspots] = useState<RedDot[]>([]);

  useEffect(() => {
    const p = loadProfile();
    if (!p) {
      navigate("/", { replace: true });
      return;
    }
    setProfile(p);
    setActiveView(p.view ?? null);
  }, [navigate]);

  // Fetch service providers from student_dots
  useEffect(() => {
    if (!profile) return;
    let alive = true;

    const loadServices = async () => {
      const { data } = await supabase.from("student_dots").select("*").order("created_at", { ascending: false });
      if (!alive || !data) return;
      setServices(data.map(mapServiceRow));
    };

    const loadAccidentDots = async () => {
      const [{ data: hotspotRows }, { data: potholeRows }] = await Promise.all([
        supabase.from("centre_dots").select("*").order("created_at", { ascending: false }),
        supabase.from("pothole_dots").select("*").order("created_at", { ascending: false }),
      ]);

      if (!alive) return;

      setHotspots([
        ...(hotspotRows ?? []).map(mapHotspotRow),
        ...(potholeRows ?? []).map(mapPotholeRow),
      ]);
    };

    loadServices();
    loadAccidentDots();

    // Realtime
    const channel = supabase
      .channel("red_dots_data")
      .on("postgres_changes", { event: "*", schema: "public", table: "student_dots" }, () => {
        loadServices();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "centre_dots" }, () => {
        loadAccidentDots();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pothole_dots" }, () => {
        loadAccidentDots();
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [profile?.phone]);

  const handleChooseView = (v: RedDotsView) => {
    setActiveView(v);
    setProfileView(v);
    setActiveFilters({});
  };

  const handleSwitchView = (v: RedDotsView) => {
    setActiveView(v);
    setProfileView(v);
    setActiveFilters({});
  };

  const dots: RedDot[] = activeView === "accidents" ? hotspots : services;

  const MAX_DOTS_ON_MAP = 50;
  const RISK_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };

  const filteredDots = useMemo(() => {
    if (!profile) return dots;
    const matched = dots.filter((d) => {
      if (activeFilters.distance) {
        const dist = haversineKm(profile.lat, profile.lng, d.lat, d.lng);
        if (dist > activeFilters.distance) return false;
      }
      if (activeFilters.search && activeFilters.search.trim()) {
        const q = activeFilters.search.trim().toLowerCase();
        const hay = `${d.name} ${d.area} ${d.category ?? ""} ${d.speciality ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (d.kind === "service") {
        if (activeFilters.category && activeFilters.category.length > 0) {
          if (!activeFilters.category.includes(d.category || "")) return false;
        }
        if (activeFilters.type && activeFilters.type.length > 0) {
          if (!activeFilters.type.includes(d.type || "")) return false;
        }
        if (activeFilters.open24x7) {
          if (!(d.availability || "").toLowerCase().includes("24")) return false;
        }
      } else {
        if (activeFilters.dotType && d.kind !== activeFilters.dotType) return false;
        if (activeFilters.risk && activeFilters.risk.length > 0) {
          if (!activeFilters.risk.includes((d.riskLevel || "").toUpperCase())) return false;
        }
        if (activeFilters.roadClass && activeFilters.roadClass.length > 0) {
          if (!activeFilters.roadClass.includes(d.roadClass || "")) return false;
        }
      }
      return true;
    });

    // Cap to top N by relevance:
    // - Accidents: rank by riskLevel (CRITICAL > HIGH > MODERATE > LOW)
    // - Services: keep first N (already ordered by created_at desc from query)
    // Distance to user is the tiebreaker so closer dots win.
    const compareDots = (a: RedDot, b: RedDot) => {
      const ra = RISK_RANK[(a.riskLevel || "").toUpperCase()] ?? 99;
      const rb = RISK_RANK[(b.riskLevel || "").toUpperCase()] ?? 99;
      if (ra !== rb) return ra - rb;
      const da = haversineKm(profile.lat, profile.lng, a.lat, a.lng);
      const db = haversineKm(profile.lat, profile.lng, b.lat, b.lng);
      return da - db;
    };

    // Always include all potholes (they are rare citizen reports), then fill remaining
    // slots with distributed top-N hotspots/services so grey dots are never crowded out.
    if (activeView === "accidents") {
      const potholes = matched.filter((d) => d.kind === "pothole");
      const others = matched.filter((d) => d.kind !== "pothole");
      const remaining = Math.max(0, MAX_DOTS_ON_MAP - potholes.length);
      const topOthers = selectDistributedTopN(others, remaining, compareDots);
      return [...topOthers, ...potholes];
    }

    return selectDistributedTopN(matched, MAX_DOTS_ON_MAP, compareDots);
  }, [dots, activeFilters, profile, activeView]);

  if (!profile) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background safe-px">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm font-medium text-foreground">Loading the map…</p>
        </div>
      </div>
    );
  }

  // First-time post-login: show the routing question
  if (!activeView) {
    return <ChatRouting userName={profile.name} onChoose={handleChooseView} />;
  }

  const handleLogout = () => {
    clearProfile();
    navigate("/", { replace: true });
  };

  const showFloatingSignOut = viewMode === "map";

  return (
    <div className={`relative w-screen h-[100dvh] ${viewMode === "map" ? "overflow-hidden" : "overflow-y-auto"}`}>
      {showFloatingSignOut && (
        <button
          onClick={handleLogout}
          aria-label="Sign out"
          className="fixed right-3 sm:right-5 z-[1200] tap-44 inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-full bg-background/95 backdrop-blur-md border border-border shadow-md text-xs sm:text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          style={{ top: `calc(env(safe-area-inset-top) + 0.75rem)` }}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      )}

      {viewMode === "list" && (
        <div className="fixed top-0 left-0 right-0 z-[1100] bg-background/95 backdrop-blur-md border-b border-border safe-pt safe-px">
          <div className="h-12 flex items-center justify-between gap-2 px-3 sm:px-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground truncate">
                {activeView === "services" ? "Service Providers" : "Accident Hotspots"}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                Showing top {filteredDots.length} of {dots.length} Red Dots {dots.length > MAX_DOTS_ON_MAP ? "(by relevance)" : ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="tap-44 inline-flex items-center justify-center gap-1.5 px-3 rounded-full text-xs font-semibold text-foreground hover:bg-accent transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <PersonaNavIsland
        activeView={activeView}
        onSwitchView={handleSwitchView}
        viewMode={viewMode}
        onSwitchMode={setViewMode}
      />

      {viewMode === "map" ? (
        <PersonaMap
          profile={profile}
          activeView={activeView}
          dots={dots}
          filteredDots={filteredDots}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
        />
      ) : (
        <PersonaListView
          profile={profile}
          activeView={activeView}
          dots={dots}
          filteredDots={filteredDots}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
        />
      )}
    </div>
  );
};

export default LaunchPage;

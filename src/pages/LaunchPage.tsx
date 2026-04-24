import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { loadProfile, clearProfile, type UserProfile } from "@/lib/phoneAuth";
import PersonaChat, { type ChatFilters } from "@/components/chat/PersonaChat";
import PersonaMap from "@/components/map/PersonaMap";
import PersonaNavIsland, { type PersonaView } from "@/components/map/PersonaNavIsland";
import PersonaListView from "@/components/map/PersonaListView";
import PersonaConnections from "@/components/map/PersonaConnections";
import ListFilterBar from "@/components/map/ListFilterBar";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/distance";
import { usePersonaConnections } from "@/hooks/usePersonaConnections";
import { LogOut } from "lucide-react";

interface Dot {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  nature_of_job?: string;
  school_iti?: string;
  jobs_interested_nature?: string;
  hiring_manager_name?: string;
  contact?: string;
  job_role_salary?: string;
  [key: string]: any;
}

function isInternshipRow(row: Dot): boolean {
  const nj = (row.nature_of_job || "").toLowerCase().trim();
  return nj === "internship" || nj === "internships" || nj.includes("intern");
}

function isITIRow(row: Dot): boolean {
  const si = (row.school_iti || "").toLowerCase();
  return si.includes("iti") || si.includes("industrial training");
}

const LaunchPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [chatComplete, setChatComplete] = useState(false);
  const [filters, setFilters] = useState<ChatFilters>({});
  const [chatFlowEnabled, setChatFlowEnabled] = useState<boolean | null>(null);
  const [activeView, setActiveView] = useState<PersonaView>("map");
  const [activeFilters, setActiveFilters] = useState<ChatFilters>({});
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    const p = loadProfile();
    if (!p) {
      navigate("/", { replace: true });
      return;
    }

    setProfile(p);

    let isActive = true;

    const loadAppSettings = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "chat_flow_enabled")
          .single();

        if (!isActive) return;

        const enabled = data?.value === "true";
        setChatFlowEnabled(enabled);
        if (!enabled) {
          setChatComplete(true);
        }
      } catch {
        if (!isActive) return;

        setChatFlowEnabled(false);
        setChatComplete(true);
      }
    };

    loadAppSettings();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  // Fetch dots based on persona
  useEffect(() => {
    if (!profile) return;
    const isSeeker = profile.persona === "school_student" || profile.persona === "iti_student";

    const fetchDots = async () => {
      if (isSeeker) {
        const { data } = await supabase.from("centre_dots").select("*");
        if (!data) return;
        let filtered = data as Dot[];
        if (profile.persona === "school_student") {
          filtered = filtered.filter(isInternshipRow);
        } else {
          filtered = filtered.filter((d) => !isInternshipRow(d));
        }
        setDots(filtered.map(d => ({ ...d, icon: "briefcase" as const })));
      } else {
        const { data } = await supabase.from("student_dots").select("*");
        if (!data) return;
        let filtered = data as Dot[];
        if (profile.persona === "msme_hiring_interns") {
          filtered = filtered.filter((d) => !isITIRow(d));
        } else {
          filtered = filtered.filter(isITIRow);
        }
        setDots(filtered);
      }
    };
    fetchDots();
  }, [profile?.persona]);

  const handleChatComplete = (f: ChatFilters) => {
    setFilters(f);
    setActiveFilters(f);
    setChatComplete(true);
  };

  const isSeeker = profile ? (profile.persona === "school_student" || profile.persona === "iti_student") : true;
  const entityLabel = isSeeker ? "Employers" : "Students";

  const filteredDots = useMemo(() => {
    return dots.filter((dot) => {
      if (activeFilters.distance) {
        if (!profile) return true;
        const dist = haversineKm(profile.lat, profile.lng, dot.lat, dot.lng);
        if (dist > activeFilters.distance) return false;
      }
      if (activeFilters.sector && activeFilters.sector.length > 0) {
        if (isSeeker) {
          const jobType = (dot.nature_of_job || "").toLowerCase();
          const matched = activeFilters.sector.some((s) => jobType.includes(s.toLowerCase()));
          if (!matched) return false;
        } else {
          const interest = (dot.jobs_interested_nature || "").toLowerCase();
          const matched = activeFilters.sector.some((s) => interest.includes(s.toLowerCase()));
          if (!matched) return false;
        }
      }
      return true;
    });
  }, [dots, activeFilters, profile]);

  if (!profile || chatFlowEnabled === null) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background safe-px">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm font-medium text-foreground">Loading your map…</p>
        </div>
      </div>
    );
  }

  if (!chatComplete) {
    return (
      <div className="h-[100dvh]">
        <PersonaChat
          persona={profile.persona}
          userName={profile.name}
          onComplete={handleChatComplete}
        />
      </div>
    );
  }

  const handleLogout = () => {
    clearProfile();
    navigate("/", { replace: true });
  };

  // On list/connections views, show Sign Out inside the header to avoid overlap.
  // On map view, render as a floating pill (header is absent).
  const showFloatingSignOut = activeView === "map";

  return (
    <div className={`relative w-screen h-[100dvh] ${activeView === "map" ? "overflow-hidden" : "overflow-y-auto"}`}>
      {/* Floating Sign Out — map view only */}
      {showFloatingSignOut && (
        <button
          onClick={handleLogout}
          aria-label="Sign out"
          className="fixed right-3 sm:right-5 z-[1200] tap-44 inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-full bg-background/95 backdrop-blur-md border border-border shadow-md text-xs sm:text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          style={{ top: `calc(env(safe-area-inset-top) + 0.75rem)` }}
        >
          <LogOut size={16} />
          <span className="hidden xs:inline sm:inline">Sign Out</span>
        </button>
      )}

      {/* Fixed top header — list & connections views only */}
      {activeView === "list" && (
        <div
          className="fixed top-0 left-0 right-0 z-[1100] bg-background/95 backdrop-blur-md border-b border-border safe-pt safe-px"
        >
          <div className="h-12 flex items-center justify-between gap-2 px-3 sm:px-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground truncate">
                {isSeeker ? "Provider" : "Seeker"} Directory
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {filteredDots.length} of {dots.length} {entityLabel.toLowerCase()}
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
      {activeView === "connections" && (
        <div
          className="fixed top-0 left-0 right-0 z-[1100] bg-background/90 backdrop-blur-md border-b border-border safe-pt safe-px"
        >
          <div className="h-12 flex items-center justify-between gap-2 px-3 sm:px-4">
            <span className="text-sm font-bold text-foreground truncate">My Connections</span>
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

      <PersonaNavIslandWrapper profile={profile} activeView={activeView} setActiveView={setActiveView} />

      {activeView === "map" && (
        <PersonaMap
          profile={profile}
          filters={activeFilters}
          dots={dots}
          filteredDots={filteredDots}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          entityLabel={entityLabel}
          isSeeker={isSeeker}
        />
      )}

      {activeView === "list" && (
        <PersonaListView
          profile={profile}
          filters={activeFilters}
          dots={dots}
          filteredDots={filteredDots}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          entityLabel={entityLabel}
          isSeeker={isSeeker}
        />
      )}

      {activeView === "connections" && (
        <PersonaConnections profile={profile} />
      )}
    </div>
  );
};

const PersonaNavIslandWrapper = ({ profile, activeView, setActiveView }: { profile: UserProfile; activeView: PersonaView; setActiveView: (v: PersonaView) => void }) => {
  const { pendingReceivedCount } = usePersonaConnections(profile.phone);
  return <PersonaNavIsland activeView={activeView} onSwitchView={setActiveView} connectionCount={pendingReceivedCount} />;
};

export default LaunchPage;

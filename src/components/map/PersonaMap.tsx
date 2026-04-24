/// <reference types="google.maps" />

import { useRef, useState, useEffect } from "react";
import { useGoogleMaps, CLEAN_MAP_STYLE } from "@/hooks/useGoogleMaps";
import { MIN_ZOOM, MAX_ZOOM } from "@/lib/mapData";
import ZoomControls from "./ZoomControls";
import PersonaFilterTerminal from "./PersonaFilterTerminal";
import DotCardPanel from "./DotCardPanel";
import type { UserProfile } from "@/lib/phoneAuth";
import type { ChatFilters } from "@/components/chat/PersonaChat";
import { usePersonaConnections, type PersonaConnStatus } from "@/hooks/usePersonaConnections";

const BLUE = "#DC143C";

interface Dot {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  icon?: string;
  nature_of_job?: string;
  hiring_manager_name?: string;
  contact?: string;
  job_role_salary?: string;
  [key: string]: any;
}

interface Props {
  profile: UserProfile;
  filters: ChatFilters;
  dots: Dot[];
  filteredDots: Dot[];
  activeFilters: ChatFilters;
  onFiltersChange: (f: ChatFilters) => void;
  entityLabel: string;
  isSeeker: boolean;
}

const ICON_SVGS: Record<string, string> = {
  briefcase: `<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
  book: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  compass: `<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`,
  graduationCap: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 6 3 6 3s6-1 6-3v-5"/>`,
  wrench: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  clipboard: `<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>`,
  default: `<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="10"/>`,
};

function createDotMarker(name: string, icon: string | undefined, status: PersonaConnStatus | null): HTMLElement {
  const svgInner = ICON_SVGS[icon || ""] || ICON_SVGS.default;
  const opacity = status === "declined" ? "0.5" : "1";
  let badge = "";
  if (status === "shortlisted") {
    badge = `<div style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:#DC143C;border:2px solid white;display:flex;align-items:center;justify-content:center;">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>
    </div>`;
  } else if (status === "pending") {
    badge = `<div style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:#D97706;border:2px solid white;display:flex;align-items:center;justify-content:center;">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    </div>`;
  } else if (status === "accepted") {
    badge = `<div style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:#16A34A;border:2px solid white;display:flex;align-items:center;justify-content:center;">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>`;
  }
  const el = document.createElement("div");
  el.innerHTML = `<div style="position:relative;cursor:pointer;opacity:${opacity};">
    <div style="width:44px;height:44px;border-radius:50%;background:${BLUE};display:flex;align-items:center;justify-content:center;border:2.5px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        ${svgInner}
      </svg>
    </div>
    ${badge}
  </div>`;
  return el.firstElementChild as HTMLElement;
}

const PersonaMap = ({ profile, filters, dots, filteredDots, activeFilters, onFiltersChange, entityLabel, isSeeker }: Props) => {
  const { ready: mapsReady, error: mapsError } = useGoogleMaps();
  const { getConnectionStatus, allConnections } = usePersonaConnections(profile.phone);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [selectedDot, setSelectedDot] = useState<Dot | null>(null);
  const [dotScreenPos, setDotScreenPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !mapsReady) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    const map = new g.maps.Map(mapRef.current, {
      center: { lat: profile.lat, lng: profile.lng },
      zoom: 12,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      disableDefaultUI: true,
      zoomControl: false,
      styles: CLEAN_MAP_STYLE,
      gestureHandling: "greedy",
      mapId: "persona_map_id",
    });
    mapInstance.current = map;
    setMapReady(true);

    const locContent = document.createElement("div");
    locContent.innerHTML = `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(66,133,244,0.15);animation:pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite;"></div>
      <div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
    </div>`;
    new g.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: profile.lat, lng: profile.lng },
      content: locContent.firstElementChild as HTMLElement,
      zIndex: 9999,
    });
  }, [mapsReady]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    markersRef.current.forEach((m: any) => (m.map = null));
    markersRef.current = [];

    filteredDots.forEach((dot) => {
      const status = getConnectionStatus(dot.id);
      const content = createDotMarker(dot.name, dot.icon, status);
      const marker = new g.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: dot.lat, lng: dot.lng },
        content,
      });
      content.addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = content.getBoundingClientRect();
        setDotScreenPos({ x: rect.left + rect.width / 2, y: rect.top });
        setSelectedDot(dot);
      });
      marker.addEventListener("gmp-click", () => {
        const rect = content.getBoundingClientRect();
        setDotScreenPos({ x: rect.left + rect.width / 2, y: rect.top });
        setSelectedDot(dot);
      });
      markersRef.current.push(marker);
    });
  }, [filteredDots, mapReady, allConnections]);

  const handleZoomIn = () => { const m = mapInstance.current; if (m) m.setZoom((m.getZoom() || 12) + 1); };
  const handleZoomOut = () => { const m = mapInstance.current; if (m) m.setZoom((m.getZoom() || 12) - 1); };
  const handleReset = () => {
    const m = mapInstance.current;
    if (m) { m.setCenter({ lat: profile.lat, lng: profile.lng }); m.setZoom(12); }
  };

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />

      <PersonaFilterTerminal
        persona={profile.persona}
        initialFilters={activeFilters}
        onFiltersChange={onFiltersChange}
        visibleCount={filteredDots.length}
        totalCount={dots.length}
        entityLabel={entityLabel}
      />

      {filteredDots.length === 0 && dots.length > 0 && (
        <div className="absolute inset-0 z-[600] flex items-center justify-center pointer-events-none">
          <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border p-6 text-center shadow-lg pointer-events-auto max-w-xs">
            <p className="text-sm font-medium text-foreground mb-1">No matches found</p>
            <p className="text-xs text-muted-foreground mb-3">Try changing your filters.</p>
            <button
              onClick={() => onFiltersChange({})}
              className="text-xs font-semibold text-white px-4 py-2 rounded-lg"
              style={{ background: BLUE }}
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {mapsError && (
        <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-background/80">
          <p className="text-destructive font-semibold">{mapsError}</p>
        </div>
      )}

      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset} />

      {selectedDot && (
        <DotCardPanel dot={selectedDot} isSeeker={isSeeker} profile={profile} anchorPos={dotScreenPos} onClose={() => { setSelectedDot(null); setDotScreenPos(null); }} />
      )}
    </>
  );
};

export default PersonaMap;

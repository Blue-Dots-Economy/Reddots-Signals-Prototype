/// <reference types="google.maps" />

import { useRef, useState, useEffect } from "react";
import { useGoogleMaps, CLEAN_MAP_STYLE } from "@/hooks/useGoogleMaps";
import { MIN_ZOOM, MAX_ZOOM } from "@/lib/mapData";
import ZoomControls from "./ZoomControls";
import PersonaFilterTerminal from "./PersonaFilterTerminal";
import DotCardPanel from "./DotCardPanel";
import type { UserProfile, RedDotsView } from "@/lib/phoneAuth";
import type { RedDot, RedDotFilters } from "@/pages/LaunchPage";

const RED = "#DC143C";
const GREY = "#4A4A4A";

interface Props {
  profile: UserProfile;
  activeView: RedDotsView;
  dots: RedDot[];
  filteredDots: RedDot[];
  activeFilters: RedDotFilters;
  onFiltersChange: (f: RedDotFilters) => void;
}

const ICON_SVGS: Record<string, string> = {
  hospital: `<path d="M12 2v20"/><path d="M2 12h20"/><rect x="4" y="4" width="16" height="16" rx="2"/>`,
  ambulance: `<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-4l-2-3h-7v7h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M14 8h2v3h-2z"/><path d="M15 6.5v3"/>`,
  mechanic: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  tow: `<path d="M5 18H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h11v10"/><path d="M14 8h4l4 4v5h-3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>`,
  ssm: `<path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/>`,
  fuel: `<path d="M3 22V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v18"/><path d="M3 22h13"/><path d="M16 8h3a2 2 0 0 1 2 2v8a2 2 0 1 1-4 0v-3"/>`,
  warning: `<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  default: `<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="10"/>`,
};

function dotColorFor(dot: RedDot, view: RedDotsView): string {
  // Accidents view: red for hotspots, grey for citizen-reported potholes.
  if (view === "accidents") return dot.kind === "pothole" ? GREY : RED;
  return RED;
}

function createDotMarker(dot: RedDot, view: RedDotsView, isUserNearest: boolean): HTMLElement {
  const iconKey = dot.kind === "hotspot" ? "warning" : (dot.iconKey || dot.category || "default");
  const svgInner = ICON_SVGS[iconKey] || ICON_SVGS.default;
  const fill = dotColorFor(dot, view);
  const el = document.createElement("div");
  el.innerHTML = `<div style="position:relative;cursor:pointer;">
    <div style="width:44px;height:44px;border-radius:50%;background:${fill};display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.18);">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        ${svgInner}
      </svg>
    </div>
  </div>`;
  return el.firstElementChild as HTMLElement;
}

const PersonaMap = ({ profile, activeView, dots, filteredDots, activeFilters, onFiltersChange }: Props) => {
  const { ready: mapsReady, error: mapsError } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [selectedDot, setSelectedDot] = useState<RedDot | null>(null);
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
      const content = createDotMarker(dot, activeView, false);
      const marker = new g.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: dot.lat, lng: dot.lng },
        content,
      });
      const open = () => {
        const rect = content.getBoundingClientRect();
        setDotScreenPos({ x: rect.left + rect.width / 2, y: rect.top });
        setSelectedDot(dot);
      };
      content.addEventListener("click", (e) => { e.stopPropagation(); open(); });
      marker.addEventListener("gmp-click", open);
      markersRef.current.push(marker);
    });
  }, [filteredDots, mapReady, activeView]);

  const handleZoomIn = () => { const m = mapInstance.current; if (m) m.setZoom((m.getZoom() || 12) + 1); };
  const handleZoomOut = () => { const m = mapInstance.current; if (m) m.setZoom((m.getZoom() || 12) - 1); };
  const handleReset = () => {
    const m = mapInstance.current;
    if (m) { m.setCenter({ lat: profile.lat, lng: profile.lng }); m.setZoom(12); }
  };

  const accent = activeView === "accidents" ? GREY : RED;

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />

      <PersonaFilterTerminal
        activeView={activeView}
        activeFilters={activeFilters}
        onFiltersChange={onFiltersChange}
        visibleCount={filteredDots.length}
        totalCount={dots.length}
      />

      {filteredDots.length === 0 && dots.length > 0 && (
        <div className="absolute inset-0 z-[600] flex items-center justify-center pointer-events-none">
          <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border p-6 text-center shadow-lg pointer-events-auto max-w-xs">
            <p className="text-sm font-medium text-foreground mb-1">No Red Dots match your filters</p>
            <p className="text-xs text-muted-foreground mb-3">Try changing the filter or search.</p>
            <button
              onClick={() => onFiltersChange({})}
              className="text-xs font-semibold text-white px-4 py-2 rounded-lg"
              style={{ background: accent }}
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
        <DotCardPanel
          dot={selectedDot}
          activeView={activeView}
          anchorPos={dotScreenPos}
          onClose={() => { setSelectedDot(null); setDotScreenPos(null); }}
        />
      )}
    </>
  );
};

export default PersonaMap;

/// <reference types="google.maps" />

import { useRef, useState, useEffect, useMemo } from "react";
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

// Lucide icon SVG inner paths (24x24 viewBox)
const ICON_SVGS: Record<string, string> = {
  // Hospital (Lucide "hospital")
  hospital: `<path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>`,
  // Siren (Lucide "siren") — for Ambulance
  ambulance: `<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>`,
  // Wrench (Lucide "wrench") — Mechanic
  mechanic: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  // Truck (Lucide "truck") — Tow Truck
  tow: `<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>`,
  // HeartPulse (Lucide "heart-pulse") — SSM
  ssm: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>`,
  // Fuel (Lucide "fuel") — Fuel Station
  fuel: `<line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>`,
  // Shield (Lucide "shield") — Police Station
  police: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>`,
  // AlertTriangle (Lucide "triangle-alert") — Accident hotspot
  warning: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
  // Construction (Lucide "construction") — Pothole / hazard
  pothole: `<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>`,
  // MapPin fallback
  default: `<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>`,
};

function normalizeCategory(cat?: string): string {
  if (!cat) return "default";
  const c = cat.toLowerCase().trim();
  if (c.includes("hospital")) return "hospital";
  if (c.includes("ambulance")) return "ambulance";
  if (c.includes("mechanic")) return "mechanic";
  if (c.includes("tow")) return "tow";
  if (c === "ssm" || c.includes("sadak") || c.includes("suraksha")) return "ssm";
  if (c.includes("fuel") || c.includes("petrol") || c.includes("gas")) return "fuel";
  if (c.includes("police")) return "police";
  return "default";
}

function dotColorFor(dot: RedDot, view: RedDotsView): string {
  // Accidents view: red for hotspots, grey for citizen-reported potholes.
  if (view === "accidents") return dot.kind === "pothole" ? GREY : RED;
  return RED;
}

function createDotMarker(dot: RedDot, view: RedDotsView, isUserNearest: boolean): HTMLElement {
  let iconKey: string;
  if (view === "accidents") {
    iconKey = dot.kind === "pothole" ? "pothole" : "warning";
  } else {
    iconKey = normalizeCategory(dot.iconKey || dot.category);
  }
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

function getMarkerPosition(dot: RedDot): { lat: number; lng: number } {
  if (dot.kind !== "pothole") return { lat: dot.lat, lng: dot.lng };

  const seed = dot.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const angle = (seed % 360) * (Math.PI / 180);
  const radius = 0.00035;

  return {
    lat: dot.lat + Math.sin(angle) * radius,
    lng: dot.lng + Math.cos(angle) * radius,
  };
}

const PersonaMap = ({ profile, activeView, dots, filteredDots, activeFilters, onFiltersChange }: Props) => {
  const { ready: mapsReady, error: mapsError } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [selectedDot, setSelectedDot] = useState<RedDot | null>(null);
  const [dotScreenPos, setDotScreenPos] = useState<{ x: number; y: number } | null>(null);
  const orderedDots = useMemo(() => {
    if (activeView !== "accidents") return filteredDots;
    return [...filteredDots].sort((a, b) => Number(a.kind === "pothole") - Number(b.kind === "pothole"));
  }, [activeView, filteredDots]);

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

    orderedDots.forEach((dot) => {
      const content = createDotMarker(dot, activeView, false);
      const position = getMarkerPosition(dot);
      const marker = new g.maps.marker.AdvancedMarkerElement({
        map,
        position,
        content,
        zIndex: dot.kind === "pothole" ? 3000 : 2000,
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
  }, [orderedDots, mapReady, activeView]);

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

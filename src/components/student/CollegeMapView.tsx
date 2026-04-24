/// <reference types="google.maps" />

import { useRef, useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps, CLEAN_MAP_STYLE } from "@/hooks/useGoogleMaps";

import { GHAZIABAD_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from "@/lib/mapData";
import { useUserLocation } from "@/hooks/useUserLocation";
import ZoomControls from "../map/ZoomControls";
import { ArrowLeft, Search, X } from "lucide-react";

const COLLEGE_COLOR = "#6A1B9A";

interface College {
  id: string; name: string; area: string; lat: number; lng: number;
  programs: string | null; fees: string | null; address: string | null;
  description: string | null; rating: string | null;
}

interface Props { onBack: () => void; initialProgram?: string; }

function createCollegeMarker(c: College, opacity: number): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<div style="position:relative;opacity:${opacity};cursor:pointer;">
    <div style="position:absolute;inset:-6px;border-radius:50%;animation:pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite;background:rgba(106,27,154,0.3)"></div>
    <div style="width:44px;height:44px;border-radius:50%;background:${COLLEGE_COLOR};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5"/>
      </svg>
    </div>
  </div>`;
  return el.firstElementChild as HTMLElement;
}

function createCollegePopup(c: College): string {
  const rows = [
    ["Programs", c.programs], ["Fees", c.fees], ["Address", c.address],
    ["Rating", c.rating ? `⭐ ${c.rating}` : undefined],
  ].filter(([, v]) => v);
  return `<div style="width:280px;padding:16px;font-family:system-ui,sans-serif;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="width:28px;height:28px;border-radius:50%;background:${COLLEGE_COLOR};display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5"/></svg>
      </div>
      <span style="background:${COLLEGE_COLOR};color:white;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;">College</span>
    </div>
    <p style="font-weight:700;font-size:17px;color:#0F172A;margin:8px 0 0;">${c.name}</p>
    <p style="font-size:12px;color:#94A3B8;margin:2px 0 0;">${c.area}</p>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:10px 0 8px;"/>
    <table style="width:100%;font-size:12px;border-collapse:collapse;">
      ${rows.map(([l, v]) => `<tr><td style="color:#94A3B8;padding:3px 8px 3px 0;font-weight:500;">${l}</td><td style="color:#475569;padding:3px 0;">${v}</td></tr>`).join("")}
    </table>
    ${c.description ? `<p style="font-size:12px;color:#64748B;margin:10px 0 0;line-height:1.5;">${c.description}</p>` : ""}
  </div>`;
}

const CollegeMapView = ({ onBack, initialProgram }: Props) => {
  const { ready: mapsReady, error: mapsError } = useGoogleMaps();
  const userLocation = useUserLocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const iwRef = useRef<any>(null);

  const [colleges, setColleges] = useState<College[]>([]);
  const [search, setSearch] = useState("");
  const [activePrograms, setActivePrograms] = useState<Set<string>>(new Set());
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    supabase.from("college_dots").select("*").then(({ data }) => {
      const d = (data || []) as College[];
      setColleges(d);
      if (initialProgram) {
        setActivePrograms(new Set(d.filter((c) => c.programs?.toLowerCase().includes(initialProgram.toLowerCase())).map((c) => c.programs!)));
      } else {
        setActivePrograms(new Set(d.filter((c) => c.programs).map((c) => c.programs!)));
      }
    });
  }, [initialProgram]);

  const programOptions = useMemo(() => [...new Set(colleges.filter((c) => c.programs).map((c) => c.programs!))].sort(), [colleges]);

  const filtered = useMemo(() => {
    return colleges.filter((c) => {
      if (c.programs && !activePrograms.has(c.programs)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.area.toLowerCase().includes(q) || (c.programs || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [colleges, activePrograms, search]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !mapsReady) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    const map = new g.maps.Map(mapRef.current, {
      center: { lat: GHAZIABAD_CENTER[0], lng: GHAZIABAD_CENTER[1] },
      zoom: DEFAULT_ZOOM, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM,
      disableDefaultUI: true, zoomControl: false,
      styles: CLEAN_MAP_STYLE, mapId: "yd-college-map", gestureHandling: "greedy",
    });
    mapInstance.current = map;
    iwRef.current = new g.maps.InfoWindow();
    setMapReady(true);
  }, [mapsReady]);

  const userLocMarkerRef = useRef<any>(null);
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady || !userLocation.loaded || !userLocation.lat) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    if (userLocMarkerRef.current) userLocMarkerRef.current.map = null;

    const locContent = document.createElement("div");
    locContent.innerHTML = `<div style="position:relative;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(66,133,244,0.15);animation:pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite;"></div><div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div></div>`;
    userLocMarkerRef.current = new g.maps.marker.AdvancedMarkerElement({ map, position: { lat: userLocation.lat, lng: userLocation.lng }, content: locContent.firstElementChild as HTMLElement, zIndex: 9999 });

    map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
    map.setZoom(13);
  }, [mapReady, userLocation]);

  const markerDataRef = useRef<{ marker: any; lat: number; lng: number }[]>([]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    markersRef.current.forEach((m: any) => (m.map = null));
    markersRef.current = [];
    markerDataRef.current = [];

    const newMarkerData: { marker: any; lat: number; lng: number }[] = [];
    filtered.forEach((c) => {
      const content = createCollegeMarker(c, 1);
      const marker = new g.maps.marker.AdvancedMarkerElement({ position: { lat: c.lat, lng: c.lng }, content });
      marker.addListener("click", () => {
        iwRef.current?.setContent(createCollegePopup(c));
        iwRef.current?.open({ anchor: marker, map });
      });
      newMarkerData.push({ marker, lat: c.lat, lng: c.lng });
    });
    markerDataRef.current = newMarkerData;
    markersRef.current = newMarkerData.map((d) => d.marker);

    const updateVisibleMarkers = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      markerDataRef.current.forEach(({ marker, lat, lng }) => {
        const inView = bounds.contains({ lat, lng });
        if (inView && !marker.map) marker.map = map;
        else if (!inView && marker.map) marker.map = null;
      });
    };
    updateVisibleMarkers();
    const listener = map.addListener("idle", updateVisibleMarkers);
    return () => { g.maps.event.removeListener(listener); };
  }, [filtered, mapReady]);

  const handleZoomIn = () => { const m = mapInstance.current; if (m) m.setZoom((m.getZoom() || DEFAULT_ZOOM) + 1); };
  const handleZoomOut = () => { const m = mapInstance.current; if (m) m.setZoom((m.getZoom() || DEFAULT_ZOOM) - 1); };
  const handleReset = () => {
    const m = mapInstance.current; if (!m) return;
    if (userLocation.loaded && userLocation.lat) { m.setCenter({ lat: userLocation.lat, lng: userLocation.lng }); m.setZoom(13); }
    else { m.setCenter({ lat: GHAZIABAD_CENTER[0], lng: GHAZIABAD_CENTER[1] }); m.setZoom(DEFAULT_ZOOM); }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      {mapsError && <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-background/80"><p className="text-destructive font-semibold">{mapsError}</p></div>}

      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
        <button onClick={onBack} className="bg-card/90 backdrop-blur-md border border-border rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 shadow-sm">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="map-panel p-3 w-[calc(100vw-32px)] sm:w-72 max-w-[300px] space-y-2">
          <p className="text-xs font-semibold uppercase opacity-70">Colleges</p>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search colleges..." className="w-full bg-white/10 border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs placeholder:opacity-40 focus:outline-none" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"><X size={12} /></button>}
          </div>
          {programOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {programOptions.map((p) => (
                <button key={p} onClick={() => setActivePrograms((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; })}
                  className="text-[11px] font-medium py-1 px-2.5 rounded-lg transition-all"
                  style={activePrograms.has(p) ? { background: COLLEGE_COLOR, color: "#fff" } : { background: "rgba(255,255,255,0.1)", opacity: 0.5 }}>
                  {p}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] opacity-40">Showing {filtered.length} of {colleges.length} colleges</p>
        </div>
      </div>

      <div className="absolute bottom-24 right-3 z-[1000]">
        <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset} />
      </div>
    </div>
  );
};

export default CollegeMapView;

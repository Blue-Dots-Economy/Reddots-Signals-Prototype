/// <reference types="google.maps" />

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UnifiedOutreach from "../outreach/UnifiedOutreach";
import StudentViewSwitcher from "./StudentViewSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleMaps, CLEAN_MAP_STYLE } from "@/hooks/useGoogleMaps";
import { sendConnectionRequest, getConnectedDotIds, usePendingCount } from "@/lib/connections";

import { GHAZIABAD_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from "@/lib/mapData";
import { useUserLocation } from "@/hooks/useUserLocation";
import { haversineKm } from "@/lib/distance";
import ZoomControls from "../map/ZoomControls";
import UnifiedFilterPanel from "../map/UnifiedFilterPanel";
import { ArrowLeft, LogOut, Map, List, MapPin, ClipboardList, Send } from "lucide-react";

const YELLOW = "#DC143C";

interface Centre {
  id: string; name: string; area: string; lat: number; lng: number;
  services: string | null; fees: string | null; address: string | null;
  description: string | null; rating: string | null; availability: string | null;
}

interface Props {
  onBack?: () => void;
  activeView?: import("@/pages/StudentIndex").StudentView;
  onSwitchView?: (view: import("@/pages/StudentIndex").StudentView) => void;
}

function createCentreMarker(c: Centre, opacity: number): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<div style="position:relative;opacity:${opacity};cursor:pointer;">
    <div style="width:44px;height:44px;border-radius:50%;background:${YELLOW};display:flex;align-items:center;justify-content:center;border:2.5px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
      </svg>
    </div>
  </div>`;
  return el.firstElementChild as HTMLElement;
}

function createCentrePopup(c: Centre, isConnected: boolean): string {
  const detailRows = [
    ["Grade", c.availability],
    ["Stream", c.rating],
    ["Service Type", c.services],
  ].filter(([, v]) => v);
  return `<div style="width:280px;padding:16px;font-family:system-ui,sans-serif;">
    <p style="font-weight:700;font-size:17px;color:#0F172A;margin:0;">${c.name}</p>
    <p style="font-size:12px;color:#94A3B8;margin:2px 0 0;">${c.area}</p>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:10px 0 8px;"/>
    <table style="width:100%;font-size:12px;border-collapse:collapse;">
      ${detailRows.map(([l, v]) => `<tr><td style="color:#94A3B8;padding:4px 12px 4px 0;font-weight:500;white-space:nowrap;vertical-align:top;width:90px;">${l}</td><td style="color:#475569;padding:4px 0;vertical-align:top;word-break:break-word;">${v}</td></tr>`).join("")}
    </table>
    <div style="margin-top:14px;">
    ${isConnected
      ? `<button disabled style="width:100%;padding:8px 0;background:#2E7D32;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:default;display:flex;align-items:center;justify-content:center;gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Connected
        </button>`
      : `<button id="shortlist-btn-${c.id}" onclick="
          var btn = document.getElementById('shortlist-btn-${c.id}');
          btn.style.background='#2E7D32';
            btn.innerHTML='✓ Connected';
          btn.disabled=true;
          var helper = document.createElement('p');
          helper.style.cssText='text-align:center;font-size:11px;color:#64748B;margin-top:6px;';
          helper.textContent='Contact details are now visible in My Connections';
          btn.parentElement.appendChild(helper);
          window.dispatchEvent(new CustomEvent('centre-shortlist',{detail:'${c.id}'}));
        " style="width:100%;padding:8px 0;background:${YELLOW};color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Connect
        </button>`
    }
    </div>
  </div>`;
}

const CentreMapView = ({ onBack, activeView, onSwitchView }: Props) => {
  const { user, signOut } = useAuth();
  const userLocation = useUserLocation();
  const { ready: mapsReady, error: mapsError } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const iwRef = useRef<any>(null);

  const [centres, setCentres] = useState<Centre[]>([]);
  const [search, setSearch] = useState("");
  const [activeGrades, setActiveGrades] = useState<Set<string>>(new Set());
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());
  const [activeServiceTypes, setActiveServiceTypes] = useState<Set<string>>(new Set());
  const [mapReady, setMapReady] = useState(false);
  const [searchHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"map" | "list" | "outreach">("map");
  const [outreachKey, setOutreachKey] = useState(0);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [tabNudgeActive, setTabNudgeActive] = useState(false);
  const connectBadgeCount = usePendingCount(user?.id ?? '');
  const [justConnectedIds, setJustConnectedIds] = useState<Set<string>>(new Set());
  const [distanceKm, setDistanceKm] = useState<number | null>(10);

  useEffect(() => {
    supabase.from("centre_dots").select("*").then(({ data }) => {
      setCentres((data || []) as Centre[]);
    });
  }, []);

  // Load existing connected centre IDs
  useEffect(() => {
    if (!user) return;
    getConnectedDotIds(user.id).then((ids) => setConnectedIds(ids));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const handler = async (e: Event) => {
      const dotId = (e as CustomEvent).detail;
      const c = centres.find((x) => x.id === dotId);
      if (!c) return;
      if (connectedIds.has(dotId)) { toast.info("Already connected"); return; }
      const { error, duplicate } = await sendConnectionRequest({
        fromUserId: user.id,
        fromPersona: "student",
        toDotId: c.id,
        toPersona: "cl_centre",
        toDotTable: "centre_dots",
      });
      if (duplicate) { toast.info("Already connected"); return; }
      if (error) { console.error("Insert connection error:", error); toast.error("Failed to shortlist"); return; }
      toast.success("Centre connected!");
      setConnectedIds((prev) => new Set([...prev, dotId]));
      setJustConnectedIds((prev) => new Set([...prev, dotId]));
      setTimeout(() => setJustConnectedIds((prev) => { const n = new Set(prev); n.delete(dotId); return n; }), 2000);
      setOutreachKey((k) => k + 1);
      setTabNudgeActive(true);
      setTimeout(() => setTabNudgeActive(false), 700);
      setTimeout(() => iwRef.current?.close(), 2000);
    };
    window.addEventListener("centre-shortlist", handler);
    return () => window.removeEventListener("centre-shortlist", handler);
  }, [user, centres, connectedIds]);

  const gradeOptions = useMemo(() => {
    const set = new Set<string>();
    centres.forEach(c => { if (c.availability) c.availability.split("|").map(s => s.trim()).filter(Boolean).forEach(v => set.add(v)); });
    return [...set].sort();
  }, [centres]);

  const streamOptions = useMemo(() => {
    const set = new Set<string>();
    centres.forEach(c => { if (c.rating) c.rating.split("|").map(s => s.trim()).filter(Boolean).forEach(v => set.add(v)); });
    return [...set].sort();
  }, [centres]);

  const serviceTypeOptions = useMemo(() => {
    const set = new Set<string>();
    centres.forEach(c => { if (c.services) c.services.split("|").map(s => s.trim()).filter(Boolean).forEach(v => set.add(v)); });
    return [...set].sort();
  }, [centres]);

  useEffect(() => {
    setActiveGrades(new Set(gradeOptions));
    setActiveStreams(new Set(streamOptions));
    setActiveServiceTypes(new Set(serviceTypeOptions));
  }, [centres]);

  const filtered = useMemo(() => {
    return centres.filter((c) => {
      if (distanceKm && userLocation.loaded && userLocation.lat) {
        const dist = haversineKm(userLocation.lat, userLocation.lng, c.lat, c.lng);
        if (dist > distanceKm) return false;
      }
      if (c.availability) {
        const grades = c.availability.split("|").map(s => s.trim());
        if (!grades.some(g => activeGrades.has(g))) return false;
      }
      if (c.rating) {
        const streams = c.rating.split("|").map(s => s.trim());
        if (!streams.some(s => activeStreams.has(s))) return false;
      }
      if (c.services) {
        const services = c.services.split("|").map(s => s.trim());
        if (!services.some(s => activeServiceTypes.has(s))) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.area.toLowerCase().includes(q) || (c.services || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [centres, activeGrades, activeStreams, activeServiceTypes, search, distanceKm, userLocation]);

  const toggleGrade = useCallback((val: string) => {
    setActiveGrades(prev => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });
  }, []);
  const toggleStream = useCallback((val: string) => {
    setActiveStreams(prev => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });
  }, []);
  const toggleServiceType = useCallback((val: string) => {
    setActiveServiceTypes(prev => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });
  }, []);

  const clearAll = useCallback(() => {
    setSearch("");
    setDistanceKm(null);
    setActiveGrades(new Set(gradeOptions));
    setActiveStreams(new Set(streamOptions));
    setActiveServiceTypes(new Set(serviceTypeOptions));
  }, [gradeOptions, streamOptions, serviceTypeOptions]);

  const filterDimensions = useMemo(() => [
    { label: "Grade", options: gradeOptions, active: activeGrades, onToggle: toggleGrade, onSelectAll: () => setActiveGrades(new Set(gradeOptions)), onUnselectAll: () => setActiveGrades(new Set()) },
    { label: "Stream", options: streamOptions, active: activeStreams, onToggle: toggleStream, onSelectAll: () => setActiveStreams(new Set(streamOptions)), onUnselectAll: () => setActiveStreams(new Set()) },
    { label: "Service Type", options: serviceTypeOptions, active: activeServiceTypes, onToggle: toggleServiceType, onSelectAll: () => setActiveServiceTypes(new Set(serviceTypeOptions)), onUnselectAll: () => setActiveServiceTypes(new Set()) },
  ], [gradeOptions, streamOptions, serviceTypeOptions, activeGrades, activeStreams, activeServiceTypes, toggleGrade, toggleStream, toggleServiceType]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !mapsReady) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    const map = new g.maps.Map(mapRef.current, {
      center: { lat: GHAZIABAD_CENTER[0], lng: GHAZIABAD_CENTER[1] },
      zoom: DEFAULT_ZOOM, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM,
      disableDefaultUI: true, zoomControl: false,
      styles: CLEAN_MAP_STYLE, mapId: "yd-centre-map", gestureHandling: "greedy",
    });
    mapInstance.current = map;
    iwRef.current = new g.maps.InfoWindow();
    setMapReady(true);
  }, [mapsReady]);

  // Show "You are here" marker based on user's database location
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
      const content = createCentreMarker(c, 1);
      const marker = new g.maps.marker.AdvancedMarkerElement({ position: { lat: c.lat, lng: c.lng }, content });
      marker.addListener("click", () => {
        iwRef.current?.setContent(createCentrePopup(c, connectedIds.has(c.id)));
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
    <div className="relative w-screen h-screen overflow-hidden">
      <div ref={mapRef} className="w-full h-full z-0" style={{ display: activeTab === "map" || activeTab === "list" || activeTab === "outreach" ? "block" : "none", visibility: activeTab === "map" ? "visible" : "hidden" }} />

      {activeTab === "map" && activeView && onSwitchView && (
        <StudentViewSwitcher activeView={activeView} onSwitchView={onSwitchView} />
      )}

      {mapsError && <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-background/80"><p className="text-destructive font-semibold">{mapsError}</p></div>}

      {activeTab === "list" && (
        <div className="absolute inset-0 z-[500] w-full bg-background overflow-y-auto pb-24">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold" style={{ color: YELLOW }}>Centre Directory</h2>
                <span className="text-xs text-muted-foreground">{filtered.length} centres</span>
              </div>
              <UnifiedFilterPanel
                search={search} onSearchChange={(val) => setSearch(val)} onSearchSubmit={() => {}}
                filters={filterDimensions}
                onClearAll={clearAll} visibleCount={filtered.length} totalCount={centres.length}
                isSearching={false} searchResultCount={null}
                searchHistory={searchHistory} onHistorySelect={() => {}}
                searchPlaceholder="Search providers..." entityLabel="centres"
                distanceKm={distanceKm} onDistanceChange={setDistanceKm}
                inline
              />
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="space-y-3">
              {filtered.map((c) => {
                const isConnected = connectedIds.has(c.id);
                return (
                <div key={c.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: YELLOW }}>
                      <ClipboardList size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-foreground truncate">{c.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{c.area}</span>
                      </div>
                      <table className="w-full text-xs mt-2 border-t border-border pt-2">
                        <tbody>
                          {c.availability && <tr><td className="text-muted-foreground py-1 pr-3 font-medium whitespace-nowrap">Grade</td><td className="text-foreground py-1">{c.availability}</td></tr>}
                          {c.rating && <tr><td className="text-muted-foreground py-1 pr-3 font-medium whitespace-nowrap">Stream</td><td className="text-foreground py-1">{c.rating}</td></tr>}
                          {c.services && <tr><td className="text-muted-foreground py-1 pr-3 font-medium whitespace-nowrap">Service Type</td><td className="text-foreground py-1">{c.services}</td></tr>}
                        </tbody>
                      </table>
                      <div className="flex justify-end mt-2">
                        {isConnected ? (
                          justConnectedIds.has(c.id) ? (
                            <div className="flex flex-col items-end">
                              <button disabled className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-default flex-shrink-0" style={{ background: "#2E7D32" }}>
                                ✓ Connected
                              </button>
                              <p className="text-[11px] text-muted-foreground mt-1">Contact details are now visible in My Connections</p>
                            </div>
                          ) : (
                            <button disabled className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-default flex-shrink-0" style={{ background: "#2E7D32" }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                              Connected
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent("centre-shortlist", { detail: c.id }))}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95 flex-shrink-0"
                            style={{ background: YELLOW }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "outreach" && (
        <div className="absolute inset-0 z-[500] w-full bg-background" style={{ overflow: "hidden" }}>
          <UnifiedOutreach key={outreachKey} onChanged={() => setOutreachKey((k) => k + 1)} />
        </div>
      )}

      {activeTab === "map" && (
        <>
          <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
            {onBack && (
              <button onClick={onBack} className="bg-card/90 backdrop-blur-md border border-border rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 shadow-sm">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <UnifiedFilterPanel
              search={search} onSearchChange={(val) => setSearch(val)} onSearchSubmit={() => {}}
              filters={filterDimensions}
              onClearAll={clearAll} visibleCount={filtered.length} totalCount={centres.length}
              isSearching={false} searchResultCount={null}
              searchHistory={searchHistory} onHistorySelect={() => {}}
              searchPlaceholder="Search providers..." entityLabel="centres"
              distanceKm={distanceKm} onDistanceChange={setDistanceKm}
            />
          </div>
          <div className="absolute bottom-24 sm:bottom-20 right-3 sm:right-4 z-[1000]">
            <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset} />
          </div>
        </>
      )}

      {!onBack && (
        <button onClick={signOut} className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[1200] bg-card/90 backdrop-blur-md border border-border rounded-xl p-2 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-1 sm:gap-1.5 hover:shadow-md" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <LogOut size={14} className="sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
        </button>
      )}

      <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-[1100] floating-nav">
        <button onClick={() => setActiveTab("map")} className="relative rounded-full px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2" style={activeTab === "map" ? { background: YELLOW, color: "white", boxShadow: "0 2px 8px rgba(220,20,60,0.3)" } : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
          <Map size={14} className="sm:w-4 sm:h-4" /> Map
        </button>
        <button onClick={() => setActiveTab("list")} className="relative rounded-full px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2" style={activeTab === "list" ? { background: YELLOW, color: "white", boxShadow: "0 2px 8px rgba(220,20,60,0.3)" } : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
          <List size={14} className="sm:w-4 sm:h-4" /> List
        </button>
        <button onClick={() => { setActiveTab("outreach"); setOutreachKey((k) => k + 1); }} className={`relative rounded-full px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 ${tabNudgeActive ? "tab-nudge-bounce tab-nudge-ripple" : ""}`} style={activeTab === "outreach" ? { background: YELLOW, color: "white", boxShadow: "0 2px 8px rgba(220,20,60,0.3)" } : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
          <Send size={14} className="sm:w-4 sm:h-4" /> My Connections
          {connectBadgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 shadow-sm animate-in zoom-in-50">
              {connectBadgeCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default CentreMapView;

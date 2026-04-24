/// <reference types="google.maps" />

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleMaps, CLEAN_MAP_STYLE } from "@/hooks/useGoogleMaps";
import { sendConnectionRequest, getConnectedDotIds, usePendingCount, getPersonaFromPath } from "@/lib/connections";
import type { Persona } from "@/lib/connections";


import {
  dots as hardcodedDots,
  GHAZIABAD_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  type DotType,
  type Pillar,
  type MapDot,
} from "@/lib/mapData";
import { useUserLocation } from "@/hooks/useUserLocation";
import { haversineKm } from "@/lib/distance";
import { isUnderageFlagged } from "@/lib/studentFlags";

import UnifiedFilterPanel from "./UnifiedFilterPanel";
import ZoomControls from "./ZoomControls";
import Legend from "./Legend";
import UnifiedOutreach from "../outreach/UnifiedOutreach";

import { LogOut, Map, Send, List, Phone, Mail, MapPin, User } from "lucide-react";

const YELLOW = "#DC143C";
const YELLOW_GLOW = "rgba(220,20,60,0.4)";

const iconSvgPaths: Record<string, string> = {
  book: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 1-4 4v14a3 3 0 0 0 3-3h7z"/>`,
  compass: `<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`,
  graduationCap: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5"/>`,
  wrench: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  clipboard: `<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
};

function createMarkerContent(dot: MapDot, opacity: number, isSearchHighlight: boolean, scaleUp: boolean = false): HTMLElement {
  const svgPath = iconSvgPaths[dot.icon] || iconSvgPaths.book;
  const scale = scaleUp ? "transform:scale(1.15);" : "";
  const highlightRing = isSearchHighlight
    ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2.5px solid white;box-shadow:0 0 8px rgba(255,255,255,0.6);pointer-events:none;"></div>`
    : "";

  const container = document.createElement("div");
  container.innerHTML = `
    <div style="position:relative;opacity:${opacity};${scale}transition:transform 0.3s ease;cursor:pointer;">
      ${highlightRing}
      <div style="width:44px;height:44px;border-radius:50%;background:${YELLOW};display:flex;align-items:center;justify-content:center;border:2.5px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
      </div>
    </div>
  `;
  return container.firstElementChild as HTMLElement;
}

function anonymizeName(name: string): string {
  return name.split(" ").map((w) => {
    if (w.length <= 2) return w;
    return w[0] + "●".repeat(w.length - 2) + w[w.length - 1];
  }).join(" ");
}

function anonymizeEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.length <= 2 ? local : local[0] + "●".repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
}

function createPopupContent(dot: MapDot, isConnected: boolean = false): string {
  const displayName = anonymizeName(dot.name);
  const pillarInfo: Record<string, { label: string; color: string }> = {
    subject_tutoring: { label: "Subject Tutoring", color: "#DC143C" },
    career_counselling: { label: "Career Counselling", color: "#9F0E2E" },
    college_admissions: { label: "College Admissions", color: "#1E40AF" },
    skill_workshop: { label: "Skill Workshop", color: "#2554C7" },
    exam_prep: { label: "Exam Prep", color: "#1E3A8A" },
  };
  const serviceType = pillarInfo[dot.pillar]?.label || dot.pillar;
  // Parse grade and stream from education field (e.g. "Class XI — Science Stream")
  const grade = dot.grade || "";
  const stream = dot.education || "";

  const detailRows = [
    ["Grade", grade], ["Stream", stream], ["Service Type", serviceType],
  ].filter(([, v]) => v);
  const detailsHtml = `<table style="width:100%;font-size:12px;border-collapse:collapse;">
    ${detailRows.map(([l, v]) => `<tr><td style="color:#94A3B8;padding:3px 8px 3px 0;font-weight:500;white-space:nowrap;">${l}</td><td style="color:#475569;padding:3px 0;">${v}</td></tr>`).join("")}
  </table>`;

  return `
    <div style="width:280px;padding:16px;font-family:system-ui,sans-serif;">
      <p style="font-weight:700;font-size:17px;color:#0F172A;margin:0;">${displayName}</p>
      <p style="font-size:12px;color:#94A3B8;margin:2px 0 0;">${dot.area}</p>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:10px 0 8px;" />
      ${detailsHtml}
      <div style="margin-top:14px;">
      ${isConnected
        ? `<button disabled style="width:100%;padding:8px 0;background:#2E7D32;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:default;display:flex;align-items:center;justify-content:center;gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Request Sent
          </button>`
      : `<button id="shortlist-btn-${dot.id}" onclick="
            var btn = document.getElementById('shortlist-btn-${dot.id}');
            btn.style.background='#2E7D32';
            btn.innerHTML='✓ Request Sent';
            btn.disabled=true;
            var helper = document.createElement('p');
            helper.style.cssText='text-align:center;font-size:11px;color:#64748B;margin-top:6px;';
            helper.textContent='You can track this in My Connections';
            btn.parentElement.appendChild(helper);
            window.dispatchEvent(new CustomEvent('dot-connect',{detail:'${dot.id}'}));
          " style="width:100%;padding:8px 0;background:${YELLOW};color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background 0.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Connect
          </button>`
      }
      </div>
    </div>
  `;
}

const MapView = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const userLocation = useUserLocation();
  const { ready: mapsReady, error: mapsError } = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [dots, setDots] = useState<MapDot[]>([]);
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<DotType>>(new Set(["blue", "brown"]));
  const [activeGrades, setActiveGrades] = useState<Set<string>>(new Set());
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());
  const [activeServiceTypes, setActiveServiceTypes] = useState<Set<string>>(new Set());

  // Derive unique filter options from data
  const gradeOptions = useMemo(() => [...new Set(dots.map(d => d.grade).filter(Boolean) as string[])].sort(), [dots]);
  const streamOptions = useMemo(() => [...new Set(dots.map(d => d.education).filter(Boolean) as string[])].sort(), [dots]);
  const serviceTypeOptions = useMemo(() => [...new Set(dots.map(d => d.pillar).filter(Boolean) as string[])].sort(), [dots]);

  // Initialize filters when dots load
  useEffect(() => {
    setActiveGrades(new Set(gradeOptions));
    setActiveStreams(new Set(streamOptions));
    setActiveServiceTypes(new Set(serviceTypeOptions));
  }, [dots]);

  const [activeTab, setActiveTab] = useState<"map" | "list" | "outreach">("map");
  const [outreachKey, setOutreachKey] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [aiMatchedIds, setAiMatchedIds] = useState<Set<string> | null>(null);
  const [searchResultCount, setSearchResultCount] = useState<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [justConnectedIds, setJustConnectedIds] = useState<Set<string>>(new Set());
  const pendingRequestCount = usePendingCount(user?.id ?? '');
  const [tabNudgeActive, setTabNudgeActive] = useState(false);
  const connectionsTabRef = useRef<HTMLButtonElement>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(10);

  const normalizeKey = (value: string) => value.toLowerCase().trim().replace(/[-\s]+/g, "_");
  const PILLAR_ALIASES: Record<string, Pillar> = {
    subject_tutoring: "subject_tutoring", career_counselling: "career_counselling",
    career_counseling: "career_counselling", college_admissions: "college_admissions",
    skill_workshop: "skill_workshop", exam_prep: "exam_prep",
  };

  const mapDbToMapDot = (d: any): MapDot => {
    const normalizedPillar = normalizeKey(d.pillar || "");
    const normalizedCategory = normalizeKey(d.category || "");
    const pillarKey = normalizedPillar || normalizedCategory;
    const pillar = (PILLAR_ALIASES[pillarKey] || "subject_tutoring") as Pillar;
    return {
      id: d.id, name: d.name, type: normalizedCategory === "brown" ? "brown" : "blue",
      icon: (d.icon || "book") as any, pillar,
      location: { lat: d.lat, lng: d.lng }, area: d.area,
      contact: (d.contact || "direct") as any,
      description: d.description || "", relevance: d.relevance || "",
      education: d.education || undefined, skills: d.skills || undefined,
      availability: d.availability || undefined, distance: d.distance || undefined,
      grade: d.grade || undefined, needs: d.needs || undefined, email: d.email || undefined,
    };
  };

  useEffect(() => {
    if (authLoading || !user) return;
    let isActive = true;
    const fetchDbDots = async () => {
      const { data, error } = await supabase.from("student_dots").select("*");
      if (error) { console.error("Failed to fetch seeker dots:", error); return; }
      const safe = (data || []).filter((d: any) => !isUnderageFlagged(d));
      if (isActive) setDots(safe.map(mapDbToMapDot));
    };
    fetchDbDots();
    const channel = supabase.channel(`student_dots_realtime_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_dots" }, fetchDbDots).subscribe();
    return () => { isActive = false; supabase.removeChannel(channel); };
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (!user) return;
    const fetchConnected = async () => {
      const ids = await getConnectedDotIds(user.id);
      setConnectedIds(ids);
    };
    fetchConnected();
  }, [user, outreachKey]);

  useEffect(() => {
    const handler = async (e: Event) => {
      const dotId = (e as CustomEvent).detail;
      if (!user) { toast.error("Please sign in to shortlist students"); return; }
      const dot = dots.find((d) => d.id === dotId);
      if (!dot) return;
      if (connectedIds.has(dotId)) { toast.info("This student is already connected"); return; }
      const fromPersona = getPersonaFromPath();
      const { error, duplicate } = await sendConnectionRequest({
        fromUserId: user.id,
        fromPersona,
        toDotId: dot.id,
        toPersona: "student",
        toDotTable: "student_dots",
      });
      if (duplicate) { toast.info("This student is already connected"); return; }
      if (error) { console.error("Insert connection error:", error); toast.error("Failed to shortlist."); return; }
      toast.success("Student connected!");
      setConnectedIds((prev) => new Set([...prev, dot.id]));
      setJustConnectedIds((prev) => new Set([...prev, dot.id]));
      setTimeout(() => setJustConnectedIds((prev) => { const n = new Set(prev); n.delete(dot.id); return n; }), 2000);
      setOutreachKey((k) => k + 1);
      setTabNudgeActive(true);
      setTimeout(() => setTabNudgeActive(false), 700);
      setTimeout(() => infoWindowRef.current?.close(), 2000);
    };
    window.addEventListener("dot-connect", handler);
    return () => window.removeEventListener("dot-connect", handler);
  }, [user, dots, connectedIds]);

  const logFilterUsage = useCallback((filterValue: string, filterType: string = "grade") => {
    if (!user) return;
    supabase.from("filter_usage_logs").insert({ user_id: user.id, filter_type: filterType, filter_value: filterValue } as any).then(() => {});
  }, [user]);

  const toggleGrade = useCallback((val: string) => {
    setActiveGrades((prev) => { const next = new Set(prev); if (next.has(val)) next.delete(val); else { next.add(val); logFilterUsage(val, "grade"); } return next; });
  }, [logFilterUsage]);
  const toggleStream = useCallback((val: string) => {
    setActiveStreams((prev) => { const next = new Set(prev); if (next.has(val)) next.delete(val); else { next.add(val); logFilterUsage(val, "stream"); } return next; });
  }, [logFilterUsage]);
  const toggleServiceType = useCallback((val: string) => {
    setActiveServiceTypes((prev) => { const next = new Set(prev); if (next.has(val)) next.delete(val); else { next.add(val); logFilterUsage(val, "service_type"); } return next; });
  }, [logFilterUsage]);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val); if (!val.trim()) { setAiMatchedIds(null); setSearchResultCount(null); }
  }, []);

  const handleSearchSubmit = useCallback(async () => {
    if (!search.trim() || isSearching) return;
    setIsSearching(true); setSearchResultCount(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-search", { body: { query: search.trim(), dots } });
      if (error) { toast.error("Search failed."); setAiMatchedIds(null); setSearchResultCount(null); return; }
      const matchedIds: string[] = data?.matchedIds ?? [];
      setAiMatchedIds(new Set(matchedIds)); setSearchResultCount(matchedIds.length);
      setSearchHistory((prev) => [search.trim(), ...prev.filter((q) => q !== search.trim())].slice(0, 3));
      if (matchedIds.length === 0) setAiMatchedIds(new Set());
    } catch { toast.error("Search failed."); setAiMatchedIds(null); setSearchResultCount(null); }
    finally { setIsSearching(false); }
  }, [search, isSearching]);

  const handleHistorySelect = useCallback((query: string) => {
    setSearch(query);
    setTimeout(() => {
      setIsSearching(true); setSearchResultCount(null);
      supabase.functions.invoke("ai-search", { body: { query, dots } }).then(({ data, error }) => {
        if (error) { toast.error("Search failed."); setAiMatchedIds(null); setSearchResultCount(null); }
        else { const ids: string[] = data?.matchedIds ?? []; setAiMatchedIds(new Set(ids)); setSearchResultCount(ids.length); }
        setIsSearching(false);
      });
    }, 0);
  }, []);

  const clearAll = useCallback(() => {
    setSearch(""); setActiveTypes(new Set(["blue", "brown"]));
    setDistanceKm(null);
    setActiveGrades(new Set(gradeOptions));
    setActiveStreams(new Set(streamOptions));
    setActiveServiceTypes(new Set(serviceTypeOptions));
    setAiMatchedIds(null); setSearchResultCount(null);
    mapInstanceRef.current?.setCenter({ lat: GHAZIABAD_CENTER[0], lng: GHAZIABAD_CENTER[1] });
    mapInstanceRef.current?.setZoom(DEFAULT_ZOOM);
  }, [gradeOptions, streamOptions, serviceTypeOptions]);

  const filteredDots = useMemo(() => {
    return dots.map((dot) => {
      if (distanceKm && userLocation.loaded && userLocation.lat) {
        const dist = haversineKm(userLocation.lat, userLocation.lng, dot.location.lat, dot.location.lng);
        if (dist > distanceKm) return { dot, opacity: 0, isSearchHighlight: false, scaleUp: false };
      }

      const typeMatch = activeTypes.has(dot.type);
      const gradeMatch = !dot.grade || activeGrades.has(dot.grade);
      const streamMatch = !dot.education || activeStreams.has(dot.education);
      const serviceMatch = !dot.pillar || activeServiceTypes.has(dot.pillar);
      const visible = typeMatch && gradeMatch && streamMatch && serviceMatch;
      if (!visible) return { dot, opacity: 0, isSearchHighlight: false, scaleUp: false };
      if (aiMatchedIds !== null) {
        const isMatched = aiMatchedIds.has(dot.id);
        return { dot, opacity: isMatched ? 1 : 0.15, isSearchHighlight: isMatched, scaleUp: isMatched };
      }
      return { dot, opacity: 1, isSearchHighlight: false, scaleUp: false };
    });
  }, [dots, activeTypes, activeGrades, activeStreams, activeServiceTypes, aiMatchedIds, distanceKm, userLocation]);

  const visibleCount = useMemo(() => filteredDots.filter(({ opacity }) => opacity >= 1).length, [filteredDots]);

  const filterDimensions = useMemo(() => [
    { label: "Grade", options: gradeOptions, active: activeGrades, onToggle: toggleGrade, onSelectAll: () => setActiveGrades(new Set(gradeOptions)), onUnselectAll: () => setActiveGrades(new Set()) },
    { label: "Stream", options: streamOptions, active: activeStreams, onToggle: toggleStream, onSelectAll: () => setActiveStreams(new Set(streamOptions)), onUnselectAll: () => setActiveStreams(new Set()) },
    { label: "Service Type", options: serviceTypeOptions, active: activeServiceTypes, onToggle: toggleServiceType, onSelectAll: () => setActiveServiceTypes(new Set(serviceTypeOptions)), onUnselectAll: () => setActiveServiceTypes(new Set()) },
  ], [gradeOptions, streamOptions, serviceTypeOptions, activeGrades, activeStreams, activeServiceTypes, toggleGrade, toggleStream, toggleServiceType]);

  const [mapReady, setMapReady] = useState(false);

  // Initialize Google Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !mapsReady) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    const map = new g.maps.Map(mapContainerRef.current, {
      center: { lat: GHAZIABAD_CENTER[0], lng: GHAZIABAD_CENTER[1] },
      zoom: DEFAULT_ZOOM, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM,
      disableDefaultUI: true, zoomControl: false,
      styles: CLEAN_MAP_STYLE, mapId: "yellow-dots-map", gestureHandling: "greedy",
    });
    mapInstanceRef.current = map;
    infoWindowRef.current = new g.maps.InfoWindow();

    fetch("/delhi-ncr.geojson").then((r) => r.json()).then((data) => {
      if (!mapInstanceRef.current) return;
      const dataLayer = new g.maps.Data({ map: mapInstanceRef.current });
      dataLayer.addGeoJson(data);
      dataLayer.setStyle({ strokeColor: "#DC143C", strokeWeight: 2.5, strokeOpacity: 0.6, fillColor: "#DC143C", fillOpacity: 0.06, clickable: false });
    }).catch(() => {});

    setMapReady(true);
    return () => {
      setMapReady(false);
      markersRef.current.forEach((m: any) => (m.map = null));
      markersRef.current = [];
      clustererRef.current?.clearMarkers(); clustererRef.current = null;
      heatmapRef.current?.setMap(null); heatmapRef.current = null;
    };
  }, [mapsReady]);

  // Show "You are here" marker based on user's database location
  const userLocMarkerRef = useRef<any>(null);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !userLocation.loaded || !userLocation.lat) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    if (userLocMarkerRef.current) userLocMarkerRef.current.map = null;

    const locContent = document.createElement("div");
    locContent.innerHTML = `<div style="position:relative;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(66,133,244,0.15);animation:pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite;"></div><div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div></div>`;
    userLocMarkerRef.current = new g.maps.marker.AdvancedMarkerElement({ map, position: { lat: userLocation.lat, lng: userLocation.lng }, content: locContent.firstElementChild as HTMLElement, zIndex: 9999 });

    // Center map on user's location
    map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
    map.setZoom(13);
  }, [mapReady, userLocation]);

  // Create marker data (without adding to map)
  const markerDataRef = useRef<{ marker: any; lat: number; lng: number }[]>([]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    // Clean up old markers
    markersRef.current.forEach((m: any) => (m.map = null));
    markersRef.current = [];
    markerDataRef.current = [];
    heatmapRef.current?.setMap(null); heatmapRef.current = null;

    const newMarkerData: { marker: any; lat: number; lng: number }[] = [];
    const heatmapData: any[] = [];

    filteredDots.forEach(({ dot, opacity, isSearchHighlight, scaleUp }) => {
      if (opacity <= 0) return;
      const content = createMarkerContent(dot, opacity, isSearchHighlight, scaleUp);
      const marker = new g.maps.marker.AdvancedMarkerElement({
        position: { lat: dot.location.lat, lng: dot.location.lng }, content, zIndex: isSearchHighlight ? 100 : 1,
      });
      marker.addListener("click", () => {
        const iw = infoWindowRef.current;
        if (!iw) return;
        iw.setContent(createPopupContent(dot, connectedIds.has(dot.id)));
        iw.open({ anchor: marker, map });
      });
      newMarkerData.push({ marker, lat: dot.location.lat, lng: dot.location.lng });
      heatmapData.push(new g.maps.LatLng(dot.location.lat, dot.location.lng));
    });

    markerDataRef.current = newMarkerData;
    markersRef.current = newMarkerData.map((d) => d.marker);

    // Viewport-based rendering
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

    if (heatmapData.length > 0) {
      heatmapRef.current = new g.maps.visualization.HeatmapLayer({
        data: heatmapData, map, radius: 40, opacity: 0.4,
        gradient: ["rgba(220,20,60,0)", "rgba(220,20,60,0.2)", "rgba(220,20,60,0.4)", "rgba(220,20,60,0.6)", "rgba(224,138,0,0.8)", "rgba(204,122,0,1)"],
      });
    }

    return () => { g.maps.event.removeListener(listener); };
  }, [filteredDots, mapReady, connectedIds]);

  const handleZoomIn = () => { const m = mapInstanceRef.current; if (m) m.setZoom((m.getZoom() || DEFAULT_ZOOM) + 1); };
  const handleZoomOut = () => { const m = mapInstanceRef.current; if (m) m.setZoom((m.getZoom() || DEFAULT_ZOOM) - 1); };
  const handleReset = () => {
    const m = mapInstanceRef.current; if (!m) return;
    if (userLocation.loaded && userLocation.lat) { m.setCenter({ lat: userLocation.lat, lng: userLocation.lng }); m.setZoom(13); }
    else { m.setCenter({ lat: GHAZIABAD_CENTER[0], lng: GHAZIABAD_CENTER[1] }); m.setZoom(DEFAULT_ZOOM); }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ display: activeTab === "map" || activeTab === "list" || !user ? "block" : "none", visibility: activeTab === "map" || !user ? "visible" : "hidden" }} />

      {mapsError && (
        <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-background/80">
          <div className="text-center p-6">
            <p className="text-destructive font-semibold mb-2">Map failed to load</p>
            <p className="text-sm text-muted-foreground">{mapsError}</p>
          </div>
        </div>
      )}

      {authLoading && (
        <div className="absolute inset-0 z-[2000]">
          <div className="w-full h-full flex items-center justify-center bg-background">
            <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
          </div>
        </div>
      )}

      {user && activeTab === "outreach" && (
        <div className="absolute inset-0 z-[500] w-full bg-background" style={{ overflow: "hidden" }}>
          <UnifiedOutreach key={outreachKey} onChanged={() => setOutreachKey((k) => k + 1)} />
        </div>
      )}

      {user && activeTab === "list" && (
        <div className="absolute inset-0 z-[500] w-full bg-background overflow-y-auto pb-24">
          {/* Sticky filter bar */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold" style={{ color: YELLOW }}>Student Directory</h2>
                <span className="text-xs text-muted-foreground">{filteredDots.filter(({ opacity }) => opacity >= 1).length} students</span>
              </div>
              <UnifiedFilterPanel
                search={search} onSearchChange={handleSearchChange} onSearchSubmit={handleSearchSubmit}
                filters={filterDimensions}
                onClearAll={clearAll} visibleCount={visibleCount} totalCount={dots.length}
                isSearching={isSearching} searchResultCount={searchResultCount}
                searchHistory={searchHistory} onHistorySelect={handleHistorySelect}
                searchPlaceholder="Search seekers..." entityLabel="students"
                distanceKm={distanceKm} onDistanceChange={setDistanceKm}
                inline
              />
            </div>
          </div>

          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="space-y-3">
              {filteredDots.filter(({ opacity }) => opacity >= 1).map(({ dot }) => {
                const isConnected = connectedIds.has(dot.id);
                return (
                  <div key={dot.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-200">
                     <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: YELLOW }}>
                        <User size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-foreground truncate">{anonymizeName(dot.name)}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">{dot.area}</span>
                        </div>
                        <table className="w-full text-xs mt-2 border-t border-border pt-2">
                          <tbody>
                            {dot.grade && <tr><td className="text-muted-foreground py-1 pr-3 font-medium whitespace-nowrap">Grade</td><td className="text-foreground py-1">{dot.grade}</td></tr>}
                            {dot.education && <tr><td className="text-muted-foreground py-1 pr-3 font-medium whitespace-nowrap">Stream</td><td className="text-foreground py-1">{dot.education}</td></tr>}
                            {dot.pillar && <tr><td className="text-muted-foreground py-1 pr-3 font-medium whitespace-nowrap">Service Type</td><td className="text-foreground py-1">{dot.pillar}</td></tr>}
                          </tbody>
                        </table>
                        <div className="flex justify-end mt-2">
                          {isConnected ? (
                            justConnectedIds.has(dot.id) ? (
                              <div className="flex flex-col items-end">
                                <button disabled className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-default flex-shrink-0" style={{ background: "#2E7D32" }}>
                                  ✓ Request Sent
                                </button>
                                <p className="text-[11px] text-muted-foreground mt-1">You can track this in My Connections</p>
                              </div>
                            ) : (
                              <button disabled className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-default flex-shrink-0" style={{ background: "#2E7D32" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                Request Sent
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => window.dispatchEvent(new CustomEvent("dot-connect", { detail: dot.id }))}
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
              {filteredDots.filter(({ opacity }) => opacity >= 1).length === 0 && (
                <div className="text-center py-16 text-sm text-muted-foreground">No seekers match the current filters.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {user && activeTab === "map" && (
        <>
          <UnifiedFilterPanel
            search={search} onSearchChange={handleSearchChange} onSearchSubmit={handleSearchSubmit}
            filters={filterDimensions}
            onClearAll={clearAll} visibleCount={visibleCount} totalCount={dots.length}
            isSearching={isSearching} searchResultCount={searchResultCount}
            searchHistory={searchHistory} onHistorySelect={handleHistorySelect}
            searchPlaceholder="Search seekers by need or area..." entityLabel="students"
            distanceKm={distanceKm} onDistanceChange={setDistanceKm}
          />
          <div className="absolute bottom-24 sm:bottom-20 right-3 sm:right-4 z-[1000]">
            <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset} />
          </div>
          <div className="absolute bottom-24 sm:bottom-20 left-3 sm:left-4 z-[1000] hidden sm:block">
            <Legend />
          </div>
        </>
      )}

      {user && (
        <button onClick={signOut} className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[1100] bg-card/90 backdrop-blur-md border border-border rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-1 sm:gap-1.5 hover:shadow-md" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <LogOut size={12} className="sm:w-3.5 sm:h-3.5" /> Sign Out
        </button>
      )}

      {user && (
        <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-[1100] floating-nav">
          <button onClick={() => setActiveTab("map")} className="relative rounded-full px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2" style={activeTab === "map" ? { background: YELLOW, color: "white", boxShadow: "0 2px 8px rgba(220,20,60,0.3)" } : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
            <Map size={14} className="sm:w-4 sm:h-4" /> Map
          </button>
          <button onClick={() => setActiveTab("list")} className="relative rounded-full px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2" style={activeTab === "list" ? { background: YELLOW, color: "white", boxShadow: "0 2px 8px rgba(220,20,60,0.3)" } : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
            <List size={14} className="sm:w-4 sm:h-4" /> List
          </button>
          <button ref={connectionsTabRef} onClick={() => { setActiveTab("outreach"); setOutreachKey((k) => k + 1); }} className={`relative rounded-full px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 ${tabNudgeActive ? "tab-nudge-bounce tab-nudge-ripple" : ""}`} style={activeTab === "outreach" ? { background: YELLOW, color: "white", boxShadow: "0 2px 8px rgba(220,20,60,0.3)" } : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
            <Send size={14} className="sm:w-4 sm:h-4" /> My Connections
            {pendingRequestCount > 0 && (
              <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 shadow-sm animate-in zoom-in-50">
                {pendingRequestCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MapView;

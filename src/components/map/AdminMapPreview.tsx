import { useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useGoogleMaps, CLEAN_MAP_STYLE } from "@/hooks/useGoogleMaps";

const YELLOW = "#DC143C";
const YELLOW_GLOW = "rgba(220,20,60,0.4)";
const GHAZIABAD_CENTER = { lat: 18.5204, lng: 73.8567 };
const DEFAULT_ZOOM = 12;

// Lucide icon SVG inner paths (24x24 viewBox)
const iconSvgPaths: Record<string, string> = {
  hospital: `<path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>`,
  ambulance: `<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>`,
  mechanic: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  tow: `<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>`,
  ssm: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>`,
  fuel: `<line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>`,
  police: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>`,
  warning: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
  pothole: `<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>`,
  default: `<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>`,
};

function normalizeIconKey(key?: string): string {
  if (!key) return "default";
  const c = key.toLowerCase().trim();
  if (c === "warning" || c.includes("hotspot") || c.includes("accident")) return "warning";
  if (c === "pothole" || c.includes("hazard")) return "pothole";
  if (c.includes("hospital")) return "hospital";
  if (c.includes("ambulance")) return "ambulance";
  if (c.includes("mechanic")) return "mechanic";
  if (c.includes("tow")) return "tow";
  if (c === "ssm" || c.includes("sadak") || c.includes("suraksha")) return "ssm";
  if (c.includes("fuel") || c.includes("petrol") || c.includes("gas")) return "fuel";
  if (c.includes("police")) return "police";
  return "default";
}

interface DotPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  label?: string;
  icon?: string;
}

interface Props {
  dots: DotPoint[];
  title: string;
}

function createAdminMarkerContent(icon?: string): HTMLElement {
  const svgPath = iconSvgPaths[normalizeIconKey(icon)] || iconSvgPaths.default;
  const container = document.createElement("div");
  container.innerHTML = `
    <div style="position:relative;transition:transform 0.3s ease;cursor:pointer;">
      <div style="width:44px;height:44px;border-radius:50%;background:${YELLOW};display:flex;align-items:center;justify-content:center;border:2.5px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
      </div>
    </div>
  `;
  return container.firstElementChild as HTMLElement;
}

function createAdminPopup(dot: DotPoint): string {
  const svgPath = iconSvgPaths[normalizeIconKey(dot.icon)] || iconSvgPaths.default;
  return `
    <div style="font-family:system-ui,sans-serif;min-width:200px;padding:12px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${YELLOW};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#1e293b;">${dot.name}</div>
          ${dot.label ? `<div style="display:inline-block;font-size:11px;font-weight:600;color:white;background:${YELLOW};padding:2px 8px;border-radius:8px;margin-top:2px;">${dot.label}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}

const AdminMapPreview = ({ dots, title }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [expanded, setExpanded] = useState(false);
  const { ready: mapsReady } = useGoogleMaps();

  useEffect(() => {
    if (!expanded || !mapRef.current || !mapsReady) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    if (!mapInstanceRef.current) {
      const map = new g.maps.Map(mapRef.current, {
        center: GHAZIABAD_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        disableDefaultUI: true,
        styles: CLEAN_MAP_STYLE,
        mapId: "admin-preview-map",
        gestureHandling: "greedy",
      });
      mapInstanceRef.current = map;
      infoWindowRef.current = new g.maps.InfoWindow();
    }
  }, [expanded, mapsReady]);

  useEffect(() => {
    if (!mapInstanceRef.current || !expanded) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    markersRef.current.forEach((m: any) => (m.map = null));
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const bounds = new g.maps.LatLngBounds();

    dots.forEach((dot) => {
      const content = createAdminMarkerContent(dot.icon);
      const marker = new g.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: dot.lat, lng: dot.lng },
        content,
      });
      marker.addListener("click", () => {
        const iw = infoWindowRef.current;
        if (!iw) return;
        iw.setContent(createAdminPopup(dot));
        iw.open({ anchor: marker, map });
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: dot.lat, lng: dot.lng });
    });

    if (dots.length > 0) {
      map.fitBounds(bounds, { top: 30, bottom: 30, left: 30, right: 30 });
    }
  }, [dots, expanded]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m: any) => (m.map = null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  const handleToggle = () => {
    if (expanded) {
      markersRef.current.forEach((m: any) => (m.map = null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={handleToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin size={16} style={{ color: YELLOW }} />
          {title} ({dots.length} dots)
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {expanded && (
        <div ref={mapRef} className="w-full border-t border-border" style={{ height: 400 }} />
      )}
    </div>
  );
};

export default AdminMapPreview;

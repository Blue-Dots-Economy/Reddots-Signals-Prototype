import { useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useGoogleMaps, CLEAN_MAP_STYLE } from "@/hooks/useGoogleMaps";

const YELLOW = "#2563EB";
const YELLOW_GLOW = "rgba(37,99,235,0.4)";
const GHAZIABAD_CENTER = { lat: 18.5204, lng: 73.8567 };
const DEFAULT_ZOOM = 12;

const iconSvgPaths: Record<string, string> = {
  book: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 1-4 4v14a3 3 0 0 0 3-3h7z"/>`,
  compass: `<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`,
  graduationCap: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5"/>`,
  wrench: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  clipboard: `<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
};

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

function createAdminMarkerContent(icon: string = "book"): HTMLElement {
  const svgPath = iconSvgPaths[icon] || iconSvgPaths.book;
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
  const svgPath = iconSvgPaths[dot.icon || "book"] || iconSvgPaths.book;
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

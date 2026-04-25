/// <reference types="google.maps" />

import { useEffect, useRef } from "react";
import { useGoogleMaps, CLEAN_MAP_STYLE } from "@/hooks/useGoogleMaps";
import { Flame } from "lucide-react";

interface HeatPoint {
  lat: number;
  lng: number;
  weight?: number;
}

interface Props {
  points: HeatPoint[];
}

const RISK_GRADIENT = [
  "rgba(0, 0, 0, 0)",
  "rgba(255, 235, 200, 0.6)",
  "rgba(255, 200, 120, 0.7)",
  "rgba(255, 140, 60, 0.8)",
  "rgba(240, 80, 40, 0.9)",
  "rgba(200, 20, 20, 1)",
  "rgba(127, 29, 29, 1)",
];

const AccidentHeatmapCard = ({ points }: Props) => {
  const { ready, error } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    // Centered & zoomed on Guwahati city
    mapInstance.current = new g.maps.Map(mapRef.current, {
      center: { lat: 26.1445, lng: 91.7362 },
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      styles: CLEAN_MAP_STYLE,
      gestureHandling: "greedy",
    });
  }, [ready]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !ready) return;
    const g = (window as any).google;
    if (!g?.maps?.visualization) return;

    // Limit heatmap to Guwahati region only — ignore Delhi & other cities
    const GUWAHATI_BOUNDS = { minLat: 26.05, maxLat: 26.30, minLng: 91.50, maxLng: 91.95 };
    const valid = points.filter(
      (p) =>
        Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
        p.lat >= GUWAHATI_BOUNDS.minLat && p.lat <= GUWAHATI_BOUNDS.maxLat &&
        p.lng >= GUWAHATI_BOUNDS.minLng && p.lng <= GUWAHATI_BOUNDS.maxLng
    );

    if (heatLayerRef.current) heatLayerRef.current.setMap(null);
    if (valid.length === 0) return;

    const data = valid.map((p) => ({
      location: new g.maps.LatLng(p.lat, p.lng),
      weight: p.weight ?? 1,
    }));

    heatLayerRef.current = new g.maps.visualization.HeatmapLayer({
      data,
      map,
      radius: 28,
      opacity: 0.78,
      gradient: RISK_GRADIENT,
      dissipating: true,
    });

    // Keep the map locked on Guwahati (don't auto-zoom out to fit stragglers)
    map.setCenter({ lat: 26.1445, lng: 91.7362 });
    map.setZoom(12);
  }, [points, ready]);

  return (
    <div
      className="bg-card border border-border rounded-xl p-3 sm:p-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Flame size={16} style={{ color: "#DC143C" }} />
        <h3 className="text-sm font-semibold text-foreground">
          Accident Heatmap
        </h3>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {points.length.toLocaleString()} hotspots
        </span>
      </div>
      <div className="relative w-full h-[280px] rounded-lg overflow-hidden border border-border">
        <div ref={mapRef} className="absolute inset-0" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-xs text-muted-foreground">
            Loading map…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-xs text-destructive">
            {error}
          </div>
        )}
        {ready && points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs text-muted-foreground">
            No accident hotspot coordinates available.
          </div>
        )}
      </div>
    </div>
  );
};

export default AccidentHeatmapCard;

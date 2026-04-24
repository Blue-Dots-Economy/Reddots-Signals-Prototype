import { useState, useEffect } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";

let cachedApiKey: string | null = null;
let optionsSet = false;

export function useGoogleMaps() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;

    const load = async () => {
      try {
        if (!cachedApiKey) {
          const { data, error: fnError } = await supabase.functions.invoke("get-google-maps-key");
          if (fnError || !data?.apiKey) {
            throw new Error(data?.error || "Failed to load Google Maps API key");
          }
          cachedApiKey = data.apiKey;
        }

        if (!optionsSet) {
          setOptions({ key: cachedApiKey!, v: "weekly" });
          optionsSet = true;
        }

        await importLibrary("maps");
        await importLibrary("visualization");
        await importLibrary("marker");

        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "Failed to load Google Maps");
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [ready]);

  return { ready, loading, error };
}

// Clean light grey map style - no POIs, no business labels, no transit
export const CLEAN_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5", visibility: "simplified" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];

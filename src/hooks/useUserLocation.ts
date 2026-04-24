import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UserLocation {
  lat: number;
  lng: number;
  label: string;
  loaded: boolean;
}

const ROLE_TABLES = {
  student: "student_dots",
  tutor: "tutor_dots",
  counsellor: "counsellor_dots",
  centre: "centre_dots",
} as const;

type RoleKey = keyof typeof ROLE_TABLES;

export function useUserLocation(): UserLocation {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [location, setLocation] = useState<UserLocation>({ lat: 0, lng: 0, label: "", loaded: false });

  const preferredRoles = useMemo<RoleKey[]>(() => {
    const routeRole = pathname.startsWith("/student")
      ? "student"
      : pathname.startsWith("/tutor")
        ? "tutor"
        : pathname.startsWith("/counsellor")
          ? "counsellor"
          : pathname.startsWith("/centre")
            ? "centre"
            : null;

    const savedRole = localStorage.getItem("yellowdots_role") as RoleKey | null;
    const ordered = [routeRole, savedRole, ...Object.keys(ROLE_TABLES)]
      .filter((role): role is RoleKey => !!role && role in ROLE_TABLES);

    return [...new Set(ordered)];
  }, [pathname]);

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    (async () => {
      for (const role of preferredRoles) {
        const table = ROLE_TABLES[role];
        const { data } = await supabase
          .from(table as "student_dots")
          .select("lat, lng, area")
          .ilike("email", user.email!)
          .limit(1);

        if (cancelled) return;

        if (data && data.length > 0) {
          const row = data[0];
          setLocation({
            lat: row.lat,
            lng: row.lng,
            label: `You — ${row.area}`,
            loaded: true,
          });
          return;
        }
      }

      if (!cancelled) {
        setLocation({ lat: 0, lng: 0, label: "", loaded: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preferredRoles, user?.email]);

  return location;
}

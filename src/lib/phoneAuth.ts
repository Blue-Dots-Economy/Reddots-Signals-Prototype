import { supabase } from "@/integrations/supabase/client";

export type RedDotsView = "services" | "accidents";

// Kept for backwards-compat with stray imports — all Red Dots users are the same role.
export type PersonaType = "red_dots_user";

export interface UserProfile {
  persona: PersonaType;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  area: string;
  view?: RedDotsView;
  rowData: Record<string, any>;
}

const GUWAHATI_FALLBACK = { lat: 26.1445, lng: 91.7362, area: "Guwahati" };

function extractPhoneNumbers(raw: string): string[] {
  if (!raw) return [];
  const segments = raw.split(/[\/,\n\s]+/);
  const phones: string[] = [];
  for (const seg of segments) {
    const digits = seg.replace(/\D/g, "");
    if (digits.length === 10) phones.push(digits);
    else if (digits.length === 12 && digits.startsWith("91")) phones.push(digits.slice(2));
    else if (digits.length === 13 && digits.startsWith("091")) phones.push(digits.slice(3));
  }
  return phones;
}

function normalizeInput(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  if (digits.startsWith("+91")) return phone.replace(/\D/g, "").slice(2);
  return digits;
}

/**
 * Look up a Red Dots user by phone. Any valid 10-digit number works — if the
 * phone is registered in `student_dots` we hydrate from that row, otherwise we
 * create a guest profile centred on Guwahati. The Services / Accidents view is
 * chosen later via the ChatRouting screen.
 */
export async function lookupUser(phone: string): Promise<UserProfile | null> {
  const normalized = normalizeInput(phone);
  if (normalized.length !== 10) return null;

  const { data } = await supabase.from("student_dots").select("*");
  if (data) {
    for (const row of data) {
      const phones = extractPhoneNumbers(row.contact || "");
      if (phones.includes(normalized)) {
        return {
          persona: "red_dots_user",
          name: row.name,
          phone: normalized,
          lat: row.lat ?? GUWAHATI_FALLBACK.lat,
          lng: row.lng ?? GUWAHATI_FALLBACK.lng,
          area: row.area ?? GUWAHATI_FALLBACK.area,
          rowData: row,
        };
      }
    }
  }

  // Guest fallback — any 10-digit phone is allowed in.
  return {
    persona: "red_dots_user",
    name: `User ${normalized.slice(-4)}`,
    phone: normalized,
    lat: GUWAHATI_FALLBACK.lat,
    lng: GUWAHATI_FALLBACK.lng,
    area: GUWAHATI_FALLBACK.area,
    rowData: {},
  };
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem("red_dots_profile", JSON.stringify(profile));
}

export function loadProfile(): UserProfile | null {
  const raw = localStorage.getItem("red_dots_profile");
  if (!raw) {
    // Backward-compat: migrate the old key once.
    const legacy = localStorage.getItem("lahi_profile");
    if (!legacy) return null;
    try {
      const parsed = JSON.parse(legacy) as UserProfile;
      parsed.persona = "red_dots_user";
      localStorage.setItem("red_dots_profile", JSON.stringify(parsed));
      localStorage.removeItem("lahi_profile");
      return parsed;
    } catch {
      return null;
    }
  }
  try { return JSON.parse(raw); } catch { return null; }
}

export function setProfileView(view: RedDotsView) {
  const p = loadProfile();
  if (!p) return;
  p.view = view;
  saveProfile(p);
}

export function clearProfile() {
  localStorage.removeItem("red_dots_profile");
  localStorage.removeItem("lahi_profile");
}

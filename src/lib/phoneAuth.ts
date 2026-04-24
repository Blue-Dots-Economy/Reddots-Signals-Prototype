import { supabase } from "@/integrations/supabase/client";

export type PersonaType =
  | "school_student"      // Persona (i)
  | "msme_hiring_interns" // Persona (ii)
  | "iti_student"         // Persona (iii)
  | "msme_hiring_iti";    // Persona (iv)

export interface UserProfile {
  persona: PersonaType;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  area: string;
  rowData: Record<string, any>;
}

function extractPhoneNumbers(raw: string): string[] {
  if (!raw) return [];
  const segments = raw.split(/[\/,\n\s]+/);
  const phones: string[] = [];
  for (const seg of segments) {
    const digits = seg.replace(/\D/g, "");
    if (digits.length === 10) {
      phones.push(digits);
    } else if (digits.length === 12 && digits.startsWith("91")) {
      phones.push(digits.slice(2));
    } else if (digits.length === 13 && digits.startsWith("091")) {
      phones.push(digits.slice(3));
    }
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

function isITI(schoolIti: string | null): boolean {
  if (!schoolIti) return false;
  const lower = schoolIti.toLowerCase();
  return lower.includes("iti") || lower.includes("industrial training");
}

function isInternship(natureOfJob: string | null): boolean {
  if (!natureOfJob) return false;
  const lower = natureOfJob.toLowerCase().trim();
  return lower === "internship" || lower === "internships";
}

export async function lookupSeeker(phone: string): Promise<UserProfile | null> {
  const normalized = normalizeInput(phone);
  if (normalized.length !== 10) return null;

  const { data } = await supabase.from("student_dots").select("*");
  if (!data) return null;

  for (const row of data) {
    const phones = extractPhoneNumbers(row.contact || "");
    if (phones.includes(normalized)) {
      const persona: PersonaType = isITI(row.school_iti) ? "iti_student" : "school_student";
      return {
        persona,
        name: row.name,
        phone: normalized,
        lat: row.lat,
        lng: row.lng,
        area: row.area,
        rowData: row,
      };
    }
  }
  return null;
}

export async function lookupProvider(phone: string): Promise<UserProfile | null> {
  const normalized = normalizeInput(phone);
  if (normalized.length !== 10) return null;

  const { data } = await supabase.from("centre_dots").select("*");
  if (!data) return null;

  for (const row of data) {
    const phones = extractPhoneNumbers(row.contact || "");
    if (phones.includes(normalized)) {
      const persona: PersonaType = isInternship(row.nature_of_job) ? "msme_hiring_interns" : "msme_hiring_iti";
      return {
        persona,
        name: row.hiring_manager_name || row.name,
        phone: normalized,
        lat: row.lat,
        lng: row.lng,
        area: row.area,
        rowData: row,
      };
    }
  }
  return null;
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem("lahi_profile", JSON.stringify(profile));
}

export function loadProfile(): UserProfile | null {
  const raw = localStorage.getItem("lahi_profile");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearProfile() {
  localStorage.removeItem("lahi_profile");
}

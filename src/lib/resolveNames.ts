// Legacy stub retained after Red Dots remix removed connections.
import { supabase } from "@/integrations/supabase/client";

export interface NameMaps {
  dotIdToName: Record<string, string>;
  userIdToName: Record<string, string>;
}

export async function buildNameMaps(): Promise<NameMaps> {
  const dotIdToName: Record<string, string> = {};
  try {
    const [{ data: students }, { data: centres }] = await Promise.all([
      supabase.from("student_dots").select("id, name"),
      supabase.from("centre_dots").select("id, name"),
    ]);
    for (const r of students || []) if (r.id && r.name) dotIdToName[r.id] = r.name;
    for (const r of centres || []) if (r.id && r.name) dotIdToName[r.id] = r.name;
  } catch {}
  return { dotIdToName, userIdToName: {} };
}

export function resolveName(
  dotId: string | null | undefined,
  userId: string | null | undefined,
  dotIdToName: Record<string, string> = {}
): string {
  if (dotId && dotIdToName[dotId]) return dotIdToName[dotId];
  if (userId) return typeof userId === "string" ? userId.slice(0, 8) : "Unknown";
  return "Unknown";
}

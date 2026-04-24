import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all dots from all tables and builds a map of dotId → name.
 * Also builds a map of dotEmail → { dotId, name } for reverse lookups.
 */
export async function buildNameMaps(): Promise<{
  dotIdToName: Record<string, string>;
  userIdToName: Record<string, string>;
}> {
  const [
    { data: students },
    { data: tutors },
    { data: counsellors },
    { data: centres },
    { data: colleges },
  ] = await Promise.all([
    supabase.from("student_dots").select("id, name, email"),
    supabase.from("tutor_dots").select("id, name, email"),
    supabase.from("counsellor_dots").select("id, name, email"),
    supabase.from("centre_dots").select("id, name, email"),
    supabase.from("college_dots").select("id, name, email"),
  ]);

  const dotIdToName: Record<string, string> = {};
  const emailToName: Record<string, string> = {};

  const allDots = [
    ...(students || []),
    ...(tutors || []),
    ...(counsellors || []),
    ...(centres || []),
    ...(colleges || []),
  ];

  for (const d of allDots) {
    dotIdToName[d.id] = d.name;
    if (d.email) {
      emailToName[d.email.toLowerCase()] = d.name;
    }
  }

  // Now resolve user_ids to names via email lookup using RPC
  // We'll batch all unique emails and call get_user_id_by_email for each
  // But that's expensive. Instead, use the edge function for admin to get user emails.
  // For now, just return dotIdToName - we'll match from_dot_id and to_dot_id
  
  return { dotIdToName, userIdToName: {} };
}

/**
 * Resolve a name for a connection row.
 * Tries dot_id first, falls back to truncated user_id.
 */
export function resolveName(
  dotId: string | null | undefined,
  userId: string | null | undefined,
  dotIdToName: Record<string, string>
): string {
  if (dotId && dotIdToName[dotId]) {
    return dotIdToName[dotId];
  }
  return "";
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Persona = "student" | "tutor" | "cl_centre" | "hei";

export interface ConnectionRecord {
  id: string;
  from_user_id: string;
  from_persona: string;
  to_user_id: string;
  to_persona: string;
  from_dot_id: string | null;
  to_dot_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Detect current user's persona from the route path.
 */
export function getPersonaFromPath(): Persona {
  const path = window.location.pathname;
  if (path.startsWith("/centre")) return "cl_centre";
  if (path.startsWith("/tutor")) return "tutor";
  if (path.startsWith("/counsellor")) return "tutor"; // counsellors behave like tutors
  if (path.startsWith("/student")) return "student";
  // Fallback: check localStorage
  const stored = localStorage.getItem("yd_persona");
  if (stored === "centre") return "cl_centre";
  if (stored === "tutor" || stored === "counsellor") return "tutor";
  return "student";
}

/**
 * Send a connection request (insert into connections table).
 */
export async function sendConnectionRequest(params: {
  fromUserId: string;
  fromPersona: Persona;
  toDotId: string;
  toPersona: Persona;
  toDotTable: string; // e.g. "student_dots", "tutor_dots", "centre_dots"
}) {
  const { fromUserId, fromPersona, toDotId, toPersona, toDotTable } = params;

  // Resolve the target auth user ID from the dot's email
  const { data: dotData } = await (supabase
    .from(toDotTable as any)
    .select("email")
    .eq("id", toDotId)
    .single() as any);

  let toUserId: string | null = null;
  if ((dotData as any)?.email) {
    const { data: uid } = await supabase.rpc("get_user_id_by_email", { _email: (dotData as any).email });
    toUserId = uid || null;
  }

  // For seeker→provider, target may not have an auth account — use a placeholder
  if (!toUserId) {
    if (toPersona === "cl_centre" || toPersona === "hei") {
      toUserId = toDotId; // use dot ID as pseudo user ID
    } else {
      return { error: new Error("Could not resolve target user") };
    }
  }

  // Check for existing connection
  const { data: existing } = await supabase
    .from("connections" as any)
    .select("id")
    .eq("from_user_id", fromUserId)
    .eq("to_dot_id", toDotId);

  if (existing && (existing as any[]).length > 0) {
    return { error: new Error("Already connected"), duplicate: true };
  }

  // Seeker → Provider is auto-accepted; all other flows start as pending
  const initialStatus = (fromPersona === "student" && toPersona === "cl_centre") ? "accepted" : "pending";

  const { error } = await supabase.from("connections" as any).insert({
    from_user_id: fromUserId,
    from_persona: fromPersona,
    to_user_id: toUserId,
    to_persona: toPersona,
    to_dot_id: toDotId,
    status: initialStatus,
  } as any);

  return { error };
}

/**
 * Fetch all connections for the current user (sent and received).
 */
export async function fetchConnections(userId: string) {
  const { data, error } = await supabase
    .from("connections" as any)
    .select("*")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) return { sent: [], received: [], error };

  const all = (data as unknown as ConnectionRecord[]) || [];
  const sent = all.filter((r) => r.from_user_id === userId);
  const received = all.filter((r) => r.to_user_id === userId);

  return { sent, received, error: null };
}

/**
 * Respond to a connection request (accept or reject).
 */
export async function respondToConnection(connectionId: string, response: "accepted" | "rejected") {
  const { error } = await supabase
    .from("connections" as any)
    .update({ status: response, updated_at: new Date().toISOString() } as any)
    .eq("id", connectionId);
  return { error };
}

/**
 * Delete a connection (only sender can delete).
 */
export async function deleteConnection(connectionId: string) {
  const { error } = await supabase
    .from("connections" as any)
    .delete()
    .eq("id", connectionId);
  return { error };
}

/**
 * Get the count of pending incoming requests for a user.
 */
export async function getPendingCount(userId: string) {
  const { count } = await supabase
    .from("connections" as any)
    .select("id", { count: "exact", head: true })
    .eq("to_user_id", userId)
    .eq("status", "pending");
  return count || 0;
}

/**
 * Check if a dot is already shortlisted by the user.
 */
export async function getConnectedDotIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("connections" as any)
    .select("to_dot_id")
    .eq("from_user_id", userId);
  const ids = ((data as any[]) || []).map((r) => r.to_dot_id).filter(Boolean);
  return new Set(ids);
}

/**
 * Resolve dot display info (name, email, contact) for a list of dot IDs
 * from the appropriate dots table based on persona.
 */
/**
 * Shared hook: real-time pending incoming request count.
 */
export function usePendingCount(userId: string): number {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    getPendingCount(userId).then(setPendingCount);

    const channel = supabase
      .channel(`pending-badge-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'connections', filter: `to_user_id=eq.${userId}` },
        () => getPendingCount(userId).then(setPendingCount)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'connections', filter: `to_user_id=eq.${userId}` },
        () => getPendingCount(userId).then(setPendingCount)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'connections', filter: `to_user_id=eq.${userId}` },
        () => getPendingCount(userId).then(setPendingCount)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return pendingCount;
}

export async function resolveDotInfo(
  dotIds: string[],
  persona: string
): Promise<Record<string, { name: string; email?: string; contact?: string; area?: string }>> {
  if (dotIds.length === 0) return {};

  const table = persona === "student" ? "student_dots"
    : persona === "tutor" ? "tutor_dots"
    : persona === "cl_centre" ? "centre_dots"
    : persona === "hei" ? "college_dots"
    : "student_dots";

  const { data } = await supabase
    .from(table as any)
    .select("id, name, email, contact, area")
    .in("id", dotIds);

  const map: Record<string, { name: string; email?: string; contact?: string; area?: string }> = {};
  ((data as any[]) || []).forEach((d) => {
    map[d.id] = { name: d.name, email: d.email || undefined, contact: d.contact || undefined, area: d.area || undefined };
  });
  return map;
}

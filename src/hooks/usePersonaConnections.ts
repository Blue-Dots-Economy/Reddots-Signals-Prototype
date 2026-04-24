import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PersonaConnStatus = "shortlisted" | "pending" | "accepted" | "declined";

// DB constraint allows: school_student, iti_student, msme_intern, msme_iti
// App-level type uses: msme_hiring_interns, msme_hiring_iti — map to short forms for DB.
export type DbPersona = "school_student" | "iti_student" | "msme_intern" | "msme_iti";

function toDbPersona(p: string): DbPersona {
  if (p === "msme_hiring_interns") return "msme_intern";
  if (p === "msme_hiring_iti") return "msme_iti";
  if (p === "school_student" || p === "iti_student") return p;
  return "school_student";
}

export interface PersonaConnection {
  id: string;
  from_phone: string;
  from_persona: DbPersona;
  from_dot_id: string;
  from_name: string | null;
  to_phone: string;
  to_persona: DbPersona;
  to_dot_id: string;
  to_name: string | null;
  status: PersonaConnStatus;
  is_minor: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShortlistInput {
  fromPhone: string;
  fromPersona: string;
  fromDotId: string;
  fromName?: string;
  toPhone: string;
  toPersona: string;
  toDotId: string;
  toName?: string;
  isMinor?: boolean;
}

export function usePersonaConnections(phoneNumber: string) {
  const [all, setAll] = useState<PersonaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const phoneRef = useRef(phoneNumber);
  phoneRef.current = phoneNumber;

  const fetchAll = useCallback(async () => {
    if (!phoneNumber) {
      setAll([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("lahi_connections" as any)
      .select("*")
      .or(`from_phone.eq.${phoneNumber},to_phone.eq.${phoneNumber}`)
      .order("updated_at", { ascending: false });
    if (!error && Array.isArray(data)) setAll(data as unknown as PersonaConnection[]);
    else setAll([]);
    setLoading(false);
  }, [phoneNumber]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time subscription
  useEffect(() => {
    if (!phoneNumber) return;
    const channel = supabase
      .channel(`lahi_conn_${phoneNumber}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lahi_connections" },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row) return;
          if (row.from_phone === phoneRef.current || row.to_phone === phoneRef.current) {
            fetchAll();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [phoneNumber, fetchAll]);

  const getConnection = useCallback(
    (dotId: string): PersonaConnection | null =>
      all.find(
        (c) =>
          (c.from_phone === phoneNumber && c.to_dot_id === dotId) ||
          (c.to_phone === phoneNumber && c.from_dot_id === dotId)
      ) || null,
    [all, phoneNumber]
  );

  const getConnectionStatus = useCallback(
    (dotId: string): PersonaConnStatus | null => {
      const c = getConnection(dotId);
      return c ? c.status : null;
    },
    [getConnection]
  );

  // Aliases per spec
  const getConnectionForDot = getConnection;
  const getStatusForDot = getConnectionStatus;

  // ── Seeker action: direct request ──
  const sendConnectRequest = useCallback(
    async (input: ShortlistInput) => {
      if (!input.toPhone) {
        // No phone on the target dot — cannot create
        return { error: "Target has no phone" };
      }
      const { error } = await supabase.from("lahi_connections" as any).insert({
        from_phone: input.fromPhone,
        from_persona: toDbPersona(input.fromPersona),
        from_dot_id: input.fromDotId,
        from_name: input.fromName ?? null,
        to_phone: input.toPhone,
        to_persona: toDbPersona(input.toPersona),
        to_dot_id: input.toDotId,
        to_name: input.toName ?? null,
        status: "pending",
        is_minor: !!input.isMinor,
      });
      await fetchAll();
      return { error: error?.message };
    },
    [fetchAll]
  );

  // ── Provider action: shortlist ──
  const shortlistDot = useCallback(
    async (input: ShortlistInput) => {
      if (!input.toPhone) return { error: "Target has no phone" };
      const { error } = await supabase.from("lahi_connections" as any).insert({
        from_phone: input.fromPhone,
        from_persona: toDbPersona(input.fromPersona),
        from_dot_id: input.fromDotId,
        from_name: input.fromName ?? null,
        to_phone: input.toPhone,
        to_persona: toDbPersona(input.toPersona),
        to_dot_id: input.toDotId,
        to_name: input.toName ?? null,
        status: "shortlisted",
        is_minor: !!input.isMinor,
      });
      await fetchAll();
      return { error: error?.message };
    },
    [fetchAll]
  );

  const reachOut = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("lahi_connections" as any)
        .update({ status: "pending" })
        .eq("id", id);
      await fetchAll();
      return { error: error?.message };
    },
    [fetchAll]
  );

  const acceptConnection = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("lahi_connections" as any)
        .update({ status: "accepted" })
        .eq("id", id);
      await fetchAll();
      return { error: error?.message };
    },
    [fetchAll]
  );

  const declineConnection = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("lahi_connections" as any)
        .update({ status: "declined" })
        .eq("id", id);
      await fetchAll();
      return { error: error?.message };
    },
    [fetchAll]
  );

  const removeConnection = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("lahi_connections" as any).delete().eq("id", id);
      await fetchAll();
      return { error: error?.message };
    },
    [fetchAll]
  );

  // Backward-compat aliases used by existing code
  const shortlist = shortlistDot;
  const simulateAccept = acceptConnection;
  const simulateDecline = declineConnection;
  const removeFromShortlist = removeConnection;

  const sentConnections = all.filter((c) => c.from_phone === phoneNumber);
  const receivedConnections = all.filter((c) => c.to_phone === phoneNumber);
  const pendingReceivedCount = receivedConnections.filter((c) => c.status === "pending").length;

  return {
    loading,
    allConnections: all,
    sentConnections,
    receivedConnections,
    pendingReceivedCount,
    getConnection,
    getConnectionStatus,
    getConnectionForDot,
    getStatusForDot,
    sendConnectRequest,
    shortlistDot,
    shortlist,
    reachOut,
    acceptConnection,
    declineConnection,
    simulateAccept,
    simulateDecline,
    removeConnection,
    removeFromShortlist,
    refetch: fetchAll,
  };
}

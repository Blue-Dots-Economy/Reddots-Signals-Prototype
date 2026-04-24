import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  fetchConnections, respondToConnection, deleteConnection, resolveDotInfo,
  getPersonaFromPath, type ConnectionRecord,
} from "@/lib/connections";
import {
  Trash2, Star, CheckCircle2, Clock, Inbox, Check, X, BookOpen, Building2, User, Info,
} from "lucide-react";

const YELLOW = "#2563EB";

function anonymizeName(name: string): string {
  return name.split(" ").map((w) => {
    if (w.length <= 2) return w;
    return w[0] + "●".repeat(w.length - 2) + w[w.length - 1];
  }).join(" ");
}

const PERSONA_LABELS: Record<string, string> = {
  student: "Seeker", tutor: "Tutor", cl_centre: "Provider", hei: "College",
};

const PERSONA_ICONS: Record<string, typeof BookOpen> = {
  student: User, tutor: BookOpen, cl_centre: Building2, hei: Building2,
};

/* ─── Connection Card (for sent connections) ─── */
const SentCard = ({
  conn, dotInfo, onDelete,
}: {
  conn: ConnectionRecord;
  dotInfo?: { name: string; email?: string; contact?: string; area?: string };
  onDelete: (id: string) => void;
}) => {
  const isAccepted = conn.status === "accepted";
  const name = dotInfo?.name || "Unknown";
  const displayName = isAccepted ? name : anonymizeName(name);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const PersonaIcon = PERSONA_ICONS[conn.to_persona] || User;
  const personaLabel = PERSONA_LABELS[conn.to_persona] || conn.to_persona;

  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0" style={{ background: `${YELLOW}20`, color: YELLOW }}>{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug truncate">{displayName}</p>
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold flex-shrink-0" style={{ background: `${YELLOW}15`, color: YELLOW }}>
              <PersonaIcon size={10} /> {personaLabel}
            </span>
          </div>
          {dotInfo?.area && <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">{dotInfo.area}</p>}
          {isAccepted && dotInfo && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {dotInfo.email && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
                  📧 {dotInfo.email}
                </span>
              )}
              {dotInfo.contact && dotInfo.contact !== "direct" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
                  📞 {dotInfo.contact}
                </span>
              )}
            </div>
          )}
        </div>
        <button onClick={() => onDelete(conn.id)} className="p-1 sm:p-1.5 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0" title="Remove">
          <Trash2 size={14} className="sm:w-4 sm:h-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <div className="flex items-center justify-between pl-[46px] sm:pl-[52px] pt-0.5">
        <span className="text-[10px] sm:text-[11px] text-muted-foreground">
          {new Date(conn.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
        </span>
        {conn.status === "pending" && (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2" style={{ color: "#1D4ED8", borderColor: "#1D4ED8", background: "#1D4ED810" }}>
            Pending <Clock size={11} />
          </span>
        )}
        {conn.status === "accepted" && (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border-2" style={{ color: "#2E7D32", borderColor: "#2E7D32", background: "#2E7D3210" }}>
            <CheckCircle2 size={11} /> Accepted
          </span>
        )}
        {conn.status === "rejected" && (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border-2" style={{ color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F10" }}>
            Declined
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Incoming Request Card ─── */
const ReceivedCard = ({
  conn, senderInfo, onApprove, onReject,
}: {
  conn: ConnectionRecord;
  senderInfo?: { name: string; email?: string; contact?: string; area?: string };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) => {
  const name = senderInfo?.name || conn.from_user_id.slice(0, 8);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const PersonaIcon = PERSONA_ICONS[conn.from_persona] || User;
  const personaLabel = PERSONA_LABELS[conn.from_persona] || conn.from_persona;

  const isAutoAccepted = conn.from_persona === "student" && conn.to_persona === "cl_centre" && conn.status === "accepted";

  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0" style={{ background: `${YELLOW}20`, color: YELLOW }}>{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug truncate">
              {isAutoAccepted ? name : `${name} wants to connect`}
            </p>
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold flex-shrink-0" style={{ background: `${YELLOW}15`, color: YELLOW }}>
              <PersonaIcon size={10} /> {personaLabel}
            </span>
          </div>
          {senderInfo?.area && <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">{senderInfo.area}</p>}
          {/* Show sender's full PII — always unmasked for receiver */}
          {senderInfo && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {senderInfo.email && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
                  📧 {senderInfo.email}
                </span>
              )}
              {senderInfo.contact && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
                  📞 {senderInfo.contact}
                </span>
              )}
            </div>
          )}
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
            {new Date(conn.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
          </p>
        </div>
        {isAutoAccepted && (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border-2 flex-shrink-0" style={{ color: "#2E7D32", borderColor: "#2E7D32", background: "#2E7D3210" }}>
            <CheckCircle2 size={11} /> Student Connected
          </span>
        )}
      </div>
      {conn.status === "pending" && (
        <div className="flex items-center gap-2 pl-[46px] sm:pl-[52px]">
          <button onClick={() => onApprove(conn.id)} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all duration-200 hover:scale-[1.03] active:scale-95" style={{ color: "#2E7D32", borderColor: "#2E7D32", background: "#2E7D3208" }}>
            <Check size={12} /> Approve
          </button>
          <button onClick={() => onReject(conn.id)} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all duration-200 hover:scale-[1.03] active:scale-95" style={{ color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F08" }}>
            <X size={12} /> Decline
          </button>
        </div>
      )}
    </div>
  );
};
/* ─── Resolved received card ─── */
const ResolvedReceivedCard = ({ conn, senderInfo }: { conn: ConnectionRecord; senderInfo?: { name: string; email?: string; contact?: string; area?: string } }) => {
  const isApproved = conn.status === "accepted";
  const name = senderInfo?.name || conn.from_user_id.slice(0, 8);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const PersonaIcon = PERSONA_ICONS[conn.from_persona] || User;
  const personaLabel = PERSONA_LABELS[conn.from_persona] || conn.from_persona;

  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 bg-secondary text-secondary-foreground">{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug truncate">{name}</p>
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold flex-shrink-0" style={{ background: `${YELLOW}15`, color: YELLOW }}>
              <PersonaIcon size={10} /> {personaLabel}
            </span>
          </div>
          {senderInfo?.area && <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">{senderInfo.area}</p>}
          {senderInfo && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {senderInfo.email && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
                  📧 {senderInfo.email}
                </span>
              )}
              {senderInfo.contact && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
                  📞 {senderInfo.contact}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border-2 flex-shrink-0" style={isApproved ? { color: "#2E7D32", borderColor: "#2E7D32", background: "#2E7D3210" } : { color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F10" }}>
          {isApproved ? <><CheckCircle2 size={11} /> Approved</> : <><X size={11} /> Declined</>}
        </span>
      </div>
    </div>
  );
};

/* ─────────── Main Component ─────────── */
const UnifiedOutreach = ({ onChanged }: { onChanged?: () => void }) => {
  const { user } = useAuth();
  const [sent, setSent] = useState<ConnectionRecord[]>([]);
  const [received, setReceived] = useState<ConnectionRecord[]>([]);
  const [dotInfoMap, setDotInfoMap] = useState<Record<string, { name: string; email?: string; contact?: string; area?: string }>>({});
  const [senderInfoMap, setSenderInfoMap] = useState<Record<string, { name: string; email?: string; contact?: string; area?: string }>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const { sent: s, received: r } = await fetchConnections(user.id);
    setSent(s);
    setReceived(r);

    // Resolve dot info for sent connections (grouped by to_persona)
    const dotsByPersona: Record<string, string[]> = {};
    s.forEach((c) => {
      if (!c.to_dot_id) return;
      if (!dotsByPersona[c.to_persona]) dotsByPersona[c.to_persona] = [];
      dotsByPersona[c.to_persona].push(c.to_dot_id);
    });

    const allInfo: Record<string, { name: string; email?: string; contact?: string; area?: string }> = {};
    await Promise.all(
      Object.entries(dotsByPersona).map(async ([persona, ids]) => {
        const info = await resolveDotInfo(ids, persona);
        Object.assign(allInfo, info);
      })
    );
    setDotInfoMap(allInfo);

    // Resolve sender info for received connections via edge function
    const senderUserIds = [...new Set(r.map((c) => c.from_user_id))];
    if (senderUserIds.length > 0) {
      try {
        const { data, error } = await supabase.functions.invoke("resolve-sender-info", {
          body: { user_ids: senderUserIds },
        });
        if (!error && data?.data) {
          setSenderInfoMap(data.data);
        }
      } catch (e) {
        console.error("Failed to resolve sender info:", e);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unified-outreach")
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAll]);

  const handleDelete = async (id: string) => {
    const { error } = await deleteConnection(id);
    if (error) { toast.error("Failed to remove"); return; }
    setSent((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removed");
    onChanged?.();
  };

  const handleApprove = async (id: string) => {
    const { error } = await respondToConnection(id, "accepted");
    if (error) { toast.error("Failed to approve"); return; }
    const approved = received.find((r) => r.id === id);
    setReceived((prev) => prev.map((r) => r.id === id ? { ...r, status: "accepted" } : r));
    toast.success("Approved! Contact details shared.");
    onChanged?.();
  };

  const handleReject = async (id: string) => {
    const { error } = await respondToConnection(id, "rejected");
    if (error) { toast.error("Failed to decline"); return; }
    setReceived((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r));
    toast.success("Request declined.");
    onChanged?.();
  };

  // Categorize sent connections
  const pending = sent.filter((r) => r.status === "pending");
  const accepted = sent.filter((r) => r.status === "accepted");
  const rejected = sent.filter((r) => r.status === "rejected");

  // Categorize received connections
  const incomingPending = received.filter((r) => r.status === "pending");
  const incomingResolved = received.filter((r) => r.status !== "pending");

  const hasAny = sent.length > 0 || received.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-5">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${YELLOW}15` }}>
          <Star size={32} style={{ color: YELLOW }} />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">No connections yet</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[280px]">Go to the Map and tap "Connect" on a dot to add them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pb-20">
      {/* ─── Incoming Pending Requests ─── */}
      {incomingPending.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <Inbox size={18} className="sm:w-5 sm:h-5" style={{ color: "#1D4ED8" }} />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Incoming Requests</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
              {incomingPending.length} request{incomingPending.length !== 1 ? "s" : ""} waiting
            </p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {incomingPending.map((r) => (
              <ReceivedCard key={r.id} conn={r} senderInfo={senderInfoMap[r.from_user_id]} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        </>
      )}

      {/* ─── Sent Pending ─── */}
      {pending.length > 0 && (
        <>
          <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${incomingPending.length > 0 ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-2">
              <Clock size={18} className="sm:w-5 sm:h-5" style={{ color: "#1D4ED8" }} />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Pending</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{pending.length} awaiting response</p>
          </div>
          {getPersonaFromPath() === "cl_centre" && (
            <div className="mx-3 sm:mx-4 mb-3 sm:mb-4 flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: "#FFF8E7", border: "1px solid #2563EB", borderLeft: "3px solid #2563EB" }}>
              <Info size={16} className="flex-shrink-0" style={{ color: "#2563EB" }} />
              <p className="text-[11px] sm:text-[12px] text-foreground/80 leading-snug">
                Seekers will receive your request and choose to connect or decline. Their contact details are shared only after they accept.
              </p>
            </div>
          )}
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {pending.map((r) => (
              <SentCard key={r.id} conn={r} dotInfo={r.to_dot_id ? dotInfoMap[r.to_dot_id] : undefined} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {/* ─── Accepted ─── */}
      {accepted.length > 0 && (
        <>
          <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${(pending.length > 0 || incomingPending.length > 0) ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Connected</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{accepted.length} connection{accepted.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {accepted.map((r) => (
              <SentCard key={r.id} conn={r} dotInfo={r.to_dot_id ? dotInfoMap[r.to_dot_id] : undefined} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {/* ─── Rejected ─── */}
      {rejected.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-[#D32F2F] text-lg">✕</span>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Declined</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{rejected.length}</p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {rejected.map((r) => (
              <SentCard key={r.id} conn={r} dotInfo={r.to_dot_id ? dotInfoMap[r.to_dot_id] : undefined} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {/* ─── Incoming Resolved ─── */}
      {incomingResolved.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Request History</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{incomingResolved.length} resolved</p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {incomingResolved.map((r) => (
              <ResolvedReceivedCard key={r.id} conn={r} senderInfo={senderInfoMap[r.from_user_id]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedOutreach;

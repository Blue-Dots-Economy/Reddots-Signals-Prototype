import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Star, ArrowRight, CheckCircle2, Inbox, Check, X, Clock, BookOpen, Building2 } from "lucide-react";

const YELLOW = "#DC143C";
const REVEAL_STATUSES = new Set(["session_booked", "completed", "responded"]);

function anonymizeName(name: string): string {
  return name.split(" ").map((w) => {
    if (w.length <= 2) return w;
    return w[0] + "●".repeat(w.length - 2) + w[w.length - 1];
  }).join(" ");
}

type EntityType = "tutor" | "centre";

interface ConnectRecord {
  id: string;
  dot_id: string;
  tutor_name: string;
  tutor_area: string;
  tutor_subject: string;
  tutor_experience: string | null;
  tutor_price: string | null;
  tutor_icon: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  entityType: EntityType;
}

interface IncomingRequest {
  id: string;
  dot_id: string;
  student_name: string;
  student_area: string;
  student_category: string;
  student_needs: string | null;
  student_grade: string | null;
  status: string;
  created_at: string;
  user_id: string;
  requester_name: string | null;
  requester_email: string | null;
}

/* ─── Connect Card ─── */
const ConnectCard = ({
  record, onDelete, onReachOut, contactInfo,
}: {
  record: ConnectRecord;
  onDelete: (id: string) => void;
  onReachOut?: (id: string) => void;
  contactInfo?: { email?: string; contact?: string } | null;
}) => {
  const canReveal = REVEAL_STATUSES.has(record.status);
  const displayName = canReveal ? record.tutor_name : anonymizeName(record.tutor_name);
  const initials = record.tutor_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const isCentre = record.entityType === "centre";
  const TypeIcon = isCentre ? Building2 : BookOpen;

  const renderCTA = () => {
    switch (record.status) {
      case "invited":
        return (
          <button onClick={() => onReachOut?.(record.id)} className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 transition-all duration-200 hover:scale-[1.03] active:scale-95" style={{ color: YELLOW, borderColor: YELLOW, background: `${YELLOW}08` }}>
            Reach Out <ArrowRight size={11} />
          </button>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2" style={{ color: "#9F0E2E", borderColor: "#9F0E2E", background: "#9F0E2E10" }}>
            Pending <Clock size={11} />
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2" style={{ color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F10" }}>
            Declined
          </span>
        );
      case "session_booked":
      case "completed":
      case "responded":
        return (
          <span className="text-[9px] sm:text-[10px] text-muted-foreground italic leading-snug max-w-[180px]">
            Contact via the information now available
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0" style={{ background: `${YELLOW}20`, color: YELLOW }}>{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug truncate">{displayName}</p>
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold flex-shrink-0" style={{ background: isCentre ? "#3B82F615" : `${YELLOW}15`, color: isCentre ? "#3B82F6" : YELLOW }}>
              <TypeIcon size={10} />
              {isCentre ? "Provider" : record.tutor_subject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">{record.tutor_area}</p>
          {canReveal && contactInfo && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {contactInfo.email && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
                  📧 {contactInfo.email}
                </span>
              )}
              {contactInfo.contact && contactInfo.contact !== "direct" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
                  📞 {contactInfo.contact}
                </span>
              )}
            </div>
          )}
        </div>
        <button onClick={() => onDelete(record.id)} className="p-1 sm:p-1.5 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0" title="Remove">
          <Trash2 size={14} className="sm:w-4 sm:h-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {!isCentre && (record.tutor_experience || record.tutor_price) && (
        <div className="flex flex-wrap gap-1.5 pl-[46px] sm:pl-[52px]">
          {record.tutor_experience && <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-medium bg-secondary text-secondary-foreground">📋 {record.tutor_experience}</span>}
          {record.tutor_price && <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-medium bg-secondary text-secondary-foreground">💰 {record.tutor_price}</span>}
        </div>
      )}

      <div className="flex items-center justify-between pl-[46px] sm:pl-[52px] pt-0.5">
        <span className="text-[10px] sm:text-[11px] text-muted-foreground">{new Date(record.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>
        {renderCTA()}
      </div>
    </div>
  );
};

/* ─── Incoming Request Card ─── */
const IncomingCard = ({ request, onApprove, onReject }: { request: IncomingRequest; onApprove: (id: string) => void; onReject: (id: string) => void }) => {
  const name = request.requester_name || "Someone";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0" style={{ background: `${YELLOW}20`, color: YELLOW }}>{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug">{name} wants to connect</p>
          {request.requester_email && <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">📧 {request.requester_email}</p>}
          <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5">
            {request.student_category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            {request.student_needs && ` — ${request.student_needs}`}
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
            {new Date(request.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-[46px] sm:pl-[52px]">
        <button onClick={() => onApprove(request.id)} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all duration-200 hover:scale-[1.03] active:scale-95" style={{ color: "#2E7D32", borderColor: "#2E7D32", background: "#2E7D3208" }}>
          <Check size={12} /> Approve
        </button>
        <button onClick={() => onReject(request.id)} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all duration-200 hover:scale-[1.03] active:scale-95" style={{ color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F08" }}>
          <X size={12} /> Decline
        </button>
      </div>
    </div>
  );
};

/* ─── Resolved Incoming Card ─── */
const IncomingHistoryCard = ({ request }: { request: IncomingRequest }) => {
  const isApproved = request.status === "session_booked" || request.status === "completed" || request.status === "responded";
  const name = request.requester_name || "Someone";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 bg-secondary text-secondary-foreground">{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug">{name}</p>
          {request.requester_email && <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">📧 {request.requester_email}</p>}
          <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5">
            {request.student_category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border-2 flex-shrink-0" style={isApproved ? { color: "#2E7D32", borderColor: "#2E7D32", background: "#2E7D3210" } : { color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F10" }}>
          {isApproved ? <><CheckCircle2 size={11} /> Approved</> : <><X size={11} /> Declined</>}
        </span>
      </div>
    </div>
  );
};

/* ───────────────────── Main Component ───────────────────── */
const StudentOutreach = ({ onChanged }: { onChanged?: () => void }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<ConnectRecord[]>([]);
  const [contactInfoMap, setContactInfoMap] = useState<Record<string, { email?: string; contact?: string }>>({});
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [incomingHistory, setIncomingHistory] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) return;

    // Fetch ALL tutor_outreach records (both tutors and centres live here)
    const { data, error } = await supabase
      .from("tutor_outreach")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch outreach error:", error);
    } else {
      const allRecords = (data || []).map((r: any): ConnectRecord => {
        // Centres are stored with tutor_icon = "clipboard-list" or "clipboard"
        const isCentre = r.tutor_icon === "clipboard-list" || r.tutor_icon === "clipboard";
        return { ...r, entityType: isCentre ? "centre" : "tutor" } as ConnectRecord;
      });
      setRecords(allRecords);

      // Fetch contact info for approved records
      const approvedTutorIds = allRecords.filter((r) => REVEAL_STATUSES.has(r.status) && r.entityType === "tutor").map((r) => r.dot_id);
      const approvedCentreIds = allRecords.filter((r) => REVEAL_STATUSES.has(r.status) && r.entityType === "centre").map((r) => r.dot_id);

      const infoMap: Record<string, { email?: string; contact?: string }> = {};

      if (approvedTutorIds.length > 0) {
        const { data: dots } = await supabase.from("tutor_dots").select("id, email").in("id", approvedTutorIds);
        dots?.forEach((d: any) => { infoMap[d.id] = { email: d.email || undefined }; });
      }
      if (approvedCentreIds.length > 0) {
        const { data: dots } = await supabase.from("centre_dots").select("id, email, contact").in("id", approvedCentreIds);
        dots?.forEach((d: any) => { infoMap[d.id] = { email: d.email || undefined, contact: d.contact || undefined }; });
      }
      setContactInfoMap(infoMap);
    }

    // Incoming requests (outreach table, target = me, pending)
    const { data: incoming } = await supabase
      .from("outreach")
      .select("*")
      .eq("target_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setIncomingRequests((incoming as unknown as IncomingRequest[]) || []);

    // Incoming history (resolved)
    const { data: hist } = await supabase
      .from("outreach")
      .select("*")
      .eq("target_user_id", user.id)
      .in("status", ["session_booked", "completed", "responded", "rejected"])
      .order("created_at", { ascending: false });
    setIncomingHistory((hist as unknown as IncomingRequest[]) || []);

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("student-outreach-unified")
      .on("postgres_changes", { event: "*", schema: "public", table: "tutor_outreach", filter: `user_id=eq.${user.id}` }, () => fetchRecords())
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach", filter: `target_user_id=eq.${user.id}` }, () => fetchRecords())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRecords]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tutor_outreach").delete().eq("id", id);
    if (error) { toast.error("Failed to remove"); return; }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removed from shortlist");
    onChanged?.();
  };

  const handleReachOut = async (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;

    let targetUserId: string | null = null;
    const table = record.entityType === "centre" ? "centre_dots" : "tutor_dots";
    const { data: dotData } = await supabase.from(table).select("email").eq("id", record.dot_id).single();

    if (dotData?.email) {
      const { data: userId } = await supabase.rpc("get_user_id_by_email", { _email: dotData.email });
      targetUserId = userId || null;
    }

    const requesterEmail = user?.email || null;
    const requesterName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Unknown";

    const { error } = await supabase
      .from("tutor_outreach")
      .update({ status: "pending" as any, target_user_id: targetUserId, requester_name: requesterName, requester_email: requesterEmail } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to send request"); return; }
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "pending" } : r));
    toast.success("Connect request sent!");
    onChanged?.();
  };

  const handleApproveIncoming = async (id: string) => {
    const { error } = await supabase.from("outreach").update({ status: "session_booked" as any }).eq("id", id);
    if (error) { toast.error("Failed to approve"); return; }
    const approved = incomingRequests.find((r) => r.id === id);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
    if (approved) setIncomingHistory((prev) => [{ ...approved, status: "session_booked" }, ...prev]);
    toast.success("Approved! They can now contact you.");
    onChanged?.();
  };

  const handleRejectIncoming = async (id: string) => {
    const { error } = await supabase.from("outreach").update({ status: "rejected" as any }).eq("id", id);
    if (error) { toast.error("Failed to decline"); return; }
    const declined = incomingRequests.find((r) => r.id === id);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
    if (declined) setIncomingHistory((prev) => [{ ...declined, status: "rejected" }, ...prev]);
    toast.success("Request declined.");
    onChanged?.();
  };

  const connected = records.filter((r) => r.status === "invited");
  const pending = records.filter((r) => r.status === "pending");
  const readyToContact = records.filter((r) => r.status === "session_booked" || r.status === "completed");
  const contacted = records.filter((r) => r.status === "responded");
  const declined = records.filter((r) => r.status === "rejected");

  const hasAny = records.length > 0 || incomingRequests.length > 0 || incomingHistory.length > 0;

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
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[280px]">Go to the Map and tap "Connect" on a Tutor or Provider dot to add them here.</p>
        </div>
      </div>
    );
  }

  const renderSection = (title: string, subtitle: string, icon: React.ReactNode, items: ConnectRecord[], showBorder: boolean, extraProps?: Partial<React.ComponentProps<typeof ConnectCard>>) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${showBorder ? "border-t border-border" : ""}`}>
          <div className="flex items-center gap-2">{icon}<h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">{title}</h2></div>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
          {items.map((r) => (
            <ConnectCard key={r.id} record={r} onDelete={handleDelete} contactInfo={contactInfoMap[r.dot_id]} {...extraProps} />
          ))}
        </div>
      </>
    );
  };

  let sectionIndex = 0;

  return (
    <div className="h-full overflow-auto pb-20">
      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <Inbox size={18} className="sm:w-5 sm:h-5" style={{ color: YELLOW }} />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Incoming Requests</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
              {incomingRequests.length} request{incomingRequests.length !== 1 ? "s" : ""} waiting for your response
            </p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {incomingRequests.map((r) => (
              <IncomingCard key={r.id} request={r} onApprove={handleApproveIncoming} onReject={handleRejectIncoming} />
            ))}
          </div>
        </>
      )}

      {/* Incoming History */}
      {incomingHistory.length > 0 && (
        <>
          <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${incomingRequests.length > 0 ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Past Requests</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{incomingHistory.length} resolved</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {incomingHistory.map((r) => <IncomingHistoryCard key={r.id} request={r} />)}
          </div>
        </>
      )}

      {/* My Connects */}
      {(() => { sectionIndex = incomingRequests.length + incomingHistory.length; return null; })()}

      {renderSection(
        "Connected", `${connected.length} tutor${connected.length !== 1 ? "s" : ""} & centre${connected.length !== 1 ? "s" : ""}`,
        <Star size={18} className="sm:w-5 sm:h-5" style={{ color: YELLOW }} />,
        connected, sectionIndex > 0, { onReachOut: handleReachOut }
      )}

      {renderSection(
        "Reached Out", `${pending.length} pending`,
        <Clock size={18} className="sm:w-5 sm:h-5" style={{ color: "#9F0E2E" }} />,
        pending, connected.length > 0 || sectionIndex > 0
      )}

      {renderSection(
        "Ready to Contact", `${readyToContact.length} connection${readyToContact.length !== 1 ? "s" : ""}`,
        <CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" />,
        readyToContact, true
      )}

      {renderSection(
        "Contacted", `${contacted.length} contacted`,
        <CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" />,
        contacted, true
      )}

      {renderSection(
        "Declined", `${declined.length} declined`,
        <span className="text-[#D32F2F] text-lg">✕</span>,
        declined, true
      )}
    </div>
  );
};

export default StudentOutreach;

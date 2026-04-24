import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Star, ArrowRight, CheckCircle2, Inbox, Check, X, Clock, Send } from "lucide-react";

const YELLOW = "#2563EB";

function anonymizeName(name: string): string {
  return name.split(" ").map((w) => {
    if (w.length <= 2) return w;
    return w[0] + "●".repeat(w.length - 2) + w[w.length - 1];
  }).join(" ");
}

const REVEAL_STATUSES = new Set(["session_booked", "completed", "responded"]);

interface OutreachRecord {
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
}

interface IncomingFromCentre {
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

const CentreCard = ({ record, onDelete, onReachOut, contactInfo }: { record: OutreachRecord; onDelete: (id: string) => void; onReachOut?: (id: string) => void; contactInfo?: { email?: string; contact?: string } | null }) => {
  const canReveal = REVEAL_STATUSES.has(record.status);
  const displayName = canReveal ? record.tutor_name : anonymizeName(record.tutor_name);
  const initials = record.tutor_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

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
          <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2" style={{ color: "#1D4ED8", borderColor: "#1D4ED8", background: "#1D4ED810" }}>
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
            To contact this centre, please email or call them at your convenience via the contact information now available
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
            <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold flex-shrink-0" style={{ background: `${YELLOW}15`, color: YELLOW }}>
              {record.tutor_subject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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

      <div className="flex items-center justify-between pl-[46px] sm:pl-[52px] pt-0.5">
        <span className="text-[10px] sm:text-[11px] text-muted-foreground">{new Date(record.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>
        {renderCTA()}
      </div>
    </div>
  );
};

/* ─── Incoming Request Card (centre/tutor reached out TO this student) ─── */
const IncomingFromCentreCard = ({ request, onApprove, onReject }: { request: IncomingFromCentre; onApprove: (id: string) => void; onReject: (id: string) => void }) => {
  const name = request.requester_name || "Someone";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0" style={{ background: `${YELLOW}20`, color: YELLOW }}>{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug">{name} wants to connect</p>
          {request.requester_email && (
            <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">📧 {request.requester_email}</p>
          )}
          <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5">
            {request.student_category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} • {request.student_area}
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
const IncomingHistoryCard = ({ request }: { request: IncomingFromCentre }) => {
  const isApproved = request.status === "session_booked" || request.status === "completed" || request.status === "responded";
  const name = request.requester_name || "A centre";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 bg-secondary text-secondary-foreground">{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug">{name}</p>
          {request.requester_email && (
            <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">📧 {request.requester_email}</p>
          )}
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

const CentreOutreach = ({ onChanged }: { onChanged?: () => void }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [contactInfoMap, setContactInfoMap] = useState<Record<string, { email?: string; contact?: string }>>({});
  const [incomingRequests, setIncomingRequests] = useState<IncomingFromCentre[]>([]);
  const [incomingHistory, setIncomingHistory] = useState<IncomingFromCentre[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) return;

    // 1. Fetch student's own outreach (student → centre via tutor_outreach)
    const { data, error } = await supabase.from("tutor_outreach").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) { console.error("Fetch centre outreach error:", error); }
    else {
      setRecords((data as OutreachRecord[]) || []);
      const outreachRecords = (data as OutreachRecord[]) || [];
      const approvedDotIds = outreachRecords.filter((r) => REVEAL_STATUSES.has(r.status)).map((r) => r.dot_id);
      if (approvedDotIds.length > 0) {
        const { data: dots } = await supabase.from("centre_dots").select("id, email, contact").in("id", approvedDotIds);
        if (dots) {
          const map: Record<string, { email?: string; contact?: string }> = {};
          dots.forEach((d: any) => { map[d.id] = { email: d.email || undefined, contact: d.contact || undefined }; });
          setContactInfoMap(map);
        }
      }
    }

    // 2. Fetch incoming requests FROM centres/tutors TO this student (outreach table, target_user_id = me, status = invited or pending)
    const { data: incoming, error: incErr } = await supabase
      .from("outreach")
      .select("*")
      .eq("target_user_id", user.id)
      .in("status", ["invited", "pending"])
      .order("created_at", { ascending: false });
    if (incErr) { console.error("Fetch incoming centre requests error:", incErr); }
    else { setIncomingRequests((incoming as unknown as IncomingFromCentre[]) || []); }

    // 3. Fetch resolved incoming history
    const { data: hist, error: histErr } = await supabase
      .from("outreach")
      .select("*")
      .eq("target_user_id", user.id)
      .in("status", ["session_booked", "completed", "responded", "rejected"])
      .order("created_at", { ascending: false });
    if (histErr) { console.error("Fetch incoming history error:", histErr); }
    else { setIncomingHistory((hist as unknown as IncomingFromCentre[]) || []); }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('centre-outreach-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tutor_outreach', filter: `user_id=eq.${user.id}` }, () => { fetchRecords(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outreach', filter: `target_user_id=eq.${user.id}` }, () => { fetchRecords(); })
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
    const { data: dotData } = await supabase
      .from("centre_dots")
      .select("email")
      .eq("id", record.dot_id)
      .single();

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
    toast.success("Approved! They can now see your contact details.");
    onChanged?.();
  };

  const handleRejectIncoming = async (id: string) => {
    const { error } = await supabase.from("outreach").update({ status: "rejected" as any }).eq("id", id);
    if (error) { toast.error("Failed to decline"); return; }
    const rejected = incomingRequests.find((r) => r.id === id);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
    if (rejected) setIncomingHistory((prev) => [{ ...rejected, status: "rejected" }, ...prev]);
    toast.success("Request declined.");
    onChanged?.();
  };

  const connected = records.filter((r) => r.status === "invited");
  const pendingConsent = records.filter((r) => r.status === "pending");
  const readyToContact = records.filter((r) => r.status === "session_booked" || r.status === "completed");
  const contacted = records.filter((r) => r.status === "responded");
  const declined = records.filter((r) => r.status === "rejected");

  const hasAnyContent = records.length > 0 || incomingRequests.length > 0 || incomingHistory.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
      </div>
    );
  }

  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-5">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${YELLOW}15` }}>
          <Star size={32} style={{ color: YELLOW }} />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">No connected Providers</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[260px]">Go to the Map and tap "Connect" on a centre to add them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pb-20">
      {/* ─── Incoming Requests (centres that reached out to this student) ─── */}
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
              <IncomingFromCentreCard key={r.id} request={r} onApprove={handleApproveIncoming} onReject={handleRejectIncoming} />
            ))}
          </div>
        </>
      )}

      {/* ─── Incoming History (resolved) ─── */}
      {incomingHistory.length > 0 && (
        <>
          <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${incomingRequests.length > 0 ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Past Incoming Requests</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{incomingHistory.length} resolved</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {incomingHistory.map((r) => <IncomingHistoryCard key={r.id} request={r} />)}
          </div>
        </>
      )}

      {/* ─── Student's own outreach below ─── */}
      {connected.length > 0 && (
        <>
          <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${(incomingRequests.length > 0 || incomingHistory.length > 0) ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-2"><Star size={18} className="sm:w-5 sm:h-5" style={{ color: YELLOW }} /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Connected Providers</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{connected.length} centre{connected.length !== 1 ? "s" : ""} connected</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {connected.map((r) => <CentreCard key={r.id} record={r} onDelete={handleDelete} onReachOut={handleReachOut} />)}
          </div>
        </>
      )}

      {pendingConsent.length > 0 && (
        <>
          <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${connected.length > 0 || incomingRequests.length > 0 || incomingHistory.length > 0 ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-2"><Clock size={18} className="sm:w-5 sm:h-5" style={{ color: "#1D4ED8" }} /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Providers Reached Out To</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{pendingConsent.length} centre{pendingConsent.length !== 1 ? "s" : ""} pending</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {pendingConsent.map((r) => <CentreCard key={r.id} record={r} onDelete={handleDelete} />)}
          </div>
        </>
      )}

      {readyToContact.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Ready to Contact</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{readyToContact.length} centre{readyToContact.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {readyToContact.map((r) => <CentreCard key={r.id} record={r} onDelete={handleDelete} contactInfo={contactInfoMap[r.dot_id]} />)}
          </div>
        </>
      )}

      {contacted.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Contacted Providers</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{contacted.length} centre{contacted.length !== 1 ? "s" : ""} contacted</p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {contacted.map((r) => <CentreCard key={r.id} record={r} onDelete={handleDelete} contactInfo={contactInfoMap[r.dot_id]} />)}
          </div>
        </>
      )}

      {declined.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2"><span className="text-[#D32F2F] text-lg">✕</span><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Declined</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{declined.length} centre{declined.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {declined.map((r) => <CentreCard key={r.id} record={r} onDelete={handleDelete} />)}
          </div>
        </>
      )}
    </div>
  );
};

export default CentreOutreach;

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

interface TutorOutreachRecord {
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

/* Incoming consent request from a tutor (outreach table where target_user_id = current student) */
interface ConsentRequest {
  id: string;
  dot_id: string;
  student_name: string;
  student_area: string;
  student_category: string;
  student_needs: string | null;
  student_grade: string | null;
  status: string;
  created_at: string;
  user_id: string; // the tutor who sent this
  requester_name: string | null;
  requester_email: string | null;
}

/* ─── Consent History Card (approved/declined by student) ─── */
const ConsentHistoryCard = ({ request }: { request: ConsentRequest }) => {
  const isApproved = request.status === "session_booked" || request.status === "completed";
  const name = request.requester_name || "A tutor";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 bg-secondary text-secondary-foreground">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug">{name}</p>
          {request.requester_email && (
            <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">📧 {request.requester_email}</p>
          )}
          <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5">
            {request.student_category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            {request.student_needs && ` — ${request.student_needs}`}
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
            {new Date(request.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border-2 flex-shrink-0"
          style={isApproved
            ? { color: "#2E7D32", borderColor: "#2E7D32", background: "#2E7D3210" }
            : { color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F10" }
          }
        >
          {isApproved ? <><CheckCircle2 size={11} /> Approved</> : <><X size={11} /> Declined</>}
        </span>
      </div>
    </div>
  );
};

/* ─── Tutor Connect Card (student's own connected tutors) ─── */
const TutorCard = ({ record, onDelete, onReachOut, contactInfo }: { record: TutorOutreachRecord; onDelete: (id: string) => void; onReachOut?: (id: string) => void; contactInfo?: { email?: string; contact?: string } | null }) => {
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
        // Contact details revealed — no further CTA needed
        return (
          <span className="text-[9px] sm:text-[10px] text-muted-foreground italic leading-snug max-w-[180px]">
            To contact this tutor, please email or call them at your convenience via the contact information now available
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

      {(record.tutor_experience || record.tutor_price) && (
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

/* ─── Consent Request Card (incoming from tutors) ─── */
const ConsentRequestCard = ({ request, onApprove, onReject }: { request: ConsentRequest; onApprove: (id: string) => void; onReject: (id: string) => void }) => {
  const name = request.requester_name || "A tutor";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="outreach-card animate-slide-up">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0" style={{ background: `${YELLOW}20`, color: YELLOW }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug">{name} wants to connect</p>
          {request.requester_email && (
            <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">📧 {request.requester_email}</p>
          )}
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

/* ─────────── Main ─────────── */
const TutorOutreach = ({ onChanged }: { onChanged?: () => void }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<TutorOutreachRecord[]>([]);
  const [contactInfoMap, setContactInfoMap] = useState<Record<string, { email?: string; contact?: string }>>({});
  const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>([]);
  const [consentHistory, setConsentHistory] = useState<ConsentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) return;

    // Fetch student's own tutor shortlists
    const { data, error } = await supabase.from("tutor_outreach").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) { console.error("Fetch tutor outreach error:", error); }
    else {
      setRecords((data as TutorOutreachRecord[]) || []);
      // Fetch contact info for approved tutor records
      const outreachRecords = (data as TutorOutreachRecord[]) || [];
      const approvedDotIds = outreachRecords.filter((r) => REVEAL_STATUSES.has(r.status)).map((r) => r.dot_id);
      if (approvedDotIds.length > 0) {
        const { data: dots } = await supabase.from("tutor_dots").select("id, email").in("id", approvedDotIds);
        if (dots) {
          const map: Record<string, { email?: string; contact?: string }> = {};
          dots.forEach((d: any) => { map[d.id] = { email: d.email || undefined }; });
          setContactInfoMap(map);
        }
      }
    }

    // Fetch incoming consent requests (outreach records where this student is the target)
    const { data: requests, error: reqError } = await supabase
      .from("outreach")
      .select("*")
      .eq("target_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (reqError) { console.error("Fetch consent requests error:", reqError); }
    else { setConsentRequests((requests as unknown as ConsentRequest[]) || []); }

    // Fetch resolved consent history (approved or declined)
    const { data: history, error: histError } = await supabase
      .from("outreach")
      .select("*")
      .eq("target_user_id", user.id)
      .in("status", ["session_booked", "completed", "rejected"])
      .order("updated_at", { ascending: false });
    if (histError) { console.error("Fetch consent history error:", histError); }
    else { setConsentHistory((history as unknown as ConsentRequest[]) || []); }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Real-time subscription for status updates (e.g. tutor approves/rejects)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('tutor-outreach-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tutor_outreach', filter: `user_id=eq.${user.id}` }, () => {
        fetchRecords();
      })
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

    // Try to resolve target user, but proceed even if they haven't signed up
    let targetUserId: string | null = null;
    const { data: dotData } = await supabase
      .from("tutor_dots")
      .select("email")
      .eq("id", record.dot_id)
      .single();

    if (dotData?.email) {
      const { data: userId } = await supabase.rpc("get_user_id_by_email", { _email: dotData.email });
      targetUserId = userId || null;
    }

    // Include requester (student) info so the tutor can see who is reaching out
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

  const handleContact = async (id: string) => {
    const { error } = await supabase.from("tutor_outreach").update({ status: "responded" as any }).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    // Log PII contact view
    await supabase.from("contact_views").insert({ user_id: user!.id, outreach_id: id, outreach_table: "tutor_outreach" } as any);
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "responded" } : r));
    toast.success("Marked as contacted");
    onChanged?.();
  };

  const handleApproveConsent = async (id: string) => {
    const { error } = await supabase.from("outreach").update({ status: "session_booked" as any }).eq("id", id);
    if (error) { toast.error("Failed to approve"); return; }
    const approved = consentRequests.find((r) => r.id === id);
    setConsentRequests((prev) => prev.filter((r) => r.id !== id));
    if (approved) setConsentHistory((prev) => [{ ...approved, status: "session_booked" }, ...prev]);
    toast.success("Consent given! The tutor can now contact you.");
    onChanged?.();
  };

  const handleRejectConsent = async (id: string) => {
    const { error } = await supabase.from("outreach").update({ status: "rejected" as any }).eq("id", id);
    if (error) { toast.error("Failed to decline"); return; }
    const declined = consentRequests.find((r) => r.id === id);
    setConsentRequests((prev) => prev.filter((r) => r.id !== id));
    if (declined) setConsentHistory((prev) => [{ ...declined, status: "rejected" }, ...prev]);
    toast.success("Request declined");
    onChanged?.();
  };

  const connected = records.filter((r) => r.status === "invited");
  const pendingConsent = records.filter((r) => r.status === "pending");
  const readyToContact = records.filter((r) => r.status === "session_booked" || r.status === "completed");
  const contacted = records.filter((r) => r.status === "responded");
  const declined = records.filter((r) => r.status === "rejected");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
      </div>
    );
  }

  if (records.length === 0 && consentRequests.length === 0 && consentHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-5">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${YELLOW}15` }}>
          <Star size={32} style={{ color: YELLOW }} />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">No connected tutors</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[260px]">Go to the Tutor Map and tap "Connect" on a tutor dot to add them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pb-20">
      {/* Incoming Consent Requests */}
      {consentRequests.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <Inbox size={18} className="sm:w-5 sm:h-5" style={{ color: "#1D4ED8" }} />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Tutor Requests</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
              {consentRequests.length} tutor{consentRequests.length !== 1 ? "s" : ""} want{consentRequests.length === 1 ? "s" : ""} to connect
            </p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {consentRequests.map((r) => (
              <ConsentRequestCard key={r.id} request={r} onApprove={handleApproveConsent} onReject={handleRejectConsent} />
            ))}
          </div>
        </>
      )}

      {/* Connected Tutors - CTA: Reach Out */}
      {connected.length > 0 && (
        <>
          <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${consentRequests.length > 0 ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-2"><Star size={18} className="sm:w-5 sm:h-5" style={{ color: YELLOW }} /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Connected Tutors</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{connected.length} tutor{connected.length !== 1 ? "s" : ""} connected</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {connected.map((r) => <TutorCard key={r.id} record={r} onDelete={handleDelete} onReachOut={handleReachOut} />)}
          </div>
        </>
      )}

      {/* Pending Consent */}
      {pendingConsent.length > 0 && (
        <>
          <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${(connected.length > 0 || consentRequests.length > 0) ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-2"><Clock size={18} className="sm:w-5 sm:h-5" style={{ color: "#1D4ED8" }} /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Tutors Reached Out To</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{pendingConsent.length} tutor{pendingConsent.length !== 1 ? "s" : ""} pending</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {pendingConsent.map((r) => <TutorCard key={r.id} record={r} onDelete={handleDelete} />)}
          </div>
        </>
      )}

      {/* Ready to Contact — consent granted */}
      {readyToContact.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Ready to Contact</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{readyToContact.length} tutor{readyToContact.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {readyToContact.map((r) => <TutorCard key={r.id} record={r} onDelete={handleDelete} contactInfo={contactInfoMap[r.dot_id]} />)}
          </div>
        </>
      )}

      {/* Contacted Tutors */}
      {contacted.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Contacted Tutors</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{contacted.length} tutor{contacted.length !== 1 ? "s" : ""} contacted</p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {contacted.map((r) => <TutorCard key={r.id} record={r} onDelete={handleDelete} contactInfo={contactInfoMap[r.dot_id]} />)}
          </div>
        </>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2"><span className="text-[#D32F2F] text-lg">✕</span><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Declined</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{declined.length} tutor{declined.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {declined.map((r) => <TutorCard key={r.id} record={r} onDelete={handleDelete} />)}
          </div>
        </>
      )}

      {/* Contacted Tutors */}
      {contacted.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" /><h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Contacted Tutors</h2></div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{contacted.length} tutor{contacted.length !== 1 ? "s" : ""} contacted</p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {contacted.map((r) => <TutorCard key={r.id} record={r} onDelete={handleDelete} />)}
          </div>
        </>
      )}

      {/* Consent History */}
      {consentHistory.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">My Consents</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
              {consentHistory.length} request{consentHistory.length !== 1 ? "s" : ""} responded to
            </p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {consentHistory.map((r) => (
              <ConsentHistoryCard key={r.id} request={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TutorOutreach;

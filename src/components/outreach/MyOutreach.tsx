import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Trash2, Star, ArrowRight, CheckCircle2, Clock, Send, Inbox, Check, X,
} from "lucide-react";

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
  student_name: string;
  student_area: string;
  student_category: string;
  student_needs: string | null;
  student_grade: string | null;
  student_icon: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  target_user_id: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  subject_tutoring: "Subject Tutoring",
  career_counselling: "Career Counselling",
  college_admissions: "College Admissions",
  skill_workshop: "Skill Workshop",
  exam_prep: "Exam Prep",
};

/* ─────────── Student Card ─────────── */
const OutreachCard = ({
  record,
  onDelete,
  onReachOut,
  onContact,
  contactInfo,
}: {
  record: OutreachRecord;
  onDelete: (id: string) => void;
  onReachOut?: (id: string) => void;
  onContact?: (id: string) => void;
  contactInfo?: { email?: string; contact?: string } | null;
}) => {
  const canReveal = REVEAL_STATUSES.has(record.status);
  const displayName = canReveal ? record.student_name : anonymizeName(record.student_name);
  const initials = record.student_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const catLabel = CATEGORY_LABELS[record.student_category] || record.student_category;

  const renderCTA = () => {
    switch (record.status) {
      case "invited":
        return (
          <button
            onClick={() => onReachOut?.(record.id)}
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 transition-all duration-200 hover:scale-[1.03] active:scale-95"
            style={{ color: YELLOW, borderColor: YELLOW, background: `${YELLOW}08` }}
          >
            Reach Out <Send size={11} />
          </button>
        );
      case "pending":
        return (
          <span
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2"
            style={{ color: "#1D4ED8", borderColor: "#1D4ED8", background: "#1D4ED810" }}
          >
            Pending Request <Clock size={11} />
          </span>
        );
      case "rejected":
        return (
          <span
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2"
            style={{ color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F10" }}
          >
            Declined
          </span>
        );
      case "responded":
      default:
        // Contact details revealed — no further CTA needed
        return (
          <span
            className="text-[9px] sm:text-[10px] text-muted-foreground italic leading-snug max-w-[180px]"
          >
            To contact student, please email or call them at your convenience via the contact information now available
          </span>
        );
    }
  };

  return (
    <div
      className="outreach-card animate-slide-up"
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0"
          style={{ background: `${YELLOW}20`, color: YELLOW }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="font-bold text-foreground text-sm sm:text-[15px] leading-snug truncate">{displayName}</p>
            <span
              className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold flex-shrink-0"
              style={{ background: `${YELLOW}15`, color: YELLOW }}
            >
              {catLabel}
            </span>
          </div>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 truncate">{record.student_area}</p>
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
        <button
          onClick={() => onDelete(record.id)}
          className="p-1 sm:p-1.5 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0"
          title="Remove from shortlist"
        >
          <Trash2 size={14} className="sm:w-4 sm:h-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {(record.student_grade || record.student_needs) && (
        <div className="flex flex-wrap gap-1.5 pl-[46px] sm:pl-[52px]">
          {record.student_grade && (
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-medium bg-secondary text-secondary-foreground">
              🎓 {record.student_grade}
            </span>
          )}
          {record.student_needs && (
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-medium bg-secondary text-secondary-foreground">
              📌 {record.student_needs}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pl-[46px] sm:pl-[52px] pt-0.5">
        <span className="text-[10px] sm:text-[11px] text-muted-foreground">
          {new Date(record.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
        </span>
        {renderCTA()}
      </div>
    </div>
  );
};

/* ─────────── Section Header ─────────── */
const SectionHeader = ({ icon, iconColor, title, count, borderTop = false }: { icon: React.ReactNode; iconColor?: string; title: string; count: number; borderTop?: boolean }) => (
  <div className={`px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 ${borderTop ? "border-t border-border" : ""}`}>
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">{title}</h2>
    </div>
    <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
      {count} student{count !== 1 ? "s" : ""}
    </p>
  </div>
);

/* ─── Incoming Student Request interfaces ─── */
interface IncomingStudentRequest {
  id: string;
  dot_id: string;
  tutor_name: string;
  tutor_area: string;
  tutor_subject: string;
  tutor_experience: string | null;
  tutor_price: string | null;
  status: string;
  created_at: string;
  user_id: string;
  requester_name: string | null;
  requester_email: string | null;
}

/* ─── Incoming Student Request Card ─── */
const IncomingRequestCard = ({ request, onApprove, onReject }: { request: IncomingStudentRequest; onApprove: (id: string) => void; onReject: (id: string) => void }) => {
  const name = request.requester_name || "A student";
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
            {request.tutor_subject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} • {request.tutor_area}
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

/* ─── Consent History Card (for resolved incoming requests) ─── */
const IncomingHistoryCard = ({ request }: { request: IncomingStudentRequest }) => {
  const isApproved = request.status === "session_booked" || request.status === "completed";
  const name = request.requester_name || "A student";
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
            {request.tutor_subject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border-2 flex-shrink-0" style={isApproved ? { color: "#2E7D32", borderColor: "#2E7D32", background: "#2E7D3210" } : { color: "#D32F2F", borderColor: "#D32F2F", background: "#D32F2F10" }}>
          {isApproved ? <><CheckCircle2 size={11} /> Approved</> : <><X size={11} /> Declined</>}
        </span>
      </div>
    </div>
  );
};

/* ─────────── Main ─────────── */
const MyOutreach = ({ onChanged }: { onChanged?: () => void }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [contactInfoMap, setContactInfoMap] = useState<Record<string, { email?: string; contact?: string }>>({});
  const [incomingRequests, setIncomingRequests] = useState<IncomingStudentRequest[]>([]);
  const [incomingHistory, setIncomingHistory] = useState<IncomingStudentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    // Fetch own outreach (tutor→student)
    const { data, error } = await supabase
      .from("outreach")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { console.error("Fetch outreach error:", error); return; }
    const outreachRecords = (data as unknown as OutreachRecord[]) || [];
    setRecords(outreachRecords);

    // Fetch contact info for approved records
    const approvedDotIds = outreachRecords
      .filter((r) => REVEAL_STATUSES.has(r.status))
      .map((r) => r.dot_id);
    if (approvedDotIds.length > 0) {
      const { data: dots } = await supabase
        .from("student_dots")
        .select("id, email, contact")
        .in("id", approvedDotIds);
      if (dots) {
        const map: Record<string, { email?: string; contact?: string }> = {};
        dots.forEach((d: any) => { map[d.id] = { email: d.email || undefined, contact: d.contact || undefined }; });
        setContactInfoMap(map);
      }
    }

    // Fetch incoming student requests (tutor_outreach where target_user_id = me, status = invited or pending)
    const { data: incoming, error: incErr } = await supabase
      .from("tutor_outreach")
      .select("*")
      .eq("target_user_id", user.id)
      .in("status", ["invited", "pending"])
      .order("created_at", { ascending: false });
    if (incErr) { console.error("Fetch incoming requests error:", incErr); }
    else { setIncomingRequests((incoming as unknown as IncomingStudentRequest[]) || []); }

    // Fetch resolved incoming history
    const { data: hist, error: histErr } = await supabase
      .from("tutor_outreach")
      .select("*")
      .eq("target_user_id", user.id)
      .in("status", ["session_booked", "completed", "rejected"])
      .order("created_at", { ascending: false });
    if (histErr) { console.error("Fetch incoming history error:", histErr); }
    else { setIncomingHistory((hist as unknown as IncomingStudentRequest[]) || []); }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Real-time subscription for status updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('outreach-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'outreach', filter: `user_id=eq.${user.id}` }, () => { fetchRecords(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tutor_outreach', filter: `target_user_id=eq.${user.id}` }, () => { fetchRecords(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRecords]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("outreach").delete().eq("id", id);
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
      .from("student_dots")
      .select("email")
      .eq("id", record.dot_id)
      .single();

    if (dotData?.email) {
      const { data: userId } = await supabase.rpc("get_user_id_by_email", { _email: dotData.email });
      targetUserId = userId || null;
    }

    // Include requester (tutor) info so the student can see who is reaching out
    const requesterEmail = user?.email || null;
    // Use user metadata or email prefix as display name
    const requesterName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Unknown";

    const { error } = await supabase
      .from("outreach")
      .update({ status: "pending" as any, target_user_id: targetUserId, requester_name: requesterName, requester_email: requesterEmail } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to send request"); return; }
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "pending", target_user_id: targetUserId } : r));
    toast.success("Connect request sent!");
    onChanged?.();
  };

  const handleContact = async (id: string) => {
    const { error } = await supabase.from("outreach").update({ status: "responded" as any }).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    // Log PII contact view
    await supabase.from("contact_views").insert({ user_id: user!.id, outreach_id: id, outreach_table: "outreach" } as any);
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "responded" } : r));
    toast.success("Marked as contacted");
    onChanged?.();
  };

  const handleApproveIncoming = async (id: string) => {
    const { error } = await supabase.from("tutor_outreach").update({ status: "session_booked" as any }).eq("id", id);
    if (error) { toast.error("Failed to approve"); return; }
    const approved = incomingRequests.find((r) => r.id === id);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
    if (approved) setIncomingHistory((prev) => [{ ...approved, status: "session_booked" }, ...prev]);
    toast.success("Consent given! The student can now contact you.");
    onChanged?.();
  };

  const handleRejectIncoming = async (id: string) => {
    const { error } = await supabase.from("tutor_outreach").update({ status: "rejected" as any }).eq("id", id);
    if (error) { toast.error("Failed to decline"); return; }
    const declined = incomingRequests.find((r) => r.id === id);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
    if (declined) setIncomingHistory((prev) => [{ ...declined, status: "rejected" }, ...prev]);
    toast.success("Request declined");
    onChanged?.();
  };

  const shortlisted = records.filter((r) => r.status === "invited");
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

  if (records.length === 0 && incomingRequests.length === 0 && incomingHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-5">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${YELLOW}15` }}>
          <Star size={32} style={{ color: YELLOW }} />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">No shortlisted students</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[260px]">
            Go to the Student Map and tap "Shortlist" on a student dot to add them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pb-20">
      {/* Incoming Student Requests */}
      {incomingRequests.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <Inbox size={18} className="sm:w-5 sm:h-5" style={{ color: "#1D4ED8" }} />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Student Requests</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
              {incomingRequests.length} student{incomingRequests.length !== 1 ? "s" : ""} want{incomingRequests.length === 1 ? "s" : ""} to connect
            </p>
          </div>
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {incomingRequests.map((r) => (
              <IncomingRequestCard key={r.id} request={r} onApprove={handleApproveIncoming} onReject={handleRejectIncoming} />
            ))}
          </div>
        </>
      )}

      {/* 1. Shortlisted — CTA: Reach Out */}
      {shortlisted.length > 0 && (
        <>
          <SectionHeader
            icon={<Star size={18} className="sm:w-5 sm:h-5" style={{ color: YELLOW }} />}
            title="Shortlisted"
            count={shortlisted.length}
            borderTop={incomingRequests.length > 0}
          />
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {shortlisted.map((r) => (
              <OutreachCard key={r.id} record={r} onDelete={handleDelete} onReachOut={handleReachOut} />
            ))}
          </div>
        </>
      )}

      {/* 2. Pending Consent */}
      {pendingConsent.length > 0 && (
        <>
          <SectionHeader
            icon={<Clock size={18} className="sm:w-5 sm:h-5" style={{ color: "#1D4ED8" }} />}
            title="Students Reached Out To"
            count={pendingConsent.length}
            borderTop={shortlisted.length > 0 || incomingRequests.length > 0}
          />
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {pendingConsent.map((r) => (
              <OutreachCard key={r.id} record={r} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {/* 3. Ready to Contact — consent granted */}
      {readyToContact.length > 0 && (
        <>
          <SectionHeader
            icon={<CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" />}
            title="Ready to Contact"
            count={readyToContact.length}
            borderTop={shortlisted.length > 0 || pendingConsent.length > 0 || incomingRequests.length > 0}
          />
          <div className="px-3 sm:px-4 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
            {readyToContact.map((r) => (
              <OutreachCard key={r.id} record={r} onDelete={handleDelete} onContact={handleContact} contactInfo={contactInfoMap[r.dot_id]} />
            ))}
          </div>
        </>
      )}

      {/* 4. Contacted */}
      {contacted.length > 0 && (
        <>
          <SectionHeader
            icon={<CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-[#2E7D32]" />}
            title="Contacted"
            count={contacted.length}
            borderTop
          />
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {contacted.map((r) => (
              <OutreachCard key={r.id} record={r} onDelete={handleDelete} contactInfo={contactInfoMap[r.dot_id]} />
            ))}
          </div>
        </>
      )}

      {/* 5. Declined */}
      {declined.length > 0 && (
        <>
          <SectionHeader
            icon={<span className="text-[#D32F2F] text-lg">✕</span>}
            title="Declined"
            count={declined.length}
            borderTop
          />
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {declined.map((r) => (
              <OutreachCard key={r.id} record={r} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {/* Incoming Request History */}
      {incomingHistory.length > 0 && (
        <>
          <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-t border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Student Request History</h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
              {incomingHistory.length} request{incomingHistory.length !== 1 ? "s" : ""} responded to
            </p>
          </div>
          <div className="px-3 sm:px-4 pb-8 space-y-2.5 sm:space-y-3">
            {incomingHistory.map((r) => (
              <IncomingHistoryCard key={r.id} request={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MyOutreach;

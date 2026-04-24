import { useEffect, useState } from "react";
import { Star, Clock, CheckCircle, XCircle, Trash2, Phone, Inbox, Bell, Mail, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { UserProfile } from "@/lib/phoneAuth";
import { usePersonaConnections, type PersonaConnection, type PersonaConnStatus } from "@/hooks/usePersonaConnections";
import ConsentChecklist, { allChecked, type ConsentItem } from "@/components/connect/ConsentChecklist";

const PROVIDER_REACHOUT_CONSENT: ConsentItem[] = [
  { key: "share", label: "I agree to share my business details (name, address, phone) with this student once they accept" },
  { key: "contact", label: "I understand this student may contact me by phone after accepting" },
];
const PROVIDER_REACHOUT_MINOR_ITEM: ConsentItem = {
  key: "minor",
  label: "I understand this student is a minor and the consent request will be sent to their parent/guardian",
};

const BLUE = "#DC143C";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const RED = "#EF4444";
const GREY = "#94A3B8";

interface Props {
  profile: UserProfile;
}

function maskName(name?: string | null): string {
  if (!name) return "Unknown";
  return name
    .split(" ")
    .map((w) => (w.length <= 1 ? w : w[0] + "●".repeat(Math.max(w.length - 2, 1)) + w[w.length - 1]))
    .join(" ");
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const PersonaConnections = ({ profile }: Props) => {
  const isSeeker = profile.persona === "school_student" || profile.persona === "iti_student";
  const conns = usePersonaConnections(profile.phone);

  const sentBy = (s: PersonaConnStatus) => conns.sentConnections.filter((c) => c.status === s);
  const recvBy = (s: PersonaConnStatus) => conns.receivedConnections.filter((c) => c.status === s);

  const empty = conns.allConnections.length === 0;

  return (
    <div className="min-h-[100dvh] bg-background pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] px-3 sm:px-6 safe-px">
      <div className="max-w-2xl mx-auto space-y-6">
        {empty ? (
          <div className="text-center py-16">
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `${BLUE}15` }}
            >
              <Inbox size={24} style={{ color: BLUE }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No connections yet</p>
            <p className="text-xs text-muted-foreground">
              {isSeeker
                ? "Tap Connect on a provider card to start."
                : "Shortlist seekers from the Map or List view to start."}
            </p>
          </div>
        ) : isSeeker ? (
          <SeekerView conns={conns} sentBy={sentBy} recvBy={recvBy} />
        ) : (
          <ProviderView conns={conns} sentBy={sentBy} recvBy={recvBy} />
        )}
      </div>
    </div>
  );
};

// ───────────── SEEKER VIEW ─────────────
function SeekerView({
  conns,
  sentBy,
  recvBy,
}: {
  conns: ReturnType<typeof usePersonaConnections>;
  sentBy: (s: PersonaConnStatus) => PersonaConnection[];
  recvBy: (s: PersonaConnStatus) => PersonaConnection[];
}) {
  const recvPending = recvBy("pending");

  return (
    <>
      {recvPending.length > 0 && (
        <Section title="Received Requests" icon={<Bell size={14} />} color={AMBER}>
          {recvPending.map((c) => (
            <ReceivedPendingCard
              key={c.id}
              conn={c}
              senderLabel={`${c.from_name || "Company"} wants to connect with you`}
              senderName={c.from_name || "Company"}
              senderSub={"Provider"}
              maskSender={false}
              onAccept={async () => {
                await conns.acceptConnection(c.id);
                toast.success("Connected! Contact details are now visible.");
              }}
              onDecline={async () => {
                await conns.declineConnection(c.id);
                toast("Request declined.");
              }}
            />
          ))}
        </Section>
      )}

      <Section title="Sent by me" color={BLUE}>
        <Subsection title="Pending" icon={<Clock size={14} />} color={AMBER} items={sentBy("pending")}>
          {sentBy("pending").map((c) => (
            <SeekerSentCard key={c.id} conn={c} kind="pending" />
          ))}
        </Subsection>

        <Subsection title="Connected" icon={<CheckCircle size={14} />} color={GREEN} items={sentBy("accepted")}>
          {sentBy("accepted").map((c) => (
            <AcceptedProviderCard key={c.id} conn={c} />
          ))}
        </Subsection>

        <Subsection title="Declined" icon={<XCircle size={14} />} color={GREY} items={sentBy("declined")}>
          {sentBy("declined").map((c) => (
            <SeekerSentCard key={c.id} conn={c} kind="declined" />
          ))}
        </Subsection>
      </Section>
    </>
  );
}

function SeekerSentCard({
  conn,
  kind,
}: {
  conn: PersonaConnection;
  kind: "pending" | "accepted" | "declined";
}) {
  const company = conn.to_name || "Company";
  const accepted = kind === "accepted";

  return (
    <div
      className={`outreach-card ${kind === "declined" ? "opacity-60" : ""}`}
      style={accepted ? { borderColor: `${GREEN}55`, boxShadow: `0 0 0 1px ${GREEN}22, 0 8px 24px -12px ${GREEN}33` } : undefined}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={company} color={accepted ? GREEN : BLUE} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground truncate tracking-tight">{company}</p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
              {timeAgo(conn.updated_at)}
            </span>
          </div>
          {accepted && conn.to_phone && (
            <p className="text-xs text-foreground mt-0.5 font-mono">{conn.to_phone}</p>
          )}
          {!accepted && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {kind === "pending" ? "Waiting for response" : "Declined"}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-2">
        {kind === "pending" && (
          <button
            disabled
            className="text-[11px] font-semibold text-white px-3.5 py-1.5 rounded-full min-h-[36px] inline-flex items-center justify-center"
            style={{ background: GREY }}
          >
            Pending
          </button>
        )}
        {accepted && (
          <a
            href={conn.to_phone ? `tel:${conn.to_phone}` : undefined}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white px-3.5 py-1.5 rounded-full transition-transform hover:scale-[1.03]"
            style={{ background: GREEN, boxShadow: `0 4px 14px -4px ${GREEN}66` }}
          >
            <Phone size={11} /> Contact Now →
          </a>
        )}
      </div>
    </div>
  );
}

// ───────────── PROVIDER VIEW ─────────────
function ProviderView({
  conns,
  sentBy,
  recvBy,
}: {
  conns: ReturnType<typeof usePersonaConnections>;
  sentBy: (s: PersonaConnStatus) => PersonaConnection[];
  recvBy: (s: PersonaConnStatus) => PersonaConnection[];
}) {
  const shortlisted = sentBy("shortlisted");
  const pending = sentBy("pending");
  const accepted = sentBy("accepted");
  const declined = sentBy("declined");
  const recvPending = recvBy("pending");

  return (
    <>
      {recvPending.length > 0 && (
        <Section title="Received Requests" icon={<Bell size={14} />} color={AMBER}>
          {recvPending.map((c) => (
            <ReceivedPendingCard
              key={c.id}
              conn={c}
              senderLabel="A student wants to connect with you"
              senderName={maskName(c.from_name)}
              senderSub="Seeker"
              maskSender
              onAccept={async () => {
                await conns.acceptConnection(c.id);
                toast.success("Connected! The student can now see your contact details.");
              }}
              onDecline={async () => {
                await conns.declineConnection(c.id);
                toast("Request declined.");
              }}
            />
          ))}
        </Section>
      )}

      {/* Outreach Status — direct Connect (no more shortlist step) */}
      {(shortlisted.length > 0 || pending.length > 0 || accepted.length > 0 || declined.length > 0) && (
        <Section title="My Outreach" color={BLUE}>
          <Subsection title="Pending" icon={<Clock size={14} />} color={AMBER} items={[...shortlisted, ...pending]}>
            {[...shortlisted, ...pending].map((c) => (
              <PendingSeekerCard
                key={c.id}
                conn={c}
                onRemove={async () => {
                  await conns.removeConnection(c.id);
                  toast("Removed");
                }}
              />
            ))}
          </Subsection>
          <Subsection title="Connected" icon={<CheckCircle size={14} />} color={GREEN} items={accepted}>
            {accepted.map((c) => (
              <AcceptedSeekerCard
                key={c.id}
                conn={c}
                onRemove={async () => {
                  await conns.removeConnection(c.id);
                  toast("Removed");
                }}
              />
            ))}
          </Subsection>
          <Subsection title="Declined" icon={<XCircle size={14} />} color={GREY} items={declined}>
            {declined.map((c) => (
              <PendingSeekerCard
                key={c.id}
                conn={c}
                declined
                onRemove={async () => {
                  await conns.removeConnection(c.id);
                  toast("Removed");
                }}
              />
            ))}
          </Subsection>
        </Section>
      )}
    </>
  );
}

function PendingSeekerCard({
  conn,
  declined,
  onRemove,
}: {
  conn: PersonaConnection;
  declined?: boolean;
  onRemove: () => Promise<void>;
}) {
  const [details, setDetails] = useState<SeekerDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!conn.to_dot_id) return;
      const { data } = await supabase
        .from("student_dots")
        .select("unique_id,grade,highest_qualification,jobs_interested_nature,jobs_interested_role,needs,category,email,contact")
        .eq("id", conn.to_dot_id)
        .maybeSingle();
      if (!cancelled && data) setDetails(data as SeekerDetails);
    })();
    return () => { cancelled = true; };
  }, [conn.to_dot_id]);

  const masked = maskName(conn.to_name);
  const stream = details?.jobs_interested_nature || "";
  const serviceType = details?.needs || details?.category || details?.jobs_interested_role || "";
  const grade = details?.grade || "";
  const accentColor = declined ? GREY : AMBER;

  return (
    <div className={`outreach-card relative ${declined ? "opacity-60" : ""}`}>
      <button
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 tap-44 inline-flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded-full"
        aria-label="Remove"
      >
        <Trash2 size={14} />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <Avatar name={masked} color={accentColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{masked}</p>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              <User size={10} /> Student
            </span>
            {conn.is_minor && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${AMBER}20`, color: AMBER }}
              >
                Minor
              </span>
            )}
          </div>

          <div className="mt-2.5 space-y-1.5">
            {grade && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-24 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Grade</span>
                <span className="text-foreground break-words">{grade}</span>
              </div>
            )}
            {stream && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-24 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Stream</span>
                <span className="text-foreground break-words">{stream}</span>
              </div>
            )}
            {serviceType && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-24 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Interest</span>
                <span className="text-foreground break-words">{serviceType}</span>
              </div>
            )}
          </div>

          {conn.is_minor && !declined && (
            <p className="text-[10px] text-muted-foreground mt-2">Sent to: Parent/Guardian</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-1">
        <span className="text-[11px] text-muted-foreground">{timeAgo(conn.updated_at)}</span>
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full border"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          {declined ? <><XCircle size={11} /> Declined</> : <><Clock size={11} /> Pending</>}
        </span>
      </div>
    </div>
  );
}

function ProviderOutreachCard({
  conn,
  kind,
}: {
  conn: PersonaConnection;
  kind: "pending" | "accepted" | "declined";
}) {
  const accepted = kind === "accepted";
  const name = accepted ? conn.to_name || "Unknown" : maskName(conn.to_name);

  return (
    <div
      className={`outreach-card ${kind === "declined" ? "opacity-60" : ""}`}
      style={accepted ? { borderColor: `${GREEN}55`, boxShadow: `0 0 0 1px ${GREEN}22, 0 8px 24px -12px ${GREEN}33` } : undefined}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={name} color={accepted ? GREEN : kind === "pending" ? AMBER : GREY} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground truncate tracking-tight">{name}</p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
              {timeAgo(conn.updated_at)}
            </span>
          </div>
          {accepted && conn.to_phone && (
            <p className="text-xs text-foreground mt-0.5 font-mono">{conn.to_phone}</p>
          )}
          {kind === "pending" && conn.is_minor && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Sent to: Parent/Guardian</p>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-2">
        {kind === "pending" && (
          <button
            disabled
            className="text-[11px] font-semibold text-white px-3.5 py-1.5 rounded-full min-h-[36px] inline-flex items-center justify-center"
            style={{ background: GREY }}
          >
            Pending
          </button>
        )}
        {accepted && (
          <a
            href={conn.to_phone ? `tel:${conn.to_phone}` : undefined}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white px-3.5 py-1.5 rounded-full transition-transform hover:scale-[1.03]"
            style={{ background: GREEN, boxShadow: `0 4px 14px -4px ${GREEN}66` }}
          >
            <Phone size={11} /> Contact Now →
          </a>
        )}
      </div>
    </div>
  );
}

function ReceivedPendingCard({
  conn,
  senderLabel,
  senderName,
  senderSub,
  maskSender,
  onAccept,
  onDecline,
}: {
  conn: PersonaConnection;
  senderLabel: string;
  senderName: string;
  senderSub: string;
  maskSender: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
}) {
  return (
    <div className="outreach-card" style={{ borderColor: `${AMBER}55`, boxShadow: `0 0 0 1px ${AMBER}22, 0 8px 24px -12px ${AMBER}33` }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: AMBER }}>{senderLabel}</p>
      <div className="flex items-start gap-2.5">
        <Avatar name={senderName} color={AMBER} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground truncate tracking-tight">{senderName}</p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
              {timeAgo(conn.created_at)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{senderSub}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <button
          onClick={onAccept}
          className="flex-1 text-[12px] font-semibold text-white py-2 rounded-full transition-transform hover:scale-[1.02] min-h-[40px]"
          style={{ background: GREEN, boxShadow: `0 4px 14px -4px ${GREEN}66` }}
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="flex-1 text-[12px] font-semibold py-2 rounded-full border-[1.5px] transition-colors min-h-[40px]"
          style={{ borderColor: RED, color: RED }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

// ───────────── shared shells ─────────────
function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        {icon && <span style={{ color }}>{icon}</span>}
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Subsection({
  title,
  icon,
  color,
  items,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: PersonaConnection[];
  children: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span style={{ color }}>{icon}</span>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: color }}
        >
          {items.length}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground px-1">{text}</p>;
}

function Avatar({ name, color }: { name?: string | null; color: string }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
      style={{ background: color }}
    >
      {initials(name)}
    </div>
  );
}

interface SeekerDetails {
  unique_id?: string | null;
  grade?: string | null;
  stream?: string | null;
  jobs_interested_nature?: string | null;
  jobs_interested_role?: string | null;
  highest_qualification?: string | null;
  needs?: string | null;
  category?: string | null;
  email?: string | null;
  contact?: string | null;
}

function AcceptedSeekerCard({
  conn,
  onRemove,
}: {
  conn: PersonaConnection;
  onRemove: () => Promise<void>;
}) {
  const [details, setDetails] = useState<SeekerDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!conn.to_dot_id) return;
      const { data } = await supabase
        .from("student_dots")
        .select("unique_id,grade,highest_qualification,jobs_interested_nature,jobs_interested_role,needs,category,email,contact")
        .eq("id", conn.to_dot_id)
        .maybeSingle();
      if (!cancelled && data) setDetails(data as SeekerDetails);
    })();
    return () => {
      cancelled = true;
    };
  }, [conn.to_dot_id]);

  const name = conn.to_name || "Unknown";
  const phone = conn.to_phone || details?.contact || "";
  const email = details?.email || "";
  const grade = details?.grade || "";
  const stream = details?.jobs_interested_nature || "";
  const serviceType = details?.needs || details?.category || details?.jobs_interested_role || "";
  const uniqueId = details?.unique_id || "";

  const dateStr = new Date(conn.updated_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });

  return (
    <div className="outreach-card relative" style={{ borderColor: `${GREEN}40`, boxShadow: `0 0 0 1px ${GREEN}1a, 0 8px 24px -12px ${GREEN}33` }}>
      <button
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 tap-44 inline-flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded-full"
        aria-label="Remove"
      >
        <Trash2 size={14} />
      </button>

      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: `${AMBER}20`, color: AMBER }}
        >
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{name}</p>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${AMBER}15`, color: AMBER }}
            >
              <User size={10} /> Student
            </span>
          </div>
          {uniqueId && <p className="text-[11px] text-muted-foreground mt-0.5">{uniqueId}</p>}

          <div className="mt-2.5 space-y-1.5">
            {grade && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-24 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Grade</span>
                <span className="text-foreground break-words">{grade}</span>
              </div>
            )}
            {stream && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-24 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Stream</span>
                <span className="text-foreground break-words">{stream}</span>
              </div>
            )}
            {serviceType && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-24 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Service Type</span>
                <span className="text-foreground break-words">{serviceType}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full max-w-full min-h-[36px]"
                style={{ background: `${GREEN}15`, color: GREEN }}
              >
                <Mail size={12} className="flex-shrink-0" />
                <span className="truncate">{email}</span>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full min-h-[36px]"
                style={{ background: `${GREEN}15`, color: GREEN }}
              >
                <Phone size={12} className="flex-shrink-0" /> {phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-1">
        <span className="text-[11px] text-muted-foreground">{dateStr}</span>
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border"
          style={{ borderColor: GREEN, color: GREEN }}
        >
          <CheckCircle2 size={12} /> Accepted
        </span>
      </div>
    </div>
  );
}

interface ProviderDetails {
  unique_id?: string | null;
  openings?: string | null;
  job_role_salary?: string | null;
  type_of_candidate?: string | null;
  min_qualification?: string | null;
  nature_of_job?: string | null;
  area?: string | null;
  email?: string | null;
  contact?: string | null;
  hiring_manager_name?: string | null;
}

function AcceptedProviderCard({ conn }: { conn: PersonaConnection }) {
  const [details, setDetails] = useState<ProviderDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!conn.to_dot_id) return;
      const { data } = await supabase
        .from("centre_dots")
        .select("unique_id,openings,job_role_salary,type_of_candidate,min_qualification,nature_of_job,area,email,contact,hiring_manager_name")
        .eq("id", conn.to_dot_id)
        .maybeSingle();
      if (!cancelled && data) setDetails(data as ProviderDetails);
    })();
    return () => {
      cancelled = true;
    };
  }, [conn.to_dot_id]);

  const name = conn.to_name || "Provider";
  const phone = conn.to_phone || details?.contact || "";
  const email = details?.email || "";
  const uniqueId = details?.unique_id || "";
  const role = details?.job_role_salary || details?.nature_of_job || "";
  const openings = details?.openings || "";
  const lookingFor = details?.type_of_candidate || "";
  const manager = details?.hiring_manager_name || "";

  const dateStr = new Date(conn.updated_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });

  return (
    <div className="outreach-card relative" style={{ borderColor: `${GREEN}40`, boxShadow: `0 0 0 1px ${GREEN}1a, 0 8px 24px -12px ${GREEN}33` }}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: `${BLUE}20`, color: BLUE }}
        >
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{name}</p>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${BLUE}15`, color: BLUE }}
            >
              Provider
            </span>
          </div>
          {uniqueId && <p className="text-[11px] text-muted-foreground mt-0.5">{uniqueId}</p>}

          <div className="mt-2.5 space-y-1.5">
            {manager && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-28 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Hiring Manager</span>
                <span className="text-foreground break-words">{manager}</span>
              </div>
            )}
            {role && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-28 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Role / Salary</span>
                <span className="text-foreground break-words">{role}</span>
              </div>
            )}
            {openings && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-28 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Openings</span>
                <span className="text-foreground break-words">{openings}</span>
              </div>
            )}
            {lookingFor && (
              <div className="flex flex-col sm:flex-row sm:gap-3 text-xs">
                <span className="font-medium sm:w-28 sm:flex-shrink-0 text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal opacity-80" style={{ color: BLUE }}>Looking For</span>
                <span className="text-foreground break-words">{lookingFor}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full max-w-full min-h-[36px]"
                style={{ background: `${GREEN}15`, color: GREEN }}
              >
                <Mail size={12} className="flex-shrink-0" />
                <span className="truncate">{email}</span>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full min-h-[36px]"
                style={{ background: `${GREEN}15`, color: GREEN }}
              >
                <Phone size={12} className="flex-shrink-0" /> {phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-1">
        <span className="text-[11px] text-muted-foreground">{dateStr}</span>
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border"
          style={{ borderColor: GREEN, color: GREEN }}
        >
          <CheckCircle2 size={12} /> Accepted
        </span>
      </div>
    </div>
  );
}

export default PersonaConnections;

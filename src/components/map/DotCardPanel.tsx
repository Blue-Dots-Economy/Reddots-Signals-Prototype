import { useEffect, useState } from "react";
import { X, Plus, Phone } from "lucide-react";
import { toast } from "sonner";
import DotIconComponent from "./DotIcon";
import type { DotIcon } from "@/lib/mapData";
import { usePersonaConnections } from "@/hooks/usePersonaConnections";
import type { UserProfile } from "@/lib/phoneAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import ConsentChecklist, { allChecked, type ConsentItem } from "@/components/connect/ConsentChecklist";

const SEEKER_CONSENT: ConsentItem[] = [
  { key: "share", label: "I agree to share my name and phone number with this employer once they accept my request" },
  { key: "contact", label: "I am okay with this employer contacting me by phone" },
];

const PROVIDER_CONSENT: ConsentItem[] = [
  { key: "share", label: "I agree to share my business details (name, address, phone) with this student once they accept" },
  { key: "contact", label: "I understand this student may contact me by phone after accepting" },
];
const PROVIDER_MINOR_ITEM: ConsentItem = {
  key: "minor",
  label: "I understand this student is a minor and the consent request will be sent to their parent/guardian",
};

const BLUE = "#2563EB";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const PANEL_CLASS =
  "relative w-full sm:w-[calc(100vw-32px)] sm:max-w-sm bg-white sm:rounded-2xl rounded-t-3xl rounded-b-none sm:rounded-b-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_8px_40px_rgba(0,0,0,0.18)] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5 max-h-[85dvh] sm:max-h-none overflow-y-auto sm:overflow-visible";
const SHEET_CLASS =
  "relative w-full bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] max-h-[85dvh] overflow-y-auto";

interface Dot {
  id: string;
  name: string;
  area: string;
  icon?: string;
  hiring_manager_name?: string;
  contact?: string;
  openings?: string;
  job_role_salary?: string;
  type_of_candidate?: string;
  min_qualification?: string;
  nature_of_job?: string;
  school_iti?: string;
  age?: string;
  jobs_interested_nature?: string;
  jobs_interested_role?: string;
  highest_qualification?: string;
  work_experience?: string;
  address?: string;
  unique_id?: string;
  [key: string]: any;
}

interface Props {
  dot: Dot;
  isSeeker: boolean;
  profile: UserProfile;
  anchorPos?: { x: number; y: number } | null;
  onClose: () => void;
}

function isEmpty(val?: string | null): boolean {
  if (!val) return true;
  const v = val.trim().toLowerCase();
  return v === "" || v === "-" || v === "na" || v === "n/a" || v === "no" || v === "none";
}

function maskName(name: string): string {
  return name
    .split(" ")
    .map((w) => {
      if (w.length <= 1) return w;
      return w[0] + "●".repeat(Math.max(w.length - 2, 1)) + w[w.length - 1];
    })
    .join(" ");
}

function isMinor(age?: string | null): boolean {
  if (!age) return false;
  const num = parseInt(age, 10);
  return !isNaN(num) && num < 18;
}

function firstPhone(raw?: string | null): string {
  if (!raw) return "";
  const m = raw
    .split(/[\/,\n\s]+/)
    .map((s) => s.replace(/\D/g, ""))
    .find((d) => d.length >= 10);
  return m ? m.slice(-10) : "";
}

function PanelShell({
  anchorPos,
  onClose,
  children,
}: {
  anchorPos?: { x: number; y: number } | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  // Mobile: bottom sheet (ignores anchorPos for predictable thumb-reach UX)
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black/40 animate-fade-in flex items-end" onClick={onClose}>
        <div
          className="w-full animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={SHEET_CLASS}>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300" aria-hidden />
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: anchored callout or centered dialog
  return (
    <div className="fixed inset-0 z-[2000] bg-black/20 animate-fade-in" onClick={onClose}>
      {anchorPos ? (
        <div
          className="fixed z-[2001]"
          style={{
            left: `${anchorPos.x}px`,
            top: `${anchorPos.y}px`,
            transform: "translate(-50%, -100%) translateY(-16px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <div className="animate-slide-up">{children}</div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-white" />
          </div>
        </div>
      ) : (
        <div
          className="fixed inset-0 z-[2001] flex items-center justify-center px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="animate-slide-up">{children}</div>
        </div>
      )}
    </div>
  );
}

const DotCardPanel = ({ dot, isSeeker, profile, anchorPos, onClose }: Props) => {
  const conns = usePersonaConnections(profile.phone);
  const existing = conns.getConnectionForDot(dot.id);
  const status = existing?.status ?? null;
  const [busy, setBusy] = useState(false);

  const dotPhone = firstPhone(dot.contact);
  const minor = isMinor(dot.age);
  const accepted = status === "accepted";

  // ── Seeker → provider: direct Connect ──
  const handleSeekerConnect = async () => {
    if (!dotPhone) {
      toast.error("This provider has no contact phone.");
      return;
    }
    setBusy(true);
    const res = await conns.sendConnectRequest({
      fromPhone: profile.phone,
      fromPersona: profile.persona,
      fromDotId: profile.rowData?.id || profile.phone,
      fromName: profile.name,
      toPhone: dotPhone,
      toPersona: (dot.nature_of_job || "").toLowerCase().includes("intern")
        ? "msme_hiring_interns"
        : "msme_hiring_iti",
      toDotId: dot.id,
      toName: dot.name,
      isMinor: false,
    });
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else toast.success(`Connection request sent to ${dot.name}!`);
  };

  // ── Provider → seeker: direct Connect (consent-gated) ──
  const handleProviderConnect = async () => {
    if (!dotPhone) {
      toast.error("This seeker has no contact phone.");
      return;
    }
    setBusy(true);
    const res = await conns.sendConnectRequest({
      fromPhone: profile.phone,
      fromPersona: profile.persona,
      fromDotId: profile.rowData?.id || profile.phone,
      fromName: profile.name,
      toPhone: dotPhone,
      toPersona: (dot.school_iti || "").toLowerCase().includes("iti")
        ? "iti_student"
        : "school_student",
      toDotId: dot.id,
      toName: dot.name,
      isMinor: minor,
    });
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else toast.success(minor ? "Consent request sent to parent/guardian!" : `Connection request sent to ${dot.name}!`);
  };

  // ── PROVIDER CARD (seeker viewing) ──
  if (isSeeker) {
    const companyName = dot.name;
    const rows: [string, string][] = [];
    if (!isEmpty(dot.openings)) rows.push(["Openings", `${dot.openings} positions`]);
    if (!isEmpty(dot.job_role_salary)) rows.push(["Role / Salary", dot.job_role_salary!]);
    if (!isEmpty(dot.type_of_candidate)) rows.push(["Looking for", dot.type_of_candidate!]);
    if (!isEmpty(dot.min_qualification)) rows.push(["Min. Qualification", dot.min_qualification!]);

    return (
      <PanelShell anchorPos={anchorPos} onClose={onClose}>
        <div className={`${PANEL_CLASS} ${status === "declined" ? "opacity-60" : ""}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={22} />
          </button>

          <div className="flex items-center gap-3 mb-1 pr-8">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: BLUE }}
            >
              <span className="text-white">
                <DotIconComponent icon={(dot.icon || "briefcase") as DotIcon} size={20} />
              </span>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{companyName}</p>
            </div>
          </div>

          <hr className="border-border mb-3" />

          {rows.length > 0 && (
            <table className="w-full text-sm mb-3">
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground">
                      {label}
                    </td>
                    <td className="py-1 text-foreground">{value}</td>
                  </tr>
                ))}
                {accepted && !isEmpty(dot.hiring_manager_name) && (
                  <tr>
                    <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground">
                      Hiring Manager
                    </td>
                    <td className="py-1 text-foreground">{dot.hiring_manager_name}</td>
                  </tr>
                )}
                {accepted && dotPhone && (
                  <tr>
                    <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground">
                      Phone
                    </td>
                    <td className="py-1 text-foreground font-mono">{dotPhone}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <SeekerActions
            dotId={dot.id}
            status={status}
            busy={busy}
            phone={dotPhone}
            companyName={companyName}
            onConnect={handleSeekerConnect}
          />
        </div>
      </PanelShell>
    );
  }

  // ── SEEKER CARD (provider viewing) ──
  const displayName = accepted ? dot.name : maskName(dot.name);
  const rows: [string, string | JSX.Element][] = [];

  if (!isEmpty(dot.age)) {
    rows.push([
      "Age",
      minor ? (
        <span>
          {dot.age}{" "}
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: `${AMBER}20`, color: AMBER }}
          >
            Minor
          </span>
        </span>
      ) : (
        dot.age!
      ),
    ]);
  }

  if (!isEmpty(dot.jobs_interested_nature)) rows.push(["Interested in", dot.jobs_interested_nature!]);
  if (!isEmpty(dot.jobs_interested_role)) rows.push(["Preferred role", dot.jobs_interested_role!]);
  if (!isEmpty(dot.highest_qualification)) rows.push(["Qualification", dot.highest_qualification!]);
  if (!isEmpty(dot.work_experience)) rows.push(["Experience", dot.work_experience!]);

  return (
    <PanelShell anchorPos={anchorPos} onClose={onClose}>
      <div className={`${PANEL_CLASS} ${status === "declined" ? "opacity-60" : ""}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={22} />
        </button>

        <div className="flex items-center gap-3 mb-1 pr-8">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: BLUE }}
          >
            <span className="text-white">
              <DotIconComponent icon={(dot.icon || "book") as DotIcon} size={20} />
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{displayName}</p>
          </div>
        </div>

        <hr className="border-border my-3" />

        {rows.length > 0 && (
          <table className="w-full text-sm mb-3">
            <tbody>
              {rows.map(([label, value], i) => (
                <tr key={i}>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground">
                    {label}
                  </td>
                  <td className="py-1 text-foreground">{value}</td>
                </tr>
              ))}
              {accepted && dotPhone && (
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground">
                    Phone
                  </td>
                  <td className="py-1 text-foreground font-mono">{dotPhone}</td>
                </tr>
              )}
              {accepted && !isEmpty(dot.area) && (
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground">
                    Location
                  </td>
                  <td className="py-1 text-foreground">{dot.area}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <ProviderActions
          dotId={dot.id}
          status={status}
          busy={busy}
          isMinor={minor}
          phone={dotPhone}
          seekerName={dot.name}
          onConnect={handleProviderConnect}
        />
      </div>
    </PanelShell>
  );
};

// ── Seeker viewing provider: Connect → Requested → Connected ──
function SeekerActions({
  dotId,
  status,
  busy,
  phone,
  companyName,
  onConnect,
}: {
  dotId: string;
  status: "shortlisted" | "pending" | "accepted" | "declined" | null;
  busy: boolean;
  phone: string;
  companyName: string;
  onConnect: () => void;
}) {
  // Reset consent every time a different dot is opened.
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setConsent({});
  }, [dotId]);

  if (status === null) {
    const ready = allChecked(SEEKER_CONSENT, consent);
    return (
      <div className="space-y-3">
        <ConsentChecklist
          items={SEEKER_CONSENT}
          values={consent}
          onChange={setConsent}
          disabled={busy}
        />
        <button
          onClick={onConnect}
          disabled={busy || !ready}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white py-2.5 rounded-xl transition-opacity disabled:cursor-not-allowed"
          style={{ background: ready ? GREEN : "#94A3B8", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Sending...
            </>
          ) : (
            <>
              <Plus size={16} /> Connect
            </>
          )}
        </button>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="space-y-2">
        <button
          disabled
          className="w-full text-sm font-semibold text-white py-2.5 rounded-xl"
          style={{ background: "#94A3B8" }}
        >
          Requested
        </button>
        <p className="text-[11px] text-muted-foreground text-center">
          Waiting for {companyName} to respond
        </p>
      </div>
    );
  }
  if (status === "accepted") {
    return (
      <a
        href={phone ? `tel:${phone}` : undefined}
        className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white py-2.5 rounded-xl"
        style={{ background: GREEN }}
      >
        <Phone size={16} /> Contact Now →
      </a>
    );
  }
  // declined
  return (
    <button
      disabled
      className="w-full text-sm font-semibold text-white py-2.5 rounded-xl"
      style={{ background: "#94A3B8" }}
    >
      Declined
    </button>
  );
}

// ── Provider viewing seeker: Connect (consent-gated) ──
function ProviderActions({
  dotId,
  status,
  busy,
  isMinor,
  phone,
  seekerName,
  onConnect,
}: {
  dotId: string;
  status: "shortlisted" | "pending" | "accepted" | "declined" | null;
  busy: boolean;
  isMinor: boolean;
  phone: string;
  seekerName: string;
  onConnect: () => void;
}) {
  const items: ConsentItem[] = isMinor ? [...PROVIDER_CONSENT, PROVIDER_MINOR_ITEM] : PROVIDER_CONSENT;
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setConsent({});
  }, [dotId]);

  if (status === null || status === "shortlisted") {
    const ready = allChecked(items, consent);
    return (
      <div className="space-y-3">
        <ConsentChecklist items={items} values={consent} onChange={setConsent} disabled={busy} />
        <button
          onClick={onConnect}
          disabled={busy || !ready}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white py-2.5 rounded-xl transition-opacity disabled:cursor-not-allowed"
          style={{ background: ready ? GREEN : "#94A3B8", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Sending...
            </>
          ) : (
            <>
              <Plus size={16} /> Connect
            </>
          )}
        </button>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="space-y-2">
        <button
          disabled
          className="w-full text-sm font-semibold text-white py-2.5 rounded-xl"
          style={{ background: "#94A3B8" }}
        >
          Requested
        </button>
        <p className="text-[11px] text-muted-foreground text-center">
          {isMinor ? "Consent request sent to parent/guardian" : `Waiting for ${seekerName} to respond`}
        </p>
      </div>
    );
  }
  if (status === "accepted") {
    return (
      <a
        href={phone ? `tel:${phone}` : undefined}
        className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white py-2.5 rounded-xl"
        style={{ background: GREEN }}
      >
        <Phone size={16} /> Contact Now →
      </a>
    );
  }
  return (
    <button
      disabled
      className="w-full text-sm font-semibold text-white py-2.5 rounded-xl"
      style={{ background: "#94A3B8" }}
    >
      Declined
    </button>
  );
}

export default DotCardPanel;

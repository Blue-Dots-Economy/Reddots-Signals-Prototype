import { useEffect, useState } from "react";
import { MapPin, Plus, Phone } from "lucide-react";
import { toast } from "sonner";
import { haversineKm } from "@/lib/distance";
import DotIconComponent from "./DotIcon";
import DotCardPanel from "./DotCardPanel";
import ListFilterBar from "./ListFilterBar";
import type { UserProfile } from "@/lib/phoneAuth";
import type { ChatFilters } from "@/components/chat/PersonaChat";
import type { DotIcon } from "@/lib/mapData";
import { usePersonaConnections, type PersonaConnStatus } from "@/hooks/usePersonaConnections";
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

const BLUE = "#DC143C";

interface Dot {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  icon?: string;
  nature_of_job?: string;
  school_iti?: string;
  jobs_interested_nature?: string;
  jobs_interested_role?: string;
  hiring_manager_name?: string;
  contact?: string;
  job_role_salary?: string;
  openings?: string;
  min_qualification?: string;
  highest_qualification?: string;
  age?: string;
  address?: string;
  [key: string]: any;
}

interface Props {
  profile: UserProfile;
  filters: ChatFilters;
  dots: Dot[];
  filteredDots: Dot[];
  activeFilters: ChatFilters;
  onFiltersChange: (f: ChatFilters) => void;
  entityLabel: string;
  isSeeker: boolean;
}

function isEmpty(val?: string | null): boolean {
  if (!val) return true;
  const v = val.trim().toLowerCase();
  return v === "" || v === "-" || v === "na" || v === "n/a" || v === "no" || v === "none";
}

function maskName(name: string): string {
  return name.split(" ").map((w) => {
    if (w.length <= 1) return w;
    return w[0] + "●".repeat(Math.max(w.length - 2, 1)) + w[w.length - 1];
  }).join(" ");
}

function isMinor(age?: string | null): boolean {
  if (!age) return false;
  const num = parseInt(age, 10);
  return !isNaN(num) && num < 18;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-0.5">
      <span className="text-xs font-medium w-24 flex-shrink-0" style={{ color: BLUE }}>{label}</span>
      <span className="text-xs text-foreground">{value}</span>
    </div>
  );
}

const PersonaListView = ({ profile, dots, filteredDots, activeFilters, onFiltersChange, entityLabel, isSeeker }: Props) => {
  const [selectedDot, setSelectedDot] = useState<Dot | null>(null);
  // Per-card seeker consent state (session-only, resets when dot leaves filtered list).
  const [consentByDot, setConsentByDot] = useState<Record<string, Record<string, boolean>>>({});
  const { getStatusForDot: getConnectionStatus, getConnectionForDot, sendConnectRequest } = usePersonaConnections(profile.phone);

  const setConsentFor = (dotId: string, next: Record<string, boolean>) =>
    setConsentByDot((prev) => ({ ...prev, [dotId]: next }));

  const clearConsentFor = (dotId: string) =>
    setConsentByDot((prev) => {
      const { [dotId]: _, ...rest } = prev;
      return rest;
    });

  const consentItemsFor = (dot: Dot): ConsentItem[] => {
    if (isSeeker) return SEEKER_CONSENT;
    return isMinor(dot.age) ? [...PROVIDER_CONSENT, PROVIDER_MINOR_ITEM] : PROVIDER_CONSENT;
  };

  const handleCTA = async (dot: Dot, status: PersonaConnStatus | null) => {
    if (status === "accepted") {
      const conn = getConnectionForDot(dot.id);
      const phone = (conn?.from_phone === profile.phone ? conn?.to_phone : conn?.from_phone) || dot.contact;
      if (phone) window.location.href = `tel:${phone}`;
      return;
    }
    if (status) {
      // pending/declined → just open card
      setSelectedDot(dot);
      return;
    }
    // No connection — direct Connect for both sides (consent-gated)
    const items = consentItemsFor(dot);
    const consent = consentByDot[dot.id] || {};
    if (!allChecked(items, consent)) {
      toast("Please confirm all consent checkboxes to proceed.");
      return;
    }
    const minor = isMinor(dot.age);
    const { error } = await sendConnectRequest({
      fromPhone: profile.phone,
      fromPersona: profile.persona,
      fromDotId: profile.phone,
      fromName: profile.name,
      toPhone: dot.contact || "",
      toPersona: profile.persona,
      toDotId: dot.id,
      toName: dot.name,
      isMinor: !isSeeker && minor,
    });
    if (error) {
      toast.error(error);
    } else {
      toast.success(!isSeeker && minor ? "Consent request sent to parent/guardian!" : `Request sent to ${dot.name}!`);
      clearConsentFor(dot.id);
    }
  };

  const sorted = [...filteredDots].sort((a, b) => {
    return haversineKm(profile.lat, profile.lng, a.lat, a.lng) - haversineKm(profile.lat, profile.lng, b.lat, b.lng);
  });

  return (
    <div className="min-h-[100dvh] bg-background pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] px-3 sm:px-6 safe-px">
      <div className="max-w-2xl mx-auto">
        <div className="mb-3">
          <ListFilterBar persona={profile.persona} activeFilters={activeFilters} onFiltersChange={onFiltersChange} />
        </div>
        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No {entityLabel.toLowerCase()} match your filters.</p>
            <button
              onClick={() => onFiltersChange({})}
              className="mt-3 text-xs font-semibold text-white px-4 py-2 rounded-lg"
              style={{ background: BLUE }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((dot) => {
              const dist = haversineKm(profile.lat, profile.lng, dot.lat, dot.lng);
              const status = getConnectionStatus(dot.id);

              if (isSeeker) {
                // ── Provider card ──
                const companyName = dot.name;
                const location = dot.area;

                return (
                  <div
                    key={dot.id}
                    onClick={() => setSelectedDot(dot)}
                    className={`bg-card border border-border rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${status === "declined" ? "opacity-60" : ""}`}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${BLUE}1A` }}>
                        <span style={{ color: BLUE }}><DotIconComponent icon={(dot.icon || "briefcase") as DotIcon} size={18} /></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground leading-tight">{companyName}</p>
                          <StatusPill status={status} />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border my-2" />

                    <div className="space-y-0">
                      {!isEmpty(dot.openings) && <DetailRow label="Openings" value={`${dot.openings} positions`} />}
                      {!isEmpty(dot.job_role_salary) && <DetailRow label="Role / Salary" value={dot.job_role_salary!} />}
                      {!isEmpty(dot.nature_of_job) && <DetailRow label="Job Type" value={dot.nature_of_job!} />}
                      {!isEmpty(dot.min_qualification) && <DetailRow label="Qualification" value={dot.min_qualification!} />}
                    </div>

                    {status === null && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <ConsentChecklist
                          items={SEEKER_CONSENT}
                          values={consentByDot[dot.id] || {}}
                          onChange={(v) => setConsentFor(dot.id, v)}
                        />
                      </div>
                    )}

                    <div className="flex justify-end mt-3">
                      <CardCTA
                        status={status}
                        onClick={(e) => { e.stopPropagation(); handleCTA(dot, status); }}
                        disabled={status === null && !allChecked(SEEKER_CONSENT, consentByDot[dot.id] || {})}
                      />
                    </div>
                  </div>
                );
              }

              // ── Seeker card ──
              const displayName = status === "accepted" ? dot.name : maskName(dot.name);
              const minor = isMinor(dot.age);

              return (
                <div
                  key={dot.id}
                  onClick={() => setSelectedDot(dot)}
                  className={`bg-card border border-border rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${status === "declined" ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${BLUE}1A` }}>
                      <span style={{ color: BLUE }}><DotIconComponent icon={(dot.icon || "book") as DotIcon} size={18} /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground leading-tight">{displayName}</p>
                        <StatusPill status={status} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border my-2" />

                  <div className="space-y-0">
                    {!isEmpty(dot.age) && (
                      <DetailRow label="Age" value={`${dot.age}${minor ? " (Minor)" : ""}`} />
                    )}
                    {!isEmpty(dot.school_iti) && <DetailRow label="School / ITI" value={dot.school_iti!} />}
                    {!isEmpty(dot.highest_qualification) && <DetailRow label="Qualification" value={dot.highest_qualification!} />}
                    {!isEmpty(dot.jobs_interested_nature) && <DetailRow label="Interest" value={dot.jobs_interested_nature!} />}
                    {!isEmpty(dot.jobs_interested_role) && <DetailRow label="Role" value={dot.jobs_interested_role!} />}
                  </div>

                  {status === null && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <ConsentChecklist
                        items={consentItemsFor(dot)}
                        values={consentByDot[dot.id] || {}}
                        onChange={(v) => setConsentFor(dot.id, v)}
                      />
                    </div>
                  )}

                  <div className="flex justify-end mt-3">
                    <CardCTA
                      status={status}
                      onClick={(e) => { e.stopPropagation(); handleCTA(dot, status); }}
                      disabled={status === null && !allChecked(consentItemsFor(dot), consentByDot[dot.id] || {})}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDot && (
        <DotCardPanel dot={selectedDot} isSeeker={isSeeker} profile={profile} onClose={() => setSelectedDot(null)} />
      )}
    </div>
  );
};

function StatusPill({ status }: { status: PersonaConnStatus | null }) {
  if (!status) return null;
  const map: Record<PersonaConnStatus, { bg: string; fg: string; label: string }> = {
    shortlisted: { bg: "#DBEAFE", fg: "#DC143C", label: "Shortlisted" },
    pending: { bg: "#FEF3C7", fg: "#B45309", label: "Pending" },
    accepted: { bg: "#DCFCE7", fg: "#166534", label: "Connected" },
    declined: { bg: "#E5E7EB", fg: "#6B7280", label: "Declined" },
  };
  const s = map[status];
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function CardCTA({
  status,
  onClick,
  disabled,
}: {
  status: PersonaConnStatus | null;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  if (status === "shortlisted") {
    // Legacy state — treat as pending visually
    return (
      <button onClick={onClick} className="text-xs font-semibold text-white px-5 py-2 rounded-full" style={{ background: "#94A3B8" }}>
        Pending
      </button>
    );
  }
  if (status === "pending") {
    return (
      <button onClick={onClick} className="text-xs font-semibold text-white px-5 py-2 rounded-full" style={{ background: "#94A3B8" }}>
        Pending
      </button>
    );
  }
  if (status === "accepted") {
    return (
      <button onClick={onClick} className="flex items-center gap-1.5 text-xs font-semibold text-white px-5 py-2 rounded-full" style={{ background: "#16A34A" }}>
        <Phone size={12} /> Contact
      </button>
    );
  }
  if (status === "declined") {
    return (
      <button onClick={onClick} disabled className="text-xs font-semibold text-white px-5 py-2 rounded-full opacity-60" style={{ background: "#94A3B8" }}>
        Declined
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 text-xs font-semibold text-white px-5 py-2 rounded-full transition-opacity disabled:cursor-not-allowed"
      style={{ background: disabled ? "#94A3B8" : BLUE }}
    >
      <Plus size={14} /> Connect
    </button>
  );
}

export default PersonaListView;

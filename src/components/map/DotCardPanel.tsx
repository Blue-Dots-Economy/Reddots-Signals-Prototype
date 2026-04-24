import { X, Phone, Navigation, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import type { RedDot } from "@/pages/LaunchPage";
import type { RedDotsView } from "@/lib/phoneAuth";

const RED = "#DC143C";
const GREY = "#4A4A4A";

const PANEL_CLASS =
  "relative w-full sm:w-[calc(100vw-32px)] sm:max-w-sm bg-white sm:rounded-2xl rounded-t-3xl rounded-b-none sm:rounded-b-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_8px_40px_rgba(0,0,0,0.18)] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5 max-h-[85dvh] sm:max-h-none overflow-y-auto sm:overflow-visible";
const SHEET_CLASS =
  "relative w-full bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] max-h-[85dvh] overflow-y-auto";

interface Props {
  dot: RedDot;
  activeView: RedDotsView;
  anchorPos?: { x: number; y: number } | null;
  onClose: () => void;
}

function isEmpty(val?: string | null): boolean {
  if (!val) return true;
  const v = val.trim().toLowerCase();
  return v === "" || v === "-" || v === "na" || v === "n/a" || v === "no" || v === "none";
}

function firstPhone(raw?: string | null): string {
  if (!raw) return "";
  const segs = raw.split(/[\/,\n\s]+/);
  for (const s of segs) {
    const digits = s.replace(/\D/g, "");
    if (digits.length >= 3 && digits.length <= 4) return digits; // 108, 100, 1800
    if (digits.length >= 10) return digits.slice(-10);
  }
  return raw.trim();
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

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black/40 animate-fade-in flex items-end" onClick={onClose}>
        <div className="w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <div className={SHEET_CLASS}>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300" aria-hidden />
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/20 animate-fade-in" onClick={onClose}>
      {anchorPos ? (
        <div
          className="fixed z-[2001]"
          style={{ left: `${anchorPos.x}px`, top: `${anchorPos.y}px`, transform: "translate(-50%, -100%) translateY(-16px)" }}
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

const CATEGORY_LABELS: Record<string, string> = {
  hospital: "Hospital",
  ambulance: "Ambulance",
  mechanic: "Mechanic",
  tow: "Tow Truck",
  ssm: "SSM Volunteer",
  fuel: "Fuel Station",
};

function riskColors(level: string): { bg: string; fg: string } {
  const l = (level || "").toUpperCase();
  if (l === "CRITICAL") return { bg: "#7F1D1D", fg: "white" };
  if (l === "HIGH") return { bg: "#DC143C", fg: "white" };
  if (l === "MODERATE") return { bg: "#F59E0B", fg: "white" };
  return { bg: "#94A3B8", fg: "white" };
}

const DotCardPanel = ({ dot, activeView, anchorPos, onClose }: Props) => {
  const phone = firstPhone(dot.contact);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dot.lat},${dot.lng}`;

  // ── SERVICE PROVIDER CARD ──
  if (dot.kind === "service") {
    const categoryLabel = CATEGORY_LABELS[dot.category || ""] || (dot.category || "Service");
    const rows: [string, string][] = [];
    if (!isEmpty(dot.area)) rows.push(["Area", dot.area]);
    if (!isEmpty(dot.availability)) rows.push(["Hours", dot.availability!]);
    if (!isEmpty(dot.speciality)) rows.push(["Specialisation", dot.speciality!]);
    if (!isEmpty(dot.costRange)) rows.push(["Cost", dot.costRange!]);
    if (!isEmpty(dot.type)) rows.push(["Type", dot.type!]);

    return (
      <PanelShell anchorPos={anchorPos} onClose={onClose}>
        <div className={PANEL_CLASS}>
          <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={22} />
          </button>

          <div className="pr-8 mb-3">
            <p className="text-lg font-bold text-gray-900 leading-tight">{dot.name}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: RED }}>
                {categoryLabel}
              </span>
              {dot.category === "hospital" && (dot.goldenHour || "").toLowerCase() === "yes" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#B45309" }}>
                  Golden Hour empanelled
                </span>
              )}
            </div>
          </div>

          {!isEmpty(dot.description) && (
            <p className="text-[13px] text-gray-700 leading-relaxed mb-3">{dot.description}</p>
          )}

          {rows.length > 0 && (
            <table className="w-full text-sm mb-4">
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground text-xs">{label}</td>
                    <td className="py-1 text-foreground text-xs">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="grid grid-cols-2 gap-2">
            <a
              href={phone ? `tel:${phone}` : undefined}
              className={`flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl transition-opacity ${phone ? "" : "opacity-50 pointer-events-none"}`}
              style={{ background: RED, boxShadow: phone ? "0 4px 14px rgba(220,20,60,0.35)" : "none" }}
              onClick={(e) => { if (!phone) e.preventDefault(); }}
            >
              <Phone size={16} /> Call
            </a>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl border-2 transition-colors hover:bg-muted"
              style={{ borderColor: RED, color: RED }}
            >
              <Navigation size={16} /> Directions
            </a>
          </div>
          {phone && (
            <p className="text-[11px] text-muted-foreground text-center mt-2 font-mono">{phone}</p>
          )}
        </div>
      </PanelShell>
    );
  }

  // ── HOTSPOT CARD ──
  const colors = riskColors(dot.riskLevel || "");
  const stats: [string, string][] = [];
  if (!isEmpty(dot.totalAccidents)) stats.push(["Total accidents", dot.totalAccidents!]);
  if (!isEmpty(dot.deaths)) stats.push(["Deaths", dot.deaths!]);
  if (!isEmpty(dot.injured)) stats.push(["Injured", dot.injured!]);
  if (!isEmpty(dot.fatalityRate)) stats.push(["Fatality rate", dot.fatalityRate!]);
  if (!isEmpty(dot.roadClass)) stats.push(["Road class", dot.roadClass!]);
  if (!isEmpty(dot.topCollision)) stats.push(["Top collision type", dot.topCollision!]);

  return (
    <PanelShell anchorPos={anchorPos} onClose={onClose}>
      <div className={PANEL_CLASS}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={22} />
        </button>

        <div className="pr-8 mb-3">
          <p className="text-lg font-bold text-gray-900 leading-tight">{dot.name}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: colors.bg, color: colors.fg }}
            >
              {(dot.riskLevel || "UNKNOWN").toUpperCase()}
            </span>
            {!isEmpty(dot.area) && (
              <span className="text-xs text-muted-foreground">{dot.area}</span>
            )}
          </div>
        </div>

        {!isEmpty(dot.description) && (
          <p className="text-[13px] text-gray-700 leading-relaxed mb-3">{dot.description}</p>
        )}

        {stats.length > 0 && (
          <table className="w-full text-sm mb-4">
            <tbody>
              {stats.map(([label, value]) => (
                <tr key={label}>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground text-xs">{label}</td>
                  <td className="py-1 text-foreground text-xs font-semibold">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          onClick={() => {
            toast.success("Hazard report submitted", {
              description: "Thanks — we've logged this near " + dot.name + ".",
            });
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl transition-opacity"
          style={{ background: GREY, boxShadow: "0 4px 14px rgba(74,74,74,0.3)" }}
        >
          <AlertTriangle size={16} /> Report a hazard here
        </button>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
        >
          <Navigation size={14} /> Open in Maps
        </a>
      </div>
    </PanelShell>
  );
};

export default DotCardPanel;

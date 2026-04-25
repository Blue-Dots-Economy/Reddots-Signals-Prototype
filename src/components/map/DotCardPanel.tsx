import { useState, useRef, useEffect, useCallback } from "react";
import { X, Phone, Navigation, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import type { RedDot } from "@/pages/LaunchPage";
import type { RedDotsView } from "@/lib/phoneAuth";
import potholeImg from "@/assets/pothole.jpg";

const RED = "#DC143C";
const GREY = "#4A4A4A";

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
    if (digits.length >= 3 && digits.length <= 4) return digits;
    if (digits.length >= 10) return digits.slice(-10);
  }
  return raw.trim();
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

const HAZARD_TYPES = ["Pothole", "Poor Lighting", "Missing Divider", "Construction Zone", "Blind Turn", "Other"];
const SEVERITIES = ["High", "Medium", "Low"] as const;

/* ───────────── Mobile bottom sheet with drag + snap points ───────────── */

type Snap = "collapsed" | "expanded" | "closed";

function MobileBottomSheet({
  onClose,
  children,
  collapsedPreview,
}: {
  onClose: () => void;
  children: React.ReactNode;
  collapsedPreview: React.ReactNode;
}) {
  const [snap, setSnap] = useState<Snap>("expanded");
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const lastY = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // viewport-based heights
  const collapsedH = 132; // px
  const expandedVh = 0.6; // 60vh

  const onPointerDown = (e: React.PointerEvent) => {
    // only initiate drag from handle area (handled via onPointerDown on handle)
    startY.current = e.clientY;
    lastY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    lastY.current = e.clientY;
    setDragY(dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    startY.current = null;
    setDragY(0);
    // gesture decisions
    if (snap === "expanded") {
      if (dy > 160) onClose();
      else if (dy > 60) setSnap("collapsed");
    } else if (snap === "collapsed") {
      if (dy > 80) onClose();
      else if (dy < -40) setSnap("expanded");
    }
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // Lock background scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const heightStyle: React.CSSProperties =
    snap === "collapsed"
      ? { height: `${collapsedH}px` }
      : { height: `${Math.round(expandedVh * 100)}dvh`, maxHeight: "60dvh" };

  const transform = dragY > 0 ? `translateY(${dragY}px)` : undefined;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end animate-fade-in">
      {/* Scrim — only ~40% of viewport gets covered visually because sheet is max 60vh */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div
        ref={sheetRef}
        className="relative w-full bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] animate-slide-up flex flex-col"
        style={{
          ...heightStyle,
          transform,
          transition: dragY === 0 ? "height 220ms cubic-bezier(0.16,1,0.3,1), transform 220ms cubic-bezier(0.16,1,0.3,1)" : "none",
          paddingBottom: "env(safe-area-inset-bottom)",
          touchAction: "none",
        }}
      >
        {/* Drag handle */}
        <div
          className="pt-2 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none" }}
        >
          <div className="w-10 h-1.5 rounded-full bg-gray-300" aria-hidden />
        </div>

        {snap === "collapsed" ? (
          <button
            className="flex-1 px-5 pb-3 text-left"
            onClick={() => setSnap("expanded")}
          >
            {collapsedPreview}
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">Tap or swipe up for details</p>
          </button>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain-strict px-5 pt-1 pb-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Tablet/Desktop right-side panel ───────────── */

function SidePanel({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[2000] animate-fade-in">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/20" />
      <aside
        className="absolute top-0 right-0 h-[100dvh] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] flex flex-col animate-slide-in-right w-[320px] lg:w-[400px]"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain-strict px-5 pt-4 pb-4">
          {children}
        </div>
      </aside>
    </div>
  );
}

/* ───────────── Card body content ───────────── */

const DotCardPanel = ({ dot, activeView, onClose }: Props) => {
  const isMobile = useIsMobile();
  const phone = firstPhone(dot.contact);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dot.lat},${dot.lng}`;
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [hazardType, setHazardType] = useState(HAZARD_TYPES[0]);
  const [hazardDesc, setHazardDesc] = useState("");
  const [hazardSeverity, setHazardSeverity] = useState<typeof SEVERITIES[number]>("Medium");
  const [submittingHazard, setSubmittingHazard] = useState(false);

  const submitHazardReport = async () => {
    setSubmittingHazard(true);
    const ref = `RD-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      await supabase.from("centre_dots").insert({
        name: `${hazardType} report`,
        area: dot.area || "Citizen report",
        lat: dot.lat + (Math.random() - 0.5) * 0.001,
        lng: dot.lng + (Math.random() - 0.5) * 0.001,
        icon: "warning",
        contact: "direct",
        relevance: hazardSeverity.toUpperCase() === "HIGH" ? "HIGH" : "MODERATE",
        description: hazardDesc.trim() || null,
        services: hazardType,
        kind: "pothole",
      } as any);
    } catch { /* non-blocking */ }
    setSubmittingHazard(false);
    toast.success("Report submitted", { description: `Reference ${ref} — thanks for the heads-up.` });
    setShowHazardForm(false);
    onClose();
  };

  const isService = dot.kind === "service";
  const categoryLabel = isService ? (CATEGORY_LABELS[dot.category || ""] || dot.category || "Service") : "";
  const colors = riskColors(dot.riskLevel || "");

  /* ── Header (also used as collapsed preview on mobile) ── */
  const Header = (
    <div className="pr-10">
      <p className="text-[15px] sm:text-base font-bold text-gray-900 leading-tight">{dot.name}</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {isService ? (
          <>
            <span className="text-[12px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: RED }}>
              {categoryLabel}
            </span>
            {dot.category === "hospital" && (dot.goldenHour || "").toLowerCase() === "yes" && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#B45309" }}>
                Golden Hour
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.fg }}>
              {(dot.riskLevel || "UNKNOWN").toUpperCase()}
            </span>
            {!isEmpty(dot.area) && <span className="text-[12px] text-muted-foreground">{dot.area}</span>}
          </>
        )}
      </div>
    </div>
  );

  /* ── Service body ── */
  const renderServiceBody = () => {
    const rows: [string, string][] = [];
    if (!isEmpty(dot.area)) rows.push(["Area", dot.area]);
    if (!isEmpty(dot.availability)) rows.push(["Hours", dot.availability!]);
    if (!isEmpty(dot.speciality)) rows.push(["Specialisation", dot.speciality!]);
    if (!isEmpty(dot.costRange)) rows.push(["Cost", dot.costRange!]);
    if (!isEmpty(dot.type)) rows.push(["Type", dot.type!]);

    return (
      <>
        {!isEmpty(dot.description) && (
          <p className="text-[14px] text-gray-700 leading-relaxed mb-3">{dot.description}</p>
        )}
        {rows.length > 0 && (
          <table className="w-full text-sm mb-4">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground text-[13px]">{label}</td>
                  <td className="py-1 text-foreground text-[13px]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  };

  return (
    <>
      {(() => {
        const Shell = ({ children }: { children: React.ReactNode }) =>
          isMobile ? (
            <MobileBottomSheet
              onClose={onClose}
              collapsedPreview={Header}
            >
              {children}
            </MobileBottomSheet>
          ) : (
            <SidePanel onClose={onClose}>{children}</SidePanel>
          );

        return (
          <Shell>
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-2 right-2 sm:top-3 sm:right-3 tap-44 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X size={22} />
            </button>

            {/* Pothole hero image */}
            {dot.kind === "pothole" && (
              <div className="-mx-5 -mt-1 mb-4 overflow-hidden">
                <img
                  src={potholeImg}
                  alt="Pothole on road"
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Header inside the sheet (shows in expanded state) */}
            <div className="mb-3">{Header}</div>

            {/* Body */}
            {isService ? (
              renderServiceBody()
            ) : (
              <>
                {!isEmpty(dot.description) && (
                  <p className="text-[14px] text-gray-700 leading-relaxed mb-3">{dot.description}</p>
                )}
                {(() => {
                  const stats: [string, string][] = [];
                  if (!isEmpty(dot.totalAccidents)) stats.push(["Total accidents", dot.totalAccidents!]);
                  if (!isEmpty(dot.deaths)) stats.push(["Deaths", dot.deaths!]);
                  if (!isEmpty(dot.injured)) stats.push(["Injured", dot.injured!]);
                  if (!isEmpty(dot.fatalityRate)) stats.push(["Fatality rate", dot.fatalityRate!]);
                  if (!isEmpty(dot.roadClass)) stats.push(["Road class", dot.roadClass!]);
                  if (!isEmpty(dot.topCollision)) stats.push(["Top collision type", dot.topCollision!]);
                  if (stats.length === 0) return null;
                  return (
                    <table className="w-full text-sm mb-4">
                      <tbody>
                        {stats.map(([label, value]) => (
                          <tr key={label}>
                            <td className="pr-4 py-1 font-medium whitespace-nowrap text-muted-foreground text-[13px]">{label}</td>
                            <td className="py-1 text-foreground text-[13px] font-semibold">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </>
            )}

            {/* Sticky CTAs */}
            <div
              className="sticky bottom-0 -mx-5 px-5 pt-3 pb-1 bg-gradient-to-t from-white via-white to-white/95 mt-auto"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 4px)" }}
            >
              {isService ? (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={phone ? `tel:${phone}` : undefined}
                    onClick={(e) => { if (!phone) e.preventDefault(); }}
                    className={`tap-44 flex items-center justify-center gap-2 text-[15px] font-bold text-white rounded-xl transition-opacity h-12 ${phone ? "" : "opacity-50 pointer-events-none"}`}
                    style={{ background: RED, boxShadow: phone ? "0 4px 14px rgba(220,20,60,0.35)" : "none" }}
                  >
                    <Phone size={18} /> Call
                  </a>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="tap-44 flex items-center justify-center gap-2 text-[15px] font-bold rounded-xl border-2 hover:bg-muted h-12"
                    style={{ borderColor: RED, color: RED }}
                  >
                    <Navigation size={18} /> Directions
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowHazardForm(true)}
                    className="tap-44 w-full flex items-center justify-center gap-2 text-[15px] font-bold text-white rounded-xl h-12"
                    style={{ background: GREY, boxShadow: "0 4px 14px rgba(74,74,74,0.3)" }}
                  >
                    <AlertTriangle size={18} /> Report a hazard
                  </button>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="tap-44 w-full flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl border border-border text-foreground hover:bg-muted h-11"
                  >
                    <Navigation size={16} /> Open in Maps
                  </a>
                </div>
              )}
              {isService && phone && (
                <p className="text-[12px] text-muted-foreground text-center mt-1.5 font-mono tabular-nums">{phone}</p>
              )}
            </div>
          </Shell>
        );
      })()}

      {showHazardForm && (
        <div className="fixed inset-0 z-[2100] bg-black/50 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setShowHazardForm(false)}>
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Report a hazard</h3>
              <button onClick={() => setShowHazardForm(false)} className="tap-44 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">Hazard type</label>
                <select
                  value={hazardType}
                  onChange={(e) => setHazardType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:outline-none focus:border-gray-400 min-h-[44px]"
                >
                  {HAZARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                  Description <span className="text-gray-400 normal-case font-normal">(optional, {200 - hazardDesc.length} left)</span>
                </label>
                <textarea
                  value={hazardDesc}
                  onChange={(e) => setHazardDesc(e.target.value.slice(0, 200))}
                  rows={3}
                  placeholder="What did you see?"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">Severity</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setHazardSeverity(s)}
                      className="py-2 rounded-lg border text-xs font-bold uppercase transition-colors min-h-[44px]"
                      style={
                        hazardSeverity === s
                          ? { background: GREY, borderColor: GREY, color: "white" }
                          : { background: "white", borderColor: "#e5e7eb", color: "#4A4A4A" }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={submitHazardReport}
                disabled={submittingHazard}
                className="tap-44 w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl mt-2 disabled:opacity-50 h-12"
                style={{ background: GREY }}
              >
                {submittingHazard ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DotCardPanel;

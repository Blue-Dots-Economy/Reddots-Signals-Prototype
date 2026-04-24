import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { buildNameMaps, resolveName } from "@/lib/resolveNames";

const YELLOW = "#2563EB";

type MetricType = "initiated" | "responded" | "accepted" | "rejected" | "contact_viewed";
type Persona = "overview" | "tutor" | "student" | "counsellor" | "centre" | "college";

const METRIC_LABELS: Record<MetricType, string> = {
  initiated: "Connects Initiated",
  responded: "Connects Responded",
  accepted: "Accepted",
  rejected: "Rejected",
  contact_viewed: "Contact Viewed",
};

const PERSONA_MAP: Record<string, string> = {
  tutor: "tutor",
  counsellor: "tutor", // counsellors mapped to tutor persona
  centre: "cl_centre",
  college: "hei",
  student: "student",
};

const MetricBreakdown = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const metric = (params.get("metric") || "initiated") as MetricType;
  const persona = (params.get("persona") || "overview") as Persona;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [metric, persona]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { dotIdToName } = await buildNameMaps();

      if (metric === "contact_viewed") {
        const { data: views } = await supabase.from("contact_views").select("*").order("viewed_at", { ascending: false });
        setRows((views || []).map(v => ({
          initiatorId: v.user_id?.slice(0, 8) || "Unknown",
          initiatorName: "",
          targetId: v.outreach_id?.slice(0, 8) || "Unknown",
          targetName: "",
          area: "—",
          type: v.outreach_table,
          time: v.viewed_at,
        })));
      } else {
        const [{ data: legacy }, { data: lahi }] = await Promise.all([
          supabase.from("connections").select("*").order("created_at", { ascending: false }),
          supabase.from("lahi_connections" as any).select("*").order("created_at", { ascending: false }),
        ]);

        // Normalize both sources into a single shape
        const legacyRows = ((legacy as any[]) || []).map((r) => ({
          from_id: r.from_user_id,
          from_dot_id: r.from_dot_id,
          from_name: null as string | null,
          to_id: r.to_user_id,
          to_dot_id: r.to_dot_id,
          to_name: null as string | null,
          from_persona: r.from_persona,
          to_persona: r.to_persona,
          status: r.status,
          created_at: r.created_at,
        }));
        const lahiRows = ((lahi as any[]) || []).map((r) => ({
          from_id: r.from_phone,
          from_dot_id: r.from_dot_id,
          from_name: r.from_name as string | null,
          to_id: r.to_phone,
          to_dot_id: r.to_dot_id,
          to_name: r.to_name as string | null,
          from_persona: r.from_persona,
          to_persona: r.to_persona,
          status: r.status,
          created_at: r.created_at,
        }));
        let filtered = [...legacyRows, ...lahiRows];

        if (persona !== "overview") {
          const mappedPersona = PERSONA_MAP[persona] || persona;
          filtered = filtered.filter(r => r.from_persona === mappedPersona || r.to_persona === mappedPersona);
        }

        if (metric === "responded") {
          filtered = filtered.filter(r => r.status === "accepted" || r.status === "rejected" || r.status === "declined");
        } else if (metric === "accepted") {
          filtered = filtered.filter(r => r.status === "accepted");
        } else if (metric === "rejected") {
          filtered = filtered.filter(r => r.status === "rejected" || r.status === "declined");
        }

        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setRows(filtered.map(r => ({
          initiatorId: typeof r.from_id === "string" ? r.from_id.slice(0, 8) : "Unknown",
          initiatorName: r.from_name || resolveName(r.from_dot_id, r.from_id, dotIdToName),
          targetId: typeof r.to_id === "string" ? r.to_id.slice(0, 8) : "Unknown",
          targetName: r.to_name || resolveName(r.to_dot_id, r.to_id, dotIdToName),
          area: "—",
          status: r.status,
          type: `${r.from_persona} → ${r.to_persona}`,
          time: r.created_at,
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      pending: { label: "Pending", bg: `${YELLOW}20`, color: YELLOW },
      accepted: { label: "Accepted", bg: "#2E7D3220", color: "#2E7D32" },
      rejected: { label: "Rejected", bg: "#EF444420", color: "#EF4444" },
    };
    const s = map[status] || { label: status, bg: "#88888820", color: "#888" };
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const personaLabel = persona === "overview" ? "All Personas" : persona.charAt(0).toUpperCase() + persona.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="h-5 w-px bg-border" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground">{METRIC_LABELS[metric]}</h1>
            <p className="text-xs text-muted-foreground">{personaLabel} · {rows.length} records</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-sm text-muted-foreground">No records found for this metric.</div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border sticky top-0 z-10 bg-card">
                     <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">From</th>
                     <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">From Name</th>
                     <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">To</th>
                     <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">To Name</th>
                     <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Direction</th>
                     {metric !== "contact_viewed" && <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>}
                     <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Time</th>
                   </tr>
                 </thead>
                 <tbody>
                   {rows.map((r, i) => (
                     <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                       <td className="px-4 py-3 text-foreground font-medium text-xs sm:text-sm truncate max-w-[120px]">{r.initiatorId}</td>
                       <td className="px-4 py-3 text-foreground text-xs sm:text-sm truncate max-w-[150px]">{r.initiatorName || "—"}</td>
                       <td className="px-4 py-3 text-foreground text-xs sm:text-sm truncate max-w-[120px]">{r.targetId}</td>
                       <td className="px-4 py-3 text-foreground text-xs sm:text-sm truncate max-w-[150px]">{r.targetName || "—"}</td>
                       <td className="px-4 py-3">
                         <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{r.type}</span>
                       </td>
                       {metric !== "contact_viewed" && <td className="px-4 py-3">{statusBadge(r.status)}</td>}
                       <td className="px-4 py-3 text-muted-foreground text-xs">
                         <div>{new Date(r.time).toLocaleDateString()}</div>
                         <div className="text-muted-foreground/70">{new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MetricBreakdown;

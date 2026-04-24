import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Users, Phone, Filter, TrendingUp, Search, ChevronDown, ChevronUp, Trash2, CircleDot, BarChart3, CheckCircle2, XCircle, Eye, MessageSquare } from "lucide-react";
import TutorDataTable from "@/components/admin/TutorDataTable";
import StudentDataTable from "@/components/admin/StudentDataTable";
import { toast } from "sonner";
import { buildNameMaps, resolveName } from "@/lib/resolveNames";

const YELLOW = "#2563EB";

type DashboardTab = "overview" | "tutor" | "counsellor" | "centre" | "college" | "student";

interface ConnectionRow {
  id: string;
  from_user_id: string;
  from_persona: string;
  to_user_id: string;
  to_persona: string;
  from_dot_id: string | null;
  to_dot_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  useEffect(() => {
    if (!user && !authLoading) navigate("/");
  }, [user, authLoading]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const tabs: { key: DashboardTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "centre", label: "Provider" },
    { key: "student", label: "Seeker" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: YELLOW }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 1-4 4v14a3 3 0 0 0 3-3h7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Blue Dots Analytics</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div>
            <p className="text-sm font-semibold text-foreground">Data Management</p>
            <p className="text-xs text-muted-foreground">Add, edit, or bulk-upload dots for all entity types</p>
          </div>
          <button onClick={() => navigate("/admin/manage-dots")} className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white rounded-lg px-3 sm:px-4 py-2 transition-colors flex-shrink-0 hover:opacity-90 w-full sm:w-auto justify-center" style={{ background: YELLOW }}>
            <CircleDot size={14} /> Manage Dots
          </button>
        </div>

        <ChatFlowToggle />

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">View activity by overview or individual persona</p>
          <div className="flex gap-1 rounded-2xl bg-muted/50 p-1 overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${activeTab === t.key ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/60"}`} style={activeTab === t.key ? { background: YELLOW } : {}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "overview" && <OverviewPanel />}
      {activeTab === "tutor" && <PersonaPanel persona="tutor" label="Tutor" />}
      {activeTab === "counsellor" && <PersonaPanel persona="counsellor" label="Counsellor" />}
      {activeTab === "centre" && <PersonaPanel persona="cl_centre" label="Provider" />}
      {activeTab === "college" && <PersonaPanel persona="hei" label="College" />}
      {activeTab === "student" && <StudentActivityPanel />}
    </div>
  );
};

/* ─── Helper: compute stats from connections ─── */
function computeStats(rows: ConnectionRow[]) {
  const initiated = rows.length;
  const accepted = rows.filter(r => r.status === "accepted").length;
  const rejected = rows.filter(r => r.status === "rejected").length;
  const responded = accepted + rejected;
  return { initiated, responded, accepted, rejected };
}

/* ─────────── Overview Panel ─────────── */
const OverviewPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [contactViews, setContactViews] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: conns }, { data: views }] = await Promise.all([
      supabase.from("connections").select("*"),
      supabase.from("contact_views").select("*"),
    ]);
    setConnections((conns as any as ConnectionRow[]) || []);
    setContactViews((views as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('overview_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_views' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <Spinner />;

  const total = computeStats(connections);
  const totalContactViewed = contactViews.length;

  // Group by from_persona → to_persona
  const groups: { label: string; filter: (r: ConnectionRow) => boolean }[] = [
    { label: "📚 Tutors → Seekers", filter: r => r.from_persona === "tutor" && r.to_persona === "student" },
    { label: "👤 Seekers → Tutors", filter: r => r.from_persona === "student" && r.to_persona === "tutor" },
    { label: "🏢 Seekers → Providers", filter: r => r.from_persona === "student" && r.to_persona === "cl_centre" },
    { label: "🏢 Providers → Seekers", filter: r => r.from_persona === "cl_centre" && r.to_persona === "student" },
    { label: "🎓 Seekers → Colleges", filter: r => r.from_persona === "student" && r.to_persona === "hei" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={<BarChart3 size={18} />} label="Connects Initiated" value={total.initiated} sub="all personas" onClick={() => navigate("/admin/metric?metric=initiated&persona=overview")} />
        <StatCard icon={<Phone size={18} />} label="Connects Responded" value={total.responded} sub={`${total.initiated ? Math.round((total.responded / total.initiated) * 100) : 0}% response rate`} onClick={() => navigate("/admin/metric?metric=responded&persona=overview")} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Accepted" value={total.accepted} sub={`${total.responded ? Math.round((total.accepted / total.responded) * 100) : 0}% acceptance`} onClick={() => navigate("/admin/metric?metric=accepted&persona=overview")} />
        <StatCard icon={<XCircle size={18} />} label="Rejected" value={total.rejected} sub={`${total.responded ? Math.round((total.rejected / total.responded) * 100) : 0}% rejection`} onClick={() => navigate("/admin/metric?metric=rejected&persona=overview")} />
        <StatCard icon={<Eye size={18} />} label="Contact Viewed" value={totalContactViewed} sub="total views" onClick={() => navigate("/admin/metric?metric=contact_viewed&persona=overview")} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 size={16} style={{ color: YELLOW }} /> Connects by Persona</h2>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Direction</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Initiated</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Responded</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Accepted</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Rejected</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const filtered = connections.filter(g.filter);
                const s = computeStats(filtered);
                if (s.initiated === 0) return null;
                return <PersonaRow key={g.label} label={g.label} initiated={s.initiated} responded={s.responded} accepted={s.accepted} rejected={s.rejected} contactViewed={0} />;
              })}
              {groups.every(g => connections.filter(g.filter).length === 0) && (
                <tr><td colSpan={5} className="text-center py-6 text-sm text-muted-foreground">No connections yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

const PersonaRow = ({ label, initiated, responded, accepted, rejected, contactViewed }: { label: string; initiated: number; responded: number; accepted: number; rejected: number; contactViewed: number }) => (
  <tr className="border-b border-border/50">
    <td className="py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{label}</td>
    <td className="text-center py-3 px-1.5 sm:px-3"><span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold" style={{ background: `${YELLOW}20`, color: YELLOW }}>{initiated}</span></td>
    <td className="text-center py-3 px-1.5 sm:px-3"><span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold" style={{ background: "#1565C020", color: "#1565C0" }}>{responded}</span></td>
    <td className="text-center py-3 px-1.5 sm:px-3"><span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold" style={{ background: "#2E7D3220", color: "#2E7D32" }}>{accepted}</span></td>
    <td className="text-center py-3 px-1.5 sm:px-3"><span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold" style={{ background: "#EF444420", color: "#EF4444" }}>{rejected}</span></td>
  </tr>
);

/* ─────────── Generic Persona Panel (Tutor, Counsellor, Centre, College) ─────────── */
const PersonaPanel = ({ persona, label }: { persona: string; label: string }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [filterLogs, setFilterLogs] = useState<any[]>([]);
  const [dotNames, setDotNames] = useState<Record<string, string>>({});
  const urlPersona = persona === "cl_centre" ? "centre" : persona === "hei" ? "college" : persona;

  const fetchData = async () => {
    setLoading(true);
    const [{ data: conns }, { data: filters }, { dotIdToName }] = await Promise.all([
      supabase.from("connections").select("*"),
      supabase.from("filter_usage_logs").select("filter_value"),
      buildNameMaps(),
    ]);
    const all = (conns as any as ConnectionRow[]) || [];
    setConnections(all.filter(r => r.from_persona === persona || r.to_persona === persona));
    setFilterLogs(filters || []);
    setDotNames(dotIdToName);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel(`${persona}_panel_realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [persona]);

  if (loading) return <Spinner />;

  const stats = computeStats(connections);
  const recent = [...connections].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);

  const filterCounts: Record<string, number> = {};
  filterLogs.forEach((log: any) => { filterCounts[log.filter_value] = (filterCounts[log.filter_value] || 0) + 1; });
  const filterUsage = Object.entries(filterCounts).map(([filter_value, count]) => ({ filter_value, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: "Pending", color: YELLOW },
      accepted: { label: "Accepted", color: "#2E7D32" },
      rejected: { label: "Rejected", color: "#EF4444" },
    };
    return map[status] || { label: status, color: "#888" };
  };

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={<BarChart3 size={18} />} label="Connects Initiated" value={stats.initiated} sub={`involving ${label.toLowerCase()}s`} onClick={() => navigate(`/admin/metric?metric=initiated&persona=${urlPersona}`)} />
        <StatCard icon={<Phone size={18} />} label="Responded" value={stats.responded} sub={`${stats.initiated ? Math.round((stats.responded / stats.initiated) * 100) : 0}%`} onClick={() => navigate(`/admin/metric?metric=responded&persona=${urlPersona}`)} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Accepted" value={stats.accepted} sub={`${stats.responded ? Math.round((stats.accepted / stats.responded) * 100) : 0}%`} onClick={() => navigate(`/admin/metric?metric=accepted&persona=${urlPersona}`)} />
        <StatCard icon={<XCircle size={18} />} label="Rejected" value={stats.rejected} sub={`${stats.responded ? Math.round((stats.rejected / stats.responded) * 100) : 0}%`} onClick={() => navigate(`/admin/metric?metric=rejected&persona=${urlPersona}`)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card border border-border rounded-2xl p-3 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4"><Filter size={16} style={{ color: YELLOW }} /> Most Used Filters</h2>
          {filterUsage.length > 0 ? (
            <div className="space-y-3">
              {filterUsage.map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-medium capitalize">{f.filter_value.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{f.count} uses</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(f.count / (filterUsage[0]?.count || 1)) * 100}%`, background: YELLOW }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No filter usage data yet.</p>}
        </div>

        <div className="bg-card border border-border rounded-2xl p-3 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4"><Users size={16} style={{ color: YELLOW }} /> Recent Activity</h2>
          {recent.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recent.map((r, i) => {
                const s = statusLabel(r.status);
                const fromName = resolveName(r.from_dot_id, r.from_user_id, dotNames);
                const toName = resolveName(r.to_dot_id, r.to_user_id, dotNames);
                return (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{fromName} → {toName}</p>
                      <p className="text-xs text-muted-foreground">{r.from_persona} → {r.to_persona} · {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.color, color: "white" }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
        </div>
      </div>

      {persona === "tutor" && <TutorDataTable />}
    </main>
  );
};

/* ─────────── Student Activity ─────────── */
const StudentActivityPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [studentFilterLogs, setStudentFilterLogs] = useState<any[]>([]);
  const [contactViewed, setContactViewed] = useState(0);
  const [dotNames, setDotNames] = useState<Record<string, string>>({});

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: conns }, { data: filters }, { data: views }, { dotIdToName }] = await Promise.all([
      supabase.from("connections").select("*"),
      supabase.from("student_filter_usage_logs").select("*"),
      supabase.from("contact_views").select("*"),
      buildNameMaps(),
    ]);
    const all = (conns as any as ConnectionRow[]) || [];
    setConnections(all.filter(r => r.from_persona === "student"));
    setStudentFilterLogs(filters || []);
    setContactViewed(((views as any[]) || []).length);
    setDotNames(dotIdToName);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase.channel('student_activity_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_views' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <Spinner />;

  const stats = computeStats(connections);

  const filterGroups: Record<string, { name: string; count: number }[]> = { tutor: [], counsellor: [], centre: [], college: [], other: [] };
  const filterCounts: Record<string, number> = {};
  studentFilterLogs.forEach((log: any) => { filterCounts[log.filter_value] = (filterCounts[log.filter_value] || 0) + 1; });
  Object.entries(filterCounts).forEach(([name, count]) => {
    const lower = name.toLowerCase();
    if (lower.includes("tutor") || lower.includes("subject")) filterGroups.tutor.push({ name, count });
    else if (lower.includes("counsell")) filterGroups.counsellor.push({ name, count });
    else if (lower.includes("centre") || lower.includes("center") || lower.includes("service")) filterGroups.centre.push({ name, count });
    else if (lower.includes("college") || lower.includes("program")) filterGroups.college.push({ name, count });
    else filterGroups.other.push({ name, count });
  });
  Object.keys(filterGroups).forEach((k) => filterGroups[k].sort((a, b) => b.count - a.count));

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: "Pending", color: YELLOW },
      accepted: { label: "Accepted", color: "#2E7D32" },
      rejected: { label: "Rejected", color: "#EF4444" },
    };
    return map[status] || { label: status, color: "#888" };
  };

  const FilterGroup = ({ title, emoji, filters }: { title: string; emoji: string; filters: { name: string; count: number }[] }) => {
    if (filters.length === 0) return null;
    const max = filters[0]?.count || 1;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{emoji} {title}</p>
        {filters.slice(0, 5).map((f, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-foreground capitalize">{f.name.replace(/_/g, " ")}</span>
              <span className="text-muted-foreground">{f.count}</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(f.count / max) * 100}%`, background: YELLOW }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const recent = [...connections].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={<BarChart3 size={18} />} label="Connects Initiated" value={stats.initiated} sub="by students" onClick={() => navigate("/admin/metric?metric=initiated&persona=student")} />
        <StatCard icon={<Phone size={18} />} label="Responded" value={stats.responded} sub={`${stats.initiated ? Math.round((stats.responded / stats.initiated) * 100) : 0}%`} onClick={() => navigate("/admin/metric?metric=responded&persona=student")} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Accepted" value={stats.accepted} sub={`${stats.responded ? Math.round((stats.accepted / stats.responded) * 100) : 0}%`} onClick={() => navigate("/admin/metric?metric=accepted&persona=student")} />
        <StatCard icon={<XCircle size={18} />} label="Rejected" value={stats.rejected} sub={`${stats.responded ? Math.round((stats.rejected / stats.responded) * 100) : 0}%`} onClick={() => navigate("/admin/metric?metric=rejected&persona=student")} />
        <StatCard icon={<Eye size={18} />} label="Contact Viewed" value={contactViewed} sub="total views" onClick={() => navigate("/admin/metric?metric=contact_viewed&persona=student")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4"><Filter size={16} style={{ color: YELLOW }} /> Student Filter Usage by Provider</h2>
          {Object.values(filterGroups).flat().length > 0 ? (
            <div className="space-y-5">
              <FilterGroup title="Tutor Filters" emoji="📚" filters={filterGroups.tutor} />
              <FilterGroup title="Counsellor Filters" emoji="🧭" filters={filterGroups.counsellor} />
              <FilterGroup title="Provider Filters" emoji="🏢" filters={filterGroups.centre} />
              <FilterGroup title="College Filters" emoji="🎓" filters={filterGroups.college} />
              <FilterGroup title="Other Filters" emoji="🔍" filters={filterGroups.other} />
            </div>
          ) : <p className="text-sm text-muted-foreground">No filter data yet.</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4"><Users size={16} style={{ color: YELLOW }} /> Recent Student Activity</h2>
          {recent.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recent.map((r, i) => {
                const s = statusLabel(r.status);
                const toName = resolveName(r.to_dot_id, r.to_user_id, dotNames);
                const toLabel = r.to_persona === "cl_centre" ? "Provider" : r.to_persona === "hei" ? "College" : r.to_persona;
                return (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">→ {toName}</p>
                      <p className="text-xs text-muted-foreground">{toLabel} · {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.color, color: "white" }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-muted-foreground">No student activity yet.</p>}
        </div>
      </div>

      <StudentDataTable />
    </main>
  );
};

/* ─── Chat Flow Toggle ─── */
const ChatFlowToggle = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "chat_flow_enabled").single().then(({ data }) => {
      setEnabled(data?.value === "true");
    });
  }, []);

  const toggle = async () => {
    if (enabled === null) return;
    setToggling(true);
    const newVal = !enabled;
    const { error } = await supabase.from("app_settings").update({ value: String(newVal), updated_at: new Date().toISOString() }).eq("key", "chat_flow_enabled");
    if (error) {
      toast.error("Failed to update setting");
    } else {
      setEnabled(newVal);
      toast.success(`Chat flow ${newVal ? "enabled" : "disabled"}`);
    }
    setToggling(false);
  };

  if (enabled === null) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${YELLOW}15`, color: YELLOW }}>
          <MessageSquare size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Chat Onboarding Flow</p>
          <p className="text-xs text-muted-foreground">{enabled ? "Users go through chat before seeing dots" : "Users see all dots immediately on login"}</p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={toggling}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${enabled ? "" : "bg-muted"}`}
        style={enabled ? { background: YELLOW } : {}}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
};

/* ─── Shared Components ─── */
const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
  </div>
);

const StatCard = ({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value: number; sub: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-shadow hover:shadow-md ${onClick ? "cursor-pointer" : ""}`} style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}>
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${YELLOW}15`, color: YELLOW }}>{icon}</div>
    <div className="min-w-0">
      <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-none">{value}</p>
      <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5 leading-snug">{label}</p>
    </div>
  </div>
);

export default AdminDashboard;

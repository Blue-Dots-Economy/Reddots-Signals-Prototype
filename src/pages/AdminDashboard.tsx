import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LogOut, CircleDot, AlertTriangle, Hospital, Wrench, Truck, Users,
  Fuel, Ambulance, BarChart3, MapPin, Activity, TrendingUp, PieChart as PieIcon,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const RED = "#DC143C";
const GREY = "#4A4A4A";

interface ServiceRow {
  id: string;
  name: string;
  area: string;
  category: string | null;       // hospital, ambulance, mechanic, tow, ssm, fuel
  pillar: string | null;          // type: Government / Private / Volunteer
  availability: string | null;
  contact: string;
  created_at: string;
}

interface HotspotRow {
  id: string;
  name: string;
  area: string;
  relevance: string | null;       // risk level
  nature_of_job: string | null;   // road class
  openings: string | null;        // total accidents
  job_role_salary: string | null; // deaths
  rating: string | null;          // fatality rate
  created_at: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  hospital: { label: "Hospitals", icon: Hospital, color: "#DC143C" },
  ambulance: { label: "Ambulances", icon: Ambulance, color: "#E11D48" },
  mechanic: { label: "Mechanics", icon: Wrench, color: "#9F1239" },
  tow: { label: "Tow Trucks", icon: Truck, color: "#7F1D1D" },
  ssm: { label: "SSM Volunteers", icon: Users, color: "#BE123C" },
  fuel: { label: "Fuel Stations", icon: Fuel, color: "#831843" },
};

const RISK_META: Record<string, { color: string; label: string }> = {
  CRITICAL: { color: "#7F1D1D", label: "Critical" },
  HIGH: { color: "#DC143C", label: "High" },
  MODERATE: { color: "#F59E0B", label: "Moderate" },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !authLoading) navigate("/admin-login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let alive = true;
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: svc }, { data: hot }] = await Promise.all([
        supabase.from("student_dots").select("id,name,area,category,pillar,availability,contact,created_at").order("created_at", { ascending: false }),
        supabase.from("centre_dots").select("id,name,area,relevance,nature_of_job,openings,job_role_salary,rating,created_at").order("created_at", { ascending: false }),
      ]);
      if (!alive) return;
      setServices((svc as any) || []);
      setHotspots((hot as any) || []);
      setLoading(false);
    };
    fetchAll();
    const channel = supabase
      .channel("admin_red_dots")
      .on("postgres_changes", { event: "*", schema: "public", table: "student_dots" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "centre_dots" }, fetchAll)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => { await signOut(); navigate("/admin-login"); };

  const serviceCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach((s) => {
      const k = (s.category || "other").toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [services]);

  const open24x7 = useMemo(
    () => services.filter((s) => (s.availability || "").toLowerCase().includes("24")).length,
    [services]
  );

  const hotspotRiskCounts = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MODERATE: 0 };
    hotspots.forEach((h) => {
      const k = (h.relevance || "").toUpperCase();
      if (counts[k] !== undefined) counts[k] += 1;
    });
    return counts;
  }, [hotspots]);

  const totalAccidents = useMemo(
    () => hotspots.reduce((sum, h) => sum + (parseInt((h.openings || "0").replace(/[^\d]/g, "")) || 0), 0),
    [hotspots]
  );
  const totalDeaths = useMemo(
    () => hotspots.reduce((sum, h) => sum + (parseInt((h.job_role_salary || "0").replace(/[^\d]/g, "")) || 0), 0),
    [hotspots]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: RED }}>
              <CircleDot size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground">Red Dots Admin</h1>
              <p className="text-xs text-muted-foreground">Guwahati Road Safety</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div>
            <p className="text-sm font-semibold text-foreground">Data Management</p>
            <p className="text-xs text-muted-foreground">Add, edit, or bulk-upload service providers and accident hotspots</p>
          </div>
          <button onClick={() => navigate("/admin/manage-dots")} className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white rounded-lg px-3 sm:px-4 py-2 transition-colors flex-shrink-0 hover:opacity-90 w-full sm:w-auto justify-center" style={{ background: RED }}>
            <CircleDot size={14} /> Manage Dots
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <>
            {/* Top-line stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<Hospital size={18} />} accent={RED} label="Service Providers" value={services.length} sub="across all categories" />
              <StatCard icon={<Activity size={18} />} accent={RED} label="Open 24×7" value={open24x7} sub={`${services.length ? Math.round((open24x7 / services.length) * 100) : 0}% of total`} />
              <StatCard icon={<AlertTriangle size={18} />} accent={GREY} label="Accident Hotspots" value={hotspots.length} sub="iRAD entries" />
              <StatCard icon={<BarChart3 size={18} />} accent={GREY} label="Total Recorded" value={totalAccidents} sub={`${totalDeaths} deaths`} />
            </div>

            {/* Two-column breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Services by category */}
              <Panel
                title="Service Providers by Category"
                icon={<Hospital size={16} style={{ color: RED }} />}
              >
                {Object.keys(serviceCategoryCounts).length === 0 ? (
                  <EmptyState text="No service providers yet." />
                ) : (
                  <div className="space-y-2.5">
                    {Object.keys(CATEGORY_META).map((key) => {
                      const count = serviceCategoryCounts[key] || 0;
                      const meta = CATEGORY_META[key];
                      const Icon = meta.icon;
                      const max = Math.max(...Object.values(serviceCategoryCounts), 1);
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Icon size={13} style={{ color: meta.color }} />
                              <span className="font-medium text-foreground">{meta.label}</span>
                            </div>
                            <span className="font-semibold text-muted-foreground">{count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, background: meta.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>

              {/* Hotspots by risk level */}
              <Panel
                title="Accident Hotspots by Risk Level"
                icon={<AlertTriangle size={16} style={{ color: GREY }} />}
              >
                {hotspots.length === 0 ? (
                  <EmptyState text="No accident hotspots yet." />
                ) : (
                  <div className="space-y-3">
                    {Object.keys(RISK_META).map((key) => {
                      const count = hotspotRiskCounts[key] || 0;
                      const meta = RISK_META[key];
                      const max = Math.max(...Object.values(hotspotRiskCounts), 1);
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                            <span className="font-semibold text-muted-foreground">{count} hotspot{count === 1 ? "" : "s"}</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, background: meta.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>

            {/* Recent dots */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Panel title="Recently added Services" icon={<MapPin size={16} style={{ color: RED }} />}>
                {services.length === 0 ? (
                  <EmptyState text="No services added yet." />
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {services.slice(0, 12).map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{s.area}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0 ml-2 capitalize" style={{ background: CATEGORY_META[(s.category || "").toLowerCase()]?.color || RED }}>
                          {(s.category || "service").toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Recent Hotspots" icon={<AlertTriangle size={16} style={{ color: GREY }} />}>
                {hotspots.length === 0 ? (
                  <EmptyState text="No hotspots added yet." />
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {hotspots.slice(0, 12).map((h) => {
                      const meta = RISK_META[(h.relevance || "").toUpperCase()];
                      return (
                        <div key={h.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{h.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{h.area}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0 ml-2" style={{ background: meta?.color || GREY }}>
                            {(h.relevance || "—").toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const Panel = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-2xl p-3 sm:p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
    <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">{icon} {title}</h2>
    {children}
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>
);

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${RED} transparent ${RED} ${RED}` }} />
  </div>
);

const StatCard = ({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: number; sub: string; accent: string }) => (
  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-shadow hover:shadow-md" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
    <div className="min-w-0">
      <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-none">{value}</p>
      <p className="text-xs sm:text-sm font-medium text-foreground mt-0.5 leading-snug">{label}</p>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">{sub}</p>
    </div>
  </div>
);

export default AdminDashboard;

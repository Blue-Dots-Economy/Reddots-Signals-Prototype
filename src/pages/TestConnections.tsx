import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  sendConnectionRequest, fetchConnections, respondToConnection,
  resolveDotInfo, type ConnectionRecord,
} from "@/lib/connections";
import { toast } from "sonner";

const YELLOW = "#DC143C";
const PERSONAS = ["student", "tutor", "cl_centre", "hei"] as const;
type Persona = typeof PERSONAS[number];

const PERSONA_LABELS: Record<string, string> = {
  student: "Seeker", tutor: "Tutor", cl_centre: "Provider", hei: "HEI / College",
};

const DOT_TABLES: Record<string, string> = {
  student: "student_dots", tutor: "tutor_dots", cl_centre: "centre_dots", hei: "college_dots",
};

const TEST_ACCOUNTS = [
  { persona: "student", email: "aaditdiwangz@gmail.com", password: "8595618873", label: "Student (Aadit)" },
  { persona: "tutor", email: "abhilasha.swarup@careerlauncher.com", password: "9696435154", label: "Tutor (Abhilasha)" },
  { persona: "cl_centre", email: "ashokvihar@careerlauncher.com", password: "9311913993", label: "Provider (Ashok Vihar)" },
];

const FLOWS = PERSONAS.flatMap(from =>
  PERSONAS.filter(to => to !== from).map(to => ({ from, to }))
);

const TestConnections = () => {
  const [user, setUser] = useState<any>(null);
  const [userPersona, setUserPersona] = useState<string>("unknown");
  const [loginLoading, setLoginLoading] = useState<string | null>(null);

  // Section 2
  const [toPersona, setToPersona] = useState<Persona>("student");
  const [dots, setDots] = useState<any[]>([]);
  const [selectedDot, setSelectedDot] = useState("");
  const [sendResult, setSendResult] = useState<any>(null);
  const [sending, setSending] = useState(false);

  // Section 3
  const [myConns, setMyConns] = useState<{ sent: ConnectionRecord[]; received: ConnectionRecord[] }>({ sent: [], received: [] });

  // Section 4
  const [allRows, setAllRows] = useState<any[]>([]);

  // Section 5 flow counts
  const [flowCounts, setFlowCounts] = useState<Record<string, number>>({});

  // Section 6 PII
  const [piiData, setPiiData] = useState<any[]>([]);

  // Section 7 stats
  const [stats, setStats] = useState<any>(null);

  // Auth listener
  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
  }, []);

  // Detect persona from dots tables
  useEffect(() => {
    if (!user?.email) { setUserPersona("unknown"); return; }
    (async () => {
      for (const [persona, table] of Object.entries(DOT_TABLES)) {
        const { data } = await supabase.from(table as any).select("id").eq("email", user.email).limit(1);
        if (data && (data as any[]).length > 0) { setUserPersona(persona); return; }
      }
      setUserPersona("admin_or_unknown");
    })();
  }, [user]);

  // Fetch dots for target persona
  useEffect(() => {
    if (!toPersona) return;
    const table = DOT_TABLES[toPersona];
    supabase.from(table as any).select("id, name, area, email").limit(50).then(({ data }) => {
      setDots((data as any[]) || []);
      setSelectedDot("");
    });
  }, [toPersona]);

  // Section 3: my connections
  const refreshMyConns = useCallback(async () => {
    if (!user) return;
    const result = await fetchConnections(user.id);
    setMyConns({ sent: result.sent, received: result.received });
  }, [user]);

  useEffect(() => { refreshMyConns(); }, [refreshMyConns]);
  useEffect(() => {
    const interval = setInterval(refreshMyConns, 10000);
    return () => clearInterval(interval);
  }, [refreshMyConns]);

  // Section 4: all rows via edge function
  const refreshAllRows = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("test-connections-inspect");
      if (!error && data?.rows) setAllRows(data.rows);
    } catch { }
  }, []);

  useEffect(() => { refreshAllRows(); }, [refreshAllRows]);

  // Section 5 & 7: flow counts & stats from all rows
  useEffect(() => {
    const counts: Record<string, number> = {};
    FLOWS.forEach(f => { counts[`${f.from}->${f.to}`] = 0; });
    allRows.forEach(r => {
      const key = `${r.from_persona}->${r.to_persona}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    setFlowCounts(counts);

    const byStatus = { pending: 0, accepted: 0, rejected: 0 };
    allRows.forEach(r => { if (byStatus[r.status as keyof typeof byStatus] !== undefined) byStatus[r.status as keyof typeof byStatus]++; });
    setStats({ total: allRows.length, ...byStatus });
  }, [allRows]);

  // Auto-refresh sections 4, 5, 7
  useEffect(() => {
    const interval = setInterval(refreshAllRows, 15000);
    return () => clearInterval(interval);
  }, [refreshAllRows]);

  // Section 6: PII for accepted connections
  useEffect(() => {
    if (!user) return;
    (async () => {
      const all = [...myConns.sent.filter(c => c.status === "accepted"), ...myConns.received.filter(c => c.status === "accepted")];
      const results: any[] = [];
      for (const conn of all) {
        const otherUserId = conn.from_user_id === user.id ? conn.to_user_id : conn.from_user_id;
        const otherPersona = conn.from_user_id === user.id ? conn.to_persona : conn.from_persona;
        const otherDotId = conn.from_user_id === user.id ? conn.to_dot_id : conn.from_dot_id;
        let info: any = {};
        if (otherDotId) {
          const resolved = await resolveDotInfo([otherDotId], otherPersona);
          info = resolved[otherDotId] || {};
        }
        results.push({
          connId: conn.id,
          direction: conn.from_user_id === user.id ? "Sent" : "Received",
          otherPersona,
          name: info.name || "—",
          email: info.email || "—",
          contact: info.contact || "—",
          area: info.area || "—",
          piiVisible: !!(info.name && info.name !== "—"),
        });
      }
      setPiiData(results);
    })();
  }, [myConns, user]);

  // Login handler
  const handleLogin = async (account: typeof TEST_ACCOUNTS[0]) => {
    setLoginLoading(account.persona);
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
    if (error) {
      // Try legacy password
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: account.email, password: "304567" });
      if (e2) toast.error(`Login failed: ${e2.message}`);
      else toast.success(`Logged in as ${account.label} (legacy pw)`);
    } else {
      toast.success(`Logged in as ${account.label}`);
    }
    setLoginLoading(null);
  };

  // Send connection
  const handleSend = async () => {
    if (!user || !selectedDot) return;
    setSending(true);
    setSendResult(null);
    const result = await sendConnectionRequest({
      fromUserId: user.id,
      fromPersona: userPersona as any,
      toDotId: selectedDot,
      toPersona: toPersona,
      toDotTable: DOT_TABLES[toPersona],
    });
    if (result.error) {
      setSendResult({ error: result.error.message || String(result.error), duplicate: (result as any).duplicate });
    } else {
      setSendResult({ success: true });
      refreshMyConns();
      refreshAllRows();
    }
    setSending(false);
  };

  // Accept/Reject
  const handleRespond = async (id: string, response: "accepted" | "rejected") => {
    const { error } = await respondToConnection(id, response);
    if (error) toast.error(error.message);
    else { toast.success(`Connection ${response}`); refreshMyConns(); refreshAllRows(); }
  };

  const short = (s: string) => s?.slice(0, 8) || "—";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 space-y-8 font-mono text-sm">
      <h1 className="text-2xl font-bold" style={{ color: YELLOW }}>🧪 Connection Test Panel</h1>
      <p className="text-zinc-500 text-xs">Hidden test route — remove before production</p>

      {/* Current user banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-xs text-zinc-500 mb-1">Currently logged in as:</p>
        {user ? (
          <div className="flex flex-wrap gap-4 items-center">
            <span className="font-bold text-white">{user.email}</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${YELLOW}30`, color: YELLOW }}>{PERSONA_LABELS[userPersona] || userPersona}</span>
            <span className="text-zinc-500 text-xs">UUID: {user.id}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-red-400 hover:text-red-300 ml-auto">Sign Out</button>
          </div>
        ) : (
          <span className="text-zinc-500">Not logged in</span>
        )}
      </div>

      {/* Section 1: Quick Login */}
      <Section title="1. Quick Login">
        <div className="flex flex-wrap gap-2">
          {TEST_ACCOUNTS.map(a => (
            <button key={a.persona} onClick={() => handleLogin(a)} disabled={loginLoading === a.persona}
              className="px-4 py-2 rounded-lg text-xs font-bold border border-zinc-700 hover:border-yellow-500/50 transition-all disabled:opacity-50"
              style={{ background: loginLoading === a.persona ? `${YELLOW}30` : "transparent" }}>
              {loginLoading === a.persona ? "Logging in..." : a.label}
            </button>
          ))}
        </div>
        <p className="text-zinc-600 text-xs mt-2">No HEI test account available (no college_dots with email).</p>
      </Section>

      {/* Section 2: Send Test Connection */}
      <Section title="2. Send Test Connection">
        {!user ? <p className="text-zinc-500">Login first</p> : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">From Persona</label>
                <div className="px-3 py-1.5 bg-zinc-800 rounded text-xs">{PERSONA_LABELS[userPersona] || userPersona}</div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">To Persona</label>
                <select value={toPersona} onChange={e => setToPersona(e.target.value as Persona)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs">
                  {PERSONAS.map(p => <option key={p} value={p}>{PERSONA_LABELS[p]}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-zinc-500 block mb-1">Target Dot ({dots.length} available)</label>
                <select value={selectedDot} onChange={e => setSelectedDot(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs w-full">
                  <option value="">Select a dot...</option>
                  {dots.map(d => (
                    <option key={d.id} value={d.id}>{d.name} — {d.area} ({short(d.id)})</option>
                  ))}
                </select>
              </div>
              <button onClick={handleSend} disabled={sending || !selectedDot}
                className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-all"
                style={{ background: YELLOW, color: "#000" }}>
                {sending ? "Sending..." : "Send Connection"}
              </button>
            </div>
            {sendResult && (
              <div className={`p-3 rounded-lg text-xs ${sendResult.error ? "bg-red-950 border border-red-800 text-red-300" : "bg-green-950 border border-green-800 text-green-300"}`}>
                {sendResult.error ? (
                  <><strong>Error:</strong> {sendResult.error} {sendResult.duplicate && "(duplicate)"}</>
                ) : (
                  <><strong>Success!</strong> Connection sent. Refresh My Connections to see it.</>
                )}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Section 3: My Connections Live View */}
      <Section title="3. My Connections Live View" onRefresh={refreshMyConns}>
        {!user ? <p className="text-zinc-500">Login first</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Dir</th>
                  <th className="text-left py-2 px-2">From</th>
                  <th className="text-left py-2 px-2">To</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Created</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...myConns.sent.map(c => ({ ...c, _dir: "Sent" })), ...myConns.received.map(c => ({ ...c, _dir: "Received" }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(c => (
                  <tr key={c.id} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                    <td className="py-1.5 px-2 text-zinc-400">{short(c.id)}</td>
                    <td className="py-1.5 px-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c._dir === "Sent" ? "bg-blue-950 text-blue-300" : "bg-purple-950 text-purple-300"}`}>{c._dir}</span></td>
                    <td className="py-1.5 px-2">{c.from_persona}</td>
                    <td className="py-1.5 px-2">{c.to_persona}</td>
                    <td className="py-1.5 px-2"><StatusBadge status={c.status} /></td>
                    <td className="py-1.5 px-2 text-zinc-500">{new Date(c.created_at).toLocaleString()}</td>
                    <td className="py-1.5 px-2">
                      {c._dir === "Received" && c.status === "pending" && (
                        <div className="flex gap-1">
                          <button onClick={() => handleRespond(c.id, "accepted")} className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-950 text-green-300 hover:bg-green-900">Accept</button>
                          <button onClick={() => handleRespond(c.id, "rejected")} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 hover:bg-red-900">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {myConns.sent.length === 0 && myConns.received.length === 0 && (
                  <tr><td colSpan={7} className="py-4 text-center text-zinc-600">No connections</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Section 4: All Rows Inspector */}
      <Section title="4. Supabase Row Inspector (all users, bypasses RLS)" onRefresh={refreshAllRows}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">From User</th>
                <th className="text-left py-2 px-2">From</th>
                <th className="text-left py-2 px-2">To User</th>
                <th className="text-left py-2 px-2">To</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-left py-2 px-2">Created</th>
                <th className="text-left py-2 px-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map(r => (
                <tr key={r.id} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                  <td className="py-1.5 px-2 text-zinc-400">{short(r.id)}</td>
                  <td className="py-1.5 px-2 text-zinc-400">{short(r.from_user_id)}</td>
                  <td className="py-1.5 px-2">{r.from_persona}</td>
                  <td className="py-1.5 px-2 text-zinc-400">{short(r.to_user_id)}</td>
                  <td className="py-1.5 px-2">{r.to_persona}</td>
                  <td className="py-1.5 px-2"><StatusBadge status={r.status} /></td>
                  <td className="py-1.5 px-2 text-zinc-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-zinc-500">{new Date(r.updated_at).toLocaleString()}</td>
                </tr>
              ))}
              {allRows.length === 0 && (
                <tr><td colSpan={8} className="py-4 text-center text-zinc-600">No rows</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 5: 12 Flow Checklist */}
      <Section title="5. Flow Checklist (auto-refreshes every 15s)">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {FLOWS.map(f => {
            const key = `${f.from}->${f.to}`;
            const count = flowCounts[key] || 0;
            const found = count > 0;
            const isAutoAccept = f.from === "student" && f.to === "cl_centre";
            return (
              <div key={key} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${found ? "border-green-800 bg-green-950/30" : "border-zinc-800 bg-zinc-900/50"}`}>
                <span className="text-xs">
                  {found ? "✅" : "❌"} {PERSONA_LABELS[f.from]} → {PERSONA_LABELS[f.to]}
                  {isAutoAccept && <span className="ml-1 text-[10px] text-yellow-400 font-bold">(auto-accept)</span>}
                </span>
                <span className={`text-xs font-bold ${found ? "text-green-400" : "text-zinc-600"}`}>{count}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Section 6: PII Reveal Check */}
      <Section title="6. PII Reveal Check (accepted connections)">
        {!user ? <p className="text-zinc-500">Login first</p> : piiData.length === 0 ? (
          <p className="text-zinc-600">No accepted connections for this user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left py-2 px-2">Conn ID</th>
                  <th className="text-left py-2 px-2">Dir</th>
                  <th className="text-left py-2 px-2">Other Persona</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Phone</th>
                  <th className="text-left py-2 px-2">PII Visible?</th>
                </tr>
              </thead>
              <tbody>
                {piiData.map(p => (
                  <tr key={p.connId} className="border-b border-zinc-900">
                    <td className="py-1.5 px-2 text-zinc-400">{short(p.connId)}</td>
                    <td className="py-1.5 px-2">{p.direction}</td>
                    <td className="py-1.5 px-2">{PERSONA_LABELS[p.otherPersona] || p.otherPersona}</td>
                    <td className="py-1.5 px-2">{p.name}</td>
                    <td className="py-1.5 px-2">{p.email}</td>
                    <td className="py-1.5 px-2">{p.contact}</td>
                    <td className="py-1.5 px-2">{p.piiVisible ? <span className="text-green-400">✅ Yes</span> : <span className="text-red-400">❌ No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Section 7: Summary Stats */}
      <Section title="7. Summary Stats (auto-refreshes every 15s)">
        {stats && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <StatPill label="Total" value={stats.total} />
              <StatPill label="Pending" value={stats.pending} color="#DC143C" />
              <StatPill label="Accepted" value={stats.accepted} color="#2E7D32" />
              <StatPill label="Rejected" value={stats.rejected} color="#EF4444" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-2">from_persona × to_persona matrix:</p>
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-1 px-3 text-left">From ↓ / To →</th>
                      {PERSONAS.map(p => <th key={p} className="py-1 px-3 text-center">{PERSONA_LABELS[p]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PERSONAS.map(from => (
                      <tr key={from} className="border-b border-zinc-900">
                        <td className="py-1 px-3 font-medium">{PERSONA_LABELS[from]}</td>
                        {PERSONAS.map(to => {
                          const count = from === to ? "—" : (flowCounts[`${from}->${to}`] || 0);
                          return <td key={to} className={`py-1 px-3 text-center ${count === "—" ? "text-zinc-700" : count === 0 ? "text-zinc-600" : "text-white font-bold"}`}>{count}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
};

/* ─── Helpers ─── */
const Section = ({ title, children, onRefresh }: { title: string; children: React.ReactNode; onRefresh?: () => void }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-bold text-zinc-300">{title}</h2>
      {onRefresh && <button onClick={onRefresh} className="text-xs px-3 py-1 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-all">↻ Refresh</button>}
    </div>
    {children}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = { pending: "bg-yellow-950 text-yellow-300", accepted: "bg-green-950 text-green-300", rejected: "bg-red-950 text-red-300" };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colors[status] || "bg-zinc-800 text-zinc-400"}`}>{status}</span>;
};

const StatPill = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <div className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
    <p className="text-2xl font-bold" style={{ color: color || "#fff" }}>{value}</p>
    <p className="text-[10px] text-zinc-500">{label}</p>
  </div>
);

export default TestConnections;

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Upload, Plus, Trash2, Search, Edit2, MapPin,
  CircleDot, Hospital, AlertTriangle, Construction,
} from "lucide-react";
import { toast } from "sonner";
import { geocodeAddressDetailed, jitterCoords, delay } from "@/lib/geocode";
import { selectDistributedTopN } from "@/lib/mapSelection";
import * as XLSX from "xlsx";
import AdminMapPreview from "@/components/map/AdminMapPreview";
import GoogleSheetSync from "@/components/sheets/GoogleSheetSync";

const RED = "#DC143C";
const GREY = "#4A4A4A";
const ORANGE = "#EA580C";
const MAX_DOTS_ON_MAP = 50;
const RISK_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };

type DotMode = "service" | "hotspot" | "pothole";

// student_dots is repurposed for service providers
interface ServiceDot {
  id: string; name: string; area: string;
  category: string;          // hospital | ambulance | mechanic | tow | ssm | fuel
  pillar: string;            // type: Government | Private | Volunteer
  icon: string;
  lat: number; lng: number;
  contact: string; email: string | null;
  description: string | null;
  availability: string | null;       // 24x7 / Day-time
  skills: string | null;             // speciality
  needs: string | null;              // cost range
  other_help: string | null;         // golden hour empanelled
  created_at: string;
}

// centre_dots is repurposed for accident hotspots
interface HotspotDot {
  id: string; name: string; area: string;
  icon: string;
  lat: number; lng: number;
  contact: string; email: string | null;
  description: string | null;
  relevance: string | null;          // risk level: CRITICAL / HIGH / MODERATE
  nature_of_job: string | null;      // road class
  openings: string | null;           // total accidents
  job_role_salary: string | null;    // deaths
  work_experience_years: string | null; // injured
  rating: string | null;             // fatality rate
  services: string | null;           // top collision type
  created_at: string;
}

// pothole_dots stores potholes
interface PotholeDot {
  id: string; name: string; area: string;
  icon: string;
  lat: number; lng: number;
  contact: string; email: string | null;
  description: string | null;
  severity: string | null;
  road_class: string | null;
  size: string | null;
  depth: string | null;
  status: string | null;
  reported_by: string | null;
  reported_on: string | null;
  remarks: string | null;
  created_at: string;
}

const SERVICE_CATEGORIES = ["hospital", "ambulance", "mechanic", "tow", "ssm", "fuel"];
const SERVICE_TYPES = ["Government", "Private", "Volunteer"];
const RISK_LEVELS = ["CRITICAL", "HIGH", "MODERATE"];
const SEVERITY_LEVELS = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
const POTHOLE_STATUSES = ["reported", "in-progress", "fixed"];

const ManageDots = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<DotMode>("service");
  const [services, setServices] = useState<ServiceDot[]>([]);
  const [hotspots, setHotspots] = useState<HotspotDot[]>([]);
  const [potholes, setPotholes] = useState<PotholeDot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDot, setEditingDot] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!user && !authLoading) navigate("/admin-login"); }, [user, authLoading, navigate]);
  useEffect(() => { setSelectedIds(new Set()); setEditingDot(null); setShowAddForm(false); fetchDots(); }, [mode]);

  const tableForMode = (): "student_dots" | "centre_dots" | "pothole_dots" =>
    mode === "service" ? "student_dots" : mode === "hotspot" ? "centre_dots" : "pothole_dots";

  const fetchDots = async () => {
    setLoading(true);
    if (mode === "service") {
      const { data } = await supabase.from("student_dots").select("*").order("created_at", { ascending: false });
      setServices((data as unknown as ServiceDot[]) || []);
    } else if (mode === "hotspot") {
      const { data } = await supabase.from("centre_dots").select("*").order("created_at", { ascending: false });
      setHotspots((data as unknown as HotspotDot[]) || []);
    } else {
      const { data } = await supabase.from("pothole_dots").select("*").order("created_at", { ascending: false });
      setPotholes((data as unknown as PotholeDot[]) || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dot? This cannot be undone.")) return;
    const { error } = await supabase.from(tableForMode()).delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Dot deleted");
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    fetchDots();
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} dots? This cannot be undone.`)) return;
    setDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from(tableForMode()).delete().in("id", ids);
    setDeleting(false);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success(`${ids.length} dots deleted`);
    setSelectedIds(new Set());
    fetchDots();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const normalizeHeaderKey = (value: string) => value.toLowerCase().trim().replace(/"/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const getField = (row: Record<string, string>, aliases: string[]): string => {
    for (const key of aliases) { const v = row[normalizeHeaderKey(key)]; if (v && v.trim()) return v.trim(); }
    return "";
  };

  const parseFileToRows = async (file: File): Promise<Record<string, string>[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      if (jsonData.length === 0) throw new Error("Excel file has no data rows");
      return jsonData.map((row) => { const obj: Record<string, string> = {}; Object.keys(row).forEach((k) => { obj[normalizeHeaderKey(k)] = String(row[k] ?? "").trim(); }); return obj; });
    }
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) throw new Error("File must have a header row and at least one data row");
    const headers = lines[0].split(",").map((h) => normalizeHeaderKey(h));
    return lines.slice(1).map((line) => {
      const result: string[] = []; let current = ""; let inQuotes = false;
      for (const c of line) { if (c === '"') inQuotes = !inQuotes; else if (c === "," && !inQuotes) { result.push(current); current = ""; } else current += c; }
      result.push(current);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = result[i]?.trim().replace(/^"|"$/g, "") || ""; });
      return obj;
    });
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const rows = await parseFileToRows(file);
      const cache = new Map<string, { lat: number; lng: number }>();
      const inserts: any[] = [];
      const skipped: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const name = getField(r, ["name", "full_name"]);
        const area = getField(r, ["area", "address", "location", "locality"]);
        const latIn = Number(getField(r, ["lat", "latitude"]));
        const lngIn = Number(getField(r, ["lng", "longitude", "lon", "long"]));
        const has = Number.isFinite(latIn) && Number.isFinite(lngIn) && (latIn !== 0 || lngIn !== 0);
        let lat: number, lng: number;
        if (has) { lat = latIn; lng = lngIn; }
        else if (area) {
          const k = area.toLowerCase();
          if (cache.has(k)) { const c = cache.get(k)!; const j = jitterCoords(c.lat, c.lng); lat = j.lat; lng = j.lng; }
          else { await delay(1100); const c = await geocodeAddressDetailed(area); if (!c.resolved) { skipped.push(`Row ${i + 2}: could not geocode "${area}"`); continue; } cache.set(k, { lat: c.lat, lng: c.lng }); lat = c.lat; lng = c.lng; }
        } else { skipped.push(`Row ${i + 2}: missing area or lat/lng`); continue; }

        if (mode === "service") {
          inserts.push({
            name: name || "Unknown", area, lat, lng,
            email: getField(r, ["email"]) || null,
            description: getField(r, ["description"]) || null,
            category: (getField(r, ["category", "type"]) || "hospital").toLowerCase(),
            pillar: getField(r, ["provider_type", "pillar"]) || "Private",
            icon: getField(r, ["icon"]) || (getField(r, ["category"]) || "hospital").toLowerCase(),
            contact: getField(r, ["contact", "phone"]) || "direct",
            availability: getField(r, ["availability", "hours"]) || null,
            skills: getField(r, ["specialisation", "speciality", "skills"]) || null,
            needs: getField(r, ["cost", "cost_range", "needs"]) || null,
            other_help: getField(r, ["golden_hour", "other_help"]) || null,
          });
        } else if (mode === "hotspot") {
          inserts.push({
            name: name || "Unknown", area, lat, lng,
            email: getField(r, ["email"]) || null,
            description: getField(r, ["description"]) || null,
            icon: "warning",
            contact: "direct",
            relevance: (getField(r, ["risk_level", "risk", "relevance"]) || "MODERATE").toUpperCase(),
            nature_of_job: getField(r, ["road_class", "nature_of_job"]) || null,
            openings: getField(r, ["total_accidents", "accidents", "openings"]) || null,
            job_role_salary: getField(r, ["deaths", "job_role_salary"]) || null,
            work_experience_years: getField(r, ["injured", "work_experience_years"]) || null,
            rating: getField(r, ["fatality_rate", "rating"]) || null,
            services: getField(r, ["top_collision", "collision_type", "services"]) || null,
          });
        } else {
          inserts.push({
            name: name || "Unknown", area, lat, lng,
            email: getField(r, ["email"]) || null,
            description: getField(r, ["description"]) || null,
            icon: "circle-dot",
            contact: getField(r, ["contact", "phone"]) || "direct",
            severity: (getField(r, ["severity", "risk_level", "risk"]) || "MODERATE").toUpperCase(),
            road_class: getField(r, ["road_class", "road_type"]) || null,
            size: getField(r, ["size", "pothole_size"]) || null,
            depth: getField(r, ["depth"]) || null,
            status: getField(r, ["status", "repair_status"]) || null,
            reported_by: getField(r, ["reported_by", "reporter"]) || null,
            reported_on: getField(r, ["reported_on", "date_reported", "date"]) || null,
            remarks: getField(r, ["remarks", "comments"]) || null,
            address: getField(r, ["address"]) || null,
          });
        }
      }

      if (!inserts.length) throw new Error("No valid rows found.");
      const { error } = await supabase.from(tableForMode()).insert(inserts);
      if (error) throw error;
      if (skipped.length) toast.warning(`Uploaded ${inserts.length} rows. Skipped ${skipped.length}.`);
      else toast.success(`${inserts.length} ${mode} dots uploaded`);
      fetchDots();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getCurrentDots = (): any[] =>
    mode === "service" ? services : mode === "hotspot" ? hotspots : potholes;

  const getFilteredDots = (): any[] => {
    const list = getCurrentDots();
    if (!filter.trim()) return list;
    const q = filter.toLowerCase();
    return list.filter((d: any) =>
      d.name?.toLowerCase().includes(q) ||
      d.area?.toLowerCase().includes(q) ||
      (d.category || "").toLowerCase().includes(q) ||
      (d.relevance || "").toLowerCase().includes(q) ||
      (d.severity || "").toLowerCase().includes(q) ||
      (d.status || "").toLowerCase().includes(q)
    );
  };

  const getMapDots = () => {
    const compareDots = (a: any, b: any) => {
      if (mode === "hotspot") {
        const riskA = RISK_RANK[(a.relevance || "").toUpperCase()] ?? 99;
        const riskB = RISK_RANK[(b.relevance || "").toUpperCase()] ?? 99;
        if (riskA !== riskB) return riskA - riskB;

        const deathsA = Number(a.job_role_salary || 0);
        const deathsB = Number(b.job_role_salary || 0);
        if (deathsA !== deathsB) return deathsB - deathsA;

        const accidentsA = Number(a.openings || 0);
        const accidentsB = Number(b.openings || 0);
        if (accidentsA !== accidentsB) return accidentsB - accidentsA;
      } else if (mode === "pothole") {
        const sevA = RISK_RANK[(a.severity || "").toUpperCase()] ?? 99;
        const sevB = RISK_RANK[(b.severity || "").toUpperCase()] ?? 99;
        if (sevA !== sevB) return sevA - sevB;
      }

      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    };

    return selectDistributedTopN(filteredDots, MAX_DOTS_ON_MAP, compareDots).map((d: any) => ({
      id: d.id, name: d.name, lat: d.lat, lng: d.lng,
      label: mode === "service" ? d.category : mode === "hotspot" ? d.relevance : d.severity,
      icon: mode === "service" ? (d.icon || d.category) : mode === "hotspot" ? "warning" : "circle-dot",
    }));
  };

  const SERVICE_COLUMNS: { key: string; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "pillar", label: "Type" },
    { key: "area", label: "Area" },
    { key: "availability", label: "Hours" },
    { key: "skills", label: "Speciality" },
    { key: "contact", label: "Phone" },
    { key: "lat", label: "Lat" },
    { key: "lng", label: "Long" },
  ];

  const HOTSPOT_COLUMNS: { key: string; label: string }[] = [
    { key: "name", label: "Hotspot" },
    { key: "relevance", label: "Risk" },
    { key: "area", label: "Area" },
    { key: "nature_of_job", label: "Road class" },
    { key: "openings", label: "Accidents" },
    { key: "job_role_salary", label: "Deaths" },
    { key: "work_experience_years", label: "Injured" },
    { key: "rating", label: "Fatality %" },
    { key: "services", label: "Top collision" },
    { key: "lat", label: "Lat" },
    { key: "lng", label: "Long" },
  ];

  const columns = mode === "service" ? SERVICE_COLUMNS : HOTSPOT_COLUMNS;
  const filteredDots = getFilteredDots();
  const accent = mode === "service" ? RED : GREY;

  const tabs: { key: DotMode; label: string; icon: any }[] = [
    { key: "service", label: "Service Providers", icon: Hospital },
    { key: "hotspot", label: "Accident Hotspots", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft size={18} className="text-foreground" /></button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: accent }}>
              <CircleDot size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Manage Dots</h1>
              <p className="text-xs text-muted-foreground">Bulk-upload, sync, or edit Red Dots</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Mode Toggle + actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex rounded-xl border border-border overflow-hidden w-fit">
            {tabs.map((t) => {
              const Icon = t.icon;
              const tabAccent = t.key === "service" ? RED : GREY;
              return (
                <button key={t.key} onClick={() => setMode(t.key)} className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5" style={mode === t.key ? { background: tabAccent, color: "white" } : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={handleCSVUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-xs sm:text-sm font-medium border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors disabled:opacity-50">
              <Upload size={14} /> {uploading ? "Uploading..." : "Upload CSV/Excel"}
            </button>
            <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white rounded-lg px-3 py-2" style={{ background: accent }}>
              <Plus size={14} /> Add Dot
            </button>
          </div>
        </div>

        <GoogleSheetSync mode={mode === "service" ? "student" : "centre"} onSyncComplete={fetchDots} />

        <AdminMapPreview title={mode === "service" ? "Service Providers Map" : "Accident Hotspots Map"} dots={getMapDots()} />

        {(showAddForm || editingDot) && (
          <DotForm mode={mode} editDot={editingDot} accent={accent} onSuccess={() => { setShowAddForm(false); setEditingDot(null); fetchDots(); }} onCancel={() => { setShowAddForm(false); setEditingDot(null); }} />
        )}

        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder={`Search ${mode === "service" ? "services" : "hotspots"}...`} value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filteredDots.length} {mode === "service" ? "service providers" : "accident hotspots"}</p>
          {selectedIds.size > 0 && (
            <button onClick={handleBatchDelete} disabled={deleting} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50" style={{ background: "#EF4444" }}>
              <Trash2 size={14} /> {deleting ? "Deleting..." : `Delete ${selectedIds.size} selected`}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${accent} transparent ${accent} ${accent}` }} /></div>
        ) : filteredDots.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground bg-card border border-border rounded-xl">No {mode === "service" ? "services" : "hotspots"} yet. Upload a CSV or add one manually.</div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredDots.every((d) => selectedIds.has(d.id)) && filteredDots.length > 0}
                        onChange={() => {
                          const all = filteredDots.every((d) => selectedIds.has(d.id));
                          if (all) setSelectedIds((prev) => { const n = new Set(prev); filteredDots.forEach((d) => n.delete(d.id)); return n; });
                          else setSelectedIds((prev) => { const n = new Set(prev); filteredDots.forEach((d) => n.add(d.id)); return n; });
                        }}
                      />
                    </th>
                    {columns.map((c) => <th key={c.key} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">{c.label}</th>)}
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDots.map((d: any) => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedIds.has(d.id)} onChange={() => toggleSelect(d.id)} />
                      </td>
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px] whitespace-nowrap">
                          {c.key === "name" ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: accent }}>{(d.name || "?")[0]}</div>
                              <span className="font-medium text-xs text-foreground truncate max-w-[200px]">{d.name}</span>
                            </div>
                          ) : c.key === "lat" || c.key === "lng" ? (
                            <span>{Number(d[c.key])?.toFixed(4) ?? "—"}</span>
                          ) : c.key === "relevance" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: ((d.relevance || "").toUpperCase() === "CRITICAL") ? "#7F1D1D" : ((d.relevance || "").toUpperCase() === "HIGH") ? RED : "#F59E0B" }}>
                              {(d.relevance || "—").toUpperCase()}
                            </span>
                          ) : (
                            <span className="capitalize">{(d[c.key] || "—").toString().replace(/_/g, " ")}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setEditingDot(d)} className="p-1.5 hover:bg-muted rounded-md mr-1" aria-label="Edit"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-muted rounded-md text-destructive" aria-label="Delete"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DotForm = ({ mode, editDot, accent, onSuccess, onCancel }: {
  mode: DotMode; editDot?: any; accent: string;
  onSuccess: () => void; onCancel: () => void;
}) => {
  const initial: Record<string, string> = mode === "service" ? {
    name: editDot?.name || "",
    area: editDot?.area || "",
    email: editDot?.email || "",
    contact: editDot?.contact || "",
    category: editDot?.category || "hospital",
    pillar: editDot?.pillar || "Private",
    availability: editDot?.availability || "",
    skills: editDot?.skills || "",
    needs: editDot?.needs || "",
    other_help: editDot?.other_help || "",
    description: editDot?.description || "",
  } : {
    name: editDot?.name || "",
    area: editDot?.area || "",
    email: editDot?.email || "",
    relevance: (editDot?.relevance || "MODERATE").toUpperCase(),
    nature_of_job: editDot?.nature_of_job || "",
    openings: editDot?.openings || "",
    job_role_salary: editDot?.job_role_salary || "",
    work_experience_years: editDot?.work_experience_years || "",
    rating: editDot?.rating || "",
    services: editDot?.services || "",
    description: editDot?.description || "",
  };
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.area) { toast.error("Name and area are required"); return; }
    setSaving(true);
    const needsGeocode = !editDot || form.area !== editDot.area;
    let lat = editDot?.lat ?? 0, lng = editDot?.lng ?? 0;
    if (needsGeocode) {
      const c = await geocodeAddressDetailed(form.area);
      if (!c.resolved) { setSaving(false); toast.error("Could not find this address."); return; }
      lat = c.lat; lng = c.lng;
    }
    const payload: any = { ...form, lat, lng };
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    payload.name = form.name;
    payload.area = form.area;
    if (mode === "service") {
      payload.icon = form.category || "hospital";
      payload.contact = form.contact || "direct";
    } else {
      payload.icon = "warning";
      payload.contact = "direct";
    }
    const table = mode === "service" ? "student_dots" : "centre_dots";
    const { error } = editDot
      ? await supabase.from(table).update(payload).eq("id", editDot.id)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) { toast.error(editDot ? "Failed to update" : "Failed to add dot"); console.error(error); return; }
    toast.success(editDot ? "Dot updated" : "Dot added");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {editDot ? <><Edit2 size={14} style={{ color: accent }} /> Edit {mode === "service" ? "Service" : "Hotspot"}</> : <><Plus size={14} style={{ color: accent }} /> Add {mode === "service" ? "Service" : "Hotspot"}</>}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Area / Address *" value={form.area} onChange={(v) => setForm({ ...form, area: v })} placeholder="e.g. GS Road, Guwahati" />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />

        {mode === "service" ? (
          <>
            <SelectField label="Category" value={form.category} options={SERVICE_CATEGORIES} onChange={(v) => setForm({ ...form, category: v })} />
            <SelectField label="Type" value={form.pillar} options={SERVICE_TYPES} onChange={(v) => setForm({ ...form, pillar: v })} />
            <Field label="Phone (Contact)" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} placeholder="e.g. 108 / 0361xxxxxxx" />
            <Field label="Hours / Availability" value={form.availability} onChange={(v) => setForm({ ...form, availability: v })} placeholder="24x7 / Day-time" />
            <Field label="Speciality" value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} />
            <Field label="Cost Range" value={form.needs} onChange={(v) => setForm({ ...form, needs: v })} />
            <Field label="Golden Hour empanelled" value={form.other_help} onChange={(v) => setForm({ ...form, other_help: v })} placeholder="Yes / No" />
          </>
        ) : (
          <>
            <SelectField label="Risk Level" value={form.relevance} options={RISK_LEVELS} onChange={(v) => setForm({ ...form, relevance: v })} />
            <Field label="Road Class" value={form.nature_of_job} onChange={(v) => setForm({ ...form, nature_of_job: v })} placeholder="National Highway, etc." />
            <Field label="Total Accidents" value={form.openings} onChange={(v) => setForm({ ...form, openings: v })} />
            <Field label="Deaths" value={form.job_role_salary} onChange={(v) => setForm({ ...form, job_role_salary: v })} />
            <Field label="Injured" value={form.work_experience_years} onChange={(v) => setForm({ ...form, work_experience_years: v })} />
            <Field label="Fatality Rate %" value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
            <Field label="Top Collision Type" value={form.services} onChange={(v) => setForm({ ...form, services: v })} placeholder="Rear-end, Head-on, etc." />
          </>
        )}
      </div>
      <Field label="Description" value={form.description || ""} onChange={(v) => setForm({ ...form, description: v })} />
      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} /> Location auto-detected from address</p>
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50" style={{ background: accent }}>
          {saving ? "Saving..." : editDot ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
};

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
    <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
  </div>
);

const SelectField = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
  <div>
    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring capitalize">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default ManageDots;

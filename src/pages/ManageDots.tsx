import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Upload, Plus, Trash2, Search, GraduationCap, BookOpen, Edit2, X, Check, MapPin, Compass, Building2, School, AlertTriangle } from "lucide-react";
import { isUnderageFlagged } from "@/lib/studentFlags";
import { toast } from "sonner";
import { geocodeAddressDetailed, jitterCoords, delay } from "@/lib/geocode";
import * as XLSX from "xlsx";
import AdminMapPreview from "@/components/map/AdminMapPreview";
import GoogleSheetSync from "@/components/sheets/GoogleSheetSync";

const YELLOW = "#2563EB";

type DotMode = "student" | "tutor" | "counsellor" | "centre" | "college";

interface StudentDot {
  id: string; name: string; area: string; pillar: string; icon: string; category: string;
  lat: number; lng: number; contact: string; description: string | null; relevance: string | null;
  education: string | null; skills: string | null; availability: string | null; distance: string | null;
  grade: string | null; needs: string | null; email: string | null; created_at: string;
  school_iti: string | null; mobile_device: string | null; age: string | null; gender: string | null;
  work_experience: string | null; highest_qualification: string | null; last_role: string | null;
  jobs_interested_nature: string | null; jobs_interested_role: string | null; other_help: string | null;
  unique_id: string | null;
}

interface TutorDot {
  id: string; name: string; area: string; subject: string; icon: string; experience: string | null;
  price_range: string | null; lat: number; lng: number; description: string | null; relevance: string | null;
  qualification: string | null; availability: string | null; distance: string | null; rating: string | null;
  languages: string | null; email: string | null; created_at: string;
}

interface CounsellorDot {
  id: string; name: string; area: string; speciality: string; icon: string; experience: string | null;
  price_range: string | null; lat: number; lng: number; description: string | null; relevance: string | null;
  qualification: string | null; availability: string | null; distance: string | null; rating: string | null;
  languages: string | null; email: string | null; mode: string | null; created_at: string;
}

interface CentreDot {
  id: string; name: string; area: string; icon: string; lat: number; lng: number;
  services: string | null; fees: string | null; address: string | null; contact: string;
  email: string | null; description: string | null; availability: string | null; rating: string | null;
  relevance: string | null; distance: string | null; created_at: string; unique_id: string | null;
}

interface CollegeDot {
  id: string; name: string; area: string; icon: string; lat: number; lng: number;
  programs: string | null; fees: string | null; address: string | null; contact: string;
  email: string | null; description: string | null; availability: string | null; rating: string | null;
  relevance: string | null; distance: string | null; created_at: string;
}

const ManageDots = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<DotMode>("student");
  const [studentDots, setStudentDots] = useState<StudentDot[]>([]);
  const [tutorDots, setTutorDots] = useState<TutorDot[]>([]);
  const [counsellorDots, setCounsellorDots] = useState<CounsellorDot[]>([]);
  const [centreDots, setCentreDots] = useState<CentreDot[]>([]);
  const [collegeDots, setCollegeDots] = useState<CollegeDot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDot, setEditingDot] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!user && !authLoading) navigate("/"); }, [user, authLoading]);
  useEffect(() => { setSelectedIds(new Set()); setEditingDot(null); setShowAddForm(false); fetchDots(); }, [mode]);

  const tableForMode = (): string => {
    const map: Record<DotMode, string> = { student: "student_dots", tutor: "tutor_dots", counsellor: "counsellor_dots", centre: "centre_dots", college: "college_dots" };
    return map[mode];
  };

  const fetchDots = async () => {
    setLoading(true);
    if (mode === "student") { const { data } = await supabase.from("student_dots").select("*").order("created_at", { ascending: false }); setStudentDots((data as unknown as StudentDot[]) || []); }
    else if (mode === "tutor") { const { data } = await supabase.from("tutor_dots").select("*").order("created_at", { ascending: false }); setTutorDots((data as unknown as TutorDot[]) || []); }
    else if (mode === "counsellor") { const { data } = await supabase.from("counsellor_dots").select("*").order("created_at", { ascending: false }); setCounsellorDots((data as unknown as CounsellorDot[]) || []); }
    else if (mode === "centre") { const { data } = await supabase.from("centre_dots").select("*").order("created_at", { ascending: false }); setCentreDots((data as unknown as CentreDot[]) || []); }
    else if (mode === "college") { const { data } = await supabase.from("college_dots").select("*").order("created_at", { ascending: false }); setCollegeDots((data as unknown as CollegeDot[]) || []); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dot? This cannot be undone.")) return;
    const { error } = await supabase.from(tableForMode() as any).delete().eq("id", id);
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
    const { error } = await supabase.from(tableForMode() as any).delete().in("id", ids);
    setDeleting(false);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success(`${ids.length} dots deleted`);
    setSelectedIds(new Set());
    fetchDots();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = (dotIds: string[]) => {
    const allSelected = dotIds.every((id) => selectedIds.has(id));
    if (allSelected) setSelectedIds((prev) => { const n = new Set(prev); dotIds.forEach((id) => n.delete(id)); return n; });
    else setSelectedIds((prev) => { const n = new Set(prev); dotIds.forEach((id) => n.add(id)); return n; });
  };

  const normalizeHeaderKey = (value: string) => value.toLowerCase().trim().replace(/"/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const getField = (row: Record<string, string>, aliases: string[]): string => {
    for (const key of aliases) { const normalized = normalizeHeaderKey(key); const value = row[normalized]; if (value && value.trim()) return value.trim(); }
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
    } else {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) throw new Error("File must have a header row and at least one data row");
      const headers = lines[0].split(",").map((h) => normalizeHeaderKey(h));
      return lines.slice(1).map((line) => { const values = parseCSVLine(line); const obj: Record<string, string> = {}; headers.forEach((h, i) => { obj[h] = values[i]?.trim().replace(/^"|"$/g, "") || ""; }); return obj; });
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []; let current = ""; let inQuotes = false;
    for (const char of line) { if (char === '"') inQuotes = !inQuotes; else if (char === "," && !inQuotes) { result.push(current); current = ""; } else current += char; }
    result.push(current); return result;
  };

  const geocodeRows = async (rows: Record<string, string>[]): Promise<{ inserts: any[]; skipped: string[] }> => {
    const geocodeCache = new Map<string, { lat: number; lng: number }>();
    const inserts: any[] = [];
    const skipped: string[] = [];
    for (let index = 0; index < rows.length; index++) {
      const r = rows[index];
      const name = getField(r, ["name", "full_name"]);
      const area = getField(r, ["area", "address", "location", "locality", "area/address", "area_address"]);
      const latInput = Number(getField(r, ["lat", "latitude"]));
      const lngInput = Number(getField(r, ["lng", "longitude", "lon", "long"]));
      const hasLatLng = Number.isFinite(latInput) && Number.isFinite(lngInput) && (latInput !== 0 || lngInput !== 0);
      let lat: number, lng: number;
      if (hasLatLng) { lat = latInput; lng = lngInput; }
      else if (area) {
        const areaKey = area.toLowerCase();
        if (geocodeCache.has(areaKey)) { const cached = geocodeCache.get(areaKey)!; const j = jitterCoords(cached.lat, cached.lng); lat = j.lat; lng = j.lng; }
        else { await delay(1100); const coords = await geocodeAddressDetailed(area); if (!coords.resolved) { skipped.push(`Row ${index + 2}: could not geocode "${area}"`); continue; } geocodeCache.set(areaKey, { lat: coords.lat, lng: coords.lng }); lat = coords.lat; lng = coords.lng; }
      } else { skipped.push(`Row ${index + 2}: missing area/address or lat/lng`); continue; }
      inserts.push({ name: name || "Unknown", area, lat, lng, email: getField(r, ["email", "email_id"]) || null, description: getField(r, ["description"]) || null, _raw: r });
    }
    return { inserts, skipped };
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const rows = await parseFileToRows(file);
      const { inserts: baseInserts, skipped } = await geocodeRows(rows);
      if (!baseInserts.length) throw new Error("No valid rows found.");

      let finalInserts: any[];
      if (mode === "student") {
        finalInserts = baseInserts.map((b) => ({ name: b.name, area: b.area, lat: b.lat, lng: b.lng, email: b.email, description: b.description, pillar: getField(b._raw, ["pillar", "category"]) || "subject_tutoring", icon: getField(b._raw, ["icon"]) || "book", category: getField(b._raw, ["category"]) || "blue", contact: getField(b._raw, ["contact"]) || "direct", education: getField(b._raw, ["education"]) || null, skills: getField(b._raw, ["skills"]) || null, availability: getField(b._raw, ["availability"]) || null, grade: getField(b._raw, ["grade"]) || null, needs: getField(b._raw, ["needs"]) || null }));
      } else if (mode === "tutor") {
        finalInserts = baseInserts.map((b) => ({ name: b.name, area: b.area, lat: b.lat, lng: b.lng, email: b.email, description: b.description, subject: getField(b._raw, ["subject"]) || "mathematics", icon: getField(b._raw, ["icon"]) || "book", experience: getField(b._raw, ["experience"]) || null, price_range: getField(b._raw, ["price_range", "price range"]) || null, qualification: getField(b._raw, ["qualification"]) || null, availability: getField(b._raw, ["availability"]) || null, rating: getField(b._raw, ["rating"]) || null, languages: getField(b._raw, ["languages"]) || null }));
      } else if (mode === "counsellor") {
        finalInserts = baseInserts.map((b) => ({ name: b.name, area: b.area, lat: b.lat, lng: b.lng, email: b.email, description: b.description, speciality: getField(b._raw, ["speciality", "specialty"]) || "general", icon: getField(b._raw, ["icon"]) || "compass", experience: getField(b._raw, ["experience"]) || null, price_range: getField(b._raw, ["price_range", "price range"]) || null, qualification: getField(b._raw, ["qualification"]) || null, availability: getField(b._raw, ["availability"]) || null, rating: getField(b._raw, ["rating"]) || null, languages: getField(b._raw, ["languages"]) || null, mode: getField(b._raw, ["mode"]) || "online" }));
      } else if (mode === "centre") {
        finalInserts = baseInserts.map((b) => ({ name: b.name, area: b.area, lat: b.lat, lng: b.lng, email: b.email, description: b.description, services: getField(b._raw, ["services"]) || null, fees: getField(b._raw, ["fees"]) || null, address: getField(b._raw, ["address"]) || b.area, contact: getField(b._raw, ["contact"]) || "direct", availability: getField(b._raw, ["availability"]) || null, rating: getField(b._raw, ["rating"]) || null }));
      } else {
        finalInserts = baseInserts.map((b) => ({ name: b.name, area: b.area, lat: b.lat, lng: b.lng, email: b.email, description: b.description, programs: getField(b._raw, ["programs", "programme"]) || null, fees: getField(b._raw, ["fees"]) || null, address: getField(b._raw, ["address"]) || b.area, contact: getField(b._raw, ["contact"]) || "direct", availability: getField(b._raw, ["availability"]) || null, rating: getField(b._raw, ["rating"]) || null }));
      }

      const { error } = await supabase.from(tableForMode() as any).insert(finalInserts);
      if (error) throw error;
      if (skipped.length > 0) toast.warning(`Uploaded ${finalInserts.length} rows. Skipped ${skipped.length}.`);
      else toast.success(`${finalInserts.length} ${mode} dots uploaded`);
      fetchDots();
    } catch (err: any) { toast.error(err.message || "Failed to upload"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const getCurrentDots = (): any[] => {
    if (mode === "student") return studentDots;
    if (mode === "tutor") return tutorDots;
    if (mode === "counsellor") return counsellorDots;
    if (mode === "centre") return centreDots;
    return collegeDots;
  };

  const getFilteredDots = (): any[] => {
    const dots = getCurrentDots();
    if (!filter.trim()) return dots;
    const q = filter.toLowerCase();
    return dots.filter((d: any) => d.name?.toLowerCase().includes(q) || d.area?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q));
  };

  const getMapDots = () => {
    const dots = getCurrentDots();
    if (mode === "student") return dots.map((d: any) => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, label: d.pillar?.replace(/_/g, " "), icon: d.icon }));
    if (mode === "tutor") return dots.map((d: any) => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, label: d.subject, icon: d.icon }));
    if (mode === "counsellor") return dots.map((d: any) => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, label: d.speciality, icon: d.icon }));
    if (mode === "centre") return dots.map((d: any) => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, label: d.services || "centre", icon: d.icon }));
    return dots.map((d: any) => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, label: d.programs || "college", icon: d.icon }));
  };

  const getColumns = (): { key: string; label: string }[] => {
    if (mode === "student") return [
      { key: "unique_id", label: "Unique ID" },
      { key: "name", label: "Full Name" }, { key: "school_iti", label: "School/ITI" },
      { key: "mobile_device", label: "Mobile Device" }, { key: "age", label: "Age" },
      { key: "gender", label: "Gender" }, { key: "area", label: "Location" },
      { key: "contact", label: "Phone Number / Email" }, { key: "work_experience", label: "Work Experience" },
      { key: "highest_qualification", label: "Highest Qualification or Skill" },
      { key: "last_role", label: "Name of last role held" },
      { key: "jobs_interested_nature", label: "Nature of Jobs Interested In" },
      { key: "jobs_interested_role", label: "Name of Job Role/s Interested in" },
      { key: "other_help", label: "Other Help Needed" },
      { key: "lat", label: "Latitude" },
      { key: "lng", label: "Longitude" },
    ];
    if (mode === "tutor") return [
      { key: "name", label: "Full Name" }, { key: "email", label: "Email Id" }, { key: "area", label: "Pincode" },
      { key: "subject", label: "Service Type" }, { key: "availability", label: "Grade Bands" },
      { key: "qualification", label: "Academic Stream" }, { key: "lat", label: "Lat" }, { key: "lng", label: "Long" },
    ];
    if (mode === "counsellor") return [
      { key: "name", label: "Name" }, { key: "email", label: "Email Id" }, { key: "area", label: "Area / Address" },
      { key: "speciality", label: "Speciality" }, { key: "experience", label: "Experience" },
      { key: "price_range", label: "Price Range" }, { key: "qualification", label: "Qualification" },
      { key: "rating", label: "Rating" }, { key: "languages", label: "Languages" },
      { key: "description", label: "Description" }, { key: "mode", label: "Mode" },
    ];
    if (mode === "centre") return [
      { key: "unique_id", label: "Unique ID" },
      { key: "name", label: "Company Name" }, { key: "area", label: "Location" },
      { key: "hiring_manager_name", label: "Hiring Manager Name" },
      { key: "contact", label: "Phone Number / Email ID" },
      { key: "called_by", label: "Called by" },
      { key: "requirement_of_portal", label: "Requirement of portal" },
      { key: "internship", label: "Internship" },
      { key: "openings", label: "# openings" },
      { key: "nature_of_job", label: "Nature of Job" },
      { key: "job_role_salary", label: "Job role / salary" },
      { key: "type_of_candidate", label: "Type of candidate" },
      { key: "min_qualification", label: "Min. Highest Qualification or Skill" },
      { key: "work_experience_years", label: "Work Experience (Years)" },
      { key: "last_role_held", label: "Name of last role held" },
      { key: "remarks", label: "Remarks" },
      { key: "lat", label: "Lat" },
      { key: "lng", label: "Long" },
    ];
    return [
      { key: "name", label: "Name" }, { key: "email", label: "Email Id" }, { key: "area", label: "Area / Address" },
      { key: "address", label: "Address" }, { key: "programs", label: "Programs" }, { key: "fees", label: "Fees" },
      { key: "contact", label: "Contact" }, { key: "availability", label: "Availability" },
      { key: "rating", label: "Rating" }, { key: "description", label: "Description" },
    ];
  };

  const tabs: { key: DotMode; label: string; icon: any }[] = [
    { key: "student", label: "Seeker", icon: GraduationCap },
    { key: "centre", label: "Provider", icon: Building2 },
  ];

  const filteredDots = getFilteredDots();
  const columns = getColumns();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft size={18} className="text-foreground" /></button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: YELLOW }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Manage Dots</h1>
              <p className="text-xs text-muted-foreground">Create, upload & manage blue dots</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex rounded-xl border border-border overflow-hidden w-fit flex-wrap">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setMode(t.key)} className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5" style={mode === t.key ? { background: YELLOW, color: "white" } : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={handleCSVUpload} className="hidden" />
          </div>
        </div>

        {/* Google Sheets Sync */}
        <GoogleSheetSync mode={mode} onSyncComplete={fetchDots} />

        {/* Map Preview */}
        <AdminMapPreview title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Map View`} dots={getMapDots()} />

        {/* Add/Edit Form */}
        {(showAddForm || editingDot) && (
          <DotForm mode={mode} editDot={editingDot} onSuccess={() => { setShowAddForm(false); setEditingDot(null); fetchDots(); }} onCancel={() => { setShowAddForm(false); setEditingDot(null); }} />
        )}

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder={`Search ${mode} dots...`} value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Count + Batch Delete */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filteredDots.length} {mode} dots</p>
          {selectedIds.size > 0 && (
            <button onClick={handleBatchDelete} disabled={deleting} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50" style={{ background: "#EF4444" }}>
              <Trash2 size={14} /> {deleting ? "Deleting..." : `Delete ${selectedIds.size} selected`}
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} /></div>
        ) : filteredDots.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground bg-card border border-border rounded-xl">No {mode} dots yet. Upload a CSV or add one manually.</div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {columns.map((c) => <th key={c.key} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredDots.map((d: any) => {
                    const flagged = mode === "student" && isUnderageFlagged(d);
                    return (
                    <tr key={d.id} className={`border-b border-border/50 transition-colors ${flagged ? "bg-red-50 dark:bg-red-950/20 opacity-60" : "hover:bg-muted/20"}`}>
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px] whitespace-nowrap">
                          {c.key === "name" ? (
                            <div className="flex items-center gap-2">
                              {flagged && <AlertTriangle size={14} className="text-destructive shrink-0" />}
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: flagged ? "#EF4444" : YELLOW }}>{(d.name || "?")[0]}</div>
                              <span className={`font-medium text-xs truncate max-w-[200px] ${flagged ? "text-red-600 dark:text-red-400 line-through" : "text-foreground"}`}>{d.name}</span>
                            </div>
                          ) : c.key === "created_at" ? (
                            <span>{new Date(d[c.key]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          ) : c.key === "lat" || c.key === "lng" ? (
                            <span>{Number(d[c.key])?.toFixed(4) ?? "—"}</span>
                          ) : (
                            <span className="capitalize">{(d[c.key] || "—").toString().replace(/_/g, " ")}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Universal Add/Edit Dot Form ─── */
const DotForm = ({ mode, editDot, onSuccess, onCancel }: { mode: DotMode; editDot?: any; onSuccess: () => void; onCancel: () => void }) => {
  const getInitialForm = () => {
    if (mode === "student") return { name: editDot?.name || "", area: editDot?.area || "", pillar: editDot?.pillar || "subject_tutoring", email: editDot?.email || "", education: editDot?.education || "", skills: editDot?.skills || "", description: editDot?.description || "", grade: editDot?.grade || "", needs: editDot?.needs || "" };
    if (mode === "tutor") return { name: editDot?.name || "", area: editDot?.area || "", subject: editDot?.subject || "mathematics", email: editDot?.email || "", experience: editDot?.experience || "", price_range: editDot?.price_range || "", qualification: editDot?.qualification || "", description: editDot?.description || "", rating: editDot?.rating || "", languages: editDot?.languages || "" };
    if (mode === "counsellor") return { name: editDot?.name || "", area: editDot?.area || "", speciality: editDot?.speciality || "general", email: editDot?.email || "", experience: editDot?.experience || "", price_range: editDot?.price_range || "", qualification: editDot?.qualification || "", description: editDot?.description || "", rating: editDot?.rating || "", languages: editDot?.languages || "", mode: editDot?.mode || "online" };
    if (mode === "centre") return { name: editDot?.name || "", area: editDot?.area || "", email: editDot?.email || "", services: editDot?.services || "", fees: editDot?.fees || "", address: editDot?.address || "", description: editDot?.description || "", contact: editDot?.contact || "direct", rating: editDot?.rating || "" };
    return { name: editDot?.name || "", area: editDot?.area || "", email: editDot?.email || "", programs: editDot?.programs || "", fees: editDot?.fees || "", address: editDot?.address || "", description: editDot?.description || "", contact: editDot?.contact || "direct", rating: editDot?.rating || "" };
  };

  const [form, setForm] = useState<Record<string, string>>(getInitialForm());
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.area || !form.email) { toast.error("Name, email, and area are required"); return; }
    setSaving(true);
    const needsGeocode = !editDot || form.area !== editDot.area;
    let lat = editDot?.lat ?? 0, lng = editDot?.lng ?? 0;
    if (needsGeocode) {
      const coords = await geocodeAddressDetailed(form.area);
      if (!coords.resolved) { setSaving(false); toast.error("Could not find this address."); return; }
      lat = coords.lat; lng = coords.lng;
    }
    const payload: any = { ...form, lat, lng };
    // Clean empty strings to null
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    payload.name = form.name; payload.area = form.area; payload.email = form.email || null;
    delete payload._raw;

    const table = mode === "student" ? "student_dots" : mode === "tutor" ? "tutor_dots" : mode === "counsellor" ? "counsellor_dots" : mode === "centre" ? "centre_dots" : "college_dots";
    const { error } = editDot ? await supabase.from(table as any).update(payload).eq("id", editDot.id) : await supabase.from(table as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(editDot ? "Failed to update" : "Failed to add dot"); console.error(error); return; }
    toast.success(editDot ? `${mode} dot updated` : `${mode} dot added`);
    onSuccess();
  };

  const fields = Object.keys(form).filter((k) => k !== "name" && k !== "area" && k !== "email" && k !== "description");
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {editDot ? <><Edit2 size={14} style={{ color: YELLOW }} /> Edit {modeLabel} Dot</> : <><Plus size={14} style={{ color: YELLOW }} /> Add {modeLabel} Dot</>}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FormField label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <FormField label="Email Id *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="e.g. user@example.com" />
        <FormField label="Area / Address *" value={form.area} onChange={(v) => setForm({ ...form, area: v })} placeholder="e.g. Indirapuram, Ghaziabad" />
        {fields.map((key) => (
          <FormField key={key} label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} value={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} />
        ))}
      </div>
      <FormField label="Description" value={form.description || ""} onChange={(v) => setForm({ ...form, description: v })} />
      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} /> Location will be auto-detected from the address</p>
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50 transition-colors" style={{ background: YELLOW }}>{saving ? "Saving..." : editDot ? "Update Dot" : "Add Dot"}</button>
      </div>
    </form>
  );
};

/* ─── Shared Form Field ─── */
const FormField = ({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
  <div>
    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} step={type === "number" ? "any" : undefined} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
  </div>
);

export default ManageDots;

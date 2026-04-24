import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

const YELLOW = "#DC143C";

interface TutorDot {
  id: string;
  name: string;
  area: string;
  subject: string;
  email: string | null;
  experience: string | null;
  price_range: string | null;
  rating: string | null;
  availability: string | null;
  languages: string | null;
  qualification: string | null;
  created_at: string;
}

type SortField = "name" | "area" | "subject" | "experience" | "created_at";

const TutorDataTable = () => {
  const [tutors, setTutors] = useState<TutorDot[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [areaFilter, setAreaFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [experienceFilter, setExperienceFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchTutors = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tutor_dots")
        .select("id, name, area, subject, email, experience, price_range, rating, availability, languages, qualification, created_at")
        .order("created_at", { ascending: false });
      setTutors(data || []);
      setLoading(false);
    };
    fetchTutors();
  }, []);

  // Derive unique filter values
  const areas = useMemo(() => ["All", ...Array.from(new Set(tutors.map((t) => t.area).filter(Boolean))).sort()], [tutors]);
  const subjects = useMemo(() => ["All", ...Array.from(new Set(tutors.map((t) => t.subject).filter(Boolean))).sort()], [tutors]);
  const experiences = useMemo(() => ["All", ...Array.from(new Set(tutors.map((t) => t.experience).filter((e): e is string => !!e))).sort()], [tutors]);
  const availabilities = useMemo(() => ["All", ...Array.from(new Set(tutors.map((t) => t.availability).filter((a): a is string => !!a))).sort()], [tutors]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let list = [...tutors];
    if (areaFilter !== "All") list = list.filter((t) => t.area === areaFilter);
    if (subjectFilter !== "All") list = list.filter((t) => t.subject === subjectFilter);
    if (experienceFilter !== "All") list = list.filter((t) => t.experience === experienceFilter);
    if (availabilityFilter !== "All") list = list.filter((t) => t.availability === availabilityFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.area.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (sortField === "created_at") return dir * (new Date(av).getTime() - new Date(bv).getTime());
      return dir * String(av).localeCompare(String(bv));
    });

    return list;
  }, [tutors, areaFilter, subjectFilter, experienceFilter, availabilityFilter, searchQuery, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-muted-foreground/40" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
  };

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const freshnessLabel = (days: number) => {
    if (days <= 7) return { text: "New", bg: "#2E7D3220", color: "#2E7D32" };
    if (days <= 30) return { text: "Recent", bg: `${YELLOW}20`, color: YELLOW };
    return { text: `${days}d`, bg: "#94a3b820", color: "#64748b" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-3 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
        <h2 className="text-base font-bold text-foreground">Tutor Directory</h2>
        <p className="text-xs text-muted-foreground mt-0.5">All registered tutors and their profile details</p>
      </div>

      {/* Filters row */}
      <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/20">
        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect label="Area" value={areaFilter} options={areas} onChange={setAreaFilter} />
          <FilterSelect label="Subject" value={subjectFilter} options={subjects} onChange={setSubjectFilter} />
          <FilterSelect label="Experience" value={experienceFilter} options={experiences} onChange={setExperienceFilter} />
          <FilterSelect label="Availability" value={availabilityFilter} options={availabilities} onChange={setAvailabilityFilter} />
          <div className="flex-1 min-w-[180px]">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Search</span>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Name, email, area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 sm:px-6 py-2 text-[11px] text-muted-foreground border-b border-border/50">
        Showing {filtered.length} of {tutors.length} tutors
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No tutors match the current filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => handleSort("name")}>
                  <span className="flex items-center gap-1 underline decoration-muted-foreground/30 underline-offset-2">Name <SortIcon field="name" /></span>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => handleSort("area")}>
                  <span className="flex items-center gap-1 underline decoration-muted-foreground/30 underline-offset-2">Area <SortIcon field="area" /></span>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => handleSort("subject")}>
                  <span className="flex items-center gap-1 underline decoration-muted-foreground/30 underline-offset-2">Subject <SortIcon field="subject" /></span>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Email</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => handleSort("experience")}>
                  <span className="flex items-center gap-1 underline decoration-muted-foreground/30 underline-offset-2">Experience <SortIcon field="experience" /></span>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Price</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Rating</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                  <span className="flex items-center gap-1 underline decoration-muted-foreground/30 underline-offset-2">Added <SortIcon field="created_at" /></span>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Freshness</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const days = daysSince(t.created_at);
                const fresh = freshnessLabel(days);
                return (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">{t.name}</td>
                    <td className="px-3 py-3 text-foreground text-xs sm:text-sm">{t.area}</td>
                    <td className="px-3 py-3 text-foreground text-xs sm:text-sm capitalize">{t.subject.replace(/_/g, " ")}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs truncate max-w-[160px]">{t.email || "—"}</td>
                    <td className="px-3 py-3 text-foreground text-xs sm:text-sm">{t.experience || "—"}</td>
                    <td className="px-3 py-3 text-foreground text-xs sm:text-sm">{t.price_range || "—"}</td>
                    <td className="px-3 py-3 text-foreground text-xs sm:text-sm">{t.rating || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: fresh.bg, color: fresh.color }}>
                        {fresh.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const FilterSelect = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
  <div className="min-w-[130px]">
    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

export default TutorDataTable;

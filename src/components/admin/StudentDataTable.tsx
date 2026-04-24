import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

const YELLOW = "#DC143C";

interface StudentDot {
  id: string;
  name: string;
  area: string;
  contact: string;
  email: string | null;
  school_iti: string | null;
  mobile_device: string | null;
  age: string | null;
  gender: string | null;
  work_experience: string | null;
  highest_qualification: string | null;
  last_role: string | null;
  jobs_interested_nature: string | null;
  jobs_interested_role: string | null;
  other_help: string | null;
  unique_id: string | null;
  lat: number;
  lng: number;
  created_at: string;
}

type SortField = keyof Omit<StudentDot, "id" | "created_at">;

const COLUMNS: { label: string; field: SortField }[] = [
  { label: "Unique ID", field: "unique_id" as SortField },
  { label: "Full Name", field: "name" },
  { label: "School/ITI", field: "school_iti" },
  { label: "Mobile Device", field: "mobile_device" },
  { label: "Age", field: "age" },
  { label: "Gender", field: "gender" },
  { label: "Location", field: "area" },
  { label: "Phone Number / Email", field: "contact" },
  { label: "Work Experience", field: "work_experience" },
  { label: "Highest Qualification or Skill", field: "highest_qualification" },
  { label: "Name of last role held", field: "last_role" },
  { label: "Nature of Jobs Interested In", field: "jobs_interested_nature" },
  { label: "Name of Job Role/s Interested in", field: "jobs_interested_role" },
  { label: "Other Help Needed", field: "other_help" },
  { label: "Latitude", field: "lat" as SortField },
  { label: "Longitude", field: "lng" as SortField },
];

const StudentDataTable = () => {
  const [students, setStudents] = useState<StudentDot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("student_dots")
        .select("id, name, area, contact, email, school_iti, mobile_device, age, gender, work_experience, highest_qualification, last_role, jobs_interested_nature, jobs_interested_role, other_help, unique_id, lat, lng, created_at")
        .order("created_at", { ascending: false });
      setStudents((data as any[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let list = [...students];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const av = (a as any)[sortField] ?? "";
      const bv = (b as any)[sortField] ?? "";
      return dir * String(av).localeCompare(String(bv));
    });
    return list;
  }, [students, searchQuery, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-muted-foreground/40" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
  };

  const getInitial = (name: string) => (name?.charAt(0) || "?").toUpperCase();

  const getCellValue = (s: StudentDot, col: typeof COLUMNS[number], idx: number): string => {
    if (col.label === "Phone Number / Email") {
      const parts = [s.contact !== "direct" ? s.contact : "", s.email || ""].filter(Boolean);
      return parts.join(" / ") || "—";
    }
    const val = (s as any)[col.field];
    return val || "—";
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
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Student Directory</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All registered seekers and their profile details</p>
        </div>
        <div className="w-[220px]">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-2 text-[11px] text-muted-foreground border-b border-border/50">
        Showing {filtered.length} of {students.length} students
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No seekers match the current filters.</div>
      ) : (
        <div className="overflow-auto max-h-[480px]">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="border-b border-border sticky top-0 z-10 bg-card">
                {COLUMNS.map((col) => (
                  <th
                    key={col.label}
                    className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs cursor-pointer select-none first:pl-4 whitespace-nowrap"
                    onClick={() => handleSort(col.field)}
                  >
                    <span className="flex items-center gap-1 underline decoration-muted-foreground/30 underline-offset-2">
                      {col.label} <SortIcon field={col.field} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  {COLUMNS.map((col) => (
                    <td key={col.label} className="px-3 py-3 text-xs sm:text-sm first:pl-4 whitespace-nowrap">
                      {col.label === "Full Name" ? (
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: YELLOW }}>
                            {getInitial(s.name)}
                          </span>
                          <span className="font-medium text-foreground">{s.name}</span>
                        </div>
                      ) : (
                        <span className={getCellValue(s, col, idx) === "—" ? "text-muted-foreground" : "text-foreground"}>
                          {getCellValue(s, col, idx)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentDataTable;

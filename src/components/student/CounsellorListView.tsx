import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Search, X, Star, MapPin, Clock, DollarSign, Phone, ArrowLeft } from "lucide-react";

const YELLOW = "#DC143C";

interface Counsellor {
  id: string;
  name: string;
  area: string;
  speciality: string;
  experience: string | null;
  price_range: string | null;
  availability: string | null;
  rating: string | null;
  languages: string | null;
  qualification: string | null;
  description: string | null;
  email: string | null;
  mode: string | null;
}

interface Props {
  onBack: () => void;
}

const CounsellorListView = ({ onBack }: Props) => {
  const { user } = useAuth();
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [justConnectedIds, setJustConnectedIds] = useState<Set<string>>(new Set());
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from("counsellor_dots").select("*");
      if (error) { console.error(error); toast.error("Failed to load counsellors"); }
      setCounsellors((data || []) as Counsellor[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return counsellors;
    const q = search.toLowerCase();
    return counsellors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.speciality.toLowerCase().includes(q) ||
        c.area.toLowerCase().includes(q)
    );
  }, [counsellors, search]);

  const handleConnect = (c: Counsellor) => {
    if (connectedIds.has(c.id)) return;
    setConnectedIds((prev) => new Set([...prev, c.id]));
    setJustConnectedIds((prev) => new Set([...prev, c.id]));
    setTimeout(() => setJustConnectedIds((prev) => { const n = new Set(prev); n.delete(c.id); return n; }), 2000);
    toast.success(`Connection request sent to ${c.name}!`);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 sm:px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">Online Counsellors</h2>
            <p className="text-xs text-muted-foreground">{filtered.length} counsellors available</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, speciality, or area..."
            className="w-full bg-muted border border-border rounded-xl pl-9 pr-8 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No counsellors found</p>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: YELLOW }}>
                <MapPin size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-foreground truncate">{c.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{c.area}</span>
                </div>
                <table className="w-full text-xs mt-2 border-t border-border pt-2">
                  <tbody>
                    {c.speciality && <tr><td className="text-muted-foreground py-1 pr-3 font-medium whitespace-nowrap">Service Type</td><td className="text-foreground py-1">{c.speciality.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}</td></tr>}
                  </tbody>
                </table>
                <div className="flex flex-col items-end mt-2">
                  {connectedIds.has(c.id) ? (
                    justConnectedIds.has(c.id) ? (
                      <>
                        <button disabled className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-default flex-shrink-0" style={{ background: "#2E7D32" }}>
                          ✓ Request Sent
                        </button>
                        <p className="text-[11px] text-muted-foreground mt-1">You can track this in My Connections</p>
                      </>
                    ) : (
                      <button disabled className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-default flex-shrink-0" style={{ background: "#2E7D32" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        Request Sent
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleConnect(c)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95 flex-shrink-0"
                      style={{ background: YELLOW }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CounsellorListView;

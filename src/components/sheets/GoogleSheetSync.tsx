import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, RefreshCw, Trash2, Link2, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

const YELLOW = "#DC143C";

type DotMode = "student" | "tutor" | "counsellor" | "centre" | "college";

interface SheetConfig {
  id: string;
  sheet_url: string;
  sheet_id: string;
  dot_type: string;
  last_synced_at: string | null;
  sync_status: string | null;
  sync_error: string | null;
  created_at: string;
}

export default function GoogleSheetSync({ mode, onSyncComplete }: { mode: DotMode; onSyncComplete?: () => void }) {
  const [configs, setConfigs] = useState<SheetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetUrl, setSheetUrl] = useState("");
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, [mode]);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sheet_configs")
      .select("*")
      .eq("dot_type", mode)
      .order("created_at", { ascending: false });
    if (!error && data) setConfigs(data as SheetConfig[]);
    setLoading(false);
  };

  const extractSheetId = (url: string): string | null => {
    // Match Google Sheets URL patterns
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleLink = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Please paste a Google Sheet URL");
      return;
    }
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      toast.error("Invalid Google Sheet URL. Please paste a valid URL like: https://docs.google.com/spreadsheets/d/...");
      return;
    }

    // Check if already linked
    const existing = configs.find((c) => c.sheet_id === sheetId);
    if (existing) {
      toast.error("This sheet is already linked");
      return;
    }

    setLinking(true);
    const { error } = await supabase.from("sheet_configs").insert({
      sheet_url: sheetUrl.trim(),
      sheet_id: sheetId,
      dot_type: mode,
    } as any);
    setLinking(false);

    if (error) {
      toast.error("Failed to link sheet");
      return;
    }

    toast.success("Sheet linked! Click Sync to pull data.");
    setSheetUrl("");
    fetchConfigs();
  };

  const handleSync = async (configId: string) => {
    setSyncing(configId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Not authenticated");
        setSyncing(null);
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sync-google-sheet`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ config_id: configId }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Sync failed");
      } else {
        const syncResult = result.results?.[0];
        if (syncResult?.status === "success") {
          toast.success(`Synced ${syncResult.count} ${mode} dots from sheet`);
        } else {
          toast.error(syncResult?.error || "Sync failed");
        }
      }
      fetchConfigs();
      onSyncComplete?.();
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    }
    setSyncing(null);
  };

  const handleUnlink = async (id: string) => {
    if (!confirm("Unlink this sheet? This won't delete existing dots.")) return;
    const { error } = await supabase.from("sheet_configs").delete().eq("id", id);
    if (error) {
      toast.error("Failed to unlink");
      return;
    }
    toast.success("Sheet unlinked");
    fetchConfigs();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  const statusIcon = (status: string | null) => {
    switch (status) {
      case "success":
        return <CheckCircle2 size={14} className="text-green-500" />;
      case "error":
        return <AlertCircle size={14} className="text-destructive" />;
      case "syncing":
        return <Loader2 size={14} className="text-yellow-500 animate-spin" />;
      default:
        return <Clock size={14} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sheet size={16} style={{ color: YELLOW }} />
        <h3 className="text-sm font-semibold text-foreground">Google Sheets Sync</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {mode === "student" ? "Seeker" : "Tutor"} Dots
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Link a Google Sheet to auto-sync {mode} dots. Shared tutor sheets can use flexible headers like <strong>name</strong>/<strong>rep_name</strong>, <strong>email</strong>/<strong>rep_email</strong>, <strong>area</strong>/<strong>pincode</strong>, plus optional lat/lng.
      </p>

      {/* Link new sheet */}
      <div className="flex gap-2">
        <input
          type="text"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="Paste Google Sheet URL..."
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleLink}
          disabled={linking}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
          style={{ background: YELLOW }}
        >
          <Link2 size={14} /> {linking ? "Linking..." : "Link Sheet"}
        </button>
      </div>

      {/* Linked sheets */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No sheets linked yet</p>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {statusIcon(config.sync_status)}
                  <span className="text-xs font-medium text-foreground truncate">
                    {config.sheet_url.length > 60
                      ? config.sheet_url.slice(0, 60) + "..."
                      : config.sheet_url}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Last synced: {formatDate(config.last_synced_at)}
                  </span>
                  {config.sync_error && (
                    <span className="text-[10px] text-destructive truncate max-w-[200px]">
                      Error: {config.sync_error}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSync(config.id)}
                  disabled={syncing === config.id}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50 text-foreground"
                >
                  <RefreshCw size={12} className={syncing === config.id ? "animate-spin" : ""} />
                  {syncing === config.id ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={() => handleUnlink(config.id)}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 px-2 py-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";

function decodePrivateKey(privateKey: string): Uint8Array {
  let normalized = privateKey.trim();
  normalized = normalized.replace(/\\n/g, "\n");
  if (normalized.includes("BEGIN PRIVATE KEY")) {
    normalized = normalized
      .replace(/-----BEGIN PRIVATE KEY-----/g, "")
      .replace(/-----END PRIVATE KEY-----/g, "")
      .replace(/\s+/g, "");
  } else {
    normalized = normalized.replace(/\s+/g, "");
  }
  try {
    return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("Private key is not valid base64/PKCS8 format");
  }
}

function resolveServiceAccount(raw: string): ServiceAccountKey {
  const cleaned = raw.trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed?.client_email && parsed?.private_key) {
      return { client_email: parsed.client_email, private_key: parsed.private_key, token_uri: parsed.token_uri || GOOGLE_TOKEN_URI };
    }
  } catch { /* noop */ }
  try {
    const maybeString = JSON.parse(cleaned);
    if (typeof maybeString === "string") {
      const parsed = JSON.parse(maybeString);
      if (parsed?.client_email && parsed?.private_key) {
        return { client_email: parsed.client_email, private_key: parsed.private_key, token_uri: parsed.token_uri || GOOGLE_TOKEN_URI };
      }
    }
  } catch { /* noop */ }
  const fallbackEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (fallbackEmail) {
    return { client_email: fallbackEmail, private_key: cleaned, token_uri: GOOGLE_TOKEN_URI };
  }
  throw new Error(
    "Invalid GOOGLE_SERVICE_ACCOUNT_KEY. Provide full JSON key, or add GOOGLE_SERVICE_ACCOUNT_EMAIL when using private-key-only format."
  );
}

async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: sa.token_uri || GOOGLE_TOKEN_URI,
    exp: now + 3600,
    iat: now,
  }));
  const textEncoder = new TextEncoder();
  const signingInput = `${header}.${payload}`;
  const binaryKey = decodePrivateKey(sa.private_key);
  const keyBuffer = binaryKey.buffer.slice(binaryKey.byteOffset, binaryKey.byteOffset + binaryKey.byteLength) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBuffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, textEncoder.encode(signingInput));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${header}.${payload}.${sig}`;
  const tokenRes = await fetch(sa.token_uri || GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function resolveTabName(accessToken: string, spreadsheetId: string, preferred?: string | null): Promise<string> {
  // If a tab name is provided AND it isn't the legacy "Sheet1" placeholder, trust it.
  // Otherwise fetch metadata and use the first tab's actual title.
  if (preferred && preferred.trim() && preferred.trim() !== "Sheet1") return preferred.trim();
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (metaRes.ok) {
    const meta = await metaRes.json();
    const firstTitle = meta?.sheets?.[0]?.properties?.title;
    if (firstTitle) return firstTitle;
  }
  return preferred?.trim() || "Sheet1";
}

async function fetchSheetData(accessToken: string, spreadsheetId: string, tabName: string): Promise<string[][]> {
  // Quote tab name if it contains spaces or special chars
  const range = /[\s'!:]/.test(tabName) ? `'${tabName.replace(/'/g, "''")}'` : tabName;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets API error [${res.status}] for tab "${tabName}": ${await res.text()}`);
  const data = await res.json();
  return data.values || [];
}

function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/"/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function getField(row: Record<string, string>, aliases: string[]): string {
  for (const key of aliases) {
    const v = row[normalizeKey(key)];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

// Guwahati centre — used as fallback when neither lat/lng nor a geocodable area is present.
const FALLBACK_LAT = 26.1445;
const FALLBACK_LNG = 91.7362;

function jitterCoords(lat: number, lng: number): { lat: number; lng: number } {
  const offset = 0.01;
  return {
    lat: lat + (Math.random() - 0.5) * offset,
    lng: lng + (Math.random() - 0.5) * offset,
  };
}

// ─── Category / risk normalization ───
function normalizeCategory(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (!v) return "hospital";
  if (v.includes("ambul")) return "ambulance";
  if (v.includes("hosp") || v.includes("clinic") || v.includes("trauma")) return "hospital";
  if (v.includes("mech") || v.includes("garage") || v.includes("repair")) return "mechanic";
  if (v.includes("tow") || v.includes("crane")) return "tow";
  if (v.includes("ssm") || v.includes("volunt") || v.includes("samaritan")) return "ssm";
  if (v.includes("fuel") || v.includes("petrol") || v.includes("gas") || v.includes("pump")) return "fuel";
  return v;
}

const ICON_BY_CATEGORY: Record<string, string> = {
  hospital: "hospital",
  ambulance: "ambulance",
  mechanic: "wrench",
  tow: "truck",
  ssm: "users",
  fuel: "fuel",
};

function normalizeServiceType(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (!v) return "Private";
  if (v.startsWith("gov") || v.includes("public") || v.includes("state")) return "Government";
  if (v.includes("volunt") || v.includes("ngo") || v.includes("ssm")) return "Volunteer";
  return "Private";
}

function normalizeRisk(raw: string): string {
  const v = raw.toUpperCase().trim();
  if (!v) return "MODERATE";
  if (v.startsWith("CRIT") || v.startsWith("BLACK")) return "CRITICAL";
  if (v.startsWith("HIGH") || v.startsWith("RED")) return "HIGH";
  if (v.startsWith("MOD") || v.startsWith("MED") || v.startsWith("AMB") || v.startsWith("YEL")) return "MODERATE";
  return v;
}

const DEFAULT_PASSWORD = "304567";

async function autoWhitelistEmails(
  supabaseUrl: string,
  supabaseServiceKey: string,
  emailPasswordMap: Record<string, string>,
) {
  const entries = Object.entries(emailPasswordMap)
    .filter(([e]) => e && e.includes("@"))
    .map(([e, p]) => [e.toLowerCase().trim(), p] as const);
  if (entries.length === 0) return;

  const headers = {
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
    "Content-Type": "application/json",
  };

  for (const [email, password] of entries) {
    const userPassword = password && password !== "direct" ? password : DEFAULT_PASSWORD;
    try {
      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, password: userPassword, email_confirm: true }),
      });
      if (createRes.status === 422 || createRes.status === 409) {
        const findRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`, { method: "GET", headers });
        if (findRes.ok) {
          const findBody = await findRes.json();
          const users = findBody.users || findBody;
          const existing = Array.isArray(users) ? users.find((u: any) => u.email?.toLowerCase() === email) : null;
          if (existing) {
            await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
              method: "PUT",
              headers,
              body: JSON.stringify({ password: userPassword }),
            });
          }
        }
      }
    } catch { /* ignore individual failures */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const saKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyRaw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");
    const sa = resolveServiceAccount(saKeyRaw);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let specificConfigId: string | null = null;
    try {
      const body = await req.json();
      specificConfigId = body.config_id || null;
    } catch { /* no body / cron */ }

    const accessToken = await getAccessToken(sa);

    let query = supabase.from("sheet_configs").select("*");
    if (specificConfigId) query = query.eq("id", specificConfigId);
    const { data: configs, error: configError } = await query;
    if (configError) throw new Error(`Failed to fetch configs: ${configError.message}`);
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "No sheets configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; status: string; count?: number; error?: string }[] = [];

    for (const config of configs) {
      try {
        await supabase
          .from("sheet_configs")
          .update({ sync_status: "syncing", updated_at: new Date().toISOString() })
          .eq("id", config.id);

        const tabName = await resolveTabName(accessToken, config.sheet_id, (config as any).sheet_tab_name);
        const rows = await fetchSheetData(accessToken, config.sheet_id, tabName);
        console.log(`Sheet ${config.sheet_id} (${config.dot_type}) tab "${tabName}": total rows = ${rows.length}`);
        if (rows.length > 0) console.log(`Raw headers: ${JSON.stringify(rows[0])}`);
        if (rows.length > 1) console.log(`First data row: ${JSON.stringify(rows[1])}`);

        if (rows.length < 2) {
          await supabase
            .from("sheet_configs")
            .update({ sync_status: "error", sync_error: "Sheet has no data rows", updated_at: new Date().toISOString() })
            .eq("id", config.id);
          results.push({ id: config.id, status: "error", error: "No data rows" });
          continue;
        }

        const headers = rows[0].map(normalizeKey);
        console.log(`Normalized headers: ${JSON.stringify(headers)}`);
        const dataRows = rows.slice(1).map((row) => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => { obj[h] = row[i]?.trim() || ""; });
          return obj;
        });
        console.log(`Parsed ${dataRows.length} data rows`);

        // Red Dots supports three dot types: services (student_dots), hotspots (centre_dots), potholes (pothole_dots).
        // Backwards compatibility: legacy values "tutor"/"college"/"counsellor" all collapse to services.
        const isHotspot = config.dot_type === "centre" || config.dot_type === "hotspot";
        const isPothole = config.dot_type === "pothole";
        const table: "student_dots" | "centre_dots" | "pothole_dots" = isPothole
          ? "pothole_dots"
          : isHotspot ? "centre_dots" : "student_dots";

        // Preserve UUIDs by email
        const { data: existingDots } = await supabase.from(table).select("id, email");
        const emailToId: Record<string, string> = {};
        for (const dot of (existingDots || []) as any[]) {
          if (dot.email) emailToId[dot.email.toLowerCase().trim()] = dot.id;
        }

        const inserts: Record<string, unknown>[] = [];
        const seenEmails = new Set<string>();
        let skippedCount = 0;

        for (const r of dataRows) {
          const name = isPothole
            ? getField(r, ["name", "pothole_name", "spot_name", "location_name", "junction", "landmark"])
            : isHotspot
              ? getField(r, ["name", "hotspot_name", "blackspot_name", "spot_name", "location_name", "junction", "police_station", "accident_spot", "ps_name"])
              : getField(r, ["name", "facility_name", "service_name", "provider_name", "hospital_name", "company_name", "rep_name"]);

          const area = getField(r, ["area", "ward", "locality", "address", "location", "pincode", "zone", "police_station", "accident_spot", "road_class"]);
          const rawLat = Number(getField(r, ["lat", "latitude"]));
          const rawLng = Number(getField(r, ["lng", "longitude", "lon", "long"]));
          const email = getField(r, ["email", "email_id", "email_pii", "rep_email", "rep_email_pii"]);
          const phone = getField(r, ["contact", "phone", "phone_pii", "mobile", "mobile_pii", "phone_number", "helpline", "rep_phone"]);

          if (!name || (!area && (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)))) {
            skippedCount++;
            if (skippedCount <= 3) {
              console.log(`Skipped row: name="${name}", area="${area}", lat=${rawLat}, lng=${rawLng}, keys=${Object.keys(r).join(",")}`);
            }
            continue;
          }

          let lat = rawLat;
          let lng = rawLng;
          if (!Number.isFinite(lat) || lat === 0 || !Number.isFinite(lng) || lng === 0) {
            const j = jitterCoords(FALLBACK_LAT, FALLBACK_LNG);
            lat = j.lat; lng = j.lng;
          }

          const normalizedEmail = email ? email.toLowerCase() : "";
          const safeEmail = normalizedEmail && !seenEmails.has(normalizedEmail) ? normalizedEmail : null;
          if (safeEmail) seenEmails.add(safeEmail);

          if (isPothole) {
            // ─── Pothole → pothole_dots ───
            const sev = normalizeRisk(getField(r, ["severity", "risk_level", "risk", "grade"]));
            inserts.push({
              name,
              area: area || "Unknown",
              icon: "circle-dot",
              lat, lng,
              contact: phone || "direct",
              email: safeEmail,
              description: getField(r, ["description", "notes"]) || null,
              severity: sev,
              road_class: getField(r, ["road_class", "road_type", "highway_class", "road_category"]) || null,
              size: getField(r, ["size", "pothole_size", "diameter"]) || null,
              depth: getField(r, ["depth", "pothole_depth"]) || null,
              status: getField(r, ["status", "repair_status", "fix_status"]) || null,
              reported_by: getField(r, ["reported_by", "reporter", "reported_by_name"]) || null,
              reported_on: getField(r, ["reported_on", "reported_date", "date_reported", "date"]) || null,
              remarks: getField(r, ["remarks", "comments"]) || null,
              address: getField(r, ["address", "full_address", "landmark"]) || null,
              unique_id: getField(r, ["unique_id", "ids", "sr_no"]) || null,
            });
          } else if (isHotspot) {
            // ─── Accident Hotspot → centre_dots ───
            const risk = normalizeRisk(getField(r, ["risk_level", "risk", "severity", "blackspot_grade"]));
            inserts.push({
              name,
              area: area || "Unknown",
              icon: "alert-triangle",
              lat, lng,
              contact: phone || "direct",
              email: safeEmail,
              description: getField(r, ["description", "remarks", "notes"]) || null,
              relevance: risk,
              nature_of_job: getField(r, ["road_class", "road_type", "highway_class", "road_category"]) || null,
              openings: getField(r, ["total_accidents", "accidents", "incidents", "crashes"]) || "1",
              job_role_salary: getField(r, ["deaths", "fatalities", "killed", "dead"]) || null,
              work_experience_years: getField(r, ["injured", "injuries", "wounded"]) || null,
              rating: getField(r, ["fatality_rate", "fatality_pct", "killed_per_100"]) || null,
              services: getField(r, ["top_collision_type", "collision_type", "primary_collision", "main_cause", "collision_nature"]) || null,
              address: getField(r, ["address", "full_address", "landmark"]) || null,
              availability: null,
              fees: null,
              hiring_manager_name: null,
              unique_id: getField(r, ["unique_id", "irad_id", "ids", "sr_no"]) || null,
            });
          } else {
            // ─── Service Provider → student_dots ───
            const category = normalizeCategory(getField(r, ["category", "service_category", "type", "facility_type"]));
            const stype = normalizeServiceType(getField(r, ["service_type", "ownership", "operator", "type_of_service"]));
            inserts.push({
              name,
              area: area || "Unknown",
              category,                          // hospital | ambulance | mechanic | tow | ssm | fuel
              pillar: stype,                     // Government | Private | Volunteer
              icon: ICON_BY_CATEGORY[category] || "hospital",
              lat, lng,
              contact: phone || "direct",
              email: safeEmail,
              description: getField(r, ["description", "notes"]) || null,
              skills: getField(r, ["speciality", "specialization", "specialty"]) || null,
              needs: getField(r, ["cost", "cost_range", "fees", "price", "price_range"]) || null,
              other_help: getField(r, ["golden_hour_empanelled", "golden_hour", "empanelled"]) || null,
              availability: getField(r, ["availability", "hours", "open_hours", "open_24x7"]) || null,
              distance: getField(r, ["distance", "coverage_radius", "coverage_radius_km"]) || null,
              unique_id: getField(r, ["unique_id", "ids", "sr_no"]) || null,
            });
          }
        }

        if (inserts.length > 0) {
          // Reuse existing IDs by email
          const newIds = new Set<string>();
          for (const row of inserts) {
            const e = ((row as any).email || "").toLowerCase().trim();
            if (e && emailToId[e]) {
              (row as any).id = emailToId[e];
              newIds.add(emailToId[e]);
            }
          }

          const idsToKeep = Array.from(newIds);
          if (idsToKeep.length > 0) {
            const { error: delErr } = await supabase.from(table).delete().not("id", "in", `(${idsToKeep.join(",")})`);
            if (delErr) console.error("Delete stale rows error:", delErr.message);
          } else {
            await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
          }

          for (let i = 0; i < inserts.length; i += 500) {
            const batch = inserts.slice(i, i + 500);
            const { error } = await supabase.from(table).upsert(batch);
            if (error) throw new Error(`Upsert failed: ${error.message}`);
          }

          // Auto-whitelist any rep emails so they can sign in
          const emailPasswordMap: Record<string, string> = {};
          for (const row of inserts) {
            const e = (row.email as string) || "";
            const c = (row.contact as string) || "";
            if (e.includes("@")) emailPasswordMap[e] = c && c !== "direct" ? c : DEFAULT_PASSWORD;
          }
          await autoWhitelistEmails(supabaseUrl, supabaseServiceKey, emailPasswordMap);
        }

        await supabase
          .from("sheet_configs")
          .update({
            sync_status: "success",
            sync_error: null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);

        results.push({ id: config.id, status: "success", count: inserts.length });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        await supabase
          .from("sheet_configs")
          .update({
            sync_status: "error",
            sync_error: msg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);
        results.push({ id: config.id, status: "error", error: msg });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Sync error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

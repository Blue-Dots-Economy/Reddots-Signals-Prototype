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

  // Handle escaped newlines from env storage
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

  // 1) Try full JSON key
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed?.client_email && parsed?.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
        token_uri: parsed.token_uri || GOOGLE_TOKEN_URI,
      };
    }
  } catch {
    // noop
  }

  // 2) Try double-encoded JSON string
  try {
    const maybeString = JSON.parse(cleaned);
    if (typeof maybeString === "string") {
      const parsed = JSON.parse(maybeString);
      if (parsed?.client_email && parsed?.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          token_uri: parsed.token_uri || GOOGLE_TOKEN_URI,
        };
      }
    }
  } catch {
    // noop
  }

  // 3) Fallback: secret contains only private key
  const fallbackEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (fallbackEmail) {
    return {
      client_email: fallbackEmail,
      private_key: cleaned,
      token_uri: GOOGLE_TOKEN_URI,
    };
  }

  throw new Error(
    "Invalid GOOGLE_SERVICE_ACCOUNT_KEY. Provide full JSON key, or add GOOGLE_SERVICE_ACCOUNT_EMAIL when using private-key-only format."
  );
}

async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: sa.token_uri || GOOGLE_TOKEN_URI,
      exp: now + 3600,
      iat: now,
    })
  );

  const textEncoder = new TextEncoder();
  const signingInput = `${header}.${payload}`;

  // Import private key (supports full PEM or raw base64 PKCS8)
  const binaryKey = decodePrivateKey(sa.private_key);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    textEncoder.encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${payload}.${sig}`;

  const tokenRes = await fetch(sa.token_uri || GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Token exchange failed: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function fetchSheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1?majorDimension=ROWS`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets API error [${res.status}]: ${errText}`);
  }
  const data = await res.json();
  return data.values || [];
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/"/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getField(row: Record<string, string>, aliases: string[]): string {
  for (const key of aliases) {
    const v = row[normalizeKey(key)];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

const FALLBACK_LAT = 18.52;
const FALLBACK_LNG = 73.86;

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; resolved: boolean }> {
  if (!address.trim()) return { lat: FALLBACK_LAT, lng: FALLBACK_LNG, resolved: false };
  const query = address.includes("India") ? address : `${address}, India`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { "User-Agent": "YellowDots/1.0" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), resolved: true };
    }
    return { lat: FALLBACK_LAT, lng: FALLBACK_LNG, resolved: false };
  } catch {
    return { lat: FALLBACK_LAT, lng: FALLBACK_LNG, resolved: false };
  }
}

function jitterCoords(lat: number, lng: number): { lat: number; lng: number } {
  const offset = 0.002;
  return {
    lat: lat + (Math.random() - 0.5) * offset,
    lng: lng + (Math.random() - 0.5) * offset,
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_PASSWORD = "304567";

async function autoWhitelistEmails(
  supabaseUrl: string,
  supabaseServiceKey: string,
  emailPasswordMap: Record<string, string>
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
      // Try to create the user with their phone as password
      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email,
          password: userPassword,
          email_confirm: true,
        }),
      });

      // If user already exists, update their password to match current phone
      if (createRes.status === 422 || createRes.status === 409) {
        // Look up user by email using the admin API
        const findRes = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`,
          { method: "GET", headers }
        );
        if (findRes.ok) {
          const findBody = await findRes.json();
          const users = findBody.users || findBody;
          const existing = Array.isArray(users)
            ? users.find((u: any) => u.email?.toLowerCase() === email)
            : null;
          if (existing) {
            await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
              method: "PUT",
              headers,
              body: JSON.stringify({ password: userPassword }),
            });
          }
        }
      }
    } catch {
      // Ignore individual failures
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyRaw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");

    const sa = resolveServiceAccount(saKeyRaw);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read body first before any auth checks (stream can only be read once)
    let specificConfigId: string | null = null;
    try {
      const body = await req.json();
      specificConfigId = body.config_id || null;
    } catch {
      // No body or not JSON (e.g. cron trigger)
    }
    const accessToken = await getAccessToken(sa);

    // Get sheet configs to sync
    let query = supabase.from("sheet_configs").select("*");
    if (specificConfigId) {
      query = query.eq("id", specificConfigId);
    }
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
        // Mark as syncing
        await supabase
          .from("sheet_configs")
          .update({ sync_status: "syncing", updated_at: new Date().toISOString() })
          .eq("id", config.id);

        const rows = await fetchSheetData(accessToken, config.sheet_id);
        console.log(`Sheet ${config.sheet_id}: total rows = ${rows.length}`);
        if (rows.length > 0) {
          console.log(`Raw headers: ${JSON.stringify(rows[0])}`);
        }
        if (rows.length > 1) {
          console.log(`First data row: ${JSON.stringify(rows[1])}`);
        }
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
          headers.forEach((h, i) => {
            obj[h] = row[i]?.trim() || "";
          });
          return obj;
        });
        console.log(`Parsed ${dataRows.length} data rows`);

        const tableMap: Record<string, string> = {
          tutor: "tutor_dots",
          student: "student_dots",
          centre: "centre_dots",
          college: "college_dots",
          counsellor: "counsellor_dots",
        };
        const table = tableMap[config.dot_type] || "student_dots";

        // Fetch existing dots to preserve IDs for matching emails
        const { data: existingDots } = await supabase.from(table).select("id, email");
        const emailToId: Record<string, string> = {};
        const existingIds = new Set<string>();
        for (const dot of (existingDots || []) as any[]) {
          existingIds.add(dot.id);
          if (dot.email) emailToId[dot.email.toLowerCase().trim()] = dot.id;
        }

        const inserts = [];
        const seenEmails = new Set<string>();
        // Cache geocode results by area to avoid duplicate lookups
        const geocodeCache: Record<string, { lat: number; lng: number }> = {};

        let skippedCount = 0;
        for (const r of dataRows) {
          const isTutor = config.dot_type === "tutor";
          const isCentre = config.dot_type === "centre";
          const isCollege = config.dot_type === "college";
          const isCounsellor = config.dot_type === "counsellor";

          let name = "";
          if (isTutor) {
            name = getField(r, ["name", "tutor_name", "full_name", "full_name_pii", "rep_name", "rep_name_pii", "faculty_name", "mentor_name"]);
          } else if (isCentre) {
            name = getField(r, ["name", "centre_name", "center_name", "branch_name", "company_name", "rep_name", "rep_name_pii", "hiring_manager_name"]);
          } else if (isCollege) {
            name = getField(r, ["name", "college_name", "institution_name", "institute_name"]);
          } else if (isCounsellor) {
            name = getField(r, ["name", "counsellor_name", "counselor_name", "full_name", "full_name_pii"]);
          } else {
            name = getField(r, ["name", "student_name", "full_name", "full_name_pii"]);
          }
          const area = getField(r, ["area", "address", "location", "locality", "area_address", "pincode"]);
          const rawLat = Number(getField(r, ["lat", "latitude"]));
          const rawLng = Number(getField(r, ["lng", "longitude", "lon", "long"]));
          const email = (isTutor || isCentre || isCounsellor)
            ? getField(r, ["email", "email_id", "rep_email", "rep_email_pii", "email_pii"])
            : getField(r, ["email", "email_id", "email_pii"]);
          const phone = (isTutor || isCentre || isCounsellor)
            ? getField(r, ["contact", "phone", "phone_pii", "mobile", "mobile_pii", "phone_number", "phone_number_email", "company_hiring_manager_phone_number_email_id", "cell", "rep_phone", "rep_phone_pii"])
            : getField(r, ["contact", "phone", "phone_pii", "mobile", "mobile_pii", "phone_number", "phone_number_email", "cell"]);
          const grade = getField(r, ["grade", "grade_band", "grade_bands"]);
          const stream = getField(r, ["stream", "pillar", "category", "student_category", "academic_stream"]);
          const serviceType = getField(r, ["service_type", "needs", "service"]);
          const tutorSubject = getField(r, ["subject", "tutor_subject", "service_type", "academic_stream", "stream"]);

          if (!name || (!area && (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)))) {
            skippedCount++;
            if (skippedCount <= 3) {
              console.log(`Skipped row: name="${name}", area="${area}", lat=${rawLat}, lng=${rawLng}, keys=${Object.keys(r).join(",")}`);
            }
            continue;
          }

          let lat = rawLat;
          let lng = rawLng;

          // If no valid lat/lng from sheet, use jittered fallback (skip slow geocoding)
          if (!Number.isFinite(lat) || lat === 0 || !Number.isFinite(lng) || lng === 0) {
            const jittered = jitterCoords(FALLBACK_LAT, FALLBACK_LNG);
            lat = jittered.lat;
            lng = jittered.lng;
          }

          const normalizedEmail = email ? email.toLowerCase() : "";
          const safeEmail = normalizedEmail && !seenEmails.has(normalizedEmail) ? normalizedEmail : null;
          if (safeEmail) seenEmails.add(safeEmail);

          if (isTutor) {
            inserts.push({
              name,
              area: area || "Unknown",
              subject: tutorSubject || "mathematics",
              icon: getField(r, ["icon"]) || "book",
              lat,
              lng,
              contact: phone || "direct",
              email: safeEmail,
              experience: getField(r, ["experience", "years_of_experience"]) || null,
              price_range: getField(r, ["price_range", "price", "fees"]) || null,
              description: getField(r, ["description", "bio"]) || null,
              qualification: getField(r, ["qualification"]) || null,
              availability: getField(r, ["availability"]) || null,
              distance: getField(r, ["distance"]) || null,
              rating: getField(r, ["rating"]) || null,
              languages: getField(r, ["languages"]) || null,
              grade: getField(r, ["grade_bands", "grade_bands*", "grade", "grade_band"]) || null,
              stream: getField(r, ["academic_stream", "academic_stream*", "stream"]) || null,
            });
          } else if (isCentre) {
            inserts.push({
              name,
              area: area || "Unknown",
              icon: getField(r, ["icon"]) || "clipboard",
              lat,
              lng,
              contact: phone || "direct",
              email: safeEmail,
              description: getField(r, ["description", "bio"]) || null,
              address: getField(r, ["address", "full_address"]) || null,
              services: serviceType || getField(r, ["services"]) || null,
              availability: getField(r, ["availability", "grade_bands"]) || null,
              fees: getField(r, ["fees", "price", "price_range"]) || null,
              rating: getField(r, ["rating", "academic_stream"]) || null,
              distance: getField(r, ["distance", "coverage_radius", "coverage_radius_km"]) || null,
              hiring_manager_name: getField(r, ["hiring_manager_name"]) || null,
              called_by: getField(r, ["called_by"]) || null,
              requirement_of_portal: getField(r, ["requirement_of_portal"]) || null,
              internship: getField(r, ["internship"]) || null,
              openings: getField(r, ["openings"]) || null,
              nature_of_job: getField(r, ["nature_of_job"]) || null,
              job_role_salary: getField(r, ["job_role_salary_for_the_role", "job_role_salary"]) || null,
              type_of_candidate: getField(r, ["type_of_candidate"]) || null,
              min_qualification: getField(r, ["min_highest_qualification_or_skill", "min_qualification"]) || null,
              work_experience_years: getField(r, ["work_experience_years", "work_experience"]) || null,
              last_role_held: getField(r, ["name_of_last_role_held", "last_role_held"]) || null,
              remarks: getField(r, ["remarks"]) || null,
              unique_id: getField(r, ["unique_ids", "unique_id", "ids"]) || null,
            });
          } else if (isCollege) {
            inserts.push({
              name,
              area: area || "Unknown",
              icon: getField(r, ["icon"]) || "graduationCap",
              lat,
              lng,
              contact: phone || "direct",
              email: safeEmail,
              description: getField(r, ["description", "bio"]) || null,
              address: getField(r, ["address", "full_address"]) || null,
              programs: getField(r, ["programs", "courses", "services"]) || null,
              availability: getField(r, ["availability"]) || null,
              fees: getField(r, ["fees", "price"]) || null,
              rating: getField(r, ["rating"]) || null,
              distance: getField(r, ["distance"]) || null,
            });
          } else if (isCounsellor) {
            inserts.push({
              name,
              area: area || "Unknown",
              icon: getField(r, ["icon"]) || "compass",
              speciality: getField(r, ["speciality", "specialization", "specialty"]) || "general",
              lat,
              lng,
              contact: phone || "direct",
              email: safeEmail,
              description: getField(r, ["description", "bio"]) || null,
              qualification: getField(r, ["qualification", "academic_stream"]) || null,
              experience: getField(r, ["experience", "years_of_experience"]) || null,
              languages: getField(r, ["languages"]) || null,
              availability: getField(r, ["availability"]) || null,
              price_range: getField(r, ["price_range", "price", "fees"]) || null,
              rating: getField(r, ["rating"]) || null,
              distance: getField(r, ["distance"]) || null,
            });
          } else {
            inserts.push({
              name,
              area: area || "Unknown",
              pillar: serviceType || stream || "subject_tutoring",
              icon: getField(r, ["icon"]) || "graduationCap",
              category: getField(r, ["category"]) || "blue",
              lat,
              lng,
              contact: phone || "direct",
              email: safeEmail,
              description: getField(r, ["description"]) || null,
              education: stream || getField(r, ["education"]) || null,
              skills: getField(r, ["skills"]) || null,
              availability: getField(r, ["availability"]) || null,
              distance: getField(r, ["distance"]) || null,
              grade: grade || null,
              needs: serviceType || null,
              school_iti: getField(r, ["school_iti", "school", "iti"]) || null,
              mobile_device: getField(r, ["mobile_device"]) || null,
              age: getField(r, ["age"]) || null,
              gender: getField(r, ["gender"]) || null,
              work_experience: getField(r, ["work_experience"]) || null,
              highest_qualification: getField(r, ["highest_qualification_or_skill", "highest_qualification"]) || null,
              last_role: getField(r, ["name_of_last_role_held", "last_role"]) || null,
              jobs_interested_nature: getField(r, ["nature_of_jobs_interested_in", "jobs_interested_nature"]) || null,
              jobs_interested_role: getField(r, ["name_of_job_role_s_interested_in", "jobs_interested_role"]) || null,
              other_help: getField(r, ["other_help_needed", "other_help"]) || null,
              unique_id: getField(r, ["unique_ids", "unique_id", "sr_no", "ids"]) || null,
            });
          }
        }

        if (inserts.length > 0) {
          // Assign existing IDs to rows that match by email, so UUIDs are preserved
          const newIds = new Set<string>();
          for (const row of inserts) {
            const e = ((row as any).email || "").toLowerCase().trim();
            if (e && emailToId[e]) {
              (row as any).id = emailToId[e];
              newIds.add(emailToId[e]);
            }
          }

          // Delete only rows whose email is NOT in the new dataset
          const idsToKeep = Array.from(newIds);
          // Delete in batches to avoid query-length issues
          if (idsToKeep.length > 0) {
            // Delete rows not in the new set
            const { error: delErr } = await supabase.from(table).delete().not("id", "in", `(${idsToKeep.join(",")})`);
            if (delErr) console.error("Delete stale rows error:", delErr.message);
          } else {
            await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
          }

          // Upsert in batches of 500 (preserves existing IDs, inserts new rows)
          for (let i = 0; i < inserts.length; i += 500) {
            const batch = inserts.slice(i, i + 500);
            const { error } = await supabase.from(table).upsert(batch);
            if (error) throw new Error(`Upsert failed: ${error.message}`);
          }

          // Auto-whitelist: create auth users with their phone as password
          const emailPasswordMap: Record<string, string> = {};
          for (const row of inserts) {
            const e = (row.email as string) || "";
            const c = (row.contact as string) || "";
            if (e.includes("@")) {
              emailPasswordMap[e] = c && c !== "direct" ? c : DEFAULT_PASSWORD;
            }
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

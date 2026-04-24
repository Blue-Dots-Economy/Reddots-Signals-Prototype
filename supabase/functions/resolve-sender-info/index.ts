import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_ids, persona } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ data: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get emails for the user IDs from auth.users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (usersError) throw usersError;

    const userIdToEmail: Record<string, string> = {};
    for (const u of users.users) {
      if (user_ids.includes(u.id) && u.email) {
        userIdToEmail[u.id] = u.email;
      }
    }

    // Determine which tables to search based on persona, or search all
    const tables = persona
      ? [persona === "student" ? "student_dots" : persona === "tutor" ? "tutor_dots" : persona === "cl_centre" ? "centre_dots" : persona === "hei" ? "college_dots" : "student_dots"]
      : ["student_dots", "tutor_dots", "counsellor_dots", "centre_dots", "college_dots"];

    const emails = Object.values(userIdToEmail);
    if (emails.length === 0) {
      return new Response(JSON.stringify({ data: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: Record<string, { name: string; email?: string; contact?: string; area?: string }> = {};

    for (const table of tables) {
      const { data: dots } = await supabaseAdmin
        .from(table)
        .select("name, email, contact, area")
        .in("email", emails);

      if (dots) {
        for (const dot of dots) {
          // Find the user_id for this email
          const userId = Object.entries(userIdToEmail).find(([, e]) => e === dot.email)?.[0];
          if (userId && !result[userId]) {
            result[userId] = {
              name: dot.name,
              email: dot.email || undefined,
              contact: dot.contact && dot.contact !== "direct" ? dot.contact : undefined,
              area: dot.area || undefined,
            };
          }
        }
      }
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

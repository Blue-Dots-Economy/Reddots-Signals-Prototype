import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = data.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Fetch all users (exclude admin)
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const users = (authUsers?.users || []).filter(u => u.email !== "admin@yellowdots.com");

    // Fetch all connections
    const { data: connections } = await supabaseAdmin
      .from("connections")
      .select("from_user_id, to_user_id, status, to_dot_id, to_persona, created_at");

    // Fetch all filter logs
    const { data: filterLogs } = await supabaseAdmin
      .from("filter_usage_logs")
      .select("user_id, filter_value");

    // Aggregate per user
    const userActivity = users.map(u => {
      const sentConnections = (connections || []).filter(c => c.from_user_id === u.id);
      const userFilters = (filterLogs || []).filter(f => f.user_id === u.id);

      const shortlisted = sentConnections.length;
      const contacted = sentConnections.filter(
        c => c.status === "accepted"
      ).length;

      // Top filters
      const filterCounts: Record<string, number> = {};
      userFilters.forEach(f => {
        filterCounts[f.filter_value] = (filterCounts[f.filter_value] || 0) + 1;
      });
      const topFilters = Object.entries(filterCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Connection target dot IDs
      const studentNames = sentConnections.map(c => c.to_dot_id || "unknown");

      return {
        user_id: u.id,
        email: u.email,
        shortlisted,
        contacted,
        topFilters,
        studentNames,
        lastActive: u.last_sign_in_at || u.created_at,
      };
    });

    return new Response(JSON.stringify({ users: userActivity }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

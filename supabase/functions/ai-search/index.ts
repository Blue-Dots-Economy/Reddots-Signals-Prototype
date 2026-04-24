import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, dots } = await req.json();

    if (!query || !dots) {
      return new Response(
        JSON.stringify({ error: "Missing query or dots" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a compact version of dots for the prompt (only relevant fields)
    const compactDots = dots.map((d: any) => ({
      id: d.id,
      name: d.name,
      pillar: d.pillar,
      area: d.area,
      skills: d.skills,
      offers: d.offers,
      terms: d.terms,
      relevance: d.relevance,
      description: d.description,
      businessType: d.businessType,
      status: d.status,
    }));

    const systemPrompt = `You are a map search assistant for a Ghaziabad MSME ecosystem map.
The map has dots representing workers, businesses, banks, suppliers, government offices, and consultants.

Each dot has these pillars: market, credit, talent, suppliers, schemes, service_provider.

When interpreting user queries:
- "I need workers with X skills" → return talent pillar dots where skills/description mention related terms
- "I need help with tax filing" or "GST" → return dots where offers/description mention GST, ITR, tax, CA, compliance
- "ODOP scheme" or any scheme name → return dots where offers/relevance/description mention the scheme
- "I need a bank loan" or "credit" → return credit pillar dots
- "copper supplier" or material queries → return supplier dots related to that material
- "find me a welder" → return talent dots with welding skills
- Be generous in matching — include related/similar terms
- If the query is very vague, return the most plausible matches (up to 20 dots)
- If nothing matches at all, return an empty array

Return ONLY a valid JSON array of dot IDs. No explanation. No markdown. Just the JSON array like: ["id-1", "id-2"]`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `User query: "${query}"\n\nDot dataset:\n${JSON.stringify(compactDots)}`,
            },
          ],
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "[]";

    // Parse the JSON array from the response, handling potential markdown wrapping
    let matchedIds: string[] = [];
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      matchedIds = JSON.parse(cleaned);
      if (!Array.isArray(matchedIds)) matchedIds = [];
    } catch {
      console.error("Failed to parse AI response:", content);
      matchedIds = [];
    }

    return new Response(
      JSON.stringify({ matchedIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

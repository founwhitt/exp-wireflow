import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get outstanding wires
    const { data: owWires, error: owErr } = await supabase
      .from("outstanding_wires")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (owErr) throw owErr;

    // Get expected wires (non-deleted, non-reconciled)
    const { data: expectedWires, error: ewErr } = await supabase
      .from("wire_records")
      .select("*")
      .eq("is_deleted", false)
      .in("status", ["Pending", "Sent"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (ewErr) throw ewErr;

    if (!owWires?.length || !expectedWires?.length) {
      return new Response(JSON.stringify({ matches: [], message: "No data to match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build concise data summaries for AI
    const owSummary = owWires.map((w: any) => ({
      id: w.id,
      amount: w.amount,
      date: w.wiring_date,
      receipt: w.receipt_number,
      invoice: w.invoice_number,
      description: w.description,
      account: w.wf_account,
      category: w.category,
    }));

    const ewSummary = expectedWires.map((w: any) => ({
      id: w.id,
      tid: w.tid,
      balance_due: w.balance_due,
      wiring_date: w.wiring_date,
      customer_name: w.customer_name,
      property_address: w.property_address,
      agent_name: w.agent_name,
      account: w.wf_account,
      status: w.status,
    }));

    const prompt = `You are a wire reconciliation assistant. Match outstanding bank wires to expected wire records.

OUTSTANDING WIRES (unidentified bank entries):
${JSON.stringify(owSummary)}

EXPECTED WIRES (pending/sent wire records):
${JSON.stringify(ewSummary)}

Match rules:
1. Amount match: Outstanding wire "amount" should be close to expected wire "balance_due" (within 5% or $50)
2. Date match: Dates within 7 days of each other are a potential match
3. Receipt/Invoice: If receipt_number or invoice_number contains a TID, that's a strong match
4. Account: Same wf_account increases confidence
5. Description may contain customer name or property address clues

Return matches with confidence scores.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a financial reconciliation AI. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_matches",
              description: "Report potential matches between outstanding and expected wires",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        outstanding_wire_id: { type: "string", description: "ID of the outstanding wire" },
                        expected_wire_id: { type: "string", description: "ID of the expected wire record" },
                        expected_wire_tid: { type: "string", description: "TID of the expected wire" },
                        confidence: { type: "number", description: "Match confidence 0-100" },
                        reason: { type: "string", description: "Brief explanation of why this is a match" },
                      },
                      required: ["outstanding_wire_id", "expected_wire_id", "expected_wire_tid", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_matches" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let matches: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        matches = parsed.matches || [];
      } catch {
        console.error("Failed to parse AI response");
      }
    }

    // Sort by confidence descending
    matches.sort((a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0));

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-match-wires error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

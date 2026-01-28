import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { domain, serviceName, detectedAt, source } = body;

    if (!domain) {
      return new Response(
        JSON.stringify({ error: "Domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if account already exists for this user
    const { data: existing } = await supabase
      .from("discovered_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("domain", domain)
      .single();

    if (existing) {
      // Update last_activity for existing account
      await supabase
        .from("discovered_accounts")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", existing.id);

      return new Response(
        JSON.stringify({ message: "Account already exists", accountId: existing.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Categorize the service
    const category = categorizeService(domain, serviceName);
    const riskScore = assessRisk(domain, category);

    // Insert new account
    const { data: account, error: insertError } = await supabase
      .from("discovered_accounts")
      .insert({
        user_id: user.id,
        service_name: serviceName || extractServiceName(domain),
        domain,
        category,
        risk_score: riskScore,
        source: source || "extension",
        first_seen: detectedAt || new Date().toISOString(),
        metadata: { detected_via: "browser_extension" }
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user metrics
    const { data: metrics } = await supabase
      .from("user_metrics")
      .select("accounts_discovered_count, extension_installed")
      .eq("user_id", user.id)
      .single();

    await supabase
      .from("user_metrics")
      .update({
        accounts_discovered_count: (metrics?.accounts_discovered_count || 0) + 1,
        extension_installed: true,
        last_active_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, account }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Extension sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function categorizeService(domain: string, serviceName?: string): string {
  const combined = `${domain} ${serviceName || ""}`.toLowerCase();
  
  const categories: Record<string, string[]> = {
    social: ["facebook", "twitter", "instagram", "linkedin", "tiktok", "snapchat", "reddit", "discord", "telegram"],
    finance: ["bank", "paypal", "stripe", "venmo", "cashapp", "coinbase", "robinhood", "wise", "revolut"],
    shopping: ["amazon", "ebay", "etsy", "shopify", "walmart", "target", "alibaba", "wish"],
    saas: ["slack", "notion", "trello", "asana", "figma", "canva", "dropbox", "zoom", "github", "gitlab"]
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => combined.includes(kw))) {
      return category;
    }
  }

  return "other";
}

function assessRisk(domain: string, category: string): string {
  // Finance and unknown services get higher risk
  if (category === "finance") return "high";
  if (category === "other") return "medium";
  return "low";
}

function extractServiceName(domain: string): string {
  const parts = domain.replace("www.", "").split(".");
  if (parts.length >= 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return domain;
}

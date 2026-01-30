import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Known service domains for categorization
const serviceDomains: Record<string, { category: string; name: string }> = {
  "facebook.com": { category: "social", name: "Facebook" },
  "twitter.com": { category: "social", name: "Twitter" },
  "instagram.com": { category: "social", name: "Instagram" },
  "linkedin.com": { category: "social", name: "LinkedIn" },
  "tiktok.com": { category: "social", name: "TikTok" },
  "amazon.com": { category: "shopping", name: "Amazon" },
  "ebay.com": { category: "shopping", name: "eBay" },
  "etsy.com": { category: "shopping", name: "Etsy" },
  "shopify.com": { category: "shopping", name: "Shopify" },
  "stripe.com": { category: "finance", name: "Stripe" },
  "paypal.com": { category: "finance", name: "PayPal" },
  "venmo.com": { category: "finance", name: "Venmo" },
  "coinbase.com": { category: "finance", name: "Coinbase" },
  "github.com": { category: "saas", name: "GitHub" },
  "gitlab.com": { category: "saas", name: "GitLab" },
  "notion.so": { category: "saas", name: "Notion" },
  "slack.com": { category: "saas", name: "Slack" },
  "figma.com": { category: "saas", name: "Figma" },
  "dropbox.com": { category: "saas", name: "Dropbox" },
  "spotify.com": { category: "other", name: "Spotify" },
  "netflix.com": { category: "other", name: "Netflix" },
  "uber.com": { category: "other", name: "Uber" },
  "doordash.com": { category: "other", name: "DoorDash" },
};

function extractDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (!match) return null;
  
  // Get the main domain (e.g., noreply@mail.spotify.com -> spotify.com)
  const parts = match[1].split(".");
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }
  return match[1];
}

function categorizeService(domain: string): { category: string; name: string } {
  const known = serviceDomains[domain];
  if (known) return known;
  
  // Default categorization based on domain patterns
  const name = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
  return { category: "other", name };
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  return data.access_token || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;

    // Get OAuth tokens using service role
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: tokenData, error: tokenError } = await adminClient
      .from("oauth_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Gmail not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenData.encrypted_access_token;

    // Check if token is expired and refresh if needed
    if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
      if (tokenData.encrypted_refresh_token) {
        const newToken = await refreshAccessToken(tokenData.encrypted_refresh_token);
        if (newToken) {
          accessToken = newToken;
          await adminClient
            .from("oauth_tokens")
            .update({
              encrypted_access_token: newToken,
              token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
            })
            .eq("id", tokenData.id);
        }
      }
    }

    // Fetch emails from Gmail
    // Search for typical registration/signup emails
    const query = "subject:(welcome OR verify OR confirm OR registration OR activate)";
    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10000000&q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const messagesData = await messagesResponse.json();

    if (messagesData.error) {
      console.error("Gmail API error:", messagesData.error);
      return new Response(JSON.stringify({ error: "Failed to fetch emails" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = messagesData.messages || [];
    const discoveredServices = new Map<string, { domain: string; name: string; category: string; firstSeen: Date }>();

    // Process messages to extract sender domains
    for (const message of messages.slice(0, 50)) {
      try {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const msgData = await msgResponse.json();
        const headers = msgData.payload?.headers || [];
        
        const fromHeader = headers.find((h: any) => h.name === "From")?.value || "";
        const dateHeader = headers.find((h: any) => h.name === "Date")?.value;
        
        const domain = extractDomain(fromHeader);
        if (domain && !discoveredServices.has(domain)) {
          const { category, name } = categorizeService(domain);
          discoveredServices.set(domain, {
            domain,
            name,
            category,
            firstSeen: dateHeader ? new Date(dateHeader) : new Date(),
          });
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    }

    // Get existing accounts to avoid duplicates
    const { data: existingAccounts } = await adminClient
      .from("discovered_accounts")
      .select("domain")
      .eq("user_id", userId);

    const existingDomains = new Set(existingAccounts?.map((a) => a.domain) || []);

    // Insert new discovered accounts
    const newAccounts = [];
    for (const [domain, service] of discoveredServices) {
      if (!existingDomains.has(domain)) {
        newAccounts.push({
          user_id: userId,
          service_name: service.name,
          domain: service.domain,
          category: service.category,
          first_seen: service.firstSeen.toISOString(),
          last_activity: new Date().toISOString(),
          risk_score: "low",
          source: "gmail_scan",
        });
      }
    }

    if (newAccounts.length > 0) {
      const { error: insertError } = await adminClient
        .from("discovered_accounts")
        .insert(newAccounts);

      if (insertError) {
        console.error("Insert error:", insertError);
      }

      // Update metrics
      const { data: currentMetrics } = await adminClient
        .from("user_metrics")
        .select("accounts_discovered_count")
        .eq("user_id", userId)
        .single();

      await adminClient
        .from("user_metrics")
        .update({
          accounts_discovered_count: (currentMetrics?.accounts_discovered_count || 0) + newAccounts.length,
          last_active_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        discovered: newAccounts.length,
        total_scanned: messages.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Gmail scan error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

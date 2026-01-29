import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Handle OAuth callback - Google redirects to base URL, we detect callback by presence of 'code' param
    if (url.searchParams.has("code")) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) {
        return new Response(JSON.stringify({ error: "Missing code or state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode state to get user_id and redirect_uri
      const stateData = JSON.parse(atob(state));
      const { user_id, redirect_uri } = stateData;

      // Exchange code for tokens - redirect_uri must match exactly what's in Google Console (no query params)
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: `${SUPABASE_URL}/functions/v1/gmail-auth`,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error("Token exchange error:", tokens);
        return Response.redirect(`${redirect_uri}?error=token_exchange_failed`);
      }

      // Store tokens in database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Check if token already exists for this user
      const { data: existingToken } = await supabase
        .from("oauth_tokens")
        .select("id")
        .eq("user_id", user_id)
        .eq("provider", "gmail")
        .maybeSingle();

      const tokenData = {
        user_id,
        provider: "gmail",
        encrypted_access_token: tokens.access_token,
        encrypted_refresh_token: tokens.refresh_token || null,
        token_expiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes: tokens.scope ? tokens.scope.split(" ") : null,
      };

      if (existingToken) {
        await supabase
          .from("oauth_tokens")
          .update(tokenData)
          .eq("id", existingToken.id);
      } else {
        await supabase.from("oauth_tokens").insert(tokenData);
      }

      // Update user metrics
      await supabase
        .from("user_metrics")
        .update({ gmail_connected: true })
        .eq("user_id", user_id);

      // Redirect back to app
      return Response.redirect(`${redirect_uri}?gmail_connected=true`);
    }

    // Handle initiating OAuth flow
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
    const body = await req.json();
    const redirectUri = body.redirect_uri;

    // Create state with user info
    const state = btoa(JSON.stringify({ user_id: userId, redirect_uri: redirectUri }));

    // Build Google OAuth URL - redirect_uri must NOT have query params to match Google Console config
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set(
      "redirect_uri",
      `${SUPABASE_URL}/functions/v1/gmail-auth`
    );
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/gmail.readonly"
    );
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "consent");
    googleAuthUrl.searchParams.set("state", state);

    return new Response(JSON.stringify({ auth_url: googleAuthUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gmail auth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

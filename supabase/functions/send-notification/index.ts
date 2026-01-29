import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NotificationRequest {
  type: "action_completed" | "high_risk_discovered" | "new_account";
  user_id: string;
  data: {
    service_name?: string;
    action_type?: string;
    risk_score?: string;
    count?: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const body: NotificationRequest = await req.json();
    const { type, user_id, data } = body;

    if (!type || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);

    if (userError || !userData.user?.email) {
      console.error("Failed to get user email:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "action_completed":
        subject = `✅ ${data.action_type === "deletion" ? "Deletion" : "Revocation"} Request Completed - ${data.service_name}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a2e; margin: 0;">FixSense</h1>
              <p style="color: #666; margin-top: 5px;">Account Privacy Manager</p>
            </div>
            <div style="background: #f8faf9; border-radius: 12px; padding: 24px; border-left: 4px solid #22c55e;">
              <h2 style="color: #1a1a2e; margin: 0 0 16px;">Action Completed</h2>
              <p style="color: #333; line-height: 1.6;">
                Your <strong>${data.action_type === "deletion" ? "deletion" : "access revocation"}</strong> request for 
                <strong>${data.service_name}</strong> has been marked as completed.
              </p>
              <p style="color: #666; font-size: 14px;">
                This action was tracked in FixSense. You can view your full action history in your dashboard.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://fixsense.app/dashboard" style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                View Dashboard
              </a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
              You're receiving this email because you have email notifications enabled in FixSense.
            </p>
          </div>
        `;
        break;

      case "high_risk_discovered":
        subject = `⚠️ High-Risk Account Discovered - ${data.service_name}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a2e; margin: 0;">FixSense</h1>
              <p style="color: #666; margin-top: 5px;">Account Privacy Manager</p>
            </div>
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; border-left: 4px solid #ef4444;">
              <h2 style="color: #1a1a2e; margin: 0 0 16px;">⚠️ Security Alert</h2>
              <p style="color: #333; line-height: 1.6;">
                We discovered a <strong style="color: #ef4444;">high-risk account</strong> in your digital footprint:
              </p>
              <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: 600;">${data.service_name}</p>
                <p style="margin: 4px 0 0; color: #ef4444; font-size: 14px;">Risk Level: High</p>
              </div>
              <p style="color: #666; font-size: 14px;">
                High-risk accounts may have access to sensitive data. We recommend reviewing this account and considering deletion or access revocation.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://fixsense.app/dashboard" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Review Account
              </a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
              You're receiving this email because you have security alerts enabled in FixSense.
            </p>
          </div>
        `;
        break;

      case "new_account":
        subject = `📬 New Accounts Discovered - FixSense`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a2e; margin: 0;">FixSense</h1>
              <p style="color: #666; margin-top: 5px;">Account Privacy Manager</p>
            </div>
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; border-left: 4px solid #0ea5e9;">
              <h2 style="color: #1a1a2e; margin: 0 0 16px;">New Accounts Found</h2>
              <p style="color: #333; line-height: 1.6;">
                We discovered <strong>${data.count || 1} new account${(data.count || 1) > 1 ? 's' : ''}</strong> in your digital footprint.
              </p>
              <p style="color: #666; font-size: 14px;">
                Review these accounts in your dashboard to decide if you want to keep them or take action.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://fixsense.app/dashboard" style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                View Dashboard
              </a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
              You're receiving this email because you have email notifications enabled in FixSense.
            </p>
          </div>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Unknown notification type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Send email via Resend
    // Note: Replace 'noreply@your-verified-domain.com' with your verified Resend domain
    const emailResponse = await resend.emails.send({
      from: "FixSense <noreply@updates.fixsense.app>",
      to: [userEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, id: emailResponse.data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

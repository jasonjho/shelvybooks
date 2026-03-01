import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MysteryBookNotificationRequest {
  mysteryBookId: string;
  recipientUserId: string;
  senderUsername: string;
  moodTag: string;
  teaser: string;
  emojiClue: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mysteryBookId, recipientUserId, senderUsername, moodTag, teaser, emojiClue }: MysteryBookNotificationRequest = await req.json();

    if (!senderUsername || !moodTag || !teaser || !emojiClue) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient email
    let recipientEmail: string | undefined;

    if (recipientUserId) {
      const { data: recipientUser, error: recipientError } = await supabaseAdmin.auth.admin.getUserById(recipientUserId);

      if (recipientError || !recipientUser?.user?.email) {
        console.log("Could not find recipient email for user:", recipientUserId);
        return new Response(
          JSON.stringify({ success: true, emailSent: false, reason: "No email found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      recipientEmail = recipientUser.user.email;
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "No recipient email provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = mysteryBookId
      ? `https://shelvybooks.com/?mystery=${mysteryBookId}`
      : "https://shelvybooks.com";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 520px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
  <p style="margin: 0 0 32px 0; font-size: 14px; color: #8b7355; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Shelvy</p>

  <h2 style="color: #1a1a1a; margin: 0 0 8px 0; font-weight: 600; font-size: 20px;">A mystery book awaits</h2>

  <p style="margin: 0 0 28px 0; font-size: 15px; color: #555;">
    <strong>${senderUsername}</strong> wrapped a book just for you.
  </p>

  <div style="border-left: 3px solid #d4a373; padding: 16px 20px; margin: 0 0 28px 0; background: #faf8f5; border-radius: 0 6px 6px 0;">
    <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; color: #8b7355; font-weight: 600;">${moodTag}</p>
    <p style="margin: 0; font-size: 15px; color: #333; font-style: italic;">"${teaser}"</p>
  </div>

  <p style="margin: 0 0 28px 0; font-size: 15px; color: #555;">
    Head to Shelvy to unwrap it and see what's inside.
  </p>

  <a href="${appUrl}" style="background: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 14px;">Unwrap your book</a>

  <p style="margin: 40px 0 0 0; font-size: 13px; color: #999;">
    — The Shelvy Team
  </p>
</body>
</html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shelvy <noreply@shelvybooks.com>",
        to: [recipientEmail],
        subject: `${senderUsername} wrapped a book just for you...`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ success: true, emailSent: false, reason: "Email API error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailData = await emailResponse.json();
    console.log("Mystery book email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailSent: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-mystery-book function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

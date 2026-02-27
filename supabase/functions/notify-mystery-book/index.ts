import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MysteryBookNotificationRequest {
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

    const { recipientUserId, senderUsername, moodTag, teaser, emojiClue }: MysteryBookNotificationRequest = await req.json();

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

    const appUrl = "https://shelvy-books.lovable.app";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 32px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">${emojiClue}</div>
          <h2 style="color: #78350f; margin: 0 0 8px 0; font-weight: 700; font-size: 22px;">
            ${senderUsername} wrapped a book just for you...
          </h2>
          <div style="background: #ffffff; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #92400e; font-weight: 600;">
              ${moodTag}
            </p>
            <p style="margin: 0; font-size: 16px; color: #374151; font-style: italic;">
              "${teaser}"
            </p>
          </div>
          <p style="margin: 16px 0 24px 0; font-size: 15px; color: #78350f;">
            A mystery book is waiting for you. Unwrap it to find out what it is!
          </p>
          <a href="${appUrl}" style="background: #78350f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">
            Unwrap your book
          </a>
        </div>
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

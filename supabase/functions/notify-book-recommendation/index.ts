import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RecommendationRequest {
  recipientUserId: string;
  senderUsername: string;
  bookTitle: string;
  bookAuthor: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    const { recipientUserId, recipientEmail: directEmail, senderUsername, bookTitle, bookAuthor, message }: RecommendationRequest & { recipientEmail?: string } = await req.json();

    // Validate required fields
    if (!senderUsername || !bookTitle || !bookAuthor) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient email - either from direct param (for testing) or lookup by userId
    let recipientEmail = directEmail;
    
    if (!recipientEmail && recipientUserId) {
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
    
    // Build the email HTML using the familiar template style
    const personalNote = message 
      ? `<p style="margin: 16px 0 24px 0; font-size: 15px; color: #6b7280; font-style: italic; border-left: 3px solid #d4a373; padding-left: 12px;">"${message}"</p>`
      : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="background: #fef9e7; border-radius: 12px; padding: 32px;">
          <h2 style="color: #78350f; margin: 0 0 20px 0; font-weight: 700; font-size: 24px;">📚 New Book Recommendation!</h2>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
            <strong style="color: #78350f;">${senderUsername}</strong> thinks you'd love this book:
          </p>
          <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin: 0 0 16px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${bookTitle}</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">by ${bookAuthor}</p>
          </div>
          ${personalNote}
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151;">
            Open Shelvy to accept or decline this recommendation!
          </p>
          <a href="${appUrl}" style="background: #78350f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">View Recommendation</a>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shelvy <noreply@shelvybooks.com>",
        to: [recipientEmail],
        subject: `${senderUsername} recommended "${bookTitle}" for you!`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      // Don't fail the whole request - recommendation was created, just email failed
      return new Response(
        JSON.stringify({ success: true, emailSent: false, reason: "Email API error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailData = await emailResponse.json();
    console.log("Recommendation email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailSent: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-book-recommendation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

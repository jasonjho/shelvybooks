import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  recipientEmail: string;
  senderName: string;
  shelfUrl?: string;
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

    const { recipientEmail, senderName, shelfUrl }: InviteRequest = await req.json();

    // Validate required fields
    if (!recipientEmail || !senderName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the recipient already has an account
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === recipientEmail.toLowerCase()
    );

    const appUrl = "https://shelvy-books.lovable.app";
    let emailHtml: string;
    let emailSubject: string;
    
    if (existingUser) {
      // User already exists - send "wants to connect" email
      emailSubject = `${senderName} wants to connect with you on Shelvy!`;
      
      const ctaUrl = shelfUrl || appUrl;
      const ctaText = shelfUrl ? `View ${senderName}'s Shelf` : "Open Shelvy";

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="background: #fef9e7; border-radius: 12px; padding: 32px;">
            <h2 style="color: #78350f; margin: 0 0 20px 0; font-weight: 700; font-size: 24px;">Hey there! 👋</h2>
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;"><strong style="color: #78350f;">${senderName}</strong> wants to connect with you on Shelvy! They thought you'd enjoy checking out their bookshelf and sharing reading recommendations.</p>
            <a href="${ctaUrl}" style="background: #78350f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">${ctaText}</a>
          </div>
        </body>
        </html>
      `;
    } else {
      // New user - send invite to join email
      emailSubject = `${senderName} invited you to join Shelvy!`;
      
      const ctaUrl = shelfUrl || appUrl;
      const ctaText = shelfUrl ? `View ${senderName}'s Shelf` : "Start Your Shelf";

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="background: #fef9e7; border-radius: 12px; padding: 32px;">
            <h2 style="color: #78350f; margin: 0 0 20px 0; font-weight: 700; font-size: 24px;">Hey there! 👋</h2>
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;"><strong style="color: #78350f;">${senderName}</strong> thinks you'd love Shelvy — a beautiful way to track your reading journey, organize your books, and discover new favorites.</p>
            <a href="${ctaUrl}" style="background: #78350f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">${ctaText}</a>
          </div>
        </body>
        </html>
      `;
    }

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
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData, "isExistingUser:", !!existingUser);

    return new Response(
      JSON.stringify({ 
        success: true, 
        isExistingUser: !!existingUser 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

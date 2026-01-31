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
      
      const shelfLink = shelfUrl 
        ? `<p style="margin: 20px 0;"><a href="${shelfUrl}" style="background: linear-gradient(to right, #b45309, #92400e); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View ${senderName}'s Shelf</a></p>` 
        : "";

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #92400e; font-size: 28px; margin: 0;">📚 Shelvy</h1>
            <p style="color: #6b7280; margin: 5px 0;">Your personal bookshelf, beautifully organized</p>
          </div>
          
          <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #92400e; margin-top: 0;">Hey there! 👋</h2>
            <p><strong>${senderName}</strong> wants to connect with you on Shelvy! They thought you'd enjoy checking out their bookshelf and sharing reading recommendations.</p>
            ${shelfLink}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" style="background: linear-gradient(to right, #b45309, #92400e); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Open Shelvy</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Use the <strong>Find Friends</strong> feature to find and follow ${senderName} back!
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 40px;">
            You received this email because ${senderName} wants to connect with you on Shelvy.
          </p>
        </body>
        </html>
      `;
    } else {
      // New user - send invite to join email
      emailSubject = `${senderName} invited you to join Shelvy!`;
      
      const shelfLink = shelfUrl 
        ? `<p style="margin: 20px 0;"><a href="${shelfUrl}" style="background: linear-gradient(to right, #b45309, #92400e); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View ${senderName}'s Shelf</a></p>` 
        : "";

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #92400e; font-size: 28px; margin: 0;">📚 Shelvy</h1>
            <p style="color: #6b7280; margin: 5px 0;">Your personal bookshelf, beautifully organized</p>
          </div>
          
          <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #92400e; margin-top: 0;">Hey there! 👋</h2>
            <p><strong>${senderName}</strong> thinks you'd love Shelvy — a beautiful way to track your reading journey, organize your books, and discover new favorites.</p>
            ${shelfLink}
          </div>
          
          <div style="margin-bottom: 24px;">
            <h3 style="color: #1f2937;">What you can do with Shelvy:</h3>
            <ul style="padding-left: 20px;">
              <li>📖 Track what you're reading, want to read, and have read</li>
              <li>🎨 Display your books on a beautiful virtual bookshelf</li>
              <li>👥 Join Book Clubs with friends</li>
              <li>✨ Get personalized recommendations</li>
              <li>🔗 Share your shelf with others</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" style="background: linear-gradient(to right, #b45309, #92400e); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Start Your Shelf</a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 40px;">
            You received this email because ${senderName} invited you to join Shelvy.
          </p>
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

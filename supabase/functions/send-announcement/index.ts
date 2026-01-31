import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnnouncementRequest {
  testEmail?: string; // If provided, only send to this email
  sendToAll?: boolean; // If true, send to all users with shelves
}

const getEmailHtml = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="background: #fef9e7; border-radius: 12px; padding: 32px;">
    <h2 style="color: #78350f; margin: 0 0 20px 0; font-weight: 700; font-size: 24px;">New on Shelvy! ✨</h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
      We've been busy making Shelvy even better for you. Here's what's new:
    </p>
    
    <div style="margin: 0 0 24px 0;">
      <div style="margin-bottom: 16px;">
        <strong style="color: #78350f;">🎨 Cleaner UI & Mobile Support</strong>
        <p style="margin: 4px 0 0 0; font-size: 15px; color: #4b5563;">
          A tidier, more polished look that works beautifully on your phone.
        </p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong style="color: #78350f;">👋 Find & Invite Friends</strong>
        <p style="margin: 4px 0 0 0; font-size: 15px; color: #4b5563;">
          Search for friends on Shelvy or invite new ones to join and share reading recommendations.
        </p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong style="color: #78350f;">🏷️ Genre Filters</strong>
        <p style="margin: 4px 0 0 0; font-size: 15px; color: #4b5563;">
          Easily filter your shelf by genre to find exactly what you're looking for.
        </p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong style="color: #78350f;">📝 Staff Pick Notes</strong>
        <p style="margin: 4px 0 0 0; font-size: 15px; color: #4b5563;">
          Add personal recommendation notes to your favorite books — displayed as cute post-it notes on your shelf.
        </p>
      </div>
    </div>
    
    <a href="https://shelvy-books.lovable.app" style="background: #78350f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">Check It Out</a>
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      Happy reading! 📖<br>
      — The Shelvy Team
    </p>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
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

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { testEmail, sendToAll }: AnnouncementRequest = await req.json();

    const emailHtml = getEmailHtml();
    const emailSubject = "New on Shelvy: Find Friends, Genre Filters & More! 📚";

    if (testEmail) {
      // Send test email
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Shelvy <noreply@shelvybooks.com>",
          to: [testEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        console.error("Resend API error:", errorData);
        throw new Error("Failed to send test email");
      }

      const emailData = await emailResponse.json();
      console.log("Test email sent:", emailData);

      return new Response(
        JSON.stringify({ success: true, message: `Test email sent to ${testEmail}` }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (sendToAll) {
      // Get all users with shelf_settings (meaning they have set up a shelf)
      const { data: shelfUsers, error: shelfError } = await supabaseAdmin
        .from('shelf_settings')
        .select('user_id');

      if (shelfError) {
        throw new Error(`Failed to fetch shelf users: ${shelfError.message}`);
      }

      if (!shelfUsers || shelfUsers.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No users with shelves found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get emails for these users
      const userIds = shelfUsers.map(s => s.user_id);
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      
      const targetEmails = authUsers?.users
        ?.filter(u => userIds.includes(u.id) && u.email)
        .map(u => u.email!) || [];

      if (targetEmails.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No valid emails found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Send emails in batches of 50 (Resend limit)
      const batchSize = 50;
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < targetEmails.length; i += batchSize) {
        const batch = targetEmails.slice(i, i + batchSize);
        
        // Send to each email individually (Resend doesn't support bulk BCC well)
        for (const email of batch) {
          try {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Shelvy <noreply@shelvybooks.com>",
                to: [email],
                subject: emailSubject,
                html: emailHtml,
              }),
            });

            if (emailResponse.ok) {
              sentCount++;
            } else {
              failedCount++;
              console.error(`Failed to send to ${email}`);
            }
          } catch (err) {
            failedCount++;
            console.error(`Error sending to ${email}:`, err);
          }
        }
      }

      console.log(`Announcement sent: ${sentCount} succeeded, ${failedCount} failed`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Sent to ${sentCount} users${failedCount > 0 ? `, ${failedCount} failed` : ''}` 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Provide testEmail or sendToAll" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-announcement function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

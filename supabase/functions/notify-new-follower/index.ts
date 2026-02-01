import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyRequest {
  followedUserId: string;
  followerUserId: string;
}

const getEmailHtml = (followerUsername: string, followerShelfUrl: string | null) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="background: #fef9e7; border-radius: 12px; padding: 32px;">
    <h2 style="color: #78350f; margin: 0 0 20px 0; font-weight: 700; font-size: 24px;">You have a new follower! 🎉</h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
      <strong style="color: #78350f;">${followerUsername}</strong> just started following your bookshelf on Shelvy.
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563;">
      They'll now be able to see when you add new books to your collection. Keep reading and sharing your favorites!
    </p>
    
    ${followerShelfUrl ? `
    <a href="${followerShelfUrl}" style="background: #78350f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">Check out ${followerUsername}'s shelf</a>
    ` : `
    <a href="https://shelvy-books.lovable.app" style="background: #78350f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">View your shelf</a>
    `}
    
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
    const { followedUserId, followerUserId }: NotifyRequest = await req.json();

    if (!followedUserId || !followerUserId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the email of the user being followed
    const { data: followedUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(followedUserId);
    
    if (userError || !followedUser?.user?.email) {
      console.log("Could not find email for followed user:", followedUserId);
      return new Response(
        JSON.stringify({ success: true, message: "No email found for user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the follower's profile
    const { data: followerProfile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('user_id', followerUserId)
      .single();

    const followerUsername = followerProfile?.username || 'Someone';

    // Check if follower has a public shelf
    const { data: followerShelf } = await supabaseAdmin
      .from('shelf_settings')
      .select('share_id, is_public')
      .eq('user_id', followerUserId)
      .eq('is_public', true)
      .maybeSingle();

    const followerShelfUrl = followerShelf?.share_id 
      ? `https://shelvy-books.lovable.app/shelf/${followerShelf.share_id}`
      : null;

    // Send the email
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shelvy <noreply@shelvybooks.com>",
        to: [followedUser.user.email],
        subject: `${followerUsername} is now following your bookshelf 📚`,
        html: getEmailHtml(followerUsername, followerShelfUrl),
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      // Don't throw - we don't want to break the follow action
      return new Response(
        JSON.stringify({ success: false, message: "Failed to send email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailData = await emailResponse.json();
    console.log("New follower notification sent:", emailData);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in notify-new-follower function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

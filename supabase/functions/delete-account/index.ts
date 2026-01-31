import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user's token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} requested account deletion`);

    // Use service role to delete all user data
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Delete in order to respect foreign key constraints
    // 1. Delete book-related data (likes, comments, notes reference books)
    const { error: likesError } = await supabase
      .from('book_likes')
      .delete()
      .eq('user_id', user.id);
    if (likesError) console.error('Error deleting likes:', likesError);

    const { error: commentsError } = await supabase
      .from('book_comments')
      .delete()
      .eq('user_id', user.id);
    if (commentsError) console.error('Error deleting comments:', commentsError);

    const { error: notesError } = await supabase
      .from('book_notes')
      .delete()
      .eq('user_id', user.id);
    if (notesError) console.error('Error deleting notes:', notesError);

    // 2. Delete books
    const { error: booksError } = await supabase
      .from('books')
      .delete()
      .eq('user_id', user.id);
    if (booksError) console.error('Error deleting books:', booksError);

    // 3. Delete follows (both directions)
    const { error: followingError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id);
    if (followingError) console.error('Error deleting following:', followingError);

    const { error: followersError } = await supabase
      .from('follows')
      .delete()
      .eq('following_id', user.id);
    if (followersError) console.error('Error deleting followers:', followersError);

    // 4. Delete club memberships and related data
    // First get clubs owned by user
    const { data: ownedClubs } = await supabase
      .from('book_clubs')
      .select('id')
      .eq('owner_id', user.id);

    if (ownedClubs && ownedClubs.length > 0) {
      const clubIds = ownedClubs.map(c => c.id);
      
      // Delete votes for suggestions in owned clubs
      const { data: suggestions } = await supabase
        .from('book_club_suggestions')
        .select('id')
        .in('club_id', clubIds);
      
      if (suggestions && suggestions.length > 0) {
        const suggestionIds = suggestions.map(s => s.id);
        await supabase.from('book_club_votes').delete().in('suggestion_id', suggestionIds);
      }
      
      // Delete suggestions in owned clubs
      await supabase.from('book_club_suggestions').delete().in('club_id', clubIds);
      
      // Delete members in owned clubs
      await supabase.from('book_club_members').delete().in('club_id', clubIds);
      
      // Delete owned clubs
      await supabase.from('book_clubs').delete().eq('owner_id', user.id);
    }

    // Delete user's club memberships (for clubs they don't own)
    const { error: membershipsError } = await supabase
      .from('book_club_members')
      .delete()
      .eq('user_id', user.id);
    if (membershipsError) console.error('Error deleting memberships:', membershipsError);

    // Delete user's votes
    const { error: votesError } = await supabase
      .from('book_club_votes')
      .delete()
      .eq('user_id', user.id);
    if (votesError) console.error('Error deleting votes:', votesError);

    // Delete user's suggestions
    const { error: suggestionsError } = await supabase
      .from('book_club_suggestions')
      .delete()
      .eq('suggested_by', user.id);
    if (suggestionsError) console.error('Error deleting suggestions:', suggestionsError);

    // 5. Delete notification settings
    const { error: notifError } = await supabase
      .from('notification_settings')
      .delete()
      .eq('user_id', user.id);
    if (notifError) console.error('Error deleting notification settings:', notifError);

    // 6. Delete shelf settings
    const { error: shelfError } = await supabase
      .from('shelf_settings')
      .delete()
      .eq('user_id', user.id);
    if (shelfError) console.error('Error deleting shelf settings:', shelfError);

    // 7. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user.id);
    if (profileError) console.error('Error deleting profile:', profileError);

    // 8. Delete user roles
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id);
    if (rolesError) console.error('Error deleting roles:', rolesError);

    // 9. Finally, delete the auth user
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted account for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error in delete-account function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

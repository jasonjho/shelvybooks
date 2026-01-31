import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchTerm = query.trim().toLowerCase();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token with anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to search
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const results: Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      shareId: string | null;
      matchedBy: 'username' | 'email';
    }> = [];

    // 1. Search by username in profiles (only users with public shelves)
    const { data: profileMatches } = await adminClient
      .from('profiles')
      .select('user_id, username, avatar_url')
      .ilike('username', `%${searchTerm}%`)
      .neq('user_id', user.id)
      .limit(10);

    if (profileMatches && profileMatches.length > 0) {
      // Get shelf settings for these users
      const userIds = profileMatches.map(p => p.user_id);
      const { data: shelfData } = await adminClient
        .from('shelf_settings')
        .select('user_id, share_id, is_public')
        .in('user_id', userIds)
        .eq('is_public', true);

      const shelfMap = new Map(shelfData?.map(s => [s.user_id, s.share_id]) || []);

      for (const profile of profileMatches) {
        const shareId = shelfMap.get(profile.user_id);
        if (shareId) {
          results.push({
            userId: profile.user_id,
            username: profile.username,
            avatarUrl: profile.avatar_url,
            shareId,
            matchedBy: 'username',
          });
        }
      }
    }

    // 2. Search by email in auth.users (only if looks like email)
    if (searchTerm.includes('@')) {
      const { data: authUsers } = await adminClient.auth.admin.listUsers({
        perPage: 50,
      });

      if (authUsers?.users) {
        const emailMatches = authUsers.users.filter(
          u => u.email?.toLowerCase().includes(searchTerm) && u.id !== user.id
        );

        if (emailMatches.length > 0) {
          const emailUserIds = emailMatches.map(u => u.id);

          // Get profiles for these users
          const { data: emailProfiles } = await adminClient
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', emailUserIds);

          // Get shelf settings
          const { data: emailShelfData } = await adminClient
            .from('shelf_settings')
            .select('user_id, share_id, is_public')
            .in('user_id', emailUserIds)
            .eq('is_public', true);

          const profileMap = new Map(emailProfiles?.map(p => [p.user_id, p]) || []);
          const shelfMap = new Map(emailShelfData?.map(s => [s.user_id, s.share_id]) || []);

          for (const authUser of emailMatches) {
            const profile = profileMap.get(authUser.id);
            const shareId = shelfMap.get(authUser.id);

            // Only include if they have a profile and public shelf
            if (profile && shareId) {
              // Check if already in results from username search
              if (!results.some(r => r.userId === authUser.id)) {
                results.push({
                  userId: authUser.id,
                  username: profile.username,
                  avatarUrl: profile.avatar_url,
                  shareId,
                  matchedBy: 'email',
                });
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ results: results.slice(0, 10) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in find-user:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

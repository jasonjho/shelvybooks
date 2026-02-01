import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Follower {
  userId: string;
  username: string;
  avatarUrl: string | null;
  shareId: string | null;
}

interface FollowersListProps {
  targetUserId: string;
  initiallyExpanded?: boolean;
}

export function FollowersList({ targetUserId, initiallyExpanded = false }: FollowersListProps) {
  const [isOpen, setIsOpen] = useState(initiallyExpanded);

  // Fetch followers for the target user
  const { data: followers = [], isLoading, error } = useQuery({
    queryKey: ['user-followers', targetUserId],
    queryFn: async (): Promise<Follower[]> => {
      // Get all users following this person
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', targetUserId)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      if (!follows || follows.length === 0) return [];

      const followerIds = follows.map(f => f.follower_id);

      // Fetch profiles for followers
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', followerIds);

      if (!profiles || profiles.length === 0) return [];

      // Fetch public shelf info
      const { data: shelfInfos } = await supabase
        .rpc('get_public_shelf_info_for_users', { _user_ids: followerIds });

      const shelfMap = new Map(
        (shelfInfos || []).map((s: { user_id: string; share_id: string }) => [s.user_id, s.share_id])
      );

      // Maintain order from follows query
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));
      
      return followerIds
        .map(id => {
          const profile = profileMap.get(id);
          if (!profile) return null;
          return {
            userId: profile.user_id,
            username: profile.username,
            avatarUrl: profile.avatar_url,
            shareId: shelfMap.get(profile.user_id) || null,
          };
        })
        .filter((f): f is Follower => f !== null);
    },
    enabled: !!targetUserId,
  });

  const followerCount = followers.length;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="w-4 h-4" />
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (error) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Users className="w-4 h-4" />
          <span className="font-medium">
            {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
          </span>
          {followerCount > 0 && (
            isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )
          )}
        </Button>
      </CollapsibleTrigger>

      {followerCount > 0 && (
        <CollapsibleContent className="mt-4">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {followers.map((follower) => (
              <div
                key={follower.userId}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Link to={`/u/${follower.username}`}>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={follower.avatarUrl || undefined} alt={follower.username} />
                    <AvatarFallback className="text-sm font-sans">
                      {follower.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/u/${follower.username}`}
                    className="text-sm font-medium hover:underline font-sans"
                  >
                    {follower.username}
                  </Link>
                </div>
                {follower.shareId && (
                  <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
                    <Link to={`/shelf/${follower.shareId}`}>
                      View shelf
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

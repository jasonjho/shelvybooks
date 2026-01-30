import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Users } from 'lucide-react';

interface FollowedUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
  shareId: string | null;
}

export function FollowingList() {
  const { user } = useAuth();
  const { following, loadingFollowing } = useFollows();

  // Fetch profile and shelf info for followed users
  const { data: followedUsers = [], isLoading } = useQuery({
    queryKey: ['followed-users-details', following.map(f => f.following_id)],
    queryFn: async (): Promise<FollowedUser[]> => {
      if (following.length === 0) return [];

      const userIds = following.map(f => f.following_id);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      if (!profiles || profiles.length === 0) return [];

      // Fetch public shelf info using RPC
      const { data: shelfInfos } = await supabase
        .rpc('get_public_shelf_info_for_users', { _user_ids: userIds });

      const shelfMap = new Map(
        (shelfInfos || []).map((s: { user_id: string; share_id: string }) => [s.user_id, s.share_id])
      );

      return profiles.map(p => ({
        userId: p.user_id,
        username: p.username,
        avatarUrl: p.avatar_url,
        shareId: shelfMap.get(p.user_id) || null,
      }));
    },
    enabled: !!user && following.length > 0,
  });

  const loading = loadingFollowing || isLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (followedUsers.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground font-sans">
          You're not following any shelves yet
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 font-sans">
          Visit public shelves and click Follow to track new books
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {followedUsers.map((user) => (
        <div
          key={user.userId}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <Link to={`/u/${user.username}`}>
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
              <AvatarFallback className="text-sm font-sans">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={`/u/${user.username}`}
              className="text-sm font-medium hover:underline font-sans"
            >
              {user.username}
            </Link>
          </div>
          {user.shareId && (
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Link to={`/shelf/${user.shareId}`}>
                View shelf
                <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// Compact version for notification popover
export function FollowingListCompact({ maxItems = 3 }: { maxItems?: number }) {
  const { user } = useAuth();
  const { following, loadingFollowing } = useFollows();

  const { data: followedUsers = [], isLoading } = useQuery({
    queryKey: ['followed-users-details', following.map(f => f.following_id)],
    queryFn: async (): Promise<FollowedUser[]> => {
      if (following.length === 0) return [];

      const userIds = following.map(f => f.following_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      if (!profiles || profiles.length === 0) return [];

      const { data: shelfInfos } = await supabase
        .rpc('get_public_shelf_info_for_users', { _user_ids: userIds });

      const shelfMap = new Map(
        (shelfInfos || []).map((s: { user_id: string; share_id: string }) => [s.user_id, s.share_id])
      );

      return profiles.map(p => ({
        userId: p.user_id,
        username: p.username,
        avatarUrl: p.avatar_url,
        shareId: shelfMap.get(p.user_id) || null,
      }));
    },
    enabled: !!user && following.length > 0,
  });

  const loading = loadingFollowing || isLoading;
  const displayedUsers = followedUsers.slice(0, maxItems);
  const remainingCount = followedUsers.length - maxItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (followedUsers.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-t border-border bg-muted/30">
      <p className="text-xs text-muted-foreground mb-2 font-sans">
        Following {followedUsers.length} {followedUsers.length === 1 ? 'shelf' : 'shelves'}
      </p>
      <div className="flex items-center gap-1">
        {displayedUsers.map((user) => (
          <Link key={user.userId} to={user.shareId ? `/shelf/${user.shareId}` : `/u/${user.username}`}>
            <Avatar className="w-7 h-7 ring-2 ring-background">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
              <AvatarFallback className="text-[10px] font-sans">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        ))}
        {remainingCount > 0 && (
          <span className="text-xs text-muted-foreground ml-1 font-sans">
            +{remainingCount} more
          </span>
        )}
      </div>
    </div>
  );
}

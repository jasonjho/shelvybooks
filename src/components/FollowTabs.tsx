import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ExternalLink, Users, UserCheck } from 'lucide-react';

interface UserInfo {
  userId: string;
  username: string;
  avatarUrl: string | null;
  shareId: string | null;
}

interface FollowTabsProps {
  targetUserId: string;
  isOwnProfile: boolean;
}

export function FollowTabs({ targetUserId, isOwnProfile }: FollowTabsProps) {
  const { user } = useAuth();
  const { following, loadingFollowing } = useFollows();

  // Fetch followers for the target user
  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ['user-followers', targetUserId],
    queryFn: async (): Promise<UserInfo[]> => {
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', targetUserId)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      if (!follows || follows.length === 0) return [];

      const followerIds = follows.map(f => f.follower_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', followerIds);

      if (!profiles || profiles.length === 0) return [];

      const { data: shelfInfos } = await supabase
        .rpc('get_public_shelf_info_for_users', { _user_ids: followerIds });

      const shelfMap = new Map(
        (shelfInfos || []).map((s: { user_id: string; share_id: string }) => [s.user_id, s.share_id])
      );

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
        .filter((f): f is UserInfo => f !== null);
    },
    enabled: !!targetUserId,
  });

  // Fetch following list (only for own profile)
  const { data: followedUsers = [], isLoading: loadingFollowed } = useQuery({
    queryKey: ['followed-users-details', following.map(f => f.following_id)],
    queryFn: async (): Promise<UserInfo[]> => {
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
    enabled: !!user && isOwnProfile && following.length > 0,
  });

  const followerCount = followers.length;
  const followingCount = followedUsers.length;

  const renderUserRow = (userInfo: UserInfo) => (
    <Link
      key={userInfo.userId}
      to={userInfo.shareId ? `/shelf/${userInfo.shareId}` : `/u/${userInfo.username}`}
      className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors group"
    >
      <Avatar className="w-7 h-7">
        <AvatarImage src={userInfo.avatarUrl || undefined} alt={userInfo.username} />
        <AvatarFallback className="text-xs font-sans">
          {userInfo.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-sans flex-1 truncate">{userInfo.username}</span>
      {userInfo.shareId && (
        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Link>
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center py-6 text-sm text-muted-foreground font-sans">
      {message}
    </div>
  );

  const renderLoading = () => (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  // If not own profile and no followers, show simple count
  if (!isOwnProfile && followerCount === 0 && !loadingFollowers) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Users className="w-4 h-4" />
        <span>0 followers</span>
      </div>
    );
  }

  // If not own profile, only show followers tab
  if (!isOwnProfile) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
          <Users className="w-4 h-4" />
          <span>{followerCount} {followerCount === 1 ? 'follower' : 'followers'}</span>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {loadingFollowers ? renderLoading() : followers.map(renderUserRow)}
        </div>
      </div>
    );
  }

  // Own profile - show tabs
  return (
    <Tabs defaultValue="followers" className="w-full max-w-sm">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="followers" className="gap-1.5 text-sm">
          <Users className="w-3.5 h-3.5" />
          Followers ({followerCount})
        </TabsTrigger>
        <TabsTrigger value="following" className="gap-1.5 text-sm">
          <UserCheck className="w-3.5 h-3.5" />
          Following ({followingCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="followers" className="mt-3">
        <div className="max-h-[200px] overflow-y-auto">
          {loadingFollowers ? (
            renderLoading()
          ) : followers.length === 0 ? (
            renderEmptyState("No followers yet")
          ) : (
            followers.map(renderUserRow)
          )}
        </div>
      </TabsContent>

      <TabsContent value="following" className="mt-3">
        <div className="max-h-[200px] overflow-y-auto">
          {loadingFollowing || loadingFollowed ? (
            renderLoading()
          ) : followedUsers.length === 0 ? (
            renderEmptyState("Not following anyone yet")
          ) : (
            followedUsers.map(renderUserRow)
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

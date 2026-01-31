import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFollows } from '@/hooks/useFollows';
import { useIsMobile } from '@/hooks/use-mobile';
import { ViewedShelfUser } from '@/hooks/useViewedShelf';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookOpen, Search, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { FindFriendsDialog } from './FindFriendsDialog';

interface FollowedUserWithShelf {
  userId: string;
  username: string;
  avatarUrl: string | null;
  shareId: string | null;
}

interface ShelfSwitcherProps {
  viewedUser: ViewedShelfUser | null;
  onSelectUser: (user: ViewedShelfUser) => void;
  onSelectOwnShelf: () => void;
}

export function ShelfSwitcher({ viewedUser, onSelectUser, onSelectOwnShelf }: ShelfSwitcherProps) {
  const { user } = useAuth();
  const { following, loadingFollowing } = useFollows();
  const isMobile = useIsMobile();
  const [findFriendsOpen, setFindFriendsOpen] = useState(false);

  // Fetch profile and shelf info for followed users
  const { data: followedUsers = [], isLoading } = useQuery({
    queryKey: ['followed-users-for-switcher', following.map(f => f.following_id)],
    queryFn: async (): Promise<FollowedUserWithShelf[]> => {
      if (following.length === 0) return [];

      const userIds = following.map(f => f.following_id);

      // Fetch public shelf info using RPC - this is the source of truth for public shelves
      const { data: shelfInfos } = await supabase
        .rpc('get_public_shelf_info_for_users', { _user_ids: userIds });

      if (!shelfInfos || shelfInfos.length === 0) return [];

      // Create a map of user_id -> shelf info (including display_name as fallback)
      const shelfMap = new Map(
        shelfInfos.map((s: { user_id: string; share_id: string; display_name: string | null }) => [
          s.user_id, 
          { shareId: s.share_id, displayName: s.display_name }
        ])
      );

      // Fetch profiles for users who have public shelves
      const usersWithShelves = shelfInfos.map((s: { user_id: string }) => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', usersWithShelves);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { username: p.username, avatarUrl: p.avatar_url }])
      );

      // Build the result - use shelf display_name as fallback if no profile exists
      return usersWithShelves.map(userId => {
        const shelf = shelfMap.get(userId);
        const profile = profileMap.get(userId);
        
        // Use profile username, or extract name from display_name, or fallback to "Unknown"
        const username = profile?.username || 
          (shelf?.displayName?.replace(/'s Bookshelf$/i, '').replace(/'s Shelf$/i, '')) || 
          'Unknown';
        
        return {
          userId,
          username,
          avatarUrl: profile?.avatarUrl || null,
          shareId: shelf?.shareId || null,
        };
      });
    },
    enabled: !!user && following.length > 0,
  });

  const loading = loadingFollowing || isLoading;

  // Only show if user follows someone
  if (!user || (following.length === 0 && !loading)) {
    return null;
  }

  // Filter to only users with public shelves
  const usersWithShelves = followedUsers.filter(u => u.shareId);

  const handleValueChange = (value: string) => {
    if (value === 'own') {
      onSelectOwnShelf();
    } else if (value === 'find-friends') {
      setFindFriendsOpen(true);
    } else {
      const selected = usersWithShelves.find(u => u.userId === value);
      if (selected && selected.shareId) {
        onSelectUser({
          userId: selected.userId,
          username: selected.username,
          avatarUrl: selected.avatarUrl,
          shareId: selected.shareId,
        });
      }
    }
  };

  const currentValue = viewedUser ? viewedUser.userId : 'own';

  return (
    <>
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className="max-w-[120px] sm:max-w-none w-auto gap-1.5 bg-background/80 border-input h-10 px-2.5 sm:px-3 text-sm font-medium focus:ring-0 focus:ring-offset-0 shrink-0">
          <BookOpen className="w-4 h-4 shrink-0" />
          <SelectValue>
            <span className="truncate">
              {isMobile 
                ? (viewedUser ? viewedUser.username.slice(0, 6) : 'You')
                : (viewedUser ? `@${viewedUser.username}` : 'Your shelf')}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-[180px]">
          <SelectItem value="own" className="gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Your shelf</span>
            </div>
          </SelectItem>
          
          {usersWithShelves.length > 0 && (
            <>
              <SelectSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Following</div>
              {usersWithShelves.map((u) => (
                <SelectItem key={u.userId} value={u.userId}>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={u.avatarUrl || undefined} alt={u.username} />
                      <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                        {u.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>@{u.username}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          
          {loading && (
            <>
              <SelectSeparator />
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </>
          )}
          
          <SelectSeparator />
          <SelectItem value="find-friends" className="gap-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Find friends...</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <FindFriendsDialog 
        open={findFriendsOpen} 
        onOpenChange={setFindFriendsOpen}
        initialTab="find"
      />
    </>
  );
}

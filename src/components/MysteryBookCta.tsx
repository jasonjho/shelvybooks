import { useState } from 'react';
import { Gift, X, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendMysteryBookDialog } from '@/components/SendMysteryBookDialog';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'shelvy-mystery-book-cta-dismissed';

interface FollowedUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

export function MysteryBookCta() {
  const { user } = useAuth();
  const { following } = useFollows();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FollowedUser | null>(null);
  const [mysteryDialogOpen, setMysteryDialogOpen] = useState(false);

  // Fetch enriched profiles for followed users
  const { data: followedUsers = [], isLoading } = useQuery({
    queryKey: ['mystery-cta-friends', following.map(f => f.following_id)],
    queryFn: async (): Promise<FollowedUser[]> => {
      if (following.length === 0) return [];
      const userIds = following.map(f => f.following_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);
      if (!profiles) return [];
      return profiles.map(p => ({
        userId: p.user_id,
        username: p.username || 'Unknown',
        avatarUrl: p.avatar_url,
      }));
    },
    enabled: !!user && following.length > 0 && pickerOpen,
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const handleSelectFriend = (friend: FollowedUser) => {
    setSelectedFriend(friend);
    setPickerOpen(false);
    setMysteryDialogOpen(true);
  };

  return (
    <>
      <div className="mb-4 py-3 px-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
        <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-800/80 dark:text-amber-200/80 flex-1">
          <span className="font-medium">Send a Mystery Book</span> — wrap a book with mood clues for a friend to unwrap!
        </p>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Gift className="w-3.5 h-3.5" />
              Send
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Pick a friend</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : followedUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-4 px-2 text-center">
                <Users className="w-5 h-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Follow some friends first to send them a mystery book!</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {followedUsers.map(friend => (
                  <button
                    key={friend.userId}
                    onClick={() => handleSelectFriend(friend)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent text-left transition-colors"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={friend.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {friend.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{friend.username}</span>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-amber-600/60 hover:text-amber-800 dark:text-amber-400/60 dark:hover:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {selectedFriend && (
        <SendMysteryBookDialog
          open={mysteryDialogOpen}
          onOpenChange={setMysteryDialogOpen}
          targetUserId={selectedFriend.userId}
          targetUsername={selectedFriend.username}
        />
      )}
    </>
  );
}

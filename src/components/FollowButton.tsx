import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';

interface FollowButtonProps {
  targetUserId: string;
  /** If true, shows only icon without label */
  iconOnly?: boolean;
}

export function FollowButton({ targetUserId, iconOnly = false }: FollowButtonProps) {
  const { user, setAuthDialogOpen } = useAuth();
  const { isFollowing, follow, unfollow, isFollowPending, isUnfollowPending } = useFollows();

  // Don't show button for own shelf or when target is current user
  if (user?.id === targetUserId) {
    return null;
  }

  const following = isFollowing(targetUserId);
  const isPending = isFollowPending || isUnfollowPending;

  const handleClick = () => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }

    if (following) {
      unfollow(targetUserId);
    } else {
      follow(targetUserId);
    }
  };

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className={following 
        ? "gap-1.5 font-sans" 
        : "gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-sans"
      }
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <>
          <UserMinus className="h-4 w-4" />
          {!iconOnly && "Following"}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {!iconOnly && "Follow"}
        </>
      )}
    </Button>
  );
}

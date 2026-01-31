import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ViewedShelfUser } from '@/hooks/useViewedShelf';

interface ViewingFriendPillProps {
  viewedUser: ViewedShelfUser;
  onClose: () => void;
}

export function ViewingFriendPill({ viewedUser, onClose }: ViewingFriendPillProps) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-full px-3 py-1.5">
        <Avatar className="w-5 h-5">
          <AvatarImage src={viewedUser.avatarUrl || undefined} alt={viewedUser.username} />
          <AvatarFallback className="text-[10px]">
            {viewedUser.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">
          Viewing <span className="text-primary">@{viewedUser.username}</span>'s shelf
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-muted"
          onClick={onClose}
        >
          <X className="w-3.5 h-3.5" />
          <span className="sr-only">Back to your shelf</span>
        </Button>
      </div>
    </div>
  );
}

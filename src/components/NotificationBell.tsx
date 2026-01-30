import { Bell, Heart, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function NotificationBell() {
  const { newLikesCount, newLikes, markAsSeen, isLoading } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative bg-background/80 border-border text-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Notifications${newLikesCount > 0 ? ` (${newLikesCount} new)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {newLikesCount > 0 && (
            <span 
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[18px] h-[18px] px-1 rounded-full",
                "bg-red-500 text-white text-xs font-medium",
                "animate-scale-in"
              )}
            >
              {newLikesCount > 99 ? '99+' : newLikesCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <h3 className="font-sans font-semibold text-sm">Notifications</h3>
          {newLikesCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAsSeen}
              className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : newLikes.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No new notifications
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                When someone likes your books, you'll see it here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {newLikes.map((like) => (
                <div 
                  key={like.id} 
                  className="px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Avatar or heart icon */}
                    {like.username ? (
                      <Link to={`/u/${like.username}`} className="shrink-0">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={like.avatarUrl || undefined} alt={like.username} />
                          <AvatarFallback className="text-xs">
                            {like.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 shrink-0">
                        <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        {like.username ? (
                          <Link 
                            to={`/u/${like.username}`} 
                            className="font-medium hover:underline"
                          >
                            {like.username}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Someone</span>
                        )}
                        {' liked '}
                        <span className="font-medium">{like.bookTitle}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(like.likedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

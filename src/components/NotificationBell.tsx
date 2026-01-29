import { Bell, Heart } from 'lucide-react';
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

export function NotificationBell() {
  const { newLikesCount, newLikes, markAsSeen, isLoading } = useNotifications();

  const handleOpenChange = (open: boolean) => {
    if (open && newLikesCount > 0) {
      // Mark as seen when opening the popover
      markAsSeen();
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
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
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
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
            <div className="divide-y">
              {newLikes.map((like) => (
                <div 
                  key={like.id} 
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30">
                      <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        Someone liked{' '}
                        <span className="font-medium truncate">
                          {like.bookTitle}
                        </span>
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

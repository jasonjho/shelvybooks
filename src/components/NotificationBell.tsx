import { useState } from 'react';
import { Bell, Heart, Check, BookPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useFollowedUsersBooks } from '@/hooks/useFollows';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowingListCompact } from '@/components/FollowingList';

export function NotificationBell() {
  const [activeTab, setActiveTab] = useState<'likes' | 'following'>('likes');
  const { newLikesCount, newLikes, markAsSeen, isLoading } = useNotifications();
  const { data: followedBooks = [], newCount: followedBooksCount, isLoading: loadingFollowedBooks, markAsSeen: markFollowsAsSeen } = useFollowedUsersBooks();

  const totalCount = newLikesCount + followedBooksCount;

  // Determine which clear action to show based on active tab
  const showClearButton = (activeTab === 'likes' && newLikesCount > 0) || 
                          (activeTab === 'following' && followedBooksCount > 0);
  
  const handleClear = () => {
    if (activeTab === 'likes') {
      markAsSeen();
    } else {
      markFollowsAsSeen();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative bg-background/80 border-border text-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Notifications${totalCount > 0 ? ` (${totalCount} new)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span 
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[18px] h-[18px] px-1 rounded-full",
                "bg-red-500 text-white text-xs font-medium",
                "animate-scale-in"
              )}
            >
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'likes' | 'following')} className="w-full">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <TabsList className="h-8 p-0.5 bg-muted/50">
              <TabsTrigger value="likes" className="text-xs px-2.5 h-7 font-sans data-[state=active]:font-medium">
                Likes {newLikesCount > 0 && `(${newLikesCount})`}
              </TabsTrigger>
              <TabsTrigger value="following" className="text-xs px-2.5 h-7 font-sans data-[state=active]:font-medium">
                Following {followedBooksCount > 0 && `(${followedBooksCount})`}
              </TabsTrigger>
            </TabsList>
            {showClearButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground font-sans"
              >
                <Check className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
          
          {/* Likes Tab */}
          <TabsContent value="likes" className="m-0">
            <ScrollArea className="max-h-[280px]">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground font-sans">
                  Loading...
                </div>
              ) : newLikes.length === 0 ? (
                <div className="p-6 text-center">
                  <Heart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground font-sans">
                    No new likes
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 font-sans">
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
                        {like.username ? (
                          <Link to={`/u/${like.username}`} className="shrink-0">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={like.avatarUrl || undefined} alt={like.username} />
                              <AvatarFallback className="text-xs font-sans">
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
                          <p className="text-sm leading-snug font-sans">
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
                          <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                            {formatDistanceToNow(new Date(like.likedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Following Tab */}
          <TabsContent value="following" className="m-0">
            <ScrollArea className="max-h-[280px]">
              {loadingFollowedBooks ? (
                <div className="p-4 text-center text-sm text-muted-foreground font-sans">
                  Loading...
                </div>
              ) : followedBooks.length === 0 ? (
                <div className="p-6 text-center">
                  <BookPlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground font-sans">
                    No new books from followed shelves
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 font-sans">
                    Follow shelves to see when they add new books
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {followedBooks.map((book) => (
                    <div 
                      key={book.id} 
                      className="px-3 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <Link to={`/u/${book.username}`} className="shrink-0">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={book.avatarUrl || undefined} alt={book.username} />
                            <AvatarFallback className="text-xs font-sans">
                              {book.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug font-sans">
                            <Link 
                              to={`/u/${book.username}`} 
                              className="font-medium hover:underline"
                            >
                              {book.username}
                            </Link>
                            {' added '}
                            <span className="font-medium">{book.title}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                            {formatDistanceToNow(new Date(book.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <FollowingListCompact />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

import { useState } from 'react';
import { Bell, Heart, Check, BookPlus, UserPlus, Gift, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useFollowedUsersBooks } from '@/hooks/useFollows';
import { useFollowerNotifications } from '@/hooks/useFollowerNotifications';
import { useBookRecommendations, BookRecommendation } from '@/hooks/useBookRecommendations';
import { useBooksContext } from '@/contexts/BooksContext';
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
  const [activeTab, setActiveTab] = useState<'activity' | 'following'>('activity');
  const { newLikesCount, newLikes, markAsSeen: markLikesAsSeen, isLoading } = useNotifications();
  const { data: followedBooks = [], newCount: followedBooksCount, isLoading: loadingFollowedBooks, markAsSeen: markFollowsAsSeen } = useFollowedUsersBooks();
  const { newFollowers, newCount: newFollowersCount, isLoading: loadingFollowers, markAsSeen: markFollowersAsSeen } = useFollowerNotifications();
  const { 
    pendingRecommendations, 
    pendingCount: newRecommendationsCount, 
    isLoading: loadingRecommendations,
    acceptRecommendation,
    declineRecommendation,
    markAsSeen: markRecommendationsAsSeen 
  } = useBookRecommendations();
  const { refetchBooks } = useBooksContext();

  // Activity = likes + new followers + recommendations
  const activityCount = newLikesCount + newFollowersCount + newRecommendationsCount;
  const totalCount = activityCount + followedBooksCount;

  // Determine which clear action to show based on active tab
  const showClearButton = (activeTab === 'activity' && activityCount > 0) || 
                          (activeTab === 'following' && followedBooksCount > 0);
  
  const handleClear = () => {
    if (activeTab === 'activity') {
      markLikesAsSeen();
      markFollowersAsSeen();
      markRecommendationsAsSeen();
    } else {
      markFollowsAsSeen();
    }
  };

  const handleAccept = async (recommendation: BookRecommendation) => {
    await acceptRecommendation(recommendation);
    // Refetch books to show the newly added book on the shelf
    await refetchBooks();
  };

  const handleDecline = async (recommendationId: string) => {
    await declineRecommendation(recommendationId);
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'activity' | 'following')} className="w-full">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <TabsList className="h-8 p-0.5 bg-muted/50">
              <TabsTrigger value="activity" className="text-xs px-2.5 h-7 font-sans data-[state=active]:font-medium">
                Activity {activityCount > 0 && `(${activityCount})`}
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
          
          {/* Activity Tab (Likes + Followers + Recommendations) */}
          <TabsContent value="activity" className="m-0">
            <ScrollArea className="max-h-[320px]">
              {(isLoading || loadingFollowers || loadingRecommendations) ? (
                <div className="p-4 text-center text-sm text-muted-foreground font-sans">
                  Loading...
                </div>
              ) : (newLikes.length === 0 && newFollowers.length === 0 && pendingRecommendations.length === 0) ? (
                <div className="p-6 text-center">
                  <Heart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground font-sans">
                    No new activity
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 font-sans">
                    Likes, followers, and book recommendations will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* Combine and sort by date */}
                  {[
                    ...pendingRecommendations.map(r => ({ type: 'recommendation' as const, data: r, date: new Date(r.createdAt) })),
                    ...newFollowers.map(f => ({ type: 'follower' as const, data: f, date: new Date(f.followedAt) })),
                    ...newLikes.map(l => ({ type: 'like' as const, data: l, date: new Date(l.likedAt) })),
                  ]
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((item) => (
                      <div 
                        key={
                          item.type === 'recommendation' 
                            ? `rec-${item.data.id}` 
                            : item.type === 'follower' 
                              ? `follower-${item.data.id}` 
                              : `like-${item.data.id}`
                        }
                        className="px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        {item.type === 'recommendation' ? (
                          <div className="space-y-2">
                            <div className="flex items-start gap-2.5">
                              {item.data.fromUsername ? (
                                <Link to={`/u/${item.data.fromUsername}`} className="shrink-0">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={item.data.fromAvatarUrl || undefined} alt={item.data.fromUsername} />
                                    <AvatarFallback className="text-xs font-sans">
                                      {item.data.fromUsername.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                              ) : (
                                <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                                  <Gift className="h-3.5 w-3.5 text-amber-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm leading-snug font-sans">
                                  {item.data.fromUsername ? (
                                    <Link 
                                      to={`/u/${item.data.fromUsername}`} 
                                      className="font-medium hover:underline"
                                    >
                                      {item.data.fromUsername}
                                    </Link>
                                  ) : (
                                    <span className="text-muted-foreground">Someone</span>
                                  )}
                                  {' recommends '}
                                  <span className="font-medium">{item.data.title}</span>
                                </p>
                                {item.data.message && (
                                  <p className="text-xs text-muted-foreground mt-0.5 italic font-sans">
                                    "{item.data.message}"
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                                  {formatDistanceToNow(item.date, { addSuffix: true })}
                                </p>
                              </div>
                              <Gift className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            </div>
                            {/* Accept/Decline buttons */}
                            <div className="flex gap-2 ml-10">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs gap-1 flex-1"
                                onClick={() => handleAccept(item.data)}
                              >
                                <Check className="h-3 w-3" />
                                Add to shelf
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1 text-muted-foreground"
                                onClick={() => handleDecline(item.data.id)}
                              >
                                <X className="h-3 w-3" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2.5">
                            {item.type === 'follower' ? (
                              <>
                                <Link to={`/u/${item.data.username}`} className="shrink-0">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={item.data.avatarUrl || undefined} alt={item.data.username} />
                                    <AvatarFallback className="text-xs font-sans">
                                      {item.data.username.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm leading-snug font-sans">
                                    <Link 
                                      to={`/u/${item.data.username}`} 
                                      className="font-medium hover:underline"
                                    >
                                      {item.data.username}
                                    </Link>
                                    {' started following you'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                                    {formatDistanceToNow(item.date, { addSuffix: true })}
                                  </p>
                                </div>
                                <UserPlus className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              </>
                            ) : (
                              <>
                                {item.data.username ? (
                                  <Link to={`/u/${item.data.username}`} className="shrink-0">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={item.data.avatarUrl || undefined} alt={item.data.username} />
                                      <AvatarFallback className="text-xs font-sans">
                                        {item.data.username.slice(0, 2).toUpperCase()}
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
                                    {item.data.username ? (
                                      <Link 
                                        to={`/u/${item.data.username}`} 
                                        className="font-medium hover:underline"
                                      >
                                        {item.data.username}
                                      </Link>
                                    ) : (
                                      <span className="text-muted-foreground">Someone</span>
                                    )}
                                    {' liked '}
                                    <span className="font-medium">{item.data.bookTitle}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                                    {formatDistanceToNow(item.date, { addSuffix: true })}
                                  </p>
                                </div>
                                <Heart className="h-4 w-4 text-pink-500 fill-pink-500 shrink-0 mt-0.5" />
                              </>
                            )}
                          </div>
                        )}
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

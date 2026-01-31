import { useState, useMemo, useCallback } from 'react';
import { Bookshelf } from '@/components/Bookshelf';
import { MobileBookshelf } from '@/components/MobileBookshelf';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ShelfControls } from '@/components/ShelfControls';
import { SocialActionsDropdown } from '@/components/SocialActionsDropdown';
import { BookActionsDropdown } from '@/components/BookActionsDropdown';
import { MobileActionsMenu } from '@/components/MobileActionsMenu';
import { AuthButton } from '@/components/AuthButton';
import { ClubsDropdown } from '@/components/ClubsDropdown';
import { DiscoverCollections } from '@/components/DiscoverCollections';
import { OnboardingTips } from '@/components/OnboardingTips';
import { DailyQuote } from '@/components/DailyQuote';
import { NotificationBell } from '@/components/NotificationBell';
import { ShareNudge } from '@/components/ShareNudge';
import { ShelfPrivacyIndicator } from '@/components/ShelfPrivacyIndicator';
import { ShareShelfDialog } from '@/components/ShareShelfDialog';
import { ControlsSkeleton, QuoteSkeleton } from '@/components/ShelfSkeleton';
import { ShelfSwitcher } from '@/components/ShelfSwitcher';
import { ViewingFriendPill } from '@/components/ViewingFriendPill';
import { Button } from '@/components/ui/button';

import { useBooks } from '@/hooks/useBooks';
import { useClubBooks } from '@/hooks/useBookClubs';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsbndbDemoBooks } from '@/hooks/useIsbndbDemoBooks';
import { useViewedShelf } from '@/hooks/useViewedShelf';
import { BookStatus, SortOption, Book, BackgroundTheme } from '@/types/book';
import { Library, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Seeded random for consistent shuffle per session
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

const STATUS_ORDER: Record<BookStatus, number> = {
  'reading': 0,
  'want-to-read': 1,
  'read': 2,
};

function sortBooks(books: Book[], sortOption: SortOption, shuffleSeed: number): Book[] {
  switch (sortOption) {
    case 'random':
      return seededShuffle(books, shuffleSeed);
    case 'recent':
      return [...books].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    case 'status-author':
      return [...books].sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        return a.author.localeCompare(b.author);
      });
    case 'author-title':
      return [...books].sort((a, b) => {
        const authorDiff = a.author.localeCompare(b.author);
        if (authorDiff !== 0) return authorDiff;
        return a.title.localeCompare(b.title);
      });
    default:
      return books;
  }
}

export default function Index() {
  const isMobile = useIsMobile();
  const [activeFilters, setActiveFilters] = useState<BookStatus[]>([]);
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('random');
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());
  const [mobileShareOpen, setMobileShareOpen] = useState(false);
  
  const { user, loading: authLoading, setAuthDialogOpen } = useAuth();

  // Shelf viewing state (for browsing friends' shelves)
  const { 
    viewedUser, 
    viewShelf, 
    clearViewedShelf, 
    isViewingFriend, 
    viewedBooks, 
    loadingViewedBooks 
  } = useViewedShelf();

  const {
    books,
    loading: booksLoading,
    shelfSkin, 
    setShelfSkin, 
    settings,
    updateSettings,
    addBook, 
    removeBook, 
    moveBook,
    updateBookCompletedAt,
  } = useBooks();

  // Get club books for highlighting
  const { getBookClubs } = useClubBooks();

  // Get notifications for like badges (use totalLikesPerBook for persistent heart stickers)
  const { totalLikesPerBook } = useNotifications();

  // Get ISBNdb-powered demo books for guests
  const { books: isbndbDemoBooks, loading: demoLoading } = useIsbndbDemoBooks();

  // Create a function that returns club info in the format BookSpine expects
  const getBookClubInfo = useCallback((title: string, author: string) => {
    const clubs = getBookClubs(title, author);
    return clubs.map(c => ({
      clubName: c.clubName,
      status: c.status,
    }));
  }, [getBookClubs]);

  // Get all books - friend's books when viewing, ISBNdb demo for guests, real for authenticated users
  const ownBooks = useMemo(() => {
    return user ? books : isbndbDemoBooks;
  }, [user, books, isbndbDemoBooks]);

  // Display books: friend's shelf when viewing, otherwise own books
  const displayBooks = useMemo(() => {
    return isViewingFriend ? viewedBooks : ownBooks;
  }, [isViewingFriend, viewedBooks, ownBooks]);

  // Extract unique categories from displayed books, sorted by frequency
  const availableCategories = useMemo(() => {
    const categoryCount = new Map<string, number>();
    displayBooks.forEach(book => {
      book.categories?.forEach(cat => {
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      });
    });
    // Sort by frequency (most common first), then alphabetically
    return Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([cat]) => cat);
  }, [displayBooks]);

  // Filter books by category
  const categoryFilteredBooks = useMemo(() => {
    if (activeCategoryFilters.length === 0) return displayBooks;
    return displayBooks.filter(book => 
      book.categories?.some(cat => activeCategoryFilters.includes(cat))
    );
  }, [displayBooks, activeCategoryFilters]);

  // Sort books
  const sortedBooks = useMemo(() => {
    return sortBooks(categoryFilteredBooks, sortOption, shuffleSeed);
  }, [categoryFilteredBooks, sortOption, shuffleSeed]);

  // Calculate book counts by status (from category-filtered books)
  const bookCounts = useMemo(() => {
    return {
      reading: categoryFilteredBooks.filter(b => b.status === 'reading').length,
      'want-to-read': categoryFilteredBooks.filter(b => b.status === 'want-to-read').length,
      read: categoryFilteredBooks.filter(b => b.status === 'read').length,
    };
  }, [categoryFilteredBooks]);

  const handleShuffle = useCallback(() => {
    setShuffleSeed(Date.now());
    setSortOption('random');
  }, []);

  // Get background class based on theme
  const getBackgroundClass = (theme: BackgroundTheme) => {
    switch (theme) {
      case 'library': return 'bg-theme-library';
      case 'cozy': return 'bg-theme-cozy';
      case 'space': return 'bg-theme-space';
      case 'forest': return 'bg-theme-forest';
      case 'ocean': return 'bg-theme-ocean';
      case 'sunset': return 'bg-theme-sunset';
      case 'lavender': return 'bg-theme-lavender';
      default: return 'office-wall';
    }
  };

  // Get ambient light gradient based on theme
  const getAmbientGradient = (theme: BackgroundTheme) => {
    switch (theme) {
      case 'library': return 'radial-gradient(ellipse at center top, hsla(35, 60%, 65%, 0.25) 0%, hsla(30, 50%, 50%, 0.08) 40%, transparent 70%)';
      case 'cozy': return 'radial-gradient(ellipse at center top, hsla(30, 70%, 70%, 0.3) 0%, hsla(25, 60%, 55%, 0.1) 40%, transparent 70%)';
      case 'forest': return 'radial-gradient(ellipse at center top, hsla(50, 60%, 70%, 0.25) 0%, hsla(80, 40%, 50%, 0.08) 40%, transparent 70%)';
      case 'ocean': return 'radial-gradient(ellipse at center top, hsla(195, 50%, 75%, 0.2) 0%, hsla(200, 40%, 60%, 0.08) 40%, transparent 70%)';
      case 'sunset': return 'radial-gradient(ellipse at center top, hsla(35, 80%, 75%, 0.35) 0%, hsla(20, 70%, 60%, 0.12) 40%, transparent 70%)';
      case 'lavender': return 'radial-gradient(ellipse at center top, hsla(270, 50%, 80%, 0.25) 0%, hsla(260, 40%, 65%, 0.08) 40%, transparent 70%)';
      case 'space': return null; // No ambient light for space
      default: return 'radial-gradient(ellipse at center top, hsla(45, 70%, 75%, 0.3) 0%, hsla(35, 60%, 60%, 0.1) 40%, transparent 70%)';
    }
  };

  const ambientGradient = getAmbientGradient(settings.backgroundTheme);

  return (
    <div className={cn("min-h-screen overflow-x-hidden overscroll-x-none", getBackgroundClass(settings.backgroundTheme))}>

      {/* Ambient top light */}
      {settings.showAmbientLight && ambientGradient && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none transition-opacity duration-500"
          style={{ background: ambientGradient }}
        />
      )}
      
      {/* Header */}
      <header className="relative border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-md">
              <Library className="w-7 h-7 text-amber-100" />
            </div>
            <div>
              <h1 className="text-4xl font-normal tracking-wide bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700 bg-clip-text text-transparent font-display">
                Shelvy
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Your personal bookshelf, beautifully organized</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && <ClubsDropdown />}
            {user && <NotificationBell />}
            <SettingsPanel 
              settings={settings} 
              onSettingsChange={updateSettings}
              currentSkin={shelfSkin}
              onSkinChange={setShelfSkin}
            />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 relative z-10">
        {/* Loading state - show skeleton placeholders for controls */}
        {(authLoading || booksLoading || (!user && demoLoading)) && (
          <div className="space-y-6">
            <QuoteSkeleton />
            <ControlsSkeleton />
          </div>
        )}

        {/* Not signed in message */}
        {!authLoading && !user && !demoLoading && (
          <div className="py-4 mb-6 space-y-4">
            <p className="text-foreground/80 text-base">
              <span className="text-amber-700 dark:text-amber-500 font-medium">Track</span> your reading journey, <span className="text-amber-700 dark:text-amber-500 font-medium">organize</span> by status, <span className="text-amber-700 dark:text-amber-500 font-medium">discover</span> new favorites, and <span className="text-amber-700 dark:text-amber-500 font-medium">join Book Clubs</span> with friends.
            </p>
            <Button 
              onClick={() => setAuthDialogOpen(true)}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md"
            >
              Sign in to start your shelf
            </Button>
          </div>
        )}

        {/* Shelf Controls & Bookshelf - fade in when loaded */}
        {!authLoading && !booksLoading && (user || !demoLoading) && (
          <div className="animate-fade-in">
            {/* Empty shelf - show collection suggestions prominently */}
            {user && !isViewingFriend && ownBooks.length === 0 ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-muted-foreground">Your shelf is empty. Browse collections below or add a book manually.</p>
                  <BookActionsDropdown onAddBook={addBook} existingBooks={ownBooks} />
                </div>
                <DiscoverCollections 
                  onAddBook={addBook} 
                  isEmptyShelf={true} 
                />
              </div>
            ) : (
              <>
                {/* Daily Quote - only on own shelf */}
                {user && !isViewingFriend && <DailyQuote />}

                {/* Viewing Friend Pill */}
                {viewedUser && (
                  <ViewingFriendPill viewedUser={viewedUser} onClose={clearViewedShelf} />
                )}

                {/* Loading indicator when fetching friend's books */}
                {isViewingFriend && loadingViewedBooks && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  {/* Left side: Shelf Switcher (desktop only) + ShelfControls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Desktop shelf switcher */}
                    <div className="hidden sm:block">
                      <ShelfSwitcher 
                        viewedUser={viewedUser}
                        onSelectUser={viewShelf}
                        onSelectOwnShelf={clearViewedShelf}
                      />
                    </div>
                    <ShelfControls
                      activeFilters={activeFilters}
                      onFilterChange={setActiveFilters}
                      sortOption={sortOption}
                      onSortChange={setSortOption}
                      onShuffle={handleShuffle}
                      bookCounts={bookCounts}
                      availableCategories={availableCategories}
                      activeCategoryFilters={activeCategoryFilters}
                      onCategoryFilterChange={setActiveCategoryFilters}
                    />
                  </div>
                  
                  {/* Right side: action buttons */}
                  {user && (
                    <>
                      {/* Desktop: separate dropdowns - hide when viewing friend's shelf */}
                      {!isViewingFriend && (
                        <div className="hidden sm:flex items-center gap-2">
                          <SocialActionsDropdown />
                          <BookActionsDropdown onAddBook={addBook} existingBooks={ownBooks} />
                        </div>
                      )}
                      {/* Mobile: unified FAB menu with privacy indicator + shelf switcher */}
                      <div className="sm:hidden flex items-center gap-2">
                        {!isViewingFriend && <ShelfPrivacyIndicator onClick={() => setMobileShareOpen(true)} />}
                        <MobileActionsMenu 
                          onAddBook={addBook} 
                          existingBooks={ownBooks}
                          viewedUser={viewedUser}
                          onSelectUser={viewShelf}
                          onSelectOwnShelf={clearViewedShelf}
                        />
                      </div>
                      <ShareShelfDialog open={mobileShareOpen} onOpenChange={setMobileShareOpen} />
                    </>
                  )}
                </div>

                {/* Hide shelf while loading friend's books */}
                {(!isViewingFriend || !loadingViewedBooks) && (
                  isMobile ? (
                    <MobileBookshelf
                      books={sortedBooks}
                      skin={shelfSkin}
                      settings={settings}
                      activeFilters={activeFilters}
                      onMoveBook={user && !isViewingFriend ? moveBook : undefined}
                      onRemoveBook={user && !isViewingFriend ? removeBook : undefined}
                      onUpdateCompletedAt={user && !isViewingFriend ? updateBookCompletedAt : undefined}
                      getBookClubInfo={user && !isViewingFriend ? getBookClubInfo : undefined}
                      likesPerBook={user && !isViewingFriend ? totalLikesPerBook : undefined}
                    />
                  ) : (
                    <Bookshelf
                      books={sortedBooks}
                      skin={shelfSkin}
                      settings={settings}
                      activeFilters={activeFilters}
                      onMoveBook={user && !isViewingFriend ? moveBook : undefined}
                      onRemoveBook={user && !isViewingFriend ? removeBook : undefined}
                      onUpdateCompletedAt={user && !isViewingFriend ? updateBookCompletedAt : undefined}
                      getBookClubInfo={user && !isViewingFriend ? getBookClubInfo : undefined}
                      likesPerBook={user && !isViewingFriend ? totalLikesPerBook : undefined}
                    />
                  )
                )}
              </>
            )}
          </div>
        )}
      </main>
      {/* Footer */}
      <footer className="relative z-10 py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground space-y-1">
          <p className="text-xs opacity-70">
            Made with <span className="text-red-500">♥</span> in NY
          </p>
        </div>
      </footer>

      {/* Onboarding tips for new users */}
      {user && ownBooks.length > 0 && !isViewingFriend && <OnboardingTips />}
      
      {/* Share nudge after 5+ books */}
      {user && !isViewingFriend && <ShareNudge bookCount={ownBooks.length} />}
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import { Bookshelf } from '@/components/Bookshelf';
import { MobileBookshelf } from '@/components/MobileBookshelf';
import { SkinPicker } from '@/components/SkinPicker';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ShelfControls } from '@/components/ShelfControls';
import { AddBookDialog } from '@/components/AddBookDialog';
import { ImportBooksDialog } from '@/components/ImportBooksDialog';
import { ShareShelfDialog } from '@/components/ShareShelfDialog';
import { AuthButton } from '@/components/AuthButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DiscoverCollections } from '@/components/DiscoverCollections';
import { useBooks } from '@/hooks/useBooks';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { BookStatus, SortOption, Book } from '@/types/book';
import { demoBooks } from '@/data/demoBooks';
import { Library, Loader2 } from 'lucide-react';

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
  const [sortOption, setSortOption] = useState<SortOption>('random');
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());
  
  const { user, loading: authLoading } = useAuth();
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
  } = useBooks();

  // Get all books - demo for guests, real for authenticated users
  const allBooks = useMemo(() => {
    return user ? books : demoBooks;
  }, [user, books]);

  // Sort books
  const sortedBooks = useMemo(() => {
    return sortBooks(allBooks, sortOption, shuffleSeed);
  }, [allBooks, sortOption, shuffleSeed]);

  // Calculate book counts by status
  const bookCounts = useMemo(() => {
    return {
      reading: allBooks.filter(b => b.status === 'reading').length,
      'want-to-read': allBooks.filter(b => b.status === 'want-to-read').length,
      read: allBooks.filter(b => b.status === 'read').length,
    };
  }, [allBooks]);

  const handleShuffle = useCallback(() => {
    setShuffleSeed(Date.now());
    setSortOption('random');
  }, []);

  return (
    <div className="min-h-screen office-wall overflow-x-hidden">
      {/* Ambient top light */}
      {settings.showAmbientLight && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none transition-opacity duration-500"
          style={{
            background: 'radial-gradient(ellipse at center top, hsla(45, 70%, 75%, 0.3) 0%, hsla(35, 60%, 60%, 0.1) 40%, transparent 70%)',
          }}
        />
      )}
      
      {/* Header */}
      <header className="relative border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-md">
              <Library className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <h1 className="text-3xl font-normal tracking-wide bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700 bg-clip-text text-transparent font-display">
                <span className="italic">Shelvy</span>Books
              </h1>
              <p className="text-xs text-muted-foreground">Your personal bookshelf, beautifully organized</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
        {/* Loading state */}
        {(authLoading || booksLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Not signed in message */}
        {!authLoading && !user && (
          <div className="py-4 mb-4">
            <p className="text-foreground/80 text-base">
              <span className="text-amber-700 dark:text-amber-500 font-medium">Track</span> your reading journey, <span className="text-amber-700 dark:text-amber-500 font-medium">organize</span> by status, and <span className="text-amber-700 dark:text-amber-500 font-medium">discover</span> new favorites. <span className="text-primary font-medium cursor-pointer hover:underline">Sign in</span> to build your own shelf — here's a preview:
            </p>
          </div>
        )}

        {/* Shelf Controls & Bookshelf */}
        {!authLoading && !booksLoading && (
          <>
            {/* Empty shelf - show collection suggestions prominently */}
            {user && allBooks.length === 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Your shelf is empty. Browse collections below or add a book manually.</p>
                  <AddBookDialog onAddBook={addBook} defaultStatus="reading" />
                </div>
                <DiscoverCollections 
                  onAddBook={addBook} 
                  isEmptyShelf={true} 
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <ShelfControls
                    activeFilters={activeFilters}
                    onFilterChange={setActiveFilters}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    onShuffle={handleShuffle}
                    bookCounts={bookCounts}
                  />
                  
                  {user && (
                    <div className="flex items-center gap-2">
                      <ShareShelfDialog />
                      <ImportBooksDialog onAddBook={addBook} />
                      <AddBookDialog onAddBook={addBook} defaultStatus="reading" />
                    </div>
                  )}
                </div>

                {/* Discover collections (collapsible) - only for logged in users with books */}
                {user && allBooks.length > 0 && (
                  <DiscoverCollections onAddBook={addBook} />
                )}

                <div className="hidden sm:flex items-center justify-end mb-6">
                  <SkinPicker currentSkin={shelfSkin} onSkinChange={setShelfSkin} />
                </div>

                {isMobile ? (
                  <MobileBookshelf
                    books={sortedBooks}
                    skin={shelfSkin}
                    settings={settings}
                    activeFilters={activeFilters}
                    onMoveBook={user ? moveBook : undefined}
                    onRemoveBook={user ? removeBook : undefined}
                  />
                ) : (
                  <Bookshelf
                    books={sortedBooks}
                    skin={shelfSkin}
                    settings={settings}
                    activeFilters={activeFilters}
                    onMoveBook={user ? moveBook : undefined}
                    onRemoveBook={user ? removeBook : undefined}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Footer hint - only show for logged in users */}
      {user && (
        <footer className="relative z-10 py-6">
          <div className="container text-center text-sm text-muted-foreground">
            <p>Right-click a book to move it or remove it from your shelf</p>
          </div>
        </footer>
      )}
    </div>
  );
}

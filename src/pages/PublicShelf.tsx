import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bookshelf } from '@/components/Bookshelf';
import { MobileBookshelf } from '@/components/MobileBookshelf';
import { BookDetailDialog } from '@/components/BookDetailDialog';
import { ShelfControls } from '@/components/ShelfControls';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthButton } from '@/components/AuthButton';
import { FollowButton } from '@/components/FollowButton';
import { CopyShelfLink } from '@/components/CopyShelfLink';
import { InlineShelfNameEditor } from '@/components/InlineShelfNameEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useBooks } from '@/hooks/useBooks';
import { useIsMobile } from '@/hooks/use-mobile';
import { Book, ShelfSettings as ShelfSettingsType, BookStatus, SortOption } from '@/types/book';
import { Library, Loader2, Lock, BookOpen, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShelfOwner {
  display_name: string | null;
  share_id: string;
  username: string | null;
  user_id: string | null;
}

const DEFAULT_SETTINGS: ShelfSettingsType = {
  showBookends: true,
  showWoodGrain: true,
  showAmbientLight: true,
  showPlant: true,
  decorDensity: 'balanced',
  backgroundTheme: 'office',
};

const STATUS_ORDER: Record<BookStatus, number> = {
  'reading': 0,
  'want-to-read': 1,
  'read': 2,
};

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

export default function PublicShelf() {
  const { shareId } = useParams<{ shareId: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { addBook, books: userBooks } = useBooks();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shelfOwner, setShelfOwner] = useState<ShelfOwner | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeFilters, setActiveFilters] = useState<BookStatus[]>([]);
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('random');
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());

  // Check if a book is already on the user's shelf
  const isBookOnShelf = useCallback((title: string, author: string) => {
    return userBooks.some(
      (b) => b.title.toLowerCase() === title.toLowerCase() && 
             b.author.toLowerCase() === author.toLowerCase()
    );
  }, [userBooks]);

  const handleAddToShelf = useCallback(async (book: Book) => {
    if (isBookOnShelf(book.title, book.author)) {
      toast.info(`"${book.title}" is already in your library.`);
      return;
    }
    await addBook({
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl || '',
      status: 'want-to-read',
    });
    toast.success(`"${book.title}" has been added to your shelf!`);
  }, [addBook, isBookOnShelf]);

  useEffect(() => {
    async function loadPublicShelf() {
      if (!shareId) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        // Fetch shelf info, owner username, and owner user_id using secure RPC functions
        // This prevents bulk enumeration of public shelves
        const [shelfResult, usernameResult, ownerIdResult] = await Promise.all([
          supabase.rpc('get_public_shelf_info', { _share_id: shareId }),
          supabase.rpc('get_public_shelf_owner_username', { _share_id: shareId }),
          supabase.rpc('get_public_shelf_owner_id', { _share_id: shareId }),
        ]);

        if (shelfResult.error) throw shelfResult.error;
        
        const shelfData = shelfResult.data?.[0];
        if (!shelfData) {
          setError('Shelf not found');
          setLoading(false);
          return;
        }

        setShelfOwner({
          display_name: shelfData.display_name,
          share_id: shelfData.share_id ?? shareId,
          username: usernameResult.data || null,
          user_id: ownerIdResult.data || null,
        });

        // Fetch books using secure RPC function (avoids exposing user_id)
        const { data: booksData, error: booksError } = await supabase
          .rpc('get_public_shelf_books', { _share_id: shareId });

        if (booksError) throw booksError;

        // Transform to Book type
        const transformedBooks: Book[] = (booksData || []).map((b: {
          id: string;
          title: string;
          author: string;
          color: string;
          status: string;
          cover_url: string | null;
          created_at: string;
          page_count: number | null;
          isbn: string | null;
          description: string | null;
          categories: string[] | null;
        }) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          color: b.color,
          status: b.status as BookStatus,
          coverUrl: b.cover_url || '/placeholder.svg',
          createdAt: b.created_at,
          pageCount: b.page_count ?? undefined,
          isbn: b.isbn ?? undefined,
          description: b.description ?? undefined,
          categories: b.categories ?? undefined,
        }));

        setBooks(transformedBooks);
      } catch (err) {
        console.error('Error loading public shelf:', err);
        setError('Failed to load shelf');
      } finally {
        setLoading(false);
      }
    }

    loadPublicShelf();
  }, [shareId]);

  // Extract unique categories from all books, sorted by frequency
  const availableCategories = useMemo(() => {
    const categoryCount = new Map<string, number>();
    books.forEach(book => {
      book.categories?.forEach(cat => {
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      });
    });
    // Sort by frequency (most common first), then alphabetically
    return Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([cat]) => cat);
  }, [books]);

  // Filter books by category
  const categoryFilteredBooks = useMemo(() => {
    if (activeCategoryFilters.length === 0) return books;
    return books.filter(book => 
      book.categories?.some(cat => activeCategoryFilters.includes(cat))
    );
  }, [books, activeCategoryFilters]);

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

  // Build shelf title: prefer display_name, then username, then fallback
  const shelfTitle = shelfOwner?.display_name 
    || (shelfOwner?.username ? `${shelfOwner.username}'s Bookshelf` : "Someone's Bookshelf");

  if (loading) {
    return (
      <div className="min-h-screen office-wall flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen office-wall flex flex-col items-center justify-center gap-4">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-2xl font-display">{error}</h1>
        <p className="text-muted-foreground">This shelf may be private or the link is invalid.</p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go to Shelvy
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen office-wall overflow-x-hidden">
      {/* Header */}
      <header className="relative border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-md">
                <Library className="w-7 h-7 text-amber-100" />
              </div>
              <div>
                <h1 className="text-4xl font-normal tracking-wide bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700 bg-clip-text text-transparent font-display">
                  Shelvy
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Your personal bookshelf, beautifully organized</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="container py-8 relative z-10">
        {/* Owner info - simplified header */}
        <div className="text-center mb-6">
          <InlineShelfNameEditor
            displayName={shelfOwner?.display_name || null}
            username={shelfOwner?.username || null}
            bookCount={books.length}
            isOwner={!!user && user.id === shelfOwner?.user_id}
            onSave={async (newName) => {
              // Update display name in database
              const { error } = await supabase
                .from('shelf_settings')
                .update({ display_name: newName || null })
                .eq('user_id', user!.id);
              
              if (error) {
                toast.error('Failed to update shelf name');
                throw error;
              }
              
              // Update local state
              setShelfOwner(prev => prev ? { ...prev, display_name: newName || null } : null);
              toast.success('Shelf name updated!');
            }}
          />
        </div>

        {/* Controls row - Desktop */}
        <div className="hidden sm:flex flex-wrap items-center justify-center gap-3 mb-6">
          {/* My Account - for logged-in users */}
          {user && (
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                My Account
              </Button>
            </Link>
          )}
          
          {/* Follow button - only show if viewing someone else's shelf */}
          {shelfOwner?.user_id && user?.id !== shelfOwner.user_id && (
            <FollowButton targetUserId={shelfOwner.user_id} />
          )}
          
          {/* Share button */}
          <CopyShelfLink />
          
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
          
          {/* CTA for logged-out users - inline with controls */}
          {!user && (
            <Link to="/">
              <Button size="sm" className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md">
                <BookOpen className="w-4 h-4" />
                Start Your Shelf
              </Button>
            </Link>
          )}
        </div>

        {/* Controls row - Mobile: more compact */}
        <div className="sm:hidden flex items-center justify-center gap-2 mb-6">
          {/* Follow button - only show if viewing someone else's shelf */}
          {shelfOwner?.user_id && user?.id !== shelfOwner.user_id && (
            <FollowButton targetUserId={shelfOwner.user_id} iconOnly />
          )}
          
          {/* Share button - compact on mobile */}
          <CopyShelfLink compact />
          
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
            compact
          />
          
          {/* CTA for logged-out users */}
          {!user && (
            <Link to="/">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md px-3">
                <BookOpen className="w-4 h-4" />
                <span className="sr-only">Start Your Shelf</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Bookshelf - Mobile vs Desktop */}
        {isMobile ? (
          <MobileBookshelf
            books={sortedBooks}
            skin="oak"
            settings={DEFAULT_SETTINGS}
            activeFilters={activeFilters}
            onSelectBook={setSelectedBook}
          />
        ) : (
          <Bookshelf
            books={sortedBooks}
            skin="oak"
            settings={DEFAULT_SETTINGS}
            activeFilters={activeFilters}
            onSelectBook={setSelectedBook}
          />
        )}
      </main>

      {/* Book detail dialog */}
      <BookDetailDialog
        book={selectedBook}
        open={!!selectedBook}
        onOpenChange={(open) => !open && setSelectedBook(null)}
        onAddToShelf={handleAddToShelf}
        isOnShelf={selectedBook ? isBookOnShelf(selectedBook.title, selectedBook.author) : false}
      />
    </div>
  );
}

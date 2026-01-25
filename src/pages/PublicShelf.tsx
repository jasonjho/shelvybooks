import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bookshelf } from '@/components/Bookshelf';
import { BookInteractions } from '@/components/BookInteractions';
import { BookDetailDialog } from '@/components/BookDetailDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import { Book, ShelfSettings as ShelfSettingsType, BookStatus } from '@/types/book';
import { Library, Loader2, ArrowLeft, Lock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShelfOwner {
  user_id: string;
  display_name: string | null;
  share_id: string;
}

const DEFAULT_SETTINGS: ShelfSettingsType = {
  showBookends: true,
  showWoodGrain: true,
  showAmbientLight: true,
  showPlant: true,
  decorDensity: 'balanced',
};

export default function PublicShelf() {
  const { shareId } = useParams<{ shareId: string }>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shelfOwner, setShelfOwner] = useState<ShelfOwner | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    async function loadPublicShelf() {
      if (!shareId) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        // Fetch shelf settings by share_id
        const { data: shelfData, error: shelfError } = await supabase
          .from('shelf_settings')
          .select('user_id, display_name, share_id, is_public')
          .eq('share_id', shareId)
          .maybeSingle();

        if (shelfError) throw shelfError;
        
        if (!shelfData) {
          setError('Shelf not found');
          setLoading(false);
          return;
        }

        if (!shelfData.is_public) {
          setError('This shelf is private');
          setLoading(false);
          return;
        }

        setShelfOwner({
          user_id: shelfData.user_id,
          display_name: shelfData.display_name,
          share_id: shelfData.share_id,
        });

        // Fetch books for this user
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', shelfData.user_id)
          .order('created_at', { ascending: true });

        if (booksError) throw booksError;

        // Transform to Book type
        const transformedBooks: Book[] = (booksData || []).map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          color: b.color,
          status: b.status as BookStatus,
          coverUrl: b.cover_url || '/placeholder.svg',
          createdAt: b.created_at,
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

  const shelfTitle = shelfOwner?.display_name || "Someone's Bookshelf";

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
            Go to ShelvyBooks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen office-wall">
      {/* Header */}
      <header className="relative border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-md">
                <Library className="w-6 h-6 text-amber-100" />
              </div>
              <div>
                <h1 className="text-3xl font-normal tracking-wide bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700 bg-clip-text text-transparent font-display">
                  <span className="italic">Shelvy</span>Books
                </h1>
                <p className="text-sm text-muted-foreground">Your personal bookshelf, beautifully organized</p>
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
        {/* Owner info */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-display mb-2">{shelfTitle}</h2>
          <p className="text-muted-foreground">
            {books.length} book{books.length !== 1 ? 's' : ''} on the shelf
          </p>
          {!user && (
            <div className="mt-6 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-4">
                <span className="text-amber-600 dark:text-amber-500 font-medium">Track</span> your reading journey, {' '}
                <span className="text-amber-600 dark:text-amber-500 font-medium">organize</span> by status, and {' '}
                <span className="text-amber-600 dark:text-amber-500 font-medium">discover</span> new favorites.
              </p>
              <Link to="/">
                <Button className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md">
                  <BookOpen className="w-4 h-4" />
                  Start Your Shelf
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Bookshelf */}
        <Bookshelf
          books={books}
          skin="oak"
          settings={DEFAULT_SETTINGS}
          activeFilters={[]}
        />
      </main>

      {/* Book detail dialog */}
      <BookDetailDialog
        book={selectedBook}
        open={!!selectedBook}
        onOpenChange={(open) => !open && setSelectedBook(null)}
      />
    </div>
  );
}

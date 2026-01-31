import { useState, useEffect, useCallback } from 'react';
import { getDailyQuote, bookQuotes, BookQuote } from '@/data/bookQuotes';
import { Button } from '@/components/ui/button';
import { Plus, X, Quote, EyeOff, Shuffle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { BookStatus } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
interface DailyQuoteProps {
  onAddBook: (book: Omit<import('@/types/book').Book, 'id'>) => void;
  existingBooks: { title: string; author: string }[];
}

const DISMISSED_KEY = 'daily-quote-dismissed';
const DISABLED_KEY = 'daily-quote-disabled';

export function DailyQuote({ onAddBook, existingBooks }: DailyQuoteProps) {
  const { user } = useAuth();
  const [quote, setQuote] = useState<BookQuote | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localIndex, setLocalIndex] = useState(0);

  useEffect(() => {
    // Check if permanently disabled
    if (localStorage.getItem(DISABLED_KEY) === 'true') {
      setDismissed(true);
      return;
    }

    const dailyQuote = getDailyQuote();
    setQuote(dailyQuote);

    // Check if already dismissed today
    const dismissedDate = localStorage.getItem(DISMISSED_KEY);
    const today = new Date().toDateString();
    if (dismissedDate === today) {
      setDismissed(true);
    }
  }, []);

  // Check if current quote's book is on shelf
  useEffect(() => {
    if (!quote) return;
    const isOnShelf = existingBooks.some(
      (b) =>
        b.title.toLowerCase() === quote.book.title.toLowerCase() &&
        b.author.toLowerCase() === quote.book.author.toLowerCase()
    );
    setAdded(isOnShelf);
  }, [quote, existingBooks]);

  const fetchDynamicQuote = useCallback(async () => {
    setLoading(true);
    try {
      // Send existing book titles to avoid duplicates
      const excludeTitles = existingBooks.map(b => b.title);
      
      const { data, error } = await supabase.functions.invoke('generate-quote', {
        body: { excludeTitles },
      });
      
      if (error) throw error;
      
      if (data?.quote && data?.book) {
        setQuote({
          quote: data.quote,
          book: {
            title: data.book.title,
            author: data.book.author,
            coverUrl: data.book.coverUrl || '/placeholder.svg',
          },
        });
      }
    } catch (err) {
      console.error('Failed to fetch dynamic quote, using local:', err);
      // Fallback to next local quote
      const nextIndex = (localIndex + 1) % bookQuotes.length;
      setLocalIndex(nextIndex);
      setQuote(bookQuotes[nextIndex]);
    } finally {
      setLoading(false);
    }
  }, [localIndex, existingBooks]);

  const handleNextQuote = () => {
    // Always use AI for shuffle when logged in (more reliable covers)
    if (user) {
      fetchDynamicQuote();
    } else {
      const nextIndex = (localIndex + 1) % bookQuotes.length;
      setLocalIndex(nextIndex);
      setQuote(bookQuotes[nextIndex]);
    }
  };

  const handleDismissToday = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, new Date().toDateString());
  };

  const handleDisablePermanently = () => {
    setDismissed(true);
    localStorage.setItem(DISABLED_KEY, 'true');
  };

  const handleAddBook = () => {
    if (!quote || !user) return;

    onAddBook({
      title: quote.book.title,
      author: quote.book.author,
      coverUrl: quote.book.coverUrl,
      status: 'want-to-read' as BookStatus,
    });
    setAdded(true);
  };

  if (dismissed || !quote) return null;

  return (
    <div
      className={cn(
        'relative mb-4 px-3 py-2 rounded-md flex items-center gap-2',
        'bg-amber-50/50 dark:bg-amber-950/20',
        'border border-amber-200/30 dark:border-amber-800/20'
      )}
    >
      <Quote className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
      
      <p className={cn(
        "flex-1 min-w-0 text-sm text-foreground/80 truncate transition-opacity",
        loading && "opacity-50"
      )}>
        <span className="italic">{quote.quote}</span>
      </p>

      {/* Compact actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleNextQuote}
          disabled={loading}
          className="p-1 rounded text-amber-600/60 hover:text-amber-700 hover:bg-amber-100/50 dark:text-amber-400/60 dark:hover:text-amber-300 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
          aria-label="Next quote"
          title="Next quote"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Shuffle className="w-3.5 h-3.5" />
          )}
        </button>

        {user && !added && (
          <Button
            size="sm"
            onClick={handleAddBook}
            disabled={loading}
            className="h-6 text-xs gap-1 px-2 bg-amber-600 hover:bg-amber-700 text-white"
            title={`Add "${quote.book.title}" to shelf`}
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Dismiss options"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleDismissToday}>
              <X className="w-4 h-4 mr-2" />
              Hide for today
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDisablePermanently} className="text-muted-foreground">
              <EyeOff className="w-4 h-4 mr-2" />
              Don't show again
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

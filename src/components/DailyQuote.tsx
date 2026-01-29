import { useState, useEffect, useCallback } from 'react';
import { getDailyQuote, bookQuotes, BookQuote } from '@/data/bookQuotes';
import { Button } from '@/components/ui/button';
import { Book, Plus, X, Quote, EyeOff, Shuffle, Loader2 } from 'lucide-react';
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
      const { data, error } = await supabase.functions.invoke('generate-quote');
      
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
  }, [localIndex]);

  const handleNextQuote = () => {
    // Alternate between local and dynamic quotes
    if (user && Math.random() > 0.5) {
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
        'relative mb-4 px-4 py-3 rounded-lg',
        'bg-gradient-to-r from-amber-50/70 to-orange-50/50',
        'dark:from-amber-950/30 dark:to-orange-950/20',
        'border border-amber-200/40 dark:border-amber-800/20'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Book cover */}
        <img
          src={quote.book.coverUrl}
          alt={quote.book.title}
          className={cn(
            "w-10 h-14 object-cover rounded shadow-sm flex-shrink-0 transition-opacity",
            loading && "opacity-50"
          )}
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />

        {/* Quote & book info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-serif italic text-foreground/85 line-clamp-2 leading-snug transition-opacity",
            loading && "opacity-50"
          )}>
            <Quote className="inline w-3 h-3 text-amber-400/60 mr-1 -mt-0.5" />
            {quote.quote}
          </p>
          <p className={cn(
            "text-xs text-muted-foreground mt-1 truncate transition-opacity",
            loading && "opacity-50"
          )}>
            — <span className="font-medium">{quote.book.title}</span> by {quote.book.author}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Next quote button */}
          <button
            onClick={handleNextQuote}
            disabled={loading}
            className="p-1.5 rounded text-amber-600/70 hover:text-amber-700 hover:bg-amber-100/50 dark:text-amber-400/70 dark:hover:text-amber-300 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
            aria-label="Next quote"
            title="Next quote"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shuffle className="w-4 h-4" />
            )}
          </button>

          {user && (
            <Button
              size="sm"
              variant={added ? 'secondary' : 'default'}
              onClick={handleAddBook}
              disabled={added || loading}
              className={cn(
                'h-7 text-xs gap-1 px-2',
                !added && 'bg-amber-600 hover:bg-amber-700 text-white'
              )}
            >
              {added ? (
                <>
                  <Book className="w-3 h-3" />
                  <span className="hidden sm:inline">Added</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </Button>
          )}

          {/* Dismiss dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Dismiss options"
              >
                <X className="w-4 h-4" />
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
    </div>
  );
}

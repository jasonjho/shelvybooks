import { useState, useEffect } from 'react';
import { getDailyQuote, BookQuote } from '@/data/bookQuotes';
import { Button } from '@/components/ui/button';
import { Book, Plus, X, Quote, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { BookStatus } from '@/types/book';

interface DailyQuoteProps {
  onAddBook: (book: Omit<import('@/types/book').Book, 'id'>) => void;
  existingBooks: { title: string; author: string }[];
}

const DISMISSED_KEY = 'daily-quote-dismissed';

export function DailyQuote({ onAddBook, existingBooks }: DailyQuoteProps) {
  const { user } = useAuth();
  const [quote, setQuote] = useState<BookQuote | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const dailyQuote = getDailyQuote();
    setQuote(dailyQuote);

    // Check if already dismissed today
    const dismissedDate = localStorage.getItem(DISMISSED_KEY);
    const today = new Date().toDateString();
    if (dismissedDate === today) {
      setDismissed(true);
    }

    // Check if book is already on shelf
    const isOnShelf = existingBooks.some(
      (b) =>
        b.title.toLowerCase() === dailyQuote.book.title.toLowerCase() &&
        b.author.toLowerCase() === dailyQuote.book.author.toLowerCase()
    );
    setAdded(isOnShelf);
  }, [existingBooks]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, new Date().toDateString());
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
        'relative mb-6 p-4 sm:p-5 rounded-xl',
        'bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/80',
        'dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/40',
        'border border-amber-200/50 dark:border-amber-800/30',
        'shadow-sm'
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground/60 hover:text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        aria-label="Dismiss quote"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Quote section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Quote of the Day
            </span>
          </div>

          <blockquote className="relative">
            <Quote className="absolute -top-1 -left-1 w-6 h-6 text-amber-300/50 dark:text-amber-700/50" />
            <p className="text-base sm:text-lg font-serif italic text-foreground/90 pl-5 leading-relaxed">
              {quote.quote}
            </p>
          </blockquote>
        </div>

        {/* Book info */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:justify-center sm:min-w-[140px]">
          <img
            src={quote.book.coverUrl}
            alt={quote.book.title}
            className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded shadow-md flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          <div className="flex flex-col sm:items-end gap-1">
            <p className="text-sm font-medium text-foreground/80 line-clamp-1">
              {quote.book.title}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {quote.book.author}
            </p>
            
            {user && (
              <Button
                size="sm"
                variant={added ? 'secondary' : 'default'}
                onClick={handleAddBook}
                disabled={added}
                className={cn(
                  'mt-1 h-7 text-xs gap-1',
                  !added && 'bg-amber-600 hover:bg-amber-700 text-white'
                )}
              >
                {added ? (
                  <>
                    <Book className="w-3 h-3" />
                    On Shelf
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    Add to Shelf
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

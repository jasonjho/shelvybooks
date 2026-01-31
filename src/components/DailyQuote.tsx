import { useState, useEffect } from 'react';
import { getDailyQuote, BookQuote } from '@/data/bookQuotes';
import { X, Quote, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DailyQuoteProps {
  onAddBook?: (book: Omit<import('@/types/book').Book, 'id'>) => void;
  existingBooks?: { title: string; author: string }[];
}

const DISMISSED_KEY = 'daily-quote-dismissed';
const DISABLED_KEY = 'daily-quote-disabled';

export function DailyQuote({ }: DailyQuoteProps) {
  const [quote, setQuote] = useState<BookQuote | null>(null);
  const [dismissed, setDismissed] = useState(false);

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

  const handleDismissToday = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, new Date().toDateString());
  };

  const handleDisablePermanently = () => {
    setDismissed(true);
    localStorage.setItem(DISABLED_KEY, 'true');
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
      
      <p className="flex-1 min-w-0 text-sm text-foreground/80 truncate">
        <span className="italic">"{quote.quote}"</span>
        <span className="text-muted-foreground ml-2">
          — {quote.book.title}, {quote.book.author}
        </span>
      </p>

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
  );
}

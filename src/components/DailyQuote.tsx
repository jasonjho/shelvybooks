import { useState, useEffect } from 'react';
import { getDailyQuote, BookQuote } from '@/data/bookQuotes';
import { X, Quote, EyeOff, ChevronDown } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);

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
        'relative mb-2 sm:mb-4 px-3 py-2 rounded-md',
        'bg-amber-50/50 dark:bg-amber-950/20',
        'border border-amber-200/30 dark:border-amber-800/20'
      )}
    >
      {/* Desktop: single line with truncation */}
      <div className="hidden sm:flex items-center gap-2">
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

      {/* Mobile: expandable quote */}
      <div className="sm:hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left flex items-start gap-2"
        >
          <Quote className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm text-foreground/80 transition-all",
              !expanded && "line-clamp-2"
            )}>
              <span className="italic">"{quote.quote}"</span>
            </p>
            <p className={cn(
              "text-xs text-muted-foreground mt-1 transition-all",
              !expanded && "truncate"
            )}>
              — {quote.book.title}, {quote.book.author}
            </p>
          </div>

          <ChevronDown className={cn(
            "w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5 transition-transform",
            expanded && "rotate-180"
          )} />
        </button>

        {/* Dismiss button row - shown when expanded */}
        {expanded && (
          <div className="flex justify-end mt-2 pt-2 border-t border-amber-200/20 dark:border-amber-800/10">
            <div className="flex gap-1">
              <button
                onClick={handleDismissToday}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Hide today
              </button>
              <button
                onClick={handleDisablePermanently}
                className="text-xs text-muted-foreground/40 hover:text-muted-foreground px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Don't show
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

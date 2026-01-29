import { useState } from 'react';
import { Book } from '@/types/book';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookInteractions } from '@/components/BookInteractions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { normalizeCoverUrl } from '@/lib/normalizeCoverUrl';
import { format } from 'date-fns';
import { CalendarCheck } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface BookDetailDialogProps {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCompletedAt?: (id: string, completedAt: string | null) => void;
}

export function BookDetailDialog({ book, open, onOpenChange, onUpdateCompletedAt }: BookDetailDialogProps) {
  const { setAuthDialogOpen } = useAuth();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  if (!book) return null;

  // Demo books have non-UUID IDs like "demo-1"
  const isDemoBook = book.id.startsWith('demo-');

  // Link to Amazon search for the book
  const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}`;
  const coverSrc = normalizeCoverUrl(book.coverUrl);

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onUpdateCompletedAt) {
      onUpdateCompletedAt(book.id, date.toISOString());
    }
    setDatePickerOpen(false);
  };

  const completedDate = book.completedAt ? new Date(book.completedAt) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-sans font-semibold">{book.title}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Book cover */}
          <div className="shrink-0">
            <div
              className="w-24 h-36 rounded-md shadow-lg bg-muted"
              style={{
                backgroundImage: `url(${coverSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>

          {/* Book info */}
          <div className="flex-1 min-w-0">
            <p className="text-muted-foreground text-sm">{book.author}</p>
            
            {/* Completed date - editable */}
            {book.status === 'read' && !isDemoBook && onUpdateCompletedAt ? (
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button 
                    className={cn(
                      "flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors",
                      "hover:underline cursor-pointer"
                    )}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>
                      {completedDate 
                        ? `Finished ${format(completedDate, 'MMM d, yyyy')}`
                        : 'Set completion date'
                      }
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={completedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            ) : book.status === 'read' && book.completedAt ? (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Finished {format(new Date(book.completedAt), 'MMM d, yyyy')}</span>
              </div>
            ) : null}
            
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-xs mt-2 inline-block"
            >
              View on Amazon →
            </a>
          </div>
        </div>

        {/* Interactions - only for real books */}
        {isDemoBook ? (
          <div className="text-center py-4 border-t border-border">
            <p className="text-muted-foreground text-sm">
              <button
                onClick={() => setAuthDialogOpen(true)}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
              {' '}to like books and leave comments
            </p>
          </div>
        ) : (
          <BookInteractions bookId={book.id} bookTitle={book.title} />
        )}
      </DialogContent>
    </Dialog>
  );
}

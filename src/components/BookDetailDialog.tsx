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
import { Badge } from '@/components/ui/badge';
import { normalizeCoverUrl } from '@/lib/normalizeCoverUrl';
import { format } from 'date-fns';
import { CalendarCheck, BookMarked, Check, BookOpen, Hash, Tag } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BookDetailDialogProps {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCompletedAt?: (id: string, completedAt: string | null) => void;
  /** For public shelf viewing - callback to add book to user's shelf */
  onAddToShelf?: (book: Book) => void;
  /** Whether the book is already on user's shelf */
  isOnShelf?: boolean;
}

export function BookDetailDialog({ book, open, onOpenChange, onUpdateCompletedAt, onAddToShelf, isOnShelf }: BookDetailDialogProps) {
  const { user, setAuthDialogOpen } = useAuth();
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
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-muted-foreground text-sm">{book.author}</p>
            
            {/* Page count & ISBN */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {book.pageCount && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {book.pageCount} pages
                </span>
              )}
              {book.isbn && (
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="font-mono text-[10px]">{book.isbn}</span>
                </span>
              )}
            </div>
            
            {/* Categories */}
            {book.categories && book.categories.length > 0 && (
              <div className="flex items-start gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {book.categories.slice(0, 4).map((cat, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {cat.length > 25 ? cat.slice(0, 25) + '…' : cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Completed date - editable */}
            {book.status === 'read' && !isDemoBook && onUpdateCompletedAt ? (
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button 
                    className={cn(
                      "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
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
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Finished {format(new Date(book.completedAt), 'MMM d, yyyy')}</span>
              </div>
            ) : null}
            
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-xs inline-block"
            >
              View on Amazon →
            </a>

            {/* Add to shelf button for public shelf viewing */}
            {onAddToShelf && (
              <div className="pt-1">
                {user ? (
                  <Button
                    size="sm"
                    variant={isOnShelf ? "secondary" : "default"}
                    disabled={isOnShelf}
                    onClick={() => onAddToShelf(book)}
                    className="gap-1.5"
                  >
                    {isOnShelf ? (
                      <>
                        <Check className="w-4 h-4" />
                        On Your Shelf
                      </>
                    ) : (
                      <>
                        <BookMarked className="w-4 h-4" />
                        Add to My Shelf
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAuthDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <BookMarked className="w-4 h-4" />
                    Sign in to Add
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description section */}
        {book.description && (
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Description</p>
            <ScrollArea className="h-24">
              <p className="text-sm text-foreground/80 leading-relaxed pr-3">
                {book.description}
              </p>
            </ScrollArea>
          </div>
        )}

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

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

interface BookDetailDialogProps {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookDetailDialog({ book, open, onOpenChange }: BookDetailDialogProps) {
  const { setAuthDialogOpen } = useAuth();
  
  if (!book) return null;

  // Demo books have non-UUID IDs like "demo-1"
  const isDemoBook = book.id.startsWith('demo-');

  // Link to Amazon search for the book
  const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}`;
  const coverSrc = normalizeCoverUrl(book.coverUrl);

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

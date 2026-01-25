import { Book } from '@/types/book';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookInteractions } from '@/components/BookInteractions';

interface BookDetailDialogProps {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookDetailDialog({ book, open, onOpenChange }: BookDetailDialogProps) {
  if (!book) return null;

  const openLibraryUrl = book.openLibraryKey
    ? `https://openlibrary.org${book.openLibraryKey}`
    : `https://openlibrary.org/search?q=${encodeURIComponent(book.title + ' ' + book.author)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">{book.title}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Book cover */}
          <div className="shrink-0">
            <div
              className="w-24 h-36 rounded-md shadow-lg bg-muted"
              style={{
                backgroundImage: `url(${book.coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>

          {/* Book info */}
          <div className="flex-1 min-w-0">
            <p className="text-muted-foreground text-sm">{book.author}</p>
            <a
              href={openLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-xs mt-2 inline-block"
            >
              View on Open Library →
            </a>
          </div>
        </div>

        {/* Interactions */}
        <BookInteractions bookId={book.id} bookTitle={book.title} />
      </DialogContent>
    </Dialog>
  );
}

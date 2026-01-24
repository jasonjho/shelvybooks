import { Book, BookStatus, ShelfSkin } from '@/types/book';
import { BookSpine } from './BookSpine';
import { cn } from '@/lib/utils';

interface BookshelfProps {
  books: Book[];
  skin: ShelfSkin;
  onMoveBook: (id: string, status: BookStatus) => void;
  onRemoveBook: (id: string) => void;
}

export function Bookshelf({ books, skin, onMoveBook, onRemoveBook }: BookshelfProps) {
  // Split books into rows of 6
  const booksPerRow = 6;
  const rows: Book[][] = [];
  
  for (let i = 0; i < books.length; i += booksPerRow) {
    rows.push(books.slice(i, i + booksPerRow));
  }

  // Ensure at least one empty row for visual appeal
  if (rows.length === 0) {
    rows.push([]);
  }

  return (
    <div className="space-y-6">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn('shelf-row', `shelf-${skin}`)}
        >
          {row.map((book, bookIndex) => (
            <div
              key={book.id}
              className="animate-slide-in"
              style={{ animationDelay: `${bookIndex * 50}ms` }}
            >
              <BookSpine
                book={book}
                onMove={onMoveBook}
                onRemove={onRemoveBook}
              />
            </div>
          ))}
          
          {/* Empty shelf message */}
          {row.length === 0 && (
            <div className="flex items-center justify-center w-full h-24 text-muted-foreground text-sm italic">
              No books on this shelf yet
            </div>
          )}
          
          {/* Shelf surface */}
          <div className="shelf-surface" />
          <div className="shelf-front" />
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';
import { BookSpine } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { cn } from '@/lib/utils';

interface BookshelfProps {
  books: Book[];
  skin: ShelfSkin;
  settings: ShelfSettings;
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
}

function Bookend() {
  return <div className="bookend" />;
}

function PlantDecor() {
  return (
    <div className="plant-pot">
      <div className="plant-leaves" />
      <div className="pot" />
    </div>
  );
}

export function Bookshelf({ books, skin, settings, onMoveBook, onRemoveBook }: BookshelfProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Ensure at least one empty row for empty state
  const hasBooks = books.length > 0;

  const skinClass = `skin-${skin}`;
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';

  return (
    <div className={cn('bookcase p-4', skinClass, grainClass)}>
      <div className={cn('shelf-row', `shelf-${skin}`, grainClass)}>
        {/* Shelf shadow */}
        <div className="shelf-shadow" />
        
        {/* Left bookend */}
        {settings.showBookends && hasBooks && <Bookend />}
        
        {/* Books grid - responsive with min/max width */}
        <div className="books-grid flex-1">
          {books.map((book, index) => (
            <div
              key={book.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <BookSpine
                book={book}
                onMove={onMoveBook}
                onRemove={onRemoveBook}
                onSelect={() => setSelectedBook(book)}
                isInteractive={!!onMoveBook && !!onRemoveBook}
              />
            </div>
          ))}
        </div>
        
        {/* Right decoration (plant on first position or bookend) */}
        {hasBooks && settings.showPlant && <PlantDecor />}
        {hasBooks && !settings.showPlant && settings.showBookends && <Bookend />}
        
        {/* Empty shelf message */}
        {!hasBooks && (
          <div className="flex items-center justify-center w-full h-24 text-muted-foreground/60 text-sm italic">
            Add some books to your shelf...
          </div>
        )}
        
        {/* Shelf surface */}
        <div className="shelf-surface" />
        <div className="shelf-front" />
      </div>

      {/* Book detail dialog */}
      <BookDetailDialog
        book={selectedBook}
        open={!!selectedBook}
        onOpenChange={(open) => !open && setSelectedBook(null)}
      />
    </div>
  );
}

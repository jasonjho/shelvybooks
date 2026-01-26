import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';
import { BookSpine } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { cn } from '@/lib/utils';
import { useState, useMemo, useRef, useEffect } from 'react';

interface MobileBookshelfProps {
  books: Book[];
  skin: ShelfSkin;
  settings: ShelfSettings;
  activeFilters: BookStatus[];
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
}

const BOOK_WIDTH = 55; // Width of mobile book covers
const BOOK_GAP = 4; // Gap between books (gap-1 = 0.25rem = 4px)
const SHELF_PADDING = 48; // Padding on left and right (1.5rem * 2 = 48px)

function MiniShelfRow({ 
  books, 
  skin, 
  settings,
  activeFilters,
  onMoveBook,
  onRemoveBook,
  onSelectBook,
}: { 
  books: Book[]; 
  skin: ShelfSkin; 
  settings: ShelfSettings;
  activeFilters: BookStatus[];
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
  onSelectBook: (book: Book) => void;
}) {
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';
  
  return (
    <div className={cn('mini-shelf', `shelf-${skin}`, grainClass)}>
      <div className="mini-shelf-back" />
      <div className="mini-shelf-content">
        {books.map((book) => {
          const isGrayed = activeFilters.length > 0 && !activeFilters.includes(book.status);
          return (
            <BookSpine
              key={book.id}
              book={book}
              onMove={onMoveBook}
              onRemove={onRemoveBook}
              onSelect={() => onSelectBook(book)}
              isInteractive={!!onMoveBook && !!onRemoveBook}
              isGrayed={isGrayed}
            />
          );
        })}
      </div>
      <div className="mini-shelf-surface" />
      <div className="mini-shelf-front" />
    </div>
  );
}

export function MobileBookshelf({ 
  books, 
  skin, 
  settings, 
  activeFilters, 
  onMoveBook, 
  onRemoveBook 
}: MobileBookshelfProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [booksPerRow, setBooksPerRow] = useState(4);
  const skinClass = `skin-${skin}`;
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';

  // Calculate how many books fit per row based on container width
  useEffect(() => {
    const updateBooksPerRow = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const availableWidth = containerWidth - SHELF_PADDING - 16; // Subtract shelf padding and container padding
      
      // Calculate how many books fit: N books take N*BOOK_WIDTH + (N-1)*BOOK_GAP
      const count = Math.max(3, Math.floor((availableWidth + BOOK_GAP) / (BOOK_WIDTH + BOOK_GAP)));
      setBooksPerRow(count);
    };

    updateBooksPerRow();
    const resizeObserver = new ResizeObserver(updateBooksPerRow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Split books into rows based on calculated capacity
  const bookRows = useMemo(() => {
    const rows: Book[][] = [];
    for (let i = 0; i < books.length; i += booksPerRow) {
      rows.push(books.slice(i, i + booksPerRow));
    }
    return rows;
  }, [books, booksPerRow]);

  return (
    <div ref={containerRef} className={cn('mobile-bookcase', skinClass, grainClass)}>
      {books.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm italic">
          Add some books to your shelf...
        </div>
      ) : (
        <div className="mobile-shelf-list">
          {bookRows.map((rowBooks, index) => (
            <MiniShelfRow
              key={index}
              books={rowBooks}
              skin={skin}
              settings={settings}
              activeFilters={activeFilters}
              onMoveBook={onMoveBook}
              onRemoveBook={onRemoveBook}
              onSelectBook={setSelectedBook}
            />
          ))}
        </div>
      )}

      <BookDetailDialog
        book={selectedBook}
        open={!!selectedBook}
        onOpenChange={(open) => !open && setSelectedBook(null)}
      />
    </div>
  );
}

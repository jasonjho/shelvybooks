import { useState, useRef, useEffect, useMemo } from 'react';
import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';
import { BookSpine } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { ShelfDecoration } from './ShelfDecorations';
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

type DecorationType = 'plant' | 'figurine' | 'globe' | 'hourglass' | 'candle' | 'photo' | 'vase';
const DECORATION_TYPES: DecorationType[] = ['plant', 'figurine', 'globe', 'hourglass', 'candle', 'photo', 'vase'];

// Generate decorations to fill empty slots in a row (limit to reasonable amount)
function generateRowDecorations(
  bookCount: number,
  maxPerRow: number,
  rowIndex: number
): { type: DecorationType; seed: number }[] {
  const emptySlots = maxPerRow - bookCount;
  if (emptySlots <= 0) return [];
  
  // Only fill up to 50% of empty space with decorations to avoid clutter
  // Also cap at 5 decorations max per row
  const decorationCount = Math.min(Math.floor(emptySlots * 0.5), 5);
  if (decorationCount <= 0) return [];
  
  const decorations: { type: DecorationType; seed: number }[] = [];
  
  for (let i = 0; i < decorationCount; i++) {
    decorations.push({
      type: DECORATION_TYPES[(rowIndex + i) % DECORATION_TYPES.length],
      seed: rowIndex * 10 + i,
    });
  }
  
  return decorations;
}

interface ShelfRowProps {
  books: Book[];
  rowIndex: number;
  maxPerRow: number;
  skin: ShelfSkin;
  settings: ShelfSettings;
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
  onSelectBook: (book: Book) => void;
}

function ShelfRow({
  books,
  rowIndex,
  maxPerRow,
  skin,
  settings,
  onMoveBook,
  onRemoveBook,
  onSelectBook,
}: ShelfRowProps) {
  const hasBooks = books.length > 0;
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';
  
  // Generate decorations for empty space in this row
  const decorations = settings.showPlant 
    ? generateRowDecorations(books.length, maxPerRow, rowIndex)
    : [];

  // Build items array: books first, then decorations to fill remaining space
  const items: Array<{ type: 'book'; book: Book } | { type: 'decoration'; decorationType: DecorationType; seed: number }> = [];
  
  // Add all books
  books.forEach(book => {
    items.push({ type: 'book', book });
  });
  
  // Add decorations to fill the remaining slots
  decorations.forEach((dec, i) => {
    items.push({ 
      type: 'decoration', 
      decorationType: dec.type, 
      seed: dec.seed 
    });
  });

  return (
    <div className={cn('shelf-row', `shelf-${skin}`, grainClass)}>
      {/* Shelf shadow */}
      <div className="shelf-shadow" />
      
      {/* Books and decorations */}
      <div className="books-grid flex-1">
        {/* Left bookend - only if no decorations */}
        {settings.showBookends && hasBooks && decorations.length === 0 && (
          <div className="flex items-end justify-center">
            <Bookend />
          </div>
        )}
        
        {items.map((item, index) => (
          <div
            key={item.type === 'book' ? item.book.id : `decor-${rowIndex}-${index}`}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {item.type === 'book' ? (
              <BookSpine
                book={item.book}
                onMove={onMoveBook}
                onRemove={onRemoveBook}
                onSelect={() => onSelectBook(item.book)}
                isInteractive={!!onMoveBook && !!onRemoveBook}
              />
            ) : (
              <ShelfDecoration
                type={item.decorationType}
                seed={item.seed}
              />
            )}
          </div>
        ))}
        
        {/* Right bookend - only if no decorations */}
        {settings.showBookends && hasBooks && decorations.length === 0 && (
          <div className="flex items-end justify-center">
            <Bookend />
          </div>
        )}
      </div>
      
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
  );
}

export function Bookshelf({ books, skin, settings, onMoveBook, onRemoveBook }: BookshelfProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [booksPerRow, setBooksPerRow] = useState(8);

  // Calculate how many books fit per row based on container width
  useEffect(() => {
    const updateBooksPerRow = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 32; // Account for padding (px-4 = 16px each side)
        // Each item is 70px wide with 8px gap = 78px per slot
        const perRow = Math.floor(containerWidth / 78);
        setBooksPerRow(Math.max(perRow, 3));
      }
    };

    updateBooksPerRow();
    const resizeObserver = new ResizeObserver(updateBooksPerRow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Split books into rows
  const bookRows = useMemo(() => {
    const rows: Book[][] = [];
    for (let i = 0; i < books.length; i += booksPerRow) {
      rows.push(books.slice(i, i + booksPerRow));
    }
    // Ensure at least one row for empty state
    if (rows.length === 0) {
      rows.push([]);
    }
    return rows;
  }, [books, booksPerRow]);

  const skinClass = `skin-${skin}`;
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';

  return (
    <div ref={containerRef} className={cn('bookcase p-4 flex flex-col gap-0', skinClass, grainClass)}>
      {bookRows.map((rowBooks, rowIndex) => (
        <ShelfRow
          key={rowIndex}
          books={rowBooks}
          rowIndex={rowIndex}
          maxPerRow={booksPerRow}
          skin={skin}
          settings={settings}
          onMoveBook={onMoveBook}
          onRemoveBook={onRemoveBook}
          onSelectBook={setSelectedBook}
        />
      ))}

      {/* Book detail dialog */}
      <BookDetailDialog
        book={selectedBook}
        open={!!selectedBook}
        onOpenChange={(open) => !open && setSelectedBook(null)}
      />
    </div>
  );
}

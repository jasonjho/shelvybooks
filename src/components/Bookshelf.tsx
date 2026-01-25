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

// Generate decoration positions interspersed among books
function generateDecorPositions(
  bookCount: number,
  maxPerRow: number,
  rowIndex: number
): { position: number; type: DecorationType; seed: number }[] {
  const emptySlots = maxPerRow - bookCount;
  if (emptySlots <= 0 || bookCount === 0) return [];
  
  // Add 1-3 decorations max, spread out organically
  const decorationCount = Math.min(Math.ceil(emptySlots * 0.3), 3);
  if (decorationCount <= 0) return [];
  
  const decorations: { position: number; type: DecorationType; seed: number }[] = [];
  const usedPositions = new Set<number>();
  
  // Use seeded randomness based on row index for consistent but varied placement
  const seededRandom = (i: number) => {
    const x = Math.sin(rowIndex * 100 + i * 50) * 10000;
    return x - Math.floor(x);
  };
  
  // Positions are gaps between books: 0 = before the 1st book, bookCount = after the last book
  const allPositions = Array.from({ length: bookCount + 1 }, (_, idx) => idx);

  const isAllowed = (pos: number, strictSpacing: boolean) => {
    if (usedPositions.has(pos)) return false;
    if (!strictSpacing) return true;
    // Try to keep at least one gap between decorations when possible
    return !usedPositions.has(pos - 1) && !usedPositions.has(pos + 1);
  };

  const pickPositionNear = (preferred: number) => {
    // Search positions in increasing distance from preferred (bounded, no while loop)
    const order: number[] = [0];
    for (let d = 1; d <= bookCount; d++) order.push(d, -d);

    // Pass 1: strict spacing (avoid adjacency)
    for (const delta of order) {
      const candidate = preferred + delta;
      if (candidate < 0 || candidate > bookCount) continue;
      if (isAllowed(candidate, true)) return candidate;
    }
    // Pass 2: relaxed (only uniqueness)
    for (const delta of order) {
      const candidate = preferred + delta;
      if (candidate < 0 || candidate > bookCount) continue;
      if (isAllowed(candidate, false)) return candidate;
    }
    return null;
  };

  for (let i = 0; i < decorationCount; i++) {
    // Prefer positions distributed across the shelf, with gentle jitter
    const base = ((bookCount + 1) / (decorationCount + 1)) * (i + 1);
    const jitter = (seededRandom(i) - 0.5) * 2; // -1..1
    const preferred = Math.max(0, Math.min(bookCount, Math.round(base + jitter)));

    const position = pickPositionNear(preferred);
    if (position == null) continue;

    usedPositions.add(position);
    decorations.push({
      position,
      type: DECORATION_TYPES[Math.floor(seededRandom(i + 10) * DECORATION_TYPES.length)],
      seed: rowIndex * 10 + i,
    });
  }
  
  return decorations.sort((a, b) => a.position - b.position);
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
  
  // Calculate available slots for books + decorations (excluding bookends)
  const bookendSlots = settings.showBookends && hasBooks ? 2 : 0;
  const availableSlots = maxPerRow - bookendSlots;
  
  // Generate decoration positions interspersed among books
  const decorPositions = settings.showPlant 
    ? generateDecorPositions(books.length, availableSlots, rowIndex)
    : [];

  // Build items array: interleave books and decorations
  const items: Array<{ type: 'book'; book: Book } | { type: 'decoration'; decorationType: DecorationType; seed: number }> = [];
  
  let decorIndex = 0;
  books.forEach((book, bookIndex) => {
    // Insert decorations before this book if positioned here
    while (decorIndex < decorPositions.length && decorPositions[decorIndex].position === bookIndex) {
      const dec = decorPositions[decorIndex];
      items.push({ 
        type: 'decoration', 
        decorationType: dec.type, 
        seed: dec.seed 
      });
      decorIndex++;
    }
    items.push({ type: 'book', book });
  });
  
  // Add any remaining decorations at the end
  while (decorIndex < decorPositions.length) {
    const dec = decorPositions[decorIndex];
    items.push({ 
      type: 'decoration', 
      decorationType: dec.type, 
      seed: dec.seed 
    });
    decorIndex++;
  }

  return (
    <div className={cn('shelf-row', `shelf-${skin}`, grainClass)}>
      {/* Shelf shadow */}
      <div className="shelf-shadow" />
      
      {/* Left bookend - always show when enabled */}
      {settings.showBookends && hasBooks && <Bookend />}
      
      {/* Books and decorations */}
      <div className="books-grid flex-1">
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
      </div>
      
      {/* Right bookend - always show when enabled */}
      {settings.showBookends && hasBooks && <Bookend />}
      
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
        // Container has p-4 (16px each side) and shelf-row has px-4 (16px each side)
        const containerWidth = containerRef.current.offsetWidth - 32 - 32; // bookcase p-4 + shelf-row px-4
        // Account for bookends (20px each + 8px gap each = 56px total when both shown)
        const bookendWidth = settings.showBookends ? 56 : 0;
        const availableWidth = containerWidth - bookendWidth;
        // Each item is 70px wide with 8px gap = 78px per slot
        const perRow = Math.floor(availableWidth / 78);
        setBooksPerRow(Math.max(perRow, 3));
      }
    };

    updateBooksPerRow();
    const resizeObserver = new ResizeObserver(updateBooksPerRow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [settings.showBookends]);

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

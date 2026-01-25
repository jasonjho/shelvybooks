import { useState, useRef, useEffect, useMemo } from 'react';
import { Book, BookStatus, ShelfSkin, ShelfSettings, DecorDensity } from '@/types/book';
import { BookSpine } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { ShelfDecoration, DECORATION_TYPES, DecorationType } from './ShelfDecorations';
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

// Fibonacci sequence for organic spacing
const FIB = [1, 2, 3, 5, 8, 13, 21];

// Density multipliers for decoration count
const DENSITY_CONFIG: Record<DecorDensity, { multiplier: number; max: number }> = {
  minimal: { multiplier: 0.12, max: 1 },
  balanced: { multiplier: 0.25, max: 3 },
  cozy: { multiplier: 0.4, max: 5 },
};

function generateDecorPositions(
  bookCount: number,
  maxPerRow: number,
  rowIndex: number,
  density: DecorDensity = 'balanced'
): { position: number; type: DecorationType; seed: number }[] {
  const emptySlots = maxPerRow - bookCount;
  if (emptySlots <= 0 || bookCount === 0) return [];
  
  const config = DENSITY_CONFIG[density];
  const decorationCount = Math.min(Math.ceil(emptySlots * config.multiplier), config.max);
  if (decorationCount <= 0) return [];
  
  const decorations: { position: number; type: DecorationType; seed: number }[] = [];
  const usedPositions = new Set<number>();
  
  // Seeded random for consistent but varied placement per row
  const seededRandom = (i: number) => {
    const x = Math.sin(rowIndex * 127.1 + i * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  
  // Pick a Fibonacci number scaled to shelf, with randomness
  const fibSpacing = (i: number) => {
    const fibIdx = Math.floor(seededRandom(i + 5) * Math.min(FIB.length, 4));
    return FIB[fibIdx];
  };

  // Generate candidate positions using Fibonacci-based offsets
  // Start at position 1+ so decorations never appear before the first book
  let cursor = 1 + Math.floor(seededRandom(rowIndex) * 2); // start offset 1-2
  
  for (let i = 0; i < decorationCount && cursor <= bookCount; i++) {
    // Add some jitter to break up patterns
    const jitter = Math.floor((seededRandom(i * 3 + 1) - 0.4) * 2); // slight bias forward
    let pos = Math.max(1, Math.min(bookCount, cursor + jitter)); // min 1, never position 0
    
    // Find nearest available position (bounded search)
    let found = false;
    for (let d = 0; d <= bookCount && !found; d++) {
      for (const candidate of [pos + d, pos - d]) {
        // Skip position 0 - decorations should never be first
        if (candidate < 1 || candidate > bookCount) continue;
        if (usedPositions.has(candidate)) continue;
        // Avoid clustering: at least 2 positions apart when possible
        const tooClose = [...usedPositions].some(p => Math.abs(p - candidate) < 2);
        if (tooClose && d < bookCount / 2) continue; // relax constraint if running out of space
        
        usedPositions.add(candidate);
        decorations.push({
          position: candidate,
          type: DECORATION_TYPES[Math.floor(seededRandom(i + 10) * DECORATION_TYPES.length)],
          seed: rowIndex * 10 + i,
        });
        found = true;
        break;
      }
    }
    
    // Advance cursor by Fibonacci spacing
    cursor += fibSpacing(i) + 1;
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
    ? generateDecorPositions(books.length, availableSlots, rowIndex, settings.decorDensity)
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
    <div ref={containerRef} className={cn('bookcase p-4 pt-6 pb-8 flex flex-col gap-0', skinClass, grainClass)}>
      {/* Decorative trim elements */}
      <div className="bookcase-crown" />
      <div className="bookcase-base" />
      <div className="bookcase-corbel left" />
      <div className="bookcase-corbel right" />
      <div className="bookcase-inner-trim" />
      {/* Carved rosette corners */}
      <div className="bookcase-rosette top-left" />
      <div className="bookcase-rosette top-right" />
      <div className="bookcase-rosette bottom-left" />
      <div className="bookcase-rosette bottom-right" />
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

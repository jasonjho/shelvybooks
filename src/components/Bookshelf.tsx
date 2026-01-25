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
  activeFilters: BookStatus[];
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
}

function Bookend() {
  return <div className="bookend" />;
}

// Fibonacci sequence for organic spacing
const FIB = [1, 2, 3, 5, 8, 13, 21];

// Density multipliers for decoration count - now based on book count, not empty slots
const DENSITY_CONFIG: Record<DecorDensity, { ratio: number; minSpacing: number }> = {
  minimal: { ratio: 0.08, minSpacing: 6 },   // ~1 decor per 12 books
  balanced: { ratio: 0.15, minSpacing: 4 },  // ~1 decor per 6-7 books
  cozy: { ratio: 0.25, minSpacing: 2 },      // ~1 decor per 4 books
};

function generateDecorPositions(
  bookCount: number,
  maxPerRow: number,
  rowIndex: number,
  density: DecorDensity = 'balanced'
): { position: number; type: DecorationType; seed: number }[] {
  if (bookCount === 0) return [];
  
  const config = DENSITY_CONFIG[density];
  
  // Calculate decoration count based on book count, ensuring at least some decorations
  const baseCount = Math.ceil(bookCount * config.ratio);
  const decorationCount = Math.max(density === 'minimal' ? 0 : 1, baseCount);
  
  if (decorationCount <= 0) return [];
  
  const decorations: { position: number; type: DecorationType; seed: number }[] = [];
  const usedPositions = new Set<number>();
  
  // Seeded random for consistent but varied placement per row
  const seededRandom = (i: number) => {
    const x = Math.sin(rowIndex * 127.1 + i * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Calculate spacing between decorations based on book count and decoration count
  // Positions are insertion points BETWEEN books: 2..bookCount+1 (never 1 to avoid "before first book")
  const avgSpacing = Math.max(config.minSpacing, Math.floor(bookCount / (decorationCount + 1)));
  
  // Generate positions with organic spacing
  for (let i = 0; i < decorationCount; i++) {
    // Base position: evenly distributed with jitter, starting after first book
    const basePos = Math.floor((i + 1) * avgSpacing) + 1; // +1 to skip position 1
    const jitter = Math.floor((seededRandom(i * 3 + rowIndex) - 0.5) * 3);
    let pos = Math.max(2, Math.min(bookCount + 1, basePos + jitter)); // min 2, never before first book
    
    // Find nearest available position that respects minimum spacing
    let found = false;
    for (let d = 0; d <= bookCount && !found; d++) {
      for (const candidate of [pos + d, pos - d]) {
        if (candidate < 2 || candidate > bookCount + 1) continue; // min 2 to never be first
        if (usedPositions.has(candidate)) continue;
        
        // Check minimum spacing from other decorations
        const tooClose = [...usedPositions].some(p => Math.abs(p - candidate) < config.minSpacing);
        if (tooClose) continue;
        
        usedPositions.add(candidate);
        decorations.push({
          position: candidate,
          type: DECORATION_TYPES[Math.floor(seededRandom(i + 10 + rowIndex) * DECORATION_TYPES.length)],
          seed: rowIndex * 10 + i,
        });
        found = true;
        break;
      }
    }
  }
  
  return decorations.sort((a, b) => a.position - b.position);
}

interface ShelfRowProps {
  books: Book[];
  rowIndex: number;
  maxPerRow: number;
  skin: ShelfSkin;
  settings: ShelfSettings;
  activeFilters: BookStatus[];
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
  activeFilters,
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
    // decorPositions use 1-based insertion points (1 == before 2nd book)
    while (decorIndex < decorPositions.length && decorPositions[decorIndex].position === bookIndex + 1) {
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
        {items.map((item, index) => {
          // Check if book should be grayed out based on filters
          const isGrayed = item.type === 'book' && 
            activeFilters.length > 0 && 
            !activeFilters.includes(item.book.status);
          
          return (
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
                  isGrayed={isGrayed}
                />
              ) : (
                <ShelfDecoration
                  type={item.decorationType}
                  seed={item.seed}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Right bookend - always show when enabled */}
      {settings.showBookends && hasBooks && <Bookend />}
      
      {/* Empty shelf message */}
      {!hasBooks && (
        <div className="flex items-center justify-center w-full h-24 text-background/80 text-sm italic drop-shadow-md">
          Add some books to your shelf...
        </div>
      )}
      
      {/* Shelf surface */}
      <div className="shelf-surface" />
      <div className="shelf-front" />
    </div>
  );
}

export function Bookshelf({ books, skin, settings, activeFilters, onMoveBook, onRemoveBook }: BookshelfProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [booksPerRow, setBooksPerRow] = useState(8);

  // Calculate decoration slots needed per row based on density
  const decorSlotsPerRow = useMemo(() => {
    if (!settings.showPlant) return 0;
    const config = DENSITY_CONFIG[settings.decorDensity];
    // Estimate ~1 decor slot per (1/ratio) books, with a minimum of 1 if decorations are enabled
    return Math.max(1, Math.ceil(8 * config.ratio)); // Based on ~8 books per row
  }, [settings.showPlant, settings.decorDensity]);

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
        const totalSlots = Math.floor(availableWidth / 78);
        // Reserve slots for decorations
        const bookSlots = Math.max(totalSlots - decorSlotsPerRow, 3);
        setBooksPerRow(bookSlots);
      }
    };

    updateBooksPerRow();
    const resizeObserver = new ResizeObserver(updateBooksPerRow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [settings.showBookends, decorSlotsPerRow]);

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
          activeFilters={activeFilters}
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

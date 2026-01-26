import { Book, BookStatus, ShelfSkin, ShelfSettings, DecorDensity } from '@/types/book';
import { BookSpine } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { ShelfDecoration, DECORATION_TYPES, DecorationType } from './ShelfDecorations';
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
const SHELF_PADDING = 96; // Padding on left and right (3rem * 2 = 96px)

// Density config for decorations on mobile (slightly lower than desktop)
const MOBILE_DENSITY_CONFIG: Record<DecorDensity, { ratio: number; minSpacing: number }> = {
  minimal: { ratio: 0.06, minSpacing: 5 },
  balanced: { ratio: 0.12, minSpacing: 3 },
  cozy: { ratio: 0.20, minSpacing: 2 },
};

function generateMobileDecorPositions(
  bookCount: number,
  maxDecorSlots: number,
  rowIndex: number,
  density: DecorDensity = 'balanced'
): { position: number; type: DecorationType; seed: number }[] {
  if (bookCount === 0 || maxDecorSlots <= 0) return [];
  
  const config = MOBILE_DENSITY_CONFIG[density];
  
  // Calculate decoration count based on book count
  const baseCount = Math.ceil(bookCount * config.ratio);
  const desiredCount = Math.max(density === 'minimal' ? 0 : 1, baseCount);
  const decorationCount = Math.min(desiredCount, maxDecorSlots);
  
  if (decorationCount <= 0) return [];
  
  const decorations: { position: number; type: DecorationType; seed: number }[] = [];
  const usedPositions = new Set<number>();
  const usedTypes = new Set<DecorationType>(); // Track used types to avoid duplicates
  
  // Seeded random for consistent placement
  const seededRandom = (i: number) => {
    const x = Math.sin(rowIndex * 127.1 + i * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const avgSpacing = Math.max(config.minSpacing, Math.floor(bookCount / (decorationCount + 1)));
  
  for (let i = 0; i < decorationCount; i++) {
    const basePos = Math.floor((i + 1) * avgSpacing) + 1;
    const jitter = Math.floor((seededRandom(i * 3 + rowIndex) - 0.5) * 2);
    let pos = Math.max(2, Math.min(bookCount + 1, basePos + jitter));
    
    let found = false;
    for (let d = 0; d <= bookCount && !found; d++) {
      for (const candidate of [pos + d, pos - d]) {
        if (candidate < 2 || candidate > bookCount + 1) continue;
        if (usedPositions.has(candidate)) continue;
        
        const tooClose = [...usedPositions].some(p => Math.abs(p - candidate) < config.minSpacing);
        if (tooClose) continue;
        
        // Find a decoration type that hasn't been used on this row
        let decorType: DecorationType | null = null;
        const startIdx = Math.floor(seededRandom(i + 10 + rowIndex) * DECORATION_TYPES.length);
        for (let t = 0; t < DECORATION_TYPES.length; t++) {
          const candidateType = DECORATION_TYPES[(startIdx + t) % DECORATION_TYPES.length];
          if (!usedTypes.has(candidateType)) {
            decorType = candidateType;
            break;
          }
        }
        
        // If all types are used, skip adding more decorations
        if (!decorType) break;
        
        usedPositions.add(candidate);
        usedTypes.add(decorType);
        decorations.push({
          position: candidate,
          type: decorType,
          seed: rowIndex * 10 + i,
        });
        found = true;
        break;
      }
    }
  }
  
  return decorations.sort((a, b) => a.position - b.position);
}

function MiniShelfRow({ 
  books, 
  skin, 
  settings,
  activeFilters,
  rowIndex,
  decorSlotsPerRow,
  onMoveBook,
  onRemoveBook,
  onSelectBook,
}: { 
  books: Book[]; 
  skin: ShelfSkin; 
  settings: ShelfSettings;
  activeFilters: BookStatus[];
  rowIndex: number;
  decorSlotsPerRow: number;
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
  onSelectBook: (book: Book) => void;
}) {
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';
  
  // Generate decoration positions
  const decorPositions = settings.showPlant 
    ? generateMobileDecorPositions(books.length, decorSlotsPerRow, rowIndex, settings.decorDensity)
    : [];

  // Build items array: interleave books and decorations
  const items: Array<{ type: 'book'; book: Book } | { type: 'decoration'; decorationType: DecorationType; seed: number }> = [];
  
  let decorIndex = 0;
  books.forEach((book, bookIndex) => {
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
  
  // Add remaining decorations at the end
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
    <div className={cn('mini-shelf', `shelf-${skin}`, grainClass)}>
      <div className="mini-shelf-back" />
      <div className="mini-shelf-content overflow-hidden">
        {items.map((item, index) => {
          if (item.type === 'book') {
            const isGrayed = activeFilters.length > 0 && !activeFilters.includes(item.book.status);
            return (
              <BookSpine
                key={item.book.id}
                book={item.book}
                onMove={onMoveBook}
                onRemove={onRemoveBook}
                onSelect={() => onSelectBook(item.book)}
                isInteractive={!!onMoveBook && !!onRemoveBook}
                isGrayed={isGrayed}
              />
            );
          }
          
          return (
            <div
              key={`decor-${rowIndex}-${index}`}
              className="mobile-decoration flex-shrink-0"
            >
              <ShelfDecoration
                type={item.decorationType}
                seed={item.seed}
              />
            </div>
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

  // Calculate decoration slots per row
  const decorSlotsPerRow = useMemo(() => {
    if (!settings.showPlant) return 0;
    const config = MOBILE_DENSITY_CONFIG[settings.decorDensity];
    return Math.max(1, Math.ceil(booksPerRow * config.ratio));
  }, [settings.showPlant, settings.decorDensity, booksPerRow]);

  // Calculate how many books fit per row based on container width
  useEffect(() => {
    const updateBooksPerRow = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const availableWidth = containerWidth - SHELF_PADDING - 16;
      
      // Account for decoration slots when calculating book capacity
      // Each decoration takes approximately 40px width at 0.7 scale (being conservative)
      const config = MOBILE_DENSITY_CONFIG[settings.decorDensity];
      const estimatedDecorCount = settings.showPlant ? Math.max(1, Math.ceil(4 * config.ratio)) : 0;
      const decorWidth = estimatedDecorCount * 42; // 38px decoration + gap (conservative)
      const effectiveWidth = availableWidth - decorWidth;
      
      // Add 8px safety margin per book to prevent edge clipping
      const count = Math.max(2, Math.floor((effectiveWidth + BOOK_GAP) / (BOOK_WIDTH + BOOK_GAP + 8)));
      setBooksPerRow(count);
    };

    updateBooksPerRow();
    const resizeObserver = new ResizeObserver(updateBooksPerRow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [settings.showPlant, settings.decorDensity]);

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
              rowIndex={index}
              decorSlotsPerRow={decorSlotsPerRow}
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

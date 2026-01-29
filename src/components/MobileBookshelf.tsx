import { Book, BookStatus, ShelfSkin, ShelfSettings, DecorDensity } from '@/types/book';
import { BookSpine, ClubInfo } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { BookNoteDialog } from './BookNoteDialog';
import { ShelfDecoration, DECORATION_TYPES, DecorationType } from './ShelfDecorations';
import { cn } from '@/lib/utils';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useBookNotes, BookNote, NoteColor } from '@/hooks/useBookNotes';

interface MobileBookshelfProps {
  books: Book[];
  skin: ShelfSkin;
  settings: ShelfSettings;
  activeFilters: BookStatus[];
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
  onUpdateCompletedAt?: (id: string, completedAt: string | null) => void;
  getBookClubInfo?: (title: string, author: string) => ClubInfo[];
  /** External handler for book selection - when set, clicks open this instead of internal dialog */
  onSelectBook?: (book: Book) => void;
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
  const usedTypes = new Set<DecorationType>();
  
  // Seeded random for consistent placement
  const seededRandom = (i: number) => {
    const x = Math.sin(rowIndex * 127.1 + i * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // For variety across rows, use different placement strategies based on row index
  // This prevents the "always at end" pattern
  const placementSeed = seededRandom(rowIndex * 7);
  
  for (let i = 0; i < decorationCount; i++) {
    let pos: number;
    
    if (decorationCount === 1) {
      // Single decoration: vary position based on row to avoid repetitive patterns
      // Use 2 zones: middle or end (never position 1 - shelves should start with books)
      const zone = Math.floor(placementSeed * 2);
      if (zone === 0) {
        pos = Math.max(2, Math.floor(bookCount / 2) + 1); // Middle-ish
      } else {
        pos = bookCount + 1; // After last book
      }
    } else {
      // Multiple decorations: spread them out (never before first book)
      const avgSpacing = Math.max(config.minSpacing, Math.floor(bookCount / (decorationCount + 1)));
      const basePos = Math.floor((i + 1) * avgSpacing) + 1;
      const jitter = Math.floor((seededRandom(i * 3 + rowIndex) - 0.5) * 2);
      pos = Math.max(2, Math.min(bookCount + 1, basePos + jitter)); // min 2, never before first book
    }
    
    // Find available position (never position 1)
    let found = false;
    for (let d = 0; d <= bookCount + 1 && !found; d++) {
      for (const candidate of [pos + d, pos - d]) {
        if (candidate < 2 || candidate > bookCount + 1) continue; // min 2 to never start shelf
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
  getBookClubInfo,
  notes,
  onAddNote,
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
  getBookClubInfo?: (title: string, author: string) => ClubInfo[];
  notes: Map<string, BookNote>;
  onAddNote: (book: Book) => void;
}) {
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';
  
  // Generate decoration positions
  const decorPositions = settings.showPlant 
    ? generateMobileDecorPositions(books.length, decorSlotsPerRow, rowIndex, settings.decorDensity)
    : [];

  // Build items array: interleave books and decorations
  const items: Array<{ type: 'book'; book: Book } | { type: 'decoration'; decorationType: DecorationType; seed: number }> = [];
  
  let decorIndex = 0;
  
  // Note: decorations never go at position 1 (shelves always start with books)
  
  books.forEach((book, bookIndex) => {
    items.push({ type: 'book', book });
    
    // Add decorations that go after this book (position = bookIndex + 2)
    while (decorIndex < decorPositions.length && decorPositions[decorIndex].position === bookIndex + 2) {
      const dec = decorPositions[decorIndex];
      items.push({ 
        type: 'decoration', 
        decorationType: dec.type, 
        seed: dec.seed 
      });
      decorIndex++;
    }
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
    <div className={cn('mini-shelf', `shelf-${skin}`, grainClass)}>
      <div className="mini-shelf-back" />
      <div className="mini-shelf-content">
        {items.map((item, index) => {
          if (item.type === 'book') {
            const isGrayed = activeFilters.length > 0 && !activeFilters.includes(item.book.status);
            const clubInfo = getBookClubInfo?.(item.book.title, item.book.author);
            const note = notes.get(item.book.id);
            return (
              <BookSpine
                key={item.book.id}
                book={item.book}
                onMove={onMoveBook}
                onRemove={onRemoveBook}
                onSelect={() => onSelectBook(item.book)}
                isInteractive={!!onMoveBook && !!onRemoveBook}
                isGrayed={isGrayed}
                clubInfo={clubInfo}
                note={note}
                onAddNote={() => onAddNote(item.book)}
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
  onRemoveBook,
  onUpdateCompletedAt,
  getBookClubInfo,
  onSelectBook,
}: MobileBookshelfProps) {
  const [internalSelectedBook, setInternalSelectedBook] = useState<Book | null>(null);
  const [noteBook, setNoteBook] = useState<Book | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [booksPerRow, setBooksPerRow] = useState(4);
  const skinClass = `skin-${skin}`;
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';

  // Use external handler if provided, otherwise use internal state
  const handleSelectBook = onSelectBook || setInternalSelectedBook;
  const selectedBook = onSelectBook ? null : internalSelectedBook;

  // Get all book IDs for fetching notes
  const bookIds = useMemo(() => books.map((b) => b.id), [books]);
  const { notes, saveNote, deleteNote, getNote } = useBookNotes(bookIds);

  const handleSaveNote = async (content: string, color: NoteColor): Promise<boolean> => {
    if (!noteBook) return false;
    const result = await saveNote(noteBook.id, content, color);
    setNoteBook(null);
    return result;
  };

  const handleDeleteNote = async (): Promise<boolean> => {
    if (!noteBook) return false;
    const result = await deleteNote(noteBook.id);
    setNoteBook(null);
    return result;
  };

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
              onSelectBook={handleSelectBook}
              getBookClubInfo={getBookClubInfo}
              notes={notes}
              onAddNote={setNoteBook}
            />
          ))}
        </div>
      )}

      {/* Book detail dialog - only render if using internal state */}
      {!onSelectBook && (
        <BookDetailDialog
          book={selectedBook}
          open={!!selectedBook}
          onOpenChange={(open) => !open && setInternalSelectedBook(null)}
          onUpdateCompletedAt={onUpdateCompletedAt}
        />
      )}

      {/* Book note dialog */}
      <BookNoteDialog
        open={!!noteBook}
        onOpenChange={(open) => !open && setNoteBook(null)}
        bookTitle={noteBook?.title || ''}
        existingNote={noteBook ? getNote(noteBook.id) : undefined}
        onSave={handleSaveNote}
        onDelete={noteBook && getNote(noteBook.id) ? handleDeleteNote : undefined}
      />
    </div>
  );
}

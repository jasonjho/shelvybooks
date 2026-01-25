import { useState, useRef, useEffect } from 'react';
import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';
import { BookSpine } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { ShelfDecoration, useShelfDecorations, ShelfDecorationItem } from './ShelfDecorations';
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

// Merge books and decorations into a single array for rendering
function mergeItemsWithDecorations(
  books: Book[],
  decorations: ShelfDecorationItem[]
): Array<{ type: 'book'; book: Book } | { type: 'decoration'; decoration: ShelfDecorationItem }> {
  if (decorations.length === 0) {
    return books.map(book => ({ type: 'book' as const, book }));
  }

  const result: Array<{ type: 'book'; book: Book } | { type: 'decoration'; decoration: ShelfDecorationItem }> = [];
  const sortedDecorations = [...decorations].sort((a, b) => a.position - b.position);
  
  let bookIndex = 0;
  let decorationIndex = 0;
  let currentPosition = 0;

  while (bookIndex < books.length || decorationIndex < sortedDecorations.length) {
    // Check if we should insert a decoration at this position
    if (
      decorationIndex < sortedDecorations.length &&
      sortedDecorations[decorationIndex].position === currentPosition
    ) {
      result.push({ type: 'decoration', decoration: sortedDecorations[decorationIndex] });
      decorationIndex++;
    } else if (bookIndex < books.length) {
      result.push({ type: 'book', book: books[bookIndex] });
      bookIndex++;
    }
    currentPosition++;
  }

  return result;
}

export function Bookshelf({ books, skin, settings, onMoveBook, onRemoveBook }: BookshelfProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridColumns, setGridColumns] = useState(8);

  // Calculate grid columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (gridRef.current) {
        const containerWidth = gridRef.current.offsetWidth;
        // Each book is min 70px with 8px gap
        const cols = Math.floor(containerWidth / 78);
        setGridColumns(Math.max(cols, 4));
      }
    };

    updateColumns();
    const resizeObserver = new ResizeObserver(updateColumns);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Get decorations based on available space
  const decorations = useShelfDecorations(books.length, gridColumns, settings.showPlant);
  
  // Merge books and decorations
  const items = mergeItemsWithDecorations(books, decorations);

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
        
        {/* Books grid with dynamic decorations */}
        <div ref={gridRef} className="books-grid flex-1">
          {items.map((item, index) => (
            <div
              key={item.type === 'book' ? item.book.id : `decor-${item.decoration.position}`}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {item.type === 'book' ? (
                <BookSpine
                  book={item.book}
                  onMove={onMoveBook}
                  onRemove={onRemoveBook}
                  onSelect={() => setSelectedBook(item.book)}
                  isInteractive={!!onMoveBook && !!onRemoveBook}
                />
              ) : (
                <ShelfDecoration
                  type={item.decoration.type}
                  seed={item.decoration.seed}
                />
              )}
            </div>
          ))}
        </div>
        
        {/* Right decoration (plant on first position or bookend) */}
        {hasBooks && settings.showPlant && decorations.length === 0 && <PlantDecor />}
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

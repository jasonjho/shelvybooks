import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';
import { BookSpine } from './BookSpine';
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
  const booksPerRow = 8;
  const rows: (Book | 'bookend-left' | 'bookend-right' | 'plant')[][] = [];
  
  for (let i = 0; i < books.length; i += booksPerRow) {
    const rowBooks = books.slice(i, i + booksPerRow);
    const rowItems: (Book | 'bookend-left' | 'bookend-right' | 'plant')[] = [];
    
    // Add left bookend if enabled
    if (settings.showBookends && rowBooks.length > 0) {
      rowItems.push('bookend-left');
    }
    
    // Add books
    rowItems.push(...rowBooks);
    
    // Add right decoration (plant or bookend)
    if (rowBooks.length > 0) {
      if (i === 0 && settings.showPlant) {
        rowItems.push('plant');
      } else if (settings.showBookends) {
        rowItems.push('bookend-right');
      }
    }
    
    rows.push(rowItems);
  }

  // Ensure at least one empty row
  if (rows.length === 0) {
    rows.push([]);
  }

  const skinClass = `skin-${skin}`;
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';

  return (
    <div className={cn('bookcase p-4', skinClass, grainClass)}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn('shelf-row', `shelf-${skin}`, grainClass)}
        >
          {/* Shelf shadow */}
          <div className="shelf-shadow" />
          
          {row.map((item, itemIndex) => {
            if (item === 'bookend-left' || item === 'bookend-right') {
              return <Bookend key={`bookend-${itemIndex}`} />;
            }
            if (item === 'plant') {
              return <PlantDecor key={`plant-${itemIndex}`} />;
            }
            return (
              <div
                key={item.id}
                className="animate-fade-in"
                style={{ animationDelay: `${itemIndex * 50}ms` }}
              >
                <BookSpine
                  book={item}
                  onMove={onMoveBook}
                  onRemove={onRemoveBook}
                  isInteractive={!!onMoveBook && !!onRemoveBook}
                />
              </div>
            );
          })}
          
          {/* Empty shelf message */}
          {row.length === 0 && (
            <div className="flex items-center justify-center w-full h-24 text-muted-foreground/60 text-sm italic">
              Add some books to your shelf...
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

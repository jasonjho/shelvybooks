import { Book, BookStatus, ShelfSkin } from '@/types/book';
import { BookSpine } from './BookSpine';
import { cn } from '@/lib/utils';

interface BookshelfProps {
  books: Book[];
  skin: ShelfSkin;
  onMoveBook: (id: string, status: BookStatus) => void;
  onRemoveBook: (id: string) => void;
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

export function Bookshelf({ books, skin, onMoveBook, onRemoveBook }: BookshelfProps) {
  const booksPerRow = 8;
  const rows: (Book | 'bookend-left' | 'bookend-right' | 'plant')[][] = [];
  
  for (let i = 0; i < books.length; i += booksPerRow) {
    const rowBooks = books.slice(i, i + booksPerRow);
    // Add decorative elements
    if (i === 0 && rowBooks.length > 0) {
      rows.push(['bookend-left', ...rowBooks, 'plant']);
    } else if (rowBooks.length > 0) {
      rows.push(['bookend-left', ...rowBooks, 'bookend-right']);
    } else {
      rows.push(rowBooks);
    }
  }

  // Ensure at least one empty row
  if (rows.length === 0) {
    rows.push([]);
  }

  const skinClass = `skin-${skin}`;

  return (
    <div className={cn('bookcase p-4', skinClass)}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn('shelf-row', `shelf-${skin}`)}
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

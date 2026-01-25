import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';
import { BookSpine } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

interface MobileBookshelfProps {
  books: Book[];
  skin: ShelfSkin;
  settings: ShelfSettings;
  activeFilters: BookStatus[];
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
}

const BOOKS_PER_ROW = 4; // Number of books per mini-shelf on mobile

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
  const skinClass = `skin-${skin}`;
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';

  // Split books into rows
  const bookRows = useMemo(() => {
    const rows: Book[][] = [];
    for (let i = 0; i < books.length; i += BOOKS_PER_ROW) {
      rows.push(books.slice(i, i + BOOKS_PER_ROW));
    }
    return rows;
  }, [books]);

  return (
    <div className={cn('mobile-bookcase', skinClass, grainClass)}>
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

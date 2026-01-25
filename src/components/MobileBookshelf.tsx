import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';
import { BookSpine } from './BookSpine';
import { BookDetailDialog } from './BookDetailDialog';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface MobileBookshelfProps {
  books: Book[];
  skin: ShelfSkin;
  settings: ShelfSettings;
  activeFilters: BookStatus[];
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
}

function MiniShelf({ 
  book, 
  skin, 
  settings,
  isGrayed,
  onMoveBook,
  onRemoveBook,
  onSelect,
}: { 
  book: Book; 
  skin: ShelfSkin; 
  settings: ShelfSettings;
  isGrayed: boolean;
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
  onSelect: () => void;
}) {
  const grainClass = settings.showWoodGrain ? '' : 'no-grain';
  
  return (
    <div className={cn('mini-shelf', `shelf-${skin}`, grainClass)}>
      <div className="mini-shelf-back" />
      <div className="mini-shelf-content">
        <BookSpine
          book={book}
          onMove={onMoveBook}
          onRemove={onRemoveBook}
          onSelect={onSelect}
          isInteractive={!!onMoveBook && !!onRemoveBook}
          isGrayed={isGrayed}
        />
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

  return (
    <div className={cn('mobile-bookcase', skinClass, grainClass)}>
      {books.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm italic">
          Add some books to your shelf...
        </div>
      ) : (
        <div className="mobile-shelf-list">
          {books.map((book) => {
            const isGrayed = activeFilters.length > 0 && !activeFilters.includes(book.status);
            return (
              <MiniShelf
                key={book.id}
                book={book}
                skin={skin}
                settings={settings}
                isGrayed={isGrayed}
                onMoveBook={onMoveBook}
                onRemoveBook={onRemoveBook}
                onSelect={() => setSelectedBook(book)}
              />
            );
          })}
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

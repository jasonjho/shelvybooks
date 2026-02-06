import { Book, ShelfSkin, ShelfSettings, BookStatus } from '@/types/book';
import { BookSpine, ClubInfo } from './BookSpine';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBookNotes, BookNote } from '@/hooks/useBookNotes';
import { useMemo } from 'react';

interface CurrentlyReadingProps {
  books: Book[];
  skin: ShelfSkin;
  settings: ShelfSettings;
  onMoveBook?: (id: string, status: BookStatus) => void;
  onRemoveBook?: (id: string) => void;
  onSelectBook: (book: Book) => void;
  getBookClubInfo?: (title: string, author: string) => ClubInfo[];
  likesPerBook?: Record<string, number>;
  onAddNote: (book: Book) => void;
}

export function CurrentlyReading({
  books,
  skin,
  settings,
  onMoveBook,
  onRemoveBook,
  onSelectBook,
  getBookClubInfo,
  likesPerBook,
  onAddNote,
}: CurrentlyReadingProps) {
  // Filter to only 'reading' books
  const readingBooks = useMemo(() => 
    books.filter(b => b.status === 'reading'),
    [books]
  );

  // Get notes for reading books
  const bookIds = useMemo(() => readingBooks.map(b => b.id), [readingBooks]);
  const { notes } = useBookNotes(bookIds);

  if (readingBooks.length === 0) return null;

  const grainClass = settings.showWoodGrain ? '' : 'no-grain';

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-medium text-foreground/80">
          Currently Reading
        </h2>
        <span className="text-xs text-muted-foreground">
          ({readingBooks.length})
        </span>
      </div>

      {/* Mini shelf for currently reading */}
      <div className={cn(
        'relative rounded-lg p-4 pb-6',
        'bg-gradient-to-b from-amber-900/20 to-amber-950/30',
        'border border-amber-800/20',
        'shadow-inner'
      )}>
        {/* Books row */}
        <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
          {readingBooks.map((book) => {
            const clubInfo = getBookClubInfo?.(book.title, book.author);
            const bookNote = notes.get(book.id);
            const newLikesCount = likesPerBook?.[book.id] || 0;
            
            return (
              <div key={book.id} className="transform hover:scale-105 transition-transform">
                <BookSpine
                  book={book}
                  onMove={onMoveBook}
                  onRemove={onRemoveBook}
                  onSelect={() => onSelectBook(book)}
                  isInteractive={!!onMoveBook && !!onRemoveBook}
                  isGrayed={false}
                  clubInfo={clubInfo}
                  note={bookNote}
                  onAddNote={() => onAddNote(book)}
                  newLikesCount={newLikesCount}
                />
              </div>
            );
          })}
        </div>

        {/* Shelf edge */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-b from-amber-800/40 to-amber-900/60 rounded-b-lg" />
      </div>
    </div>
  );
}

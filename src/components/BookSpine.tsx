import { Book, BookStatus } from '@/types/book';
import { forwardRef } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { BookOpen, BookMarked, CheckCircle, Trash2 } from 'lucide-react';

interface BookSpineProps {
  book: Book;
  onMove?: (id: string, status: BookStatus) => void;
  onRemove?: (id: string) => void;
  onSelect?: () => void;
  isInteractive?: boolean;
  isGrayed?: boolean;
}

const statusOptions: { status: BookStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'reading', label: 'Currently Reading', icon: <BookOpen className="w-4 h-4" /> },
  { status: 'want-to-read', label: 'Want to Read', icon: <BookMarked className="w-4 h-4" /> },
  { status: 'read', label: 'Read', icon: <CheckCircle className="w-4 h-4" /> },
];

type BookCoverProps = {
  book: Book;
  onSelect?: () => void;
  isGrayed?: boolean;
};

const BookCover = forwardRef<HTMLDivElement, BookCoverProps>(
  ({ book, onSelect, isGrayed }, ref) => {
  // Use stored link (now Google Books) or fallback to Google search
  const bookInfoUrl = book.openLibraryKey?.startsWith('http') 
    ? book.openLibraryKey
    : `https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + book.author + ' book')}`;

  return (
    <div ref={ref} className={`book-spine group/book relative ${isGrayed ? 'book-grayed' : ''}`}>
      <div
        className="book-cover w-[70px] h-[105px] cursor-pointer"
        onClick={onSelect}
        style={{
          backgroundImage: `url(${book.coverUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* 3D book edge effect */}
        <div className="book-edge" />
        
        {/* Top edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white/20 to-transparent" />
        
        {/* Fallback if no cover */}
        {book.coverUrl === '/placeholder.svg' && (
          <div className="absolute inset-0 flex items-center justify-center p-2 bg-gradient-to-br from-secondary to-muted">
            <span className="text-[9px] text-center font-display text-secondary-foreground leading-tight line-clamp-4">
              {book.title}
            </span>
          </div>
        )}
      </div>
      
      {/* Hover tooltip - now interactive */}
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 opacity-0 group-hover/book:opacity-100 transition-opacity duration-200 z-30 pb-4">
        <div className="bg-popover text-popover-foreground px-4 py-3 rounded-lg text-sm min-w-[200px] max-w-[280px] shadow-xl border border-border">
          <p className="font-medium leading-snug">{book.title}</p>
          <p className="text-muted-foreground mt-1.5 text-xs">{book.author}</p>
          <a 
            href={bookInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline mt-2 text-xs flex items-center gap-1 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            View on Google Books →
          </a>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-popover" />
      </div>
    </div>
  );
  }
);

BookCover.displayName = 'BookCover';

export function BookSpine({ book, onMove, onRemove, onSelect, isInteractive = true, isGrayed = false }: BookSpineProps) {
  // If not interactive, just render the book without context menu
  if (!isInteractive || !onMove || !onRemove) {
    return <BookCover book={book} onSelect={onSelect} isGrayed={isGrayed} />;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <BookCover book={book} onSelect={onSelect} isGrayed={isGrayed} />
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48 z-50">
        {statusOptions
          .filter((opt) => opt.status !== book.status)
          .map((opt) => (
            <ContextMenuItem
              key={opt.status}
              onClick={() => onMove(book.id, opt.status)}
              className="gap-2 cursor-pointer"
            >
              {opt.icon}
              Move to {opt.label}
            </ContextMenuItem>
          ))}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onRemove(book.id)}
          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Remove
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

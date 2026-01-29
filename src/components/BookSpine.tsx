import { Book, BookStatus } from '@/types/book';
import { forwardRef, useEffect, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { BookOpen, BookMarked, CheckCircle, Trash2, Users, StickyNote } from 'lucide-react';
import { useBookAnimations } from '@/contexts/BookAnimationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { normalizeCoverUrl } from '@/lib/normalizeCoverUrl';
import { BookNote, NoteColor } from '@/hooks/useBookNotes';
import { PostItNote } from '@/components/PostItNote';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ClubInfo {
  clubName: string;
  status: 'suggested' | 'reading' | 'read';
}

interface BookSpineProps {
  book: Book;
  onMove?: (id: string, status: BookStatus) => void;
  onRemove?: (id: string) => void;
  onSelect?: () => void;
  isInteractive?: boolean;
  isGrayed?: boolean;
  clubInfo?: ClubInfo[];
  note?: BookNote;
  onAddNote?: () => void;
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
  isWobbling?: boolean;
  isSparkle?: boolean;
  clubInfo?: ClubInfo[];
  note?: BookNote;
  onAddNote?: () => void;
  isInteractive?: boolean;
};

const BookCover = forwardRef<HTMLDivElement, BookCoverProps>(
  ({ book, onSelect, isGrayed, isWobbling, isSparkle, clubInfo, note, onAddNote, isInteractive = true }, ref) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}`;
  const hasClubInfo = clubInfo && clubInfo.length > 0;
  const isCurrentlyReading = clubInfo?.some(c => c.status === 'reading');
  const showPlaceholder = !book.coverUrl || book.coverUrl === '/placeholder.svg' || imageError;
  const coverSrc = normalizeCoverUrl(book.coverUrl);

  // Reset image state when we render a different book / URL
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [book.id, book.coverUrl]);

  // Handle image load - check if it's a valid cover or a placeholder image
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { naturalWidth, naturalHeight } = img;
    
    // Detect placeholder images:
    // 1. 1x1 placeholders (common when a cover is missing)
    // 2. Google's "image not available" placeholders (various sizes: 120x192, 128x188, etc.)
    // 3. Google Books URLs without edge=curl often return "no cover" images
    const isOneByOne = naturalWidth <= 1 && naturalHeight <= 1;
    const isGooglePlaceholder = 
      (naturalWidth === 120 && naturalHeight === 192) ||
      (naturalWidth === 128 && naturalHeight === 188) ||
      (naturalWidth === 128 && naturalHeight === 196) ||
      (naturalWidth === 128 && naturalHeight === 197);
    // IMPORTANT: `normalizeCoverUrl()` may add `edge=curl` to `img.src`, so if we
    // want to detect the problematic "no cover" variants we must check the raw
    // stored URL (book.coverUrl), not the normalized one.
    const rawCoverUrl = book.coverUrl || '';
    const isGoogleNoCover =
      rawCoverUrl.includes('books.google.com/books/content') &&
      !rawCoverUrl.includes('edge=curl');

    if (isOneByOne || isGooglePlaceholder || isGoogleNoCover) {
      setImageError(true);
      setImageLoaded(true);
      return;
    }

    setImageError(false);
    setImageLoaded(true);
  };

  return (
    <div 
      ref={ref} 
      className={cn(
        'book-spine group/book relative',
        isGrayed && 'book-grayed',
        isWobbling && 'book-wobble',
        isSparkle && 'book-sparkle'
      )}
    >
      {/* Post-it note decoration - positioned to peek out behind/beside the book */}
      {note && (
        <Popover>
          <PopoverTrigger asChild>
            <button 
              className="absolute -right-3 -top-2 z-40 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <PostItNote content={note.content} color={note.color} size="sm" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            className="w-64 p-0 border-none bg-transparent shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className={cn(
                'p-4 rounded shadow-lg',
                note.color === 'yellow' && 'bg-yellow-200',
                note.color === 'pink' && 'bg-pink-200',
                note.color === 'blue' && 'bg-sky-200',
                note.color === 'green' && 'bg-lime-200',
              )}
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              <p className="text-gray-700 text-lg leading-snug whitespace-pre-wrap">
                {note.content}
              </p>
              {isInteractive && onAddNote && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNote();
                  }}
                  className="mt-3 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Edit note
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
      <div
        className={cn(
          'book-cover w-[70px] h-[105px] cursor-pointer relative overflow-hidden',
          hasClubInfo && 'ring-2 ring-primary/60 ring-offset-1 ring-offset-background',
          isCurrentlyReading && 'ring-amber-500/80'
        )}
        onClick={onSelect}
      >
        {/* Loading skeleton */}
        {!imageLoaded && !showPlaceholder && (
          <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        )}
        
        {/* Actual cover image */}
        {!showPlaceholder && (
          <img
            src={coverSrc}
            alt={book.title}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            referrerPolicy="no-referrer"
          />
        )}
        
        {/* 3D book edge effect */}
        <div className="book-edge" />
        
        {/* Top edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white/20 to-transparent" />
        
        {/* Club badge */}
        {hasClubInfo && (
          <div 
            className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md z-10',
              isCurrentlyReading 
                ? 'bg-amber-500 text-white' 
                : 'bg-primary text-primary-foreground'
            )}
            title={clubInfo.map(c => `${c.clubName}${c.status === 'reading' ? ' (Reading)' : ''}`).join(', ')}
          >
            <Users className="w-3 h-3" />
          </div>
        )}
        
        {/* Fallback if no cover or error */}
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center p-2 bg-gradient-to-br from-secondary to-muted">
            <span className="text-[9px] text-center font-display text-secondary-foreground leading-tight line-clamp-4">
              {book.title}
            </span>
          </div>
        )}

        {/* Sparkle particles for completed books */}
        {isSparkle && (
          <>
            <div className="sparkle-particle" style={{ top: '-5px', left: '20%', animationDelay: '0s' }} />
            <div className="sparkle-particle" style={{ top: '-8px', left: '50%', animationDelay: '0.15s' }} />
            <div className="sparkle-particle" style={{ top: '-3px', left: '75%', animationDelay: '0.3s' }} />
          </>
        )}
      </div>
      
      {/* Hover tooltip */}
      <div className="absolute -top-24 sm:-top-28 left-1/2 -translate-x-1/2 opacity-0 group-hover/book:opacity-100 transition-opacity duration-200 z-30 pb-4 hidden sm:block pointer-events-none group-hover/book:pointer-events-auto">
        <div className="bg-popover text-popover-foreground px-4 py-3 rounded-lg text-sm min-w-[200px] max-w-[280px] shadow-xl border border-border">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            className="font-medium leading-snug text-left hover:text-primary transition-colors"
          >
            {book.title}
          </button>
          <p className="text-muted-foreground mt-1.5 text-xs">{book.author}</p>
          {hasClubInfo && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
              <Users className="w-3 h-3" />
              <span>{clubInfo.map(c => c.clubName).join(', ')}</span>
            </div>
          )}
          <a 
            href={amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline mt-2 text-xs flex items-center gap-1 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            View on Amazon →
          </a>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-popover" />
      </div>
    </div>
  );
  }
);

BookCover.displayName = 'BookCover';

export function BookSpine({ book, onMove, onRemove, onSelect, isInteractive = true, isGrayed = false, clubInfo, note, onAddNote }: BookSpineProps) {
  const { recentlyAddedBooks, recentlyCompletedBooks } = useBookAnimations();
  
  const isWobbling = recentlyAddedBooks.has(book.id);
  const isSparkle = recentlyCompletedBooks.has(book.id);

  // If not interactive, just render the book without context menu
  if (!isInteractive || !onMove || !onRemove) {
    return <BookCover book={book} onSelect={onSelect} isGrayed={isGrayed} isWobbling={isWobbling} isSparkle={isSparkle} clubInfo={clubInfo} note={note} isInteractive={false} />;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <BookCover book={book} onSelect={onSelect} isGrayed={isGrayed} isWobbling={isWobbling} isSparkle={isSparkle} clubInfo={clubInfo} note={note} onAddNote={onAddNote} isInteractive={true} />
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
              {opt.label}
            </ContextMenuItem>
          ))}
        <ContextMenuSeparator />
        {onAddNote && (
          <ContextMenuItem
            onClick={onAddNote}
            className="gap-2 cursor-pointer"
          >
            <StickyNote className="w-4 h-4" />
            {note ? 'Edit note' : 'Add note'}
          </ContextMenuItem>
        )}
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

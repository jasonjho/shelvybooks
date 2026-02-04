import { Book, BookStatus } from '@/types/book';
import { forwardRef, useEffect, useState, useRef, useCallback } from 'react';
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
import { getAmazonBookUrl } from '@/lib/amazonLinks';
import { BookNote, NoteColor } from '@/hooks/useBookNotes';
import { PostItNote } from '@/components/PostItNote';
import { BookLikeBadge } from '@/components/BookLikeBadge';
import { BookHoverPreview } from '@/components/BookHoverPreview';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useIsMobile } from '@/hooks/use-mobile';

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
  newLikesCount?: number;
  /** When viewing someone else's shelf, allows adding the book to your own shelf */
  onAddToShelf?: (book: Book) => void;
  /** Whether this book is already on the user's shelf */
  isOnShelf?: boolean;
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
  newLikesCount?: number;
  onMove?: (id: string, status: BookStatus) => void;
  onRemove?: (id: string) => void;
  onAddToShelf?: (book: Book) => void;
  isOnShelf?: boolean;
};

const BookCover = forwardRef<HTMLDivElement, BookCoverProps>(
  ({ book, onSelect, isGrayed, isWobbling, isSparkle, clubInfo, note, onAddNote, isInteractive = true, newLikesCount = 0, onMove, onRemove, onAddToShelf, isOnShelf }, ref) => {
  const isMobile = useIsMobile();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'above' | 'below'>('above');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const amazonUrl = getAmazonBookUrl(book.title, book.author, book.isbn);
  const hasClubInfo = clubInfo && clubInfo.length > 0;
  const isCurrentlyReading = clubInfo?.some(c => c.status === 'reading');
  // Check for placeholder URLs before even loading
  const isPlaceholderUrl = !book.coverUrl || 
    book.coverUrl === '/placeholder.svg' || 
    (book.coverUrl.includes('isbndb.com') && book.coverUrl.includes('nocover'));
  const showPlaceholder = isPlaceholderUrl || imageError;
  const coverSrc = normalizeCoverUrl(book.coverUrl);

  const setCombinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref]
  );

  // Check if tooltip would be clipped at top and adjust position
  const updateTooltipPosition = useCallback(() => {
    if (rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      // If book is within 280px of viewport top, show tooltip below
      // 280px accounts for tooltip height (~220px) + padding
      const shouldShowBelow = rect.top < 280;
      setTooltipPosition(shouldShowBelow ? 'below' : 'above');
    }
  }, []);

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
    // 3. Open Library "no image available" placeholders (180x270, 130x195, 260x390)
    // 4. Google Books URLs without edge=curl often return "no cover" images
    const isOneByOne = naturalWidth <= 1 && naturalHeight <= 1;
    const isGooglePlaceholder = 
      (naturalWidth === 120 && naturalHeight === 192) ||
      (naturalWidth === 128 && naturalHeight === 188) ||
      (naturalWidth === 128 && naturalHeight === 196) ||
      (naturalWidth === 128 && naturalHeight === 197);
    const isOpenLibraryPlaceholder =
      (naturalWidth === 180 && naturalHeight === 270) ||
      (naturalWidth === 130 && naturalHeight === 195) ||
      (naturalWidth === 260 && naturalHeight === 390);
    // IMPORTANT: `normalizeCoverUrl()` may add `edge=curl` to `img.src`, so if we
    // want to detect the problematic "no cover" variants we must check the raw
    // stored URL (book.coverUrl), not the normalized one.
    const rawCoverUrl = book.coverUrl || '';
    const isGoogleNoCover =
      rawCoverUrl.includes('books.google.com/books/content') &&
      !rawCoverUrl.includes('edge=curl');

    if (isOneByOne || isGooglePlaceholder || isOpenLibraryPlaceholder || isGoogleNoCover) {
      setImageError(true);
      setImageLoaded(true);
      return;
    }

    setImageError(false);
    setImageLoaded(true);
  };

  return (
    <div 
      ref={setCombinedRef}
      className={cn(
        'book-spine group/book relative hover:z-50 focus-within:z-50',
        isGrayed && 'book-grayed',
        isWobbling && 'book-wobble',
        isSparkle && 'book-sparkle'
      )}
      onMouseEnter={updateTooltipPosition}
    >
      {/* Post-it note decoration - positioned at bottom-right like a shelf talker */}
      {note && (
        <Popover>
          <PopoverTrigger asChild>
          <button 
            className="absolute left-1/2 -translate-x-1/2 -bottom-3 z-40 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
              <PostItNote content={note.content} color={note.color} size="sm" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side={isMobile ? "top" : "right"}
            align={isMobile ? "center" : "end"}
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
      {/* Use HoverCard for desktop hover behavior, with Popover nested for mobile tap */}
      <HoverCard openDelay={120} closeDelay={80}>
        <HoverCardTrigger asChild>
          <div
            className={cn(
              'book-cover w-[70px] h-[105px] cursor-pointer relative overflow-hidden',
              hasClubInfo && 'ring-2 ring-primary/60 ring-offset-1 ring-offset-background',
              isCurrentlyReading && 'ring-amber-500/80'
            )}
            onClick={onSelect}
          >
            {/* Loading skeleton - subtle shimmer, fades out as image loads */}
            {!showPlaceholder && (
              <div 
                className={cn(
                  "absolute inset-0 w-full h-full bg-muted animate-shimmer-subtle transition-opacity duration-300",
                  imageLoaded ? "opacity-0" : "opacity-100"
                )} 
              />
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

            {/* New likes badge */}
            {!hasClubInfo && newLikesCount > 0 && (
              <BookLikeBadge count={newLikesCount} />
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
        </HoverCardTrigger>

        {/* Hover tooltip with metadata - desktop only (hidden on mobile) */}
        <HoverCardContent
          side={tooltipPosition === 'above' ? 'top' : 'bottom'}
          sideOffset={16}
          align="center"
          avoidCollisions={true}
          collisionPadding={20}
          sticky="always"
          className="w-auto p-0 border-none bg-transparent shadow-none hidden sm:block z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <div className="max-h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain rounded-lg touch-pan-y scroll-touch">
              <BookHoverPreview 
                book={book} 
                amazonUrl={amazonUrl} 
                onSelect={onSelect}
                clubInfo={clubInfo}
                onMove={isInteractive ? onMove : undefined}
                onRemove={isInteractive ? onRemove : undefined}
                onOpenNote={isInteractive && onAddNote ? () => onAddNote() : undefined}
                onAddToShelf={onAddToShelf}
                isOnShelf={isOnShelf}
              />
            </div>
            {/* Arrow pointing to book */}
            <div 
              className={cn(
                "absolute left-1/2 -translate-x-1/2 border-[8px] border-transparent",
                tooltipPosition === 'above' 
                  ? '-bottom-4 border-t-popover' 
                  : '-top-4 border-b-popover'
              )} 
            />
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
  }
);

BookCover.displayName = 'BookCover';

export function BookSpine({ book, onMove, onRemove, onSelect, isInteractive = true, isGrayed = false, clubInfo, note, onAddNote, newLikesCount, onAddToShelf, isOnShelf }: BookSpineProps) {
  const { recentlyAddedBooks, recentlyCompletedBooks } = useBookAnimations();
  
  const isWobbling = recentlyAddedBooks.has(book.id);
  const isSparkle = recentlyCompletedBooks.has(book.id);

  // If not interactive (no move/remove), just render the book without context menu
  // But still pass onAddToShelf if available (for viewing friend's shelf)
  if (!isInteractive || !onMove || !onRemove) {
    return (
      <BookCover 
        book={book} 
        onSelect={onSelect} 
        isGrayed={isGrayed} 
        isWobbling={isWobbling} 
        isSparkle={isSparkle} 
        clubInfo={clubInfo} 
        note={note} 
        isInteractive={false} 
        newLikesCount={newLikesCount}
        onAddToShelf={onAddToShelf}
        isOnShelf={isOnShelf}
      />
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <BookCover 
          book={book} 
          onSelect={onSelect} 
          isGrayed={isGrayed} 
          isWobbling={isWobbling} 
          isSparkle={isSparkle} 
          clubInfo={clubInfo} 
          note={note} 
          onAddNote={onAddNote} 
          isInteractive={true} 
          newLikesCount={newLikesCount}
          onMove={onMove}
          onRemove={onRemove}
        />
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

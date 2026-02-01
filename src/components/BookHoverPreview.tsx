import { Book, BookStatus } from '@/types/book';
import { BookOpen, Hash, Tag, FileText, BookMarked, CheckCircle, Trash2, Plus, StickyNote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getAmazonBookUrl } from '@/lib/amazonLinks';
import { cn } from '@/lib/utils';

interface BookHoverPreviewProps {
  book: Book;
  amazonUrl?: string;
  onSelect?: () => void;
  clubInfo?: Array<{ clubName: string; status: string }>;
  onMove?: (id: string, status: BookStatus) => void;
  onRemove?: (id: string) => void;
  /** Callback to open the note dialog for this book */
  onOpenNote?: (book: Book) => void;
  /** When viewing someone else's shelf, allows adding the book to your own shelf */
  onAddToShelf?: (book: Book) => void;
  /** Whether this book is already on the user's shelf */
  isOnShelf?: boolean;
}

const statusOptions: { status: BookStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'reading', label: 'Reading', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { status: 'want-to-read', label: 'Want to Read', icon: <BookMarked className="w-3.5 h-3.5" /> },
  { status: 'read', label: 'Read', icon: <CheckCircle className="w-3.5 h-3.5" /> },
];

export function BookHoverPreview({ book, amazonUrl, onSelect, clubInfo, onMove, onRemove, onOpenNote, onAddToShelf, isOnShelf }: BookHoverPreviewProps) {
  const finalAmazonUrl = amazonUrl || getAmazonBookUrl(book.title, book.author, book.isbn);
  const hasMetadata = book.pageCount || book.isbn || book.categories?.length || book.description;
  const isInteractive = !!onMove;

  return (
    <div className="bg-popover text-popover-foreground px-4 py-3 rounded-lg text-sm min-w-[240px] max-w-[320px] shadow-xl border border-border max-h-[calc(100vh-120px)] overflow-y-auto overscroll-contain">
      {/* Title & Author */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        className="font-medium leading-snug text-left hover:text-primary transition-colors"
      >
        {book.title}
      </button>
      <p className="text-muted-foreground mt-1 text-xs">{book.author}</p>
      
      {/* Metadata section */}
      {hasMetadata && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
          {/* Page count */}
          {book.pageCount && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>{book.pageCount} pages</span>
            </div>
          )}
          
          {/* ISBN */}
          {book.isbn && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="w-3 h-3 shrink-0" />
              <span className="font-mono text-[10px]">{book.isbn}</span>
            </div>
          )}
          
          {/* Categories */}
          {book.categories && book.categories.length > 0 && (
            <div className="flex items-start gap-1.5 text-xs">
              <Tag className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {book.categories.slice(0, 3).map((cat, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {cat.length > 20 ? cat.slice(0, 20) + '…' : cat}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Description (truncated) */}
          {book.description && (
            <div className="flex items-start gap-1.5 text-xs">
              <FileText className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
              <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                {book.description}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Club info */}
      {clubInfo && clubInfo.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
          <span>📚</span>
          <span>{clubInfo.map(c => c.clubName).join(', ')}</span>
        </div>
      )}
      
      {/* Status actions - only show for interactive books (own shelf) */}
      {isInteractive && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusOptions
              .filter((opt) => opt.status !== book.status)
              .map((opt) => (
                <button
                  key={opt.status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove?.(book.id, opt.status);
                  }}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                    'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                  )}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            {onOpenNote && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNote(book);
                }}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                  'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                )}
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>Note</span>
              </button>
            )}
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(book.id);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors bg-destructive/10 hover:bg-destructive/20 text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Add to shelf action - only show when viewing someone else's shelf */}
      {onAddToShelf && (
        <div className="mt-3 pt-3 border-t border-border/50">
          {isOnShelf ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Already on your shelf</span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToShelf(book);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors bg-primary hover:bg-primary/90 text-primary-foreground w-full justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to my shelf</span>
            </button>
          )}
        </div>
      )}
      
      {/* Amazon link */}
      <a 
        href={finalAmazonUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline mt-2 text-xs flex items-center gap-1 font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        View on Amazon →
      </a>
    </div>
  );
}

import { Book } from '@/types/book';
import { BookOpen, Hash, Tag, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BookHoverPreviewProps {
  book: Book;
  amazonUrl: string;
  onSelect?: () => void;
  clubInfo?: Array<{ clubName: string; status: string }>;
}

export function BookHoverPreview({ book, amazonUrl, onSelect, clubInfo }: BookHoverPreviewProps) {
  const hasMetadata = book.pageCount || book.isbn || book.categories?.length || book.description;

  return (
    <div className="bg-popover text-popover-foreground px-4 py-3 rounded-lg text-sm min-w-[240px] max-w-[320px] shadow-xl border border-border">
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
      
      {/* Amazon link */}
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
  );
}

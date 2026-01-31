import { Book, BookStatus } from '@/types/book';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { BookOpen, BookMarked, CheckCircle, Trash2, StickyNote, ExternalLink, X } from 'lucide-react';
import { getAmazonBookUrl } from '@/lib/amazonLinks';
import { BookNote } from '@/hooks/useBookNotes';

interface BookActionDrawerProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove?: (id: string, status: BookStatus) => void;
  onRemove?: (id: string) => void;
  onSelect?: () => void;
  onAddNote?: () => void;
  note?: BookNote;
}

const statusOptions: { status: BookStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'reading', label: 'Currently Reading', icon: <BookOpen className="w-5 h-5" /> },
  { status: 'want-to-read', label: 'Want to Read', icon: <BookMarked className="w-5 h-5" /> },
  { status: 'read', label: 'Read', icon: <CheckCircle className="w-5 h-5" /> },
];

export function BookActionDrawer({
  book,
  open,
  onOpenChange,
  onMove,
  onRemove,
  onSelect,
  onAddNote,
  note,
}: BookActionDrawerProps) {
  const amazonUrl = getAmazonBookUrl(book.title, book.author, book.isbn);

  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative border-b pb-4">
          <DrawerClose className="absolute right-4 top-4 p-1 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </DrawerClose>
          <DrawerTitle className="text-left pr-8 line-clamp-2">{book.title}</DrawerTitle>
          <p className="text-sm text-muted-foreground text-left">{book.author}</p>
        </DrawerHeader>
        
        <div className="p-4 space-y-2">
          {/* View Details */}
          {onSelect && (
            <button
              onClick={() => handleAction(onSelect)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <span>View Details</span>
            </button>
          )}

          {/* Move to status options */}
          {onMove && (
            <>
              <div className="pt-2 pb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Move to</span>
              </div>
              {statusOptions
                .filter((opt) => opt.status !== book.status)
                .map((opt) => (
                  <button
                    key={opt.status}
                    onClick={() => handleAction(() => onMove(book.id, opt.status))}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <span className="text-muted-foreground">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
            </>
          )}

          {/* Note action */}
          {onAddNote && (
            <button
              onClick={() => handleAction(onAddNote)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <StickyNote className="w-5 h-5 text-muted-foreground" />
              <span>{note ? 'Edit Note' : 'Add Note'}</span>
            </button>
          )}

          {/* Amazon link */}
          <a
            href={amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            onClick={() => onOpenChange(false)}
          >
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
            <span>View on Amazon</span>
          </a>

          {/* Remove action */}
          {onRemove && (
            <>
              <div className="border-t my-2" />
              <button
                onClick={() => handleAction(() => onRemove(book.id))}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 transition-colors text-left text-destructive"
              >
                <Trash2 className="w-5 h-5" />
                <span>Remove from Shelf</span>
              </button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBookSearch, getCoverUrl } from '@/hooks/useBookSearch';
import { BookStatus, GoogleBook } from '@/types/book';
import { Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddBookDialogProps {
  onAddBook: (book: {
    title: string;
    author: string;
    coverUrl: string;
    status: BookStatus;
    openLibraryKey: string;
  }) => void;
  defaultStatus: BookStatus;
}

export function AddBookDialog({ onAddBook, defaultStatus }: AddBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { results, isLoading, error, searchBooks, clearResults } = useBookSearch();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchBooks(query);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (book: GoogleBook) => {
    onAddBook({
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors?.[0] || 'Unknown Author',
      coverUrl: getCoverUrl(book),
      status: defaultStatus,
      openLibraryKey: book.volumeInfo.infoLink || book.id, // Use Google Books link as reference
    });
    setOpen(false);
    setQuery('');
    clearResults();
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    clearResults();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add a Book</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or author..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive text-sm">
              {error}
            </div>
          )}

          {!isLoading && !error && results.length === 0 && query.length >= 2 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No books found
            </div>
          )}

          {!isLoading && !error && query.length < 2 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Type at least 2 characters to search
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {results.map((book) => (
              <button
                key={book.id}
                onClick={() => handleSelect(book)}
                className={cn(
                  'group p-2 rounded-lg text-left transition-colors',
                  'hover:bg-secondary focus:bg-secondary focus:outline-none'
                )}
              >
                <div className="aspect-[2/3] rounded overflow-hidden bg-muted mb-2">
                  <img
                    src={getCoverUrl(book)}
                    alt={book.volumeInfo.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <p className="text-xs font-medium line-clamp-2 leading-tight">
                  {book.volumeInfo.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {book.volumeInfo.authors?.[0] || 'Unknown'}
                </p>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

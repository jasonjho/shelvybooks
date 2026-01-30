import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBookSearch, getCoverUrl } from '@/hooks/useBookSearch';
import { BookStatus, GoogleBook } from '@/types/book';
import { Plus, Search, Loader2, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddBookDialogProps {
  onAddBook: (book: {
    title: string;
    author: string;
    coverUrl: string;
    status: BookStatus;
    openLibraryKey: string;
    pageCount?: number;
    isbn?: string;
    description?: string;
    categories?: string[];
  }) => void;
  defaultStatus: BookStatus;
}

export function AddBookDialog({ onAddBook, defaultStatus }: AddBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
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
    // Extract ISBN (prefer ISBN-13, fall back to ISBN-10)
    const isbn = book.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier
      || book.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier;
    
    onAddBook({
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors?.[0] || 'Unknown Author',
      coverUrl: getCoverUrl(book),
      status: defaultStatus,
      openLibraryKey: book.volumeInfo.infoLink || book.id,
      pageCount: book.volumeInfo.pageCount,
      isbn,
      description: book.volumeInfo.description,
      categories: book.volumeInfo.categories?.slice(0, 5),
    });
    setOpen(false);
    setQuery('');
    clearResults();
  };

  const handleManualAdd = () => {
    if (!manualTitle.trim()) return;
    
    onAddBook({
      title: manualTitle.trim(),
      author: manualAuthor.trim() || 'Unknown Author',
      coverUrl: '',
      status: defaultStatus,
      openLibraryKey: `manual-${Date.now()}`,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setQuery('');
    setManualTitle('');
    setManualAuthor('');
    setShowManualEntry(false);
    clearResults();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
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
          <DialogTitle className="font-sans text-lg font-semibold">Add a Book</DialogTitle>
          <DialogDescription className="sr-only">
            Search for a book or add one manually
          </DialogDescription>
        </DialogHeader>
        
        {!showManualEntry ? (
          <>
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
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground text-sm">No books found</p>
                  <p className="text-xs text-muted-foreground/70">
                    Tip: Try adding the author name for better results
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setManualTitle(query);
                      setShowManualEntry(true);
                    }}
                    className="gap-1.5"
                  >
                    <PenLine className="w-4 h-4" />
                    Add manually
                  </Button>
                </div>
              )}

              {!isLoading && !error && results.length > 0 && results.length < 4 && (
                <p className="text-xs text-muted-foreground/70 text-center mb-3">
                  Can't find your book? Try adding the author name
                </p>
              )}

              {!isLoading && !error && query.length < 2 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground text-sm">Type at least 2 characters to search</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowManualEntry(true)}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <PenLine className="w-4 h-4" />
                    Or add manually
                  </Button>
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

              {results.length > 0 && (
                <div className="text-center pt-4 border-t mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowManualEntry(true)}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <PenLine className="w-4 h-4" />
                    Can't find your book? Add manually
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-title">Title *</Label>
              <Input
                id="manual-title"
                placeholder="Book title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-author">Author</Label>
              <Input
                id="manual-author"
                placeholder="Author name (optional)"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowManualEntry(false)}
                className="flex-1"
              >
                Back to search
              </Button>
              <Button 
                onClick={handleManualAdd}
                disabled={!manualTitle.trim()}
                className="flex-1"
              >
                Add Book
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
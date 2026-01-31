import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { BookStatus } from '@/types/book';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchCoverUrl } from '@/hooks/useBookSearch';

interface ParsedBook {
  title: string;
  author: string;
  status: BookStatus;
  selected: boolean;
}

interface GoodreadsRow {
  Title?: string;
  Author?: string;
  'Author l-f'?: string;
  'Exclusive Shelf'?: string;
  'Bookshelves'?: string;
  [key: string]: string | undefined;
}

interface ImportBooksDialogProps {
  onAddBook: (book: {
    title: string;
    author: string;
    coverUrl: string;
    status: BookStatus;
    openLibraryKey: string;
  }) => Promise<void>;
  existingBooks: { title: string; author: string }[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function mapGoodreadsStatus(shelf: string | undefined): BookStatus {
  if (!shelf) return 'want-to-read';
  const lower = shelf.toLowerCase();
  if (lower === 'currently-reading' || lower.includes('currently')) return 'reading';
  if (lower === 'read') return 'read';
  return 'want-to-read';
}

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Calculate word overlap similarity (0-1)
function wordSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeForComparison(str1).split(' ').filter(w => w.length > 2));
  const words2 = new Set(normalizeForComparison(str2).split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let matchCount = 0;
  words1.forEach(word => {
    if (words2.has(word)) matchCount++;
  });
  
  // Return similarity based on smaller set (to handle subtitles well)
  const minSize = Math.min(words1.size, words2.size);
  return matchCount / minSize;
}

function isDuplicate(book: { title: string; author: string }, existingBooks: { title: string; author: string }[]): boolean {
  const normalizedTitle = normalizeForComparison(book.title);
  const normalizedAuthor = normalizeForComparison(book.author);
  
  return existingBooks.some(existing => {
    const existingTitle = normalizeForComparison(existing.title);
    const existingAuthor = normalizeForComparison(existing.author);
    
    // Check author similarity (at least one significant word matches)
    const authorWords1 = normalizedAuthor.split(' ').filter(w => w.length > 2);
    const authorWords2 = existingAuthor.split(' ').filter(w => w.length > 2);
    const authorMatch = authorWords1.some(w => authorWords2.includes(w)) || 
                        authorWords2.some(w => authorWords1.includes(w));
    
    if (!authorMatch) return false;
    
    // Exact title match
    if (existingTitle === normalizedTitle) return true;
    
    // One title contains the other (handles subtitles)
    if (existingTitle.includes(normalizedTitle) || normalizedTitle.includes(existingTitle)) return true;
    
    // High word overlap (>70% of significant words match)
    if (wordSimilarity(book.title, existing.title) >= 0.7) return true;
    
    return false;
  });
}

export function ImportBooksDialog({ onAddBook, existingBooks, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ImportBooksDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedBooks, setParsedBooks] = useState<(ParsedBook & { isDuplicate: boolean })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    Papa.parse<GoodreadsRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV: ' + results.errors[0].message);
          return;
        }

        const books = results.data
          .filter((row) => row.Title && row.Title.trim())
          .map((row) => {
            const book = {
              title: row.Title?.trim() || '',
              author: row.Author?.trim() || row['Author l-f']?.trim() || 'Unknown Author',
              status: mapGoodreadsStatus(row['Exclusive Shelf'] || row['Bookshelves']),
            };
            const duplicate = isDuplicate(book, existingBooks);
            return {
              ...book,
              selected: !duplicate, // Deselect duplicates by default
              isDuplicate: duplicate,
            };
          });

        if (books.length === 0) {
          setError('No books found in the CSV file. Make sure it\'s a Goodreads export.');
          return;
        }

        setParsedBooks(books);
        setStep('preview');
      },
      error: (err) => {
        setError('Failed to read file: ' + err.message);
      },
    });
  }, [existingBooks]);

  const toggleBook = useCallback((index: number) => {
    setParsedBooks((prev) =>
      prev.map((book, i) => (i === index ? { ...book, selected: !book.selected } : book))
    );
  }, []);

  const toggleAll = useCallback((selected: boolean) => {
    setParsedBooks((prev) => prev.map((book) => ({ ...book, selected })));
  }, []);

  const handleImport = useCallback(async () => {
    const selectedBooks = parsedBooks.filter((b) => b.selected);
    if (selectedBooks.length === 0) return;

    setStep('importing');
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < selectedBooks.length; i++) {
      const book = selectedBooks[i];
      try {
        // Fetch cover from Google Books API
        const coverUrl = await fetchCoverUrl(book.title, book.author);
        
        await onAddBook({
          title: book.title,
          author: book.author,
          coverUrl: coverUrl || '',
          status: book.status,
          openLibraryKey: `goodreads-import-${Date.now()}-${i}`,
        });
        success++;
      } catch {
        failed++;
      }
      setImportProgress(((i + 1) / selectedBooks.length) * 100);
      setImportResults({ success, failed });
    }

    setStep('done');
  }, [parsedBooks, onAddBook]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Reset after animation
    setTimeout(() => {
      setStep('upload');
      setParsedBooks([]);
      setError(null);
      setImportProgress(0);
      setImportResults({ success: 0, failed: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 200);
  }, []);

  const selectedCount = parsedBooks.filter((b) => b.selected).length;

  const getStatusLabel = (status: BookStatus) => {
    if (status === 'reading') return 'Reading';
    if (status === 'read') return 'Read';
    return 'To Read';
  };

  const dialogContent = (
    <DialogContent className="max-w-2xl w-[90vw] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="font-sans text-lg font-semibold">Import from Goodreads</DialogTitle>
        <DialogDescription className="text-sm">
          Upload your Goodreads library export (CSV) to bulk-add books
        </DialogDescription>
      </DialogHeader>

      {step === 'upload' && (
        <div className="space-y-4">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              'hover:border-primary/50 hover:bg-muted/50 cursor-pointer',
              error && 'border-destructive'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Click to upload CSV</p>
            <p className="text-xs text-muted-foreground">
              Export from Goodreads → My Books → Import/Export
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">How to export from Goodreads:</p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1">
              <li>Go to goodreads.com → My Books</li>
              <li>Click "Import and export" in the left sidebar</li>
              <li>Click "Export Library"</li>
              <li>Upload the downloaded CSV here</li>
            </ol>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Found <span className="font-medium text-foreground">{parsedBooks.length}</span> books
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>
                Deselect all
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-2 space-y-1">
              {parsedBooks.map((book, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md transition-colors',
                    'hover:bg-muted/50 cursor-pointer',
                    !book.selected && 'opacity-50'
                  )}
                  onClick={() => toggleBook(index)}
                >
                  <Checkbox checked={book.selected} className="pointer-events-none flex-shrink-0" />
                  <Book className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={book.title}>{book.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap',
                      book.isDuplicate 
                        ? 'bg-muted text-muted-foreground'
                        : book.status === 'reading' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : book.status === 'want-to-read' 
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    )}
                  >
                    {book.isDuplicate ? 'On shelf' : getStatusLabel(book.status)}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleImport} disabled={selectedCount === 0} className="flex-1">
              Import {selectedCount} {selectedCount === 1 ? 'book' : 'books'}
            </Button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <Progress value={importProgress} />
            <p className="text-sm text-center text-muted-foreground">
              Importing books... {importResults.success + importResults.failed} /{' '}
              {parsedBooks.filter((b) => b.selected).length}
            </p>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-medium">Import Complete!</p>
            <p className="text-sm text-muted-foreground">
              Successfully added {importResults.success} {importResults.success === 1 ? 'book' : 'books'}
              {importResults.failed > 0 && ` (${importResults.failed} failed)`}
            </p>
          </div>
          <Button onClick={handleClose} className="w-full">
            Done
          </Button>
        </div>
      )}
    </DialogContent>
  );

  // When controlled (no trigger needed), just render the dialog
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled: include the trigger button
  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="w-4 h-4" />
          Import
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}

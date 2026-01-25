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
}

function mapGoodreadsStatus(shelf: string | undefined): BookStatus {
  if (!shelf) return 'want-to-read';
  const lower = shelf.toLowerCase();
  if (lower === 'currently-reading' || lower.includes('currently')) return 'reading';
  if (lower === 'read') return 'read';
  return 'want-to-read';
}

export function ImportBooksDialog({ onAddBook }: ImportBooksDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedBooks, setParsedBooks] = useState<ParsedBook[]>([]);
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

        const books: ParsedBook[] = results.data
          .filter((row) => row.Title && row.Title.trim())
          .map((row) => ({
            title: row.Title?.trim() || '',
            author: row.Author?.trim() || row['Author l-f']?.trim() || 'Unknown Author',
            status: mapGoodreadsStatus(row['Exclusive Shelf'] || row['Bookshelves']),
            selected: true,
          }));

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
  }, []);

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
        await onAddBook({
          title: book.title,
          author: book.author,
          coverUrl: '',
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="w-4 h-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Import from Goodreads</DialogTitle>
          <DialogDescription>
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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
                      'flex items-center gap-3 p-2 rounded-md transition-colors',
                      'hover:bg-muted/50 cursor-pointer',
                      !book.selected && 'opacity-50'
                    )}
                    onClick={() => toggleBook(index)}
                  >
                    <Checkbox checked={book.selected} className="pointer-events-none" />
                    <Book className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full flex-shrink-0',
                        book.status === 'reading' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        book.status === 'want-to-read' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                        book.status === 'read' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      )}
                    >
                      {book.status === 'reading' ? 'Reading' : book.status === 'read' ? 'Read' : 'Want to Read'}
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
    </Dialog>
  );
}

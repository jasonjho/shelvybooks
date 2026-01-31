import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react';
import { Collection, CollectionBook } from '@/hooks/useOpenLibraryCollections';
import { cn } from '@/lib/utils';

interface CollectionCardProps {
  collection: Collection;
  books: CollectionBook[] | undefined;
  isLoading: boolean;
  onPreview: () => void;
  onAddBooks: (books: CollectionBook[]) => void;
  isAddingBooks?: boolean;
}

export function CollectionCard({
  collection,
  books,
  isLoading,
  onPreview,
  onAddBooks,
  isAddingBooks = false,
}: CollectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());

  const handleExpand = async () => {
    if (!isExpanded && !books) {
      onPreview();
    }
    setIsExpanded(!isExpanded);
  };

  const handleSelectBook = (bookKey: string) => {
    setSelectedBooks(prev => {
      const next = new Set(prev);
      if (next.has(bookKey)) {
        next.delete(bookKey);
      } else {
        next.add(bookKey);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (books) {
      if (selectedBooks.size === books.length) {
        setSelectedBooks(new Set());
      } else {
        setSelectedBooks(new Set(books.map(b => b.key)));
      }
    }
  };

  const handleAddSelected = () => {
    if (books) {
      const booksToAdd = books.filter(b => selectedBooks.has(b.key));
      onAddBooks(booksToAdd);
      setSelectedBooks(new Set());
    }
  };

  const handleAddAll = () => {
    if (books) {
      onAddBooks(books);
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{collection.icon}</span>
            <div>
              <CardTitle className="text-lg font-sans">{collection.name}</CardTitle>
              <CardDescription className="text-sm font-sans">{collection.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (!books) {
                  onPreview();
                }
                // Small delay to ensure books are loaded
                setTimeout(() => handleAddAll(), books ? 0 : 1000);
              }}
              disabled={isLoading || isAddingBooks}
              className="shrink-0"
            >
              {isAddingBooks ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Add All
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        {/* Expand/Collapse button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExpand}
          className="w-full justify-center text-muted-foreground hover:text-foreground font-sans"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Hide preview
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Preview & pick books
            </>
          )}
        </Button>

        {/* Expanded book list */}
        {isExpanded && (
          <div className="mt-4 space-y-3 animate-fade-in">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-14 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : books && books.length > 0 ? (
              <>
                {/* Select all / Add selected controls */}
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-sm font-sans"
                  >
                    {selectedBooks.size === books.length ? 'Deselect all' : 'Select all'}
                  </Button>
                  {selectedBooks.size > 0 && (
                    <Button
                      size="sm"
                      onClick={handleAddSelected}
                      disabled={isAddingBooks}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add {selectedBooks.size} selected
                    </Button>
                  )}
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2 pr-4">
                    {books.map(book => (
                      <label
                        key={book.key}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                          selectedBooks.has(book.key) 
                            ? 'bg-primary/10' 
                            : 'hover:bg-muted'
                        )}
                      >
                        <Checkbox
                          checked={selectedBooks.has(book.key)}
                          onCheckedChange={() => handleSelectBook(book.key)}
                        />
                        <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-muted">
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-amber-100 text-xs font-medium">
                              {book.title[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium font-sans break-words">{book.title}</p>
                          <p className="text-xs text-muted-foreground font-sans break-words">{book.author}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 font-sans">
                No books found in this collection
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

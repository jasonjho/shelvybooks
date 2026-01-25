import { useState } from 'react';
import { CollectionCard } from './CollectionCard';
import { useOpenLibraryCollections, CollectionBook } from '@/hooks/useOpenLibraryCollections';
import { Book, BookStatus } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DiscoverCollectionsProps {
  onAddBook: (book: Omit<Book, 'id'>) => Promise<void>;
  isEmptyShelf?: boolean;
  compact?: boolean;
}

export function DiscoverCollections({ 
  onAddBook, 
  isEmptyShelf = false,
  compact = false,
}: DiscoverCollectionsProps) {
  const [isExpanded, setIsExpanded] = useState(isEmptyShelf);
  const [addingBooks, setAddingBooks] = useState<Set<string>>(new Set());
  
  const {
    collections,
    loadingCollection,
    collectionBooks,
    fetchCollection,
    convertToBook,
  } = useOpenLibraryCollections();

  const handlePreview = async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      await fetchCollection(collection);
    }
  };

  const handleAddBooks = async (collectionId: string, books: CollectionBook[]) => {
    setAddingBooks(prev => new Set(prev).add(collectionId));
    
    try {
      let addedCount = 0;
      for (const book of books) {
        try {
          const bookData = convertToBook(book, 'want-to-read' as BookStatus);
          await onAddBook(bookData);
          addedCount++;
        } catch (err) {
          console.error('Failed to add book:', book.title, err);
        }
      }
      
      toast({
        title: 'Books added!',
        description: `Added ${addedCount} book${addedCount !== 1 ? 's' : ''} to your shelf.`,
      });
    } finally {
      setAddingBooks(prev => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    }
  };

  // For empty shelf, show prominently
  if (isEmptyShelf) {
    return (
      <div className="py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Get Started</span>
          </div>
          <h2 className="text-2xl font-display font-semibold mb-2">
            Your shelf is empty!
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Browse curated collections below to quickly populate your bookshelf, 
            or search for specific books using the "Add Book" button.
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {collections.map(collection => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              books={collectionBooks[collection.id]}
              isLoading={loadingCollection === collection.id}
              onPreview={() => handlePreview(collection.id)}
              onAddBooks={(books) => handleAddBooks(collection.id, books)}
              isAddingBooks={addingBooks.has(collection.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Compact discover section (persistent)
  return (
    <div className="mb-6">
      <Button
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Discover Collections</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {collections.map(collection => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              books={collectionBooks[collection.id]}
              isLoading={loadingCollection === collection.id}
              onPreview={() => handlePreview(collection.id)}
              onAddBooks={(books) => handleAddBooks(collection.id, books)}
              isAddingBooks={addingBooks.has(collection.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

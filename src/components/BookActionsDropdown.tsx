import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BookPlus, Upload, ChevronDown, Plus, Sparkles, Library } from 'lucide-react';
import { ImportBooksDialog } from '@/components/ImportBooksDialog';
import { AddBookDialog } from '@/components/AddBookDialog';
import { MagicRecommender } from '@/components/MagicRecommender';
import { DiscoverCollections } from '@/components/DiscoverCollections';
import { Book } from '@/types/book';

interface BookActionsDropdownProps {
  onAddBook: (book: Omit<Book, 'id'>) => Promise<void>;
  existingBooks: Book[];
}

export function BookActionsDropdown({ onAddBook, existingBooks }: BookActionsDropdownProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [recommenderOpen, setRecommenderOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-background/80">
            <BookPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Books</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-background border shadow-lg z-50">
          <DropdownMenuItem 
            onClick={() => setRecommenderOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Find me a book
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setDiscoverOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Library className="w-4 h-4" />
            Discover Collections
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setAddBookOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Book
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setImportOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import from CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs rendered outside dropdown to avoid z-index issues */}
      <ImportBooksDialog 
        open={importOpen} 
        onOpenChange={setImportOpen} 
        onAddBook={onAddBook} 
        existingBooks={existingBooks} 
      />
      <AddBookDialog 
        open={addBookOpen} 
        onOpenChange={setAddBookOpen} 
        onAddBook={onAddBook} 
        defaultStatus="reading" 
      />
      <MagicRecommender 
        open={recommenderOpen}
        onOpenChange={setRecommenderOpen}
        books={existingBooks}
        onAddBook={onAddBook}
      />
      <DiscoverCollections 
        open={discoverOpen}
        onOpenChange={setDiscoverOpen}
        onAddBook={onAddBook}
      />
    </>
  );
}

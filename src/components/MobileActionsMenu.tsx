import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  BookPlus, 
  Upload, 
  Sparkles, 
  Library, 
  Users, 
  Search, 
  Mail,
} from 'lucide-react';
import { ImportBooksDialog } from '@/components/ImportBooksDialog';
import { AddBookDialog } from '@/components/AddBookDialog';
import { MagicRecommender } from '@/components/MagicRecommender';
import { DiscoverCollections } from '@/components/DiscoverCollections';
import { FindFriendsDialog } from '@/components/FindFriendsDialog';
import { Book } from '@/types/book';

interface MobileActionsMenuProps {
  onAddBook: (book: Omit<Book, 'id'>) => Promise<void>;
  existingBooks: Book[];
}

export function MobileActionsMenu({ 
  onAddBook, 
  existingBooks,
}: MobileActionsMenuProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [recommenderOpen, setRecommenderOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [findFriendsOpen, setFindFriendsOpen] = useState(false);
  const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="default" 
            size="icon" 
            className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 shadow-md focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-background border shadow-lg z-50">
          {/* Books section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
            <BookPlus className="w-3 h-3" />
            Add Books
          </DropdownMenuLabel>
          <DropdownMenuItem 
            onClick={() => setAddBookOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Book
          </DropdownMenuItem>
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
          <DropdownMenuItem 
            onClick={() => setImportOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import from CSV
          </DropdownMenuItem>
          
          {/* Social section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Social
          </DropdownMenuLabel>
          <DropdownMenuItem 
            onClick={() => setFindFriendsOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            Find Friends
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setInviteFriendsOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            Invite Friends
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* All dialogs */}
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
        defaultStatus="want-to-read" 
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
      <FindFriendsDialog 
        open={findFriendsOpen} 
        onOpenChange={setFindFriendsOpen} 
        initialTab="find"
      />
      <FindFriendsDialog 
        open={inviteFriendsOpen} 
        onOpenChange={setInviteFriendsOpen} 
        initialTab="invite"
      />
    </>
  );
}

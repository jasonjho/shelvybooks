import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  BookPlus, 
  Upload, 
  Sparkles, 
  Library, 
  Users, 
  Share2, 
  Search, 
  Mail,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImportBooksDialog } from '@/components/ImportBooksDialog';
import { AddBookDialog } from '@/components/AddBookDialog';
import { MagicRecommender } from '@/components/MagicRecommender';
import { DiscoverCollections } from '@/components/DiscoverCollections';
import { FindFriendsDialog } from '@/components/FindFriendsDialog';
import { ShareShelfDialog } from '@/components/ShareShelfDialog';
import { Book } from '@/types/book';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ViewedShelfUser } from '@/hooks/useViewedShelf';

interface FollowedUserWithShelf {
  userId: string;
  username: string;
  avatarUrl: string | null;
  shareId: string | null;
}

interface MobileActionsMenuProps {
  onAddBook: (book: Omit<Book, 'id'>) => Promise<void>;
  existingBooks: Book[];
  viewedUser?: ViewedShelfUser | null;
  onSelectUser?: (user: ViewedShelfUser) => void;
  onSelectOwnShelf?: () => void;
}

export function MobileActionsMenu({ 
  onAddBook, 
  existingBooks,
  viewedUser,
  onSelectUser,
  onSelectOwnShelf,
}: MobileActionsMenuProps) {
  const { user } = useAuth();
  const { following, loadingFollowing } = useFollows();
  const [importOpen, setImportOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [recommenderOpen, setRecommenderOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [findFriendsOpen, setFindFriendsOpen] = useState(false);
  const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Fetch profile and shelf info for followed users (for Browse Shelves)
  const { data: followedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['followed-users-for-mobile-switcher', following.map(f => f.following_id)],
    queryFn: async (): Promise<FollowedUserWithShelf[]> => {
      if (following.length === 0) return [];

      const userIds = following.map(f => f.following_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      if (!profiles || profiles.length === 0) return [];

      const { data: shelfInfos } = await supabase
        .rpc('get_public_shelf_info_for_users', { _user_ids: userIds });

      const shelfMap = new Map(
        (shelfInfos || []).map((s: { user_id: string; share_id: string }) => [s.user_id, s.share_id])
      );

      return profiles.map(p => ({
        userId: p.user_id,
        username: p.username,
        avatarUrl: p.avatar_url,
        shareId: shelfMap.get(p.user_id) || null,
      }));
    },
    enabled: !!user && following.length > 0 && !!onSelectUser,
  });

  const usersWithShelves = followedUsers.filter(u => u.shareId);
  const showBrowseShelves = !!onSelectUser && (following.length > 0 || loadingFollowing);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="default" 
            size="icon" 
            className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 shadow-md"
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
          
          {/* Social section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Social
          </DropdownMenuLabel>
          
          {/* Browse Shelves submenu */}
          {showBrowseShelves && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                <BookOpen className="w-4 h-4" />
                Browse Shelves
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {viewedUser && (
                  <>
                    <DropdownMenuItem 
                      onClick={onSelectOwnShelf}
                      className="gap-2 cursor-pointer"
                    >
                      <span className="font-medium">Your shelf</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {loadingFollowing || loadingUsers ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : usersWithShelves.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    No friends with public shelves
                  </div>
                ) : (
                  usersWithShelves.map((u) => (
                    <DropdownMenuItem
                      key={u.userId}
                      onClick={() => u.shareId && onSelectUser?.({
                        userId: u.userId,
                        username: u.username,
                        avatarUrl: u.avatarUrl,
                        shareId: u.shareId,
                      })}
                      className="gap-2 cursor-pointer"
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={u.avatarUrl || undefined} alt={u.username} />
                        <AvatarFallback className="text-[10px]">
                          {u.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>@{u.username}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
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
          <DropdownMenuItem 
            onClick={() => setShareOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Share Shelf
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
      <ShareShelfDialog open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
}

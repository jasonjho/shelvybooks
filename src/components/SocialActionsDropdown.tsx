import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Users, Share2, ChevronDown, Search, Mail } from 'lucide-react';
import { FindFriendsDialog } from '@/components/FindFriendsDialog';
import { ShareShelfDialog } from '@/components/ShareShelfDialog';

export function SocialActionsDropdown() {
  const [findFriendsOpen, setFindFriendsOpen] = useState(false);
  const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-background/80 focus-visible:ring-0 focus-visible:ring-offset-0">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Social</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg z-50">
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

      {/* Dialogs rendered outside dropdown to avoid z-index issues */}
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

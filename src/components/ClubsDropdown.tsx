import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, ChevronDown, Plus, Loader2, Link2 } from 'lucide-react';
import { useBookClubs } from '@/hooks/useBookClubs';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export function ClubsDropdown() {
  const { clubs, loading, createClub, joinClub } = useBookClubs();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!clubName.trim()) return;
    
    setIsSubmitting(true);
    const club = await createClub(clubName.trim(), clubDescription.trim() || undefined);
    setIsSubmitting(false);
    
    if (club) {
      setDialogOpen(false);
      resetForm();
      navigate(`/clubs/${club.id}`);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    
    setIsSubmitting(true);
    const club = await joinClub(inviteCode.trim());
    setIsSubmitting(false);
    
    if (club) {
      setDialogOpen(false);
      resetForm();
      navigate(`/clubs/${club.id}`);
    }
  };

  const resetForm = () => {
    setClubName('');
    setClubDescription('');
    setInviteCode('');
    setActiveTab('create');
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className="gap-1.5" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        Clubs
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-10 px-2.5 sm:px-3 bg-background/80 border-border text-foreground hover:bg-muted hover:text-foreground shrink-0">
            <Users className="w-4 h-4" />
            {!isMobile && "Clubs"}
            {clubs.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {clubs.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover">
          {clubs.length === 0 ? (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              No clubs yet
            </div>
          ) : (
            clubs.map((club) => (
              <DropdownMenuItem key={club.id} asChild>
                <Link to={`/clubs/${club.id}`} className="cursor-pointer">
                  <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="truncate">{club.name}</span>
                </Link>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create or Join Club
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
        setDialogOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Book Clubs
            </DialogTitle>
            <DialogDescription>
              Create a new club or join one with an invite code
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'join')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="join" className="gap-1.5">
                <Link2 className="w-4 h-4" />
                Join
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="club-name">Club Name *</Label>
                <Input
                  id="club-name"
                  placeholder="e.g., Monthly Mystery Readers"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-description">Description (optional)</Label>
                <Textarea
                  id="club-description"
                  placeholder="What's your club about?"
                  value={clubDescription}
                  onChange={(e) => setClubDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={!clubName.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Creating...' : 'Create Club'}
              </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  placeholder="Paste the invite code here"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ask a club member for their invite link or code
                </p>
              </div>
              <Button 
                onClick={handleJoin} 
                disabled={!inviteCode.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Joining...' : 'Join Club'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClubDetails, useBookClubs, VoteWithUser, ClubMemberWithProfile } from '@/hooks/useBookClubs';
import { useClubReflections } from '@/hooks/useClubReflections';
import { useBookSearch, getCoverUrl } from '@/hooks/useBookSearch';
import { useBooksContext } from '@/contexts/BooksContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { 
  ArrowLeft, 
  Users, 
  Link2, 
  Copy, 
  Check, 
  Plus, 
  Search, 
  Loader2,
  ThumbsUp,
  BookOpen,
  CheckCircle,
  MoreVertical,
  Trash2,
  Play,
  Library,
  BookMarked,
  Settings,
  Pencil,
  Crown,
  ExternalLink
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { cn } from '@/lib/utils';
import { GoogleBook } from '@/types/book';
import { useToast } from '@/hooks/use-toast';
import { PastReadCard } from '@/components/club/PastReadCard';

export default function ClubPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { updateClub, deleteClub } = useBookClubs();
  const {
    club,
    members,
    suggestions,
    votes,
    loading,
    isOwner,
    addSuggestion,
    vote,
    updateSuggestionStatus,
    removeSuggestion,
    updateClubDetails,
  } = useClubDetails(clubId);

  // Reflections hook for past reads
  const {
    reflections,
    addReflection,
    updateReflection,
    deleteReflection,
    getReflectionsForSuggestion,
    hasReflectedOn,
    getAverageRating,
  } = useClubReflections(clubId);

  // Get votes for a specific suggestion
  const getVotesForSuggestion = (suggestionId: string) => {
    return votes.filter(v => v.suggestionId === suggestionId);
  };

  const { addBook, books } = useBooksContext();
  const [copied, setCopied] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if a book is already on the user's shelf (fuzzy match - handles subtitle variations)
  const isOnShelf = (title: string, author: string) => {
    const normalizedTitle = title.toLowerCase().split(':')[0].trim();
    const normalizedAuthor = author.toLowerCase().split(',')[0].trim();
    
    return books.some((b) => {
      const shelfTitle = b.title.toLowerCase().split(':')[0].trim();
      const shelfAuthor = b.author.toLowerCase().split(',')[0].trim();
      
      // Match if main title (before colon) and primary author match
      return shelfTitle === normalizedTitle && shelfAuthor === normalizedAuthor;
    });
  };

  const handleAddToShelf = async (title: string, author: string, coverUrl?: string | null) => {
    if (isOnShelf(title, author)) {
      toast({ title: 'Already on your shelf', description: `"${title}" is already in your library.` });
      return;
    }
    await addBook({
      title,
      author,
      coverUrl: coverUrl || '',
      status: 'want-to-read',
    });
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Club not found</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shelf
        </Button>
      </div>
    );
  }

  const inviteUrl = `${window.location.origin}/clubs/join/${club.inviteCode}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: 'Invite link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenEditDialog = () => {
    setEditName(club.name);
    setEditDescription(club.description || '');
    setEditDialogOpen(true);
  };

  const handleUpdateClub = async () => {
    if (!clubId || !editName.trim()) return;
    setIsUpdating(true);
    const success = await updateClub(clubId, editName.trim(), editDescription.trim() || undefined);
    setIsUpdating(false);
    if (success) {
      updateClubDetails(editName.trim(), editDescription.trim() || null);
      setEditDialogOpen(false);
    }
  };

  const handleDeleteClub = async () => {
    if (!clubId) return;
    await deleteClub(clubId);
    navigate('/');
  };

  const currentlyReading = suggestions.find((s) => s.status === 'reading');
  const suggestedBooks = suggestions
    .filter((s) => s.status === 'suggested')
    .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  const pastReads = suggestions
    .filter((s) => s.status === 'read')
    .sort((a, b) => {
      const aDate = a.finishedAt || a.createdAt;
      const bDate = b.finishedAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Edit Club Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-semibold">Edit Club</DialogTitle>
            <DialogDescription>Update your club's name and description</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Club Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={200}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateClub} disabled={!editName.trim() || isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="container py-6 sm:py-8 space-y-8">
        {/* Back link + Club banner */}
        <div className="space-y-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to shelf
          </button>
          <div className="rounded-xl border border-amber-200/30 dark:border-amber-900/30 bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center min-w-0">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold font-sans truncate">{club.name}</h2>
                  {club.description && (
                    <p className="text-sm text-muted-foreground font-sans truncate">{club.description}</p>
                  )}
                </div>
              </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="gap-1 bg-amber-100/60 dark:bg-amber-900/40 border-amber-200/50 dark:border-amber-800/50">
                <Users className="w-3 h-3" />
                <span className="hidden sm:inline">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                <span className="sm:hidden">{members.length}</span>
              </Badge>
              <Button variant="outline" size="sm" onClick={handleCopyInvite} className="gap-1.5 border-amber-200/50 dark:border-amber-800/50 hover:bg-amber-100/50 dark:hover:bg-amber-900/30">
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Invite'}</span>
              </Button>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-amber-100/50 dark:hover:bg-amber-900/30">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover font-sans">
                    <DropdownMenuItem onClick={handleOpenEditDialog}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Club
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Club
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-sans">Delete "{club.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the club, all suggestions, and votes. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteClub} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
        </div>
        {/* Currently Reading Section */}
        {currentlyReading && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold font-sans">Currently Reading</h2>
            </div>
            <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
              <div className="flex gap-4">
                {currentlyReading.coverUrl ? (
                  <img
                    src={currentlyReading.coverUrl}
                    alt={currentlyReading.title}
                    className="w-20 h-28 object-cover rounded shadow"
                  />
                ) : (
                  <div className="w-20 h-28 bg-muted rounded flex items-center justify-center">
                    <Library className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg font-sans">{currentlyReading.title}</h3>
                  <p className="text-muted-foreground font-sans">{currentlyReading.author}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {currentlyReading.voteCount} votes
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddToShelf(currentlyReading.title, currentlyReading.author, currentlyReading.coverUrl)}
                      disabled={isOnShelf(currentlyReading.title, currentlyReading.author)}
                    >
                      <BookMarked className="w-4 h-4 mr-1.5" />
                      {isOnShelf(currentlyReading.title, currentlyReading.author) ? 'On Shelf' : 'Add to Shelf'}
                    </Button>
                    {isOwner && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              Mark as Read
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-sans">Finish "{currentlyReading.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will move the book to past reads and reset all votes on remaining suggestions so the club can start picking a new book.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => updateSuggestionStatus(currentlyReading.id, 'read')}>
                                Finish Book
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem onClick={() => updateSuggestionStatus(currentlyReading.id, 'suggested')}>
                              <ThumbsUp className="w-4 h-4 mr-2" />
                              Back to Suggestions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => removeSuggestion(currentlyReading.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Suggestions Section */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold font-sans">Suggestions</h2>
              <Badge variant="outline">{suggestedBooks.length}</Badge>
            </div>
            <AddSuggestionDialog
              open={addDialogOpen}
              onOpenChange={setAddDialogOpen}
              onAddSuggestion={addSuggestion}
            />
          </div>

          {suggestedBooks.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <Library className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No suggestions yet</p>
              <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Suggest a Book
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {suggestedBooks.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isOwner={isOwner}
                  currentUserId={user?.id}
                  isOnShelf={isOnShelf(suggestion.title, suggestion.author)}
                  voters={getVotesForSuggestion(suggestion.id)}
                  onVote={() => vote(suggestion.id)}
                  onSetReading={() => updateSuggestionStatus(suggestion.id, 'reading')}
                  onRemove={() => removeSuggestion(suggestion.id)}
                  onAddToShelf={() => handleAddToShelf(suggestion.title, suggestion.author, suggestion.coverUrl)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past Reads Section */}
        {pastReads.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold font-sans">Past Reads</h2>
              <Badge variant="outline">{pastReads.length}</Badge>
            </div>
            <div className="grid gap-3">
              {pastReads.map((book) => {
                const bookReflections = getReflectionsForSuggestion(book.id);
                const userReflection = bookReflections.find(r => r.userId === user?.id);
                return (
                  <PastReadCard
                    key={book.id}
                    suggestion={{
                      id: book.id,
                      title: book.title,
                      author: book.author,
                      coverUrl: book.coverUrl,
                      finishedAt: book.finishedAt,
                    }}
                    reflections={bookReflections}
                    averageRating={getAverageRating(book.id)}
                    hasUserReflected={hasReflectedOn(book.id)}
                    userReflection={userReflection}
                    isOnShelf={isOnShelf(book.title, book.author)}
                    onAddReflection={(rating, content, isAnonymous) => 
                      addReflection(book.id, rating, content, isAnonymous)
                    }
                    onUpdateReflection={updateReflection}
                    onDeleteReflection={deleteReflection}
                    onAddToShelf={() => handleAddToShelf(book.title, book.author, book.coverUrl)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Members Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold font-sans">Members</h2>
            <Badge variant="outline">{members.length}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} ownerId={club.ownerId} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// Member Card Component
interface MemberCardProps {
  member: ClubMemberWithProfile;
  ownerId: string;
}

function MemberCard({ member, ownerId }: MemberCardProps) {
  const isOwner = member.userId === ownerId;
  const displayName = member.displayName || 'Anonymous';
  const initials = displayName.slice(0, 2).toUpperCase();
  
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate font-sans text-sm">{displayName}</p>
          {isOwner && (
            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}
        </div>
      </div>
      {member.isPublic && member.shareId && (
        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );

  if (member.isPublic && member.shareId) {
    return (
      <Link to={`/shelf/${member.shareId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

// Suggestion Card Component
interface SuggestionCardProps {
  suggestion: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    suggestedBy: string;
    voteCount?: number;
    hasVoted?: boolean;
  };
  isOwner: boolean;
  currentUserId?: string;
  isOnShelf: boolean;
  voters: VoteWithUser[];
  onVote: () => void;
  onSetReading: () => void;
  onRemove: () => void;
  onAddToShelf: () => void;
}

function SuggestionCard({
  suggestion,
  isOwner,
  currentUserId,
  isOnShelf,
  voters,
  onVote,
  onSetReading,
  onRemove,
  onAddToShelf,
}: SuggestionCardProps) {
  const canRemove = isOwner || suggestion.suggestedBy === currentUserId;

  return (
    <div className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        {suggestion.coverUrl ? (
          <img
            src={suggestion.coverUrl}
            alt={suggestion.title}
            className="w-12 h-16 object-cover rounded shrink-0"
          />
        ) : (
          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shrink-0">
            <Library className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate font-sans">{suggestion.title}</p>
          <p className="text-sm text-muted-foreground truncate font-sans">{suggestion.author}</p>
          {voters.length > 0 && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <button className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <div className="flex -space-x-1.5">
                    {voters.slice(0, 3).map((voter, idx) => (
                      <Avatar key={voter.id} className="h-5 w-5 border-2 border-background">
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {(voter.displayName || 'A').slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span>
                    {voters.length === 1 
                      ? `${voters[0].displayName || 'Someone'} voted`
                      : `${voters.length} votes`}
                  </span>
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-48 p-2" align="start">
                <p className="text-xs font-medium mb-2">Voted by:</p>
                <div className="space-y-1.5">
                  {voters.map((voter) => (
                    <div key={voter.id} className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {(voter.displayName || 'A').slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {voter.isPublic && voter.shareId ? (
                        <Link 
                          to={`/shelf/${voter.shareId}`} 
                          className="text-xs hover:underline truncate flex-1"
                        >
                          {voter.displayName || 'Anonymous'}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {voter.displayName || 'Anonymous'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
      </div>
      {/* Action buttons - separate row on mobile to prevent clipping */}
      <div className="flex items-center gap-1 mt-3 ml-[60px]">
        <Button
          variant={suggestion.hasVoted ? 'default' : 'outline'}
          size="sm"
          onClick={onVote}
          className="gap-1.5"
        >
          <ThumbsUp className={cn('w-4 h-4', suggestion.hasVoted && 'fill-current')} />
          {suggestion.voteCount || 0}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddToShelf}
          disabled={isOnShelf}
          title={isOnShelf ? 'Already on your shelf' : 'Add to your shelf'}
        >
          <BookMarked className={cn('w-4 h-4', isOnShelf && 'fill-current text-primary')} />
        </Button>
        {(isOwner || canRemove) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {isOwner && (
                <DropdownMenuItem onClick={onSetReading}>
                  <Play className="w-4 h-4 mr-2" />
                  Set as Currently Reading
                </DropdownMenuItem>
              )}
              {canRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Add Suggestion Dialog Component
interface AddSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSuggestion: (title: string, author: string, coverUrl?: string) => void;
}

function AddSuggestionDialog({ open, onOpenChange, onAddSuggestion }: AddSuggestionDialogProps) {
  const [query, setQuery] = useState('');
  const { results, isLoading, searchBooks, clearResults } = useBookSearch();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchBooks(query);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchBooks, clearResults]);

  const handleSelect = (book: GoogleBook) => {
    onAddSuggestion(
      book.volumeInfo.title,
      book.volumeInfo.authors?.[0] || 'Unknown Author',
      getCoverUrl(book)
    );
    onOpenChange(false);
    setQuery('');
    clearResults();
  };

  const handleClose = () => {
    onOpenChange(false);
    setQuery('');
    clearResults();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? onOpenChange(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Suggest Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Suggest a Book</DialogTitle>
          <DialogDescription className="sr-only">Search for a book to suggest to the club</DialogDescription>
        </DialogHeader>

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

        <div className="min-h-[250px] max-h-[350px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && query.length < 2 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Type at least 2 characters to search
            </div>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No books found
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {results.map((book) => (
              <button
                key={book.id}
                onClick={() => handleSelect(book)}
                className="group p-2 rounded-lg text-left transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

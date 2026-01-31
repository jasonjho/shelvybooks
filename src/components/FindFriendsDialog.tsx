import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Loader2, ExternalLink, Mail, Send, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useShelfSettings } from '@/hooks/useShelfSettings';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface SearchResult {
  userId: string;
  username: string;
  avatarUrl: string | null;
  shareId: string | null;
  matchedBy: 'username' | 'email';
}

interface FindFriendsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTab?: 'find' | 'invite';
}

export function FindFriendsDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, initialTab }: FindFriendsDialogProps = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { settings } = useShelfSettings();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'find' | 'invite'>(initialTab || 'find');
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  
  // Find friends state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  
  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const shelfUrl = settings?.share_id 
    ? `https://shelvy-books.lovable.app/shelf/${settings.share_id}` 
    : null;

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to search');
        return;
      }

      const response = await supabase.functions.invoke('find-user', {
        body: { query: query.trim() },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setResults(response.data?.results || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeTab === 'find') {
        handleSearch();
      } else {
        handleSendInvite();
      }
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingInvite(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to send invites');
        return;
      }

      const senderName = profile?.username || 'A friend';

      const response = await supabase.functions.invoke('send-invite', {
        body: { 
          recipientEmail: inviteEmail.trim(),
          senderName,
          shelfUrl: settings?.is_public ? shelfUrl : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const isExistingUser = response.data?.isExistingUser;
      
      if (isExistingUser) {
        toast.success('Connection request sent!', {
          description: `${inviteEmail} is already on Shelvy — we've let them know you want to connect!`,
        });
      } else {
        toast.success('Invite sent!', {
          description: `We've sent an invitation to ${inviteEmail}`,
        });
      }
      setInviteEmail('');
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Failed to send invite. Please try again.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    const linkToCopy = shelfUrl || 'https://shelvy-books.lovable.app';
    await navigator.clipboard.writeText(linkToCopy);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when closing
      setQuery('');
      setResults([]);
      setSearched(false);
      setInviteEmail('');
      setActiveTab(initialTab || 'find');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  };

  if (!user) return null;

  const dialogContent = (
    <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Find & Invite Friends
        </DialogTitle>
        <DialogDescription>
          Search for friends on Shelvy or invite new ones to join.
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'find' | 'invite')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="find" className="gap-2">
            <Search className="w-4 h-4" />
            Find
          </TabsTrigger>
          <TabsTrigger value="invite" className="gap-2">
            <Mail className="w-4 h-4" />
            Invite
          </TabsTrigger>
        </TabsList>

        {/* Find Friends Tab */}
        <TabsContent value="find" className="flex-1 flex flex-col mt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by username or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
            />
            <Button onClick={handleSearch} disabled={loading} className="flex-shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-[150px]">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No users found with public shelves.</p>
                <p className="text-sm mt-1">Try a different search term or invite them!</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-2">
                {results.map((result) => (
                  <Link
                    key={result.userId}
                    to={`/shelf/${result.shareId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.avatarUrl || undefined} alt={result.username} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {result.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Found by {result.matchedBy}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}

            {!loading && !searched && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Enter a username or email to search</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Invite Friends Tab */}
        <TabsContent value="invite" className="flex-1 flex flex-col mt-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Send an email invite</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                  }}
                />
                <Button onClick={handleSendInvite} disabled={sendingInvite} className="flex-shrink-0 gap-2">
                  {sendingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                We'll send them a friendly invite to join Shelvy
                {settings?.is_public && ' with a link to your shelf'}.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Share a link</label>
              <Button
                variant="outline"
                className="w-full gap-2 justify-center"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy {settings?.is_public ? 'shelf' : 'Shelvy'} link
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5 text-center">
                {settings?.is_public 
                  ? 'Share your public shelf link directly'
                  : 'Share a link to Shelvy (make your shelf public to share it)'
                }
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  // When controlled (no trigger needed), just render the dialog
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled: include the trigger button
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Find/Invite Friends</span>
          <span className="sm:hidden">Friends</span>
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}

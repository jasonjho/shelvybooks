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
import { Search, Users, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface SearchResult {
  userId: string;
  username: string;
  avatarUrl: string | null;
  shareId: string | null;
  matchedBy: 'username' | 'email';
}

export function FindFriendsDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
      handleSearch();
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when closing
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-background/80 border-border text-foreground hover:bg-muted hover:text-foreground"
          title="Find Friends"
        >
          <Users className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Find Friends
          </DialogTitle>
          <DialogDescription>
            Search by username or email to find friends and view their shelves.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
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

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-[100px]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found with public shelves.</p>
              <p className="text-sm mt-1">Try a different search term.</p>
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
      </DialogContent>
    </Dialog>
  );
}

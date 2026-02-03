import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookSearch, getCoverUrl } from '@/hooks/useBookSearch';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Send, BookOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GoogleBook } from '@/types/book';

interface RecommendBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
}

export function RecommendBookDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
}: RecommendBookDialogProps) {
  const { user } = useAuth();
  const { results: searchResults, isLoading: isSearching, searchBooks, clearResults } = useBookSearch();
  
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedBook(null);
      setMessage('');
      clearResults();
      setSent(false);
    }
  }, [open, clearResults]);

  const handleSearch = () => {
    if (query.trim()) {
      searchBooks(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelectBook = (book: GoogleBook) => {
    setSelectedBook(book);
    clearResults();
    setQuery('');
  };

  const handleSendRecommendation = async () => {
    if (!user || !selectedBook) return;

    setIsSending(true);
    try {
      // For now, we'll add the book directly to their shelf with a "want-to-read" status
      // and mark it as a recommendation. In the future, this could be a separate notifications table.
      const coverUrl = getCoverUrl(selectedBook);
      const author = selectedBook.volumeInfo.authors?.join(', ') || 'Unknown Author';

      const { error } = await supabase.from('books').insert({
        user_id: targetUserId,
        title: selectedBook.volumeInfo.title,
        author,
        cover_url: coverUrl || null,
        status: 'want-to-read',
        color: `hsl(${Math.floor(Math.random() * 360)}, 45%, 35%)`,
        description: message 
          ? `💌 Recommended by a friend: "${message}"`
          : selectedBook.volumeInfo.description || null,
        categories: selectedBook.volumeInfo.categories || null,
        page_count: selectedBook.volumeInfo.pageCount || null,
        isbn: selectedBook.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
      });

      if (error) throw error;

      setSent(true);
      toast.success(`Book recommended to ${targetUsername}!`);
      
      // Close after a brief moment to show success state
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error('Error sending recommendation:', err);
      toast.error('Failed to send recommendation');
    } finally {
      setIsSending(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-600" />
            Recommend a Book
          </DialogTitle>
          <DialogDescription>
            Help {targetUsername} get started by recommending a book you love!
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium">Recommendation sent!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {targetUsername} will see this book on their shelf.
            </p>
          </div>
        ) : selectedBook ? (
          <div className="space-y-4">
            {/* Selected book preview */}
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              {getCoverUrl(selectedBook) ? (
                <img
                  src={getCoverUrl(selectedBook)!}
                  alt={selectedBook.volumeInfo.title}
                  className="w-12 h-16 object-cover rounded shadow"
                />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedBook.volumeInfo.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedBook.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 mt-1"
                  onClick={() => setSelectedBook(null)}
                >
                  Change book
                </Button>
              </div>
            </div>

            {/* Optional message */}
            <div className="space-y-2">
              <Label htmlFor="message">Add a personal note (optional)</Label>
              <Textarea
                id="message"
                placeholder="Why do you recommend this book?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Send button */}
            <Button
              className="w-full gap-2"
              onClick={handleSendRecommendation}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Recommendation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search input */}
            <div className="flex gap-2">
              <Input
                placeholder="Search for a book..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <ScrollArea className="h-64">
                <div className="space-y-2 pr-4">
                  {searchResults.map((book) => {
                    const coverUrl = getCoverUrl(book);
                    return (
                      <button
                        key={book.id}
                        onClick={() => handleSelectBook(book)}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                          'hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring'
                        )}
                      >
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={book.volumeInfo.title}
                            className="w-10 h-14 object-cover rounded shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="font-medium text-sm truncate">
                            {book.volumeInfo.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Empty state for search */}
            {query && searchResults.length === 0 && !isSearching && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No results found. Try a different search.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

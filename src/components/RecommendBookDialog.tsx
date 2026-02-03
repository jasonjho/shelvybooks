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
  const { results, isLoading, searchBooks, clearResults } = useBookSearch();
  
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

  // Debounced search (same as AddBookDialog)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchBooks(query);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectBook = (book: GoogleBook) => {
    setSelectedBook(book);
    clearResults();
    setQuery('');
  };

  const handleSendRecommendation = async () => {
    if (!user || !selectedBook) return;

    setIsSending(true);
    try {
      const coverUrl = getCoverUrl(selectedBook);
      const author = selectedBook.volumeInfo.authors?.join(', ') || 'Unknown Author';

      // Insert into book_recommendations table instead of directly into books
      const { error } = await supabase.from('book_recommendations').insert({
        from_user_id: user.id,
        to_user_id: targetUserId,
        title: selectedBook.volumeInfo.title,
        author,
        cover_url: coverUrl || null,
        message: message || null,
        description: selectedBook.volumeInfo.description || null,
        categories: selectedBook.volumeInfo.categories || null,
        page_count: selectedBook.volumeInfo.pageCount || null,
        isbn: selectedBook.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
        status: 'pending',
      });

      if (error) throw error;

      setSent(true);
      toast.success(`Book recommended to ${targetUsername}!`);
      
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-sans text-lg font-semibold">
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
          <>
            {/* Search input - same style as AddBookDialog */}
            <div className="space-y-1.5">
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
              <p className="text-xs text-muted-foreground/70 px-1">
                Tip: Add author name for better results
              </p>
            </div>

            {/* Results grid - same layout as AddBookDialog */}
            <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && results.length === 0 && query.length >= 2 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground text-sm">No books found</p>
                  <p className="text-xs text-muted-foreground/70">
                    Try adding the author name for better results
                  </p>
                </div>
              )}

              {!isLoading && query.length < 2 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">Type at least 2 characters to search</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {results.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleSelectBook(book)}
                    className={cn(
                      'group p-2 rounded-lg text-left transition-colors',
                      'hover:bg-secondary focus:bg-secondary focus:outline-none'
                    )}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

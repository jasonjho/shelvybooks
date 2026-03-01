import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
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
import { Label } from '@/components/ui/label';
import { Search, Loader2, Gift, Check, BookOpen, ArrowLeft, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MYSTERY_BOOK_MOODS } from '@/data/mysteryBookMoods';
import type { GoogleBook } from '@/types/book';

interface SendMysteryBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
}

type Step = 'search' | 'clues' | 'sent';

export function SendMysteryBookDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
}: SendMysteryBookDialogProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { results, isLoading, searchBooks, clearResults } = useBookSearch();

  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [teaser, setTeaser] = useState('');
  const [emojiClue, setEmojiClue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Cache the target user's shelf books (title+author pairs) for the lifetime of the dialog
  const targetShelfBooks = useRef<{ title: string; author: string }[]>([]);
  const shelfFetched = useRef(false);

  // Fetch target's shelf books when dialog opens
  useEffect(() => {
    if (!open || shelfFetched.current) return;
    shelfFetched.current = true;

    (async () => {
      try {
        const { data: shelfInfos } = await supabase
          .rpc('get_public_shelf_info_for_users', { _user_ids: [targetUserId] });
        const shareId = shelfInfos?.[0]?.share_id;
        if (!shareId) return;

        const { data: books } = await supabase
          .rpc('get_public_shelf_books', { _share_id: shareId });
        if (books) {
          targetShelfBooks.current = books.map((b: { title: string; author: string }) => ({
            title: b.title.toLowerCase(),
            author: b.author.toLowerCase(),
          }));
        }
      } catch {
        // Non-critical — silently skip the shelf check
      }
    })();
  }, [open, targetUserId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('search');
      setQuery('');
      setSelectedBook(null);
      setSelectedMood(null);
      setTeaser('');
      setEmojiClue('');
      setDuplicateWarning(null);
      clearResults();
      shelfFetched.current = false;
      targetShelfBooks.current = [];
    }
  }, [open, clearResults]);

  // Debounced search
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

  const handleSelectBook = async (book: GoogleBook) => {
    setSelectedBook(book);
    clearResults();
    setQuery('');
    setDuplicateWarning(null);
    setStep('clues');

    const bookTitle = book.volumeInfo.title;
    const bookAuthor = book.volumeInfo.authors?.join(', ') || 'Unknown Author';

    // Check if the book is already on the recipient's shelf
    const onShelf = targetShelfBooks.current.some(
      b => b.title === bookTitle.toLowerCase() && b.author === bookAuthor.toLowerCase()
    );
    if (onShelf) {
      setDuplicateWarning(`${targetUsername} already has this book on their shelf.`);
      return;
    }

    // Check if you've already sent this as a mystery book
    try {
      const { data } = await (supabase.from('mystery_books') as any)
        .select('id')
        .eq('from_user_id', user!.id)
        .eq('to_user_id', targetUserId)
        .ilike('title', bookTitle)
        .ilike('author', bookAuthor)
        .limit(1);
      if (data && data.length > 0) {
        setDuplicateWarning(`You've already sent this book to ${targetUsername} as a mystery book.`);
      }
    } catch {
      // Non-critical — silently skip
    }
  };

  const handleSelectMood = (tag: string) => {
    setSelectedMood(tag);
    const mood = MYSTERY_BOOK_MOODS.find(m => m.tag === tag);
    if (mood) {
      setEmojiClue(mood.emoji);
    }
  };

  const handleSend = async () => {
    if (!user || !selectedBook || !selectedMood || !teaser.trim() || !emojiClue.trim()) return;

    setIsSending(true);
    try {
      const coverUrl = getCoverUrl(selectedBook);
      const author = selectedBook.volumeInfo.authors?.join(', ') || 'Unknown Author';
      const bookTitle = selectedBook.volumeInfo.title;

      const { error } = await (supabase.from('mystery_books') as any).insert({
        from_user_id: user.id,
        to_user_id: targetUserId,
        mood_tag: selectedMood,
        teaser: teaser.trim().slice(0, 120),
        emoji_clue: emojiClue.trim(),
        title: bookTitle,
        author,
        cover_url: coverUrl || null,
        description: selectedBook.volumeInfo.description || null,
        categories: selectedBook.volumeInfo.categories || null,
        page_count: selectedBook.volumeInfo.pageCount || null,
        isbn: selectedBook.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
        status: 'pending',
      });

      if (error) throw error;

      // Fire-and-forget email notification
      const senderUsername = profile?.username || 'A friend';
      supabase.functions.invoke('notify-mystery-book', {
        body: {
          recipientUserId: targetUserId,
          senderUsername,
          moodTag: selectedMood,
          teaser: teaser.trim(),
          emojiClue: emojiClue.trim(),
        },
      }).then(({ error: emailError }) => {
        if (emailError) {
          console.log('Mystery book email notification failed (non-blocking):', emailError);
        }
      });

      setStep('sent');
      toast.success(`Mystery book sent to ${targetUsername}!`);

      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error('Error sending mystery book:', err);
      toast.error('Failed to send mystery book');
    } finally {
      setIsSending(false);
    }
  };

  if (!user) return null;

  const canSend = selectedBook && selectedMood && teaser.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-sans text-lg font-semibold">
            <Gift className="w-5 h-5 text-amber-600" />
            Mystery Book
          </DialogTitle>
          <DialogDescription>
            Wrap a mystery book for {targetUsername} — they'll only see your clues until they unwrap it!
          </DialogDescription>
        </DialogHeader>

        {step === 'sent' ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Gift className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-lg font-medium">Mystery book sent!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {targetUsername} will see your clues and can unwrap the book.
            </p>
          </div>
        ) : step === 'clues' ? (
          <div className="space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Selected book preview */}
            {selectedBook && (
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
                    className="text-xs h-6 px-2 mt-1 gap-1"
                    onClick={() => { setStep('search'); setSelectedBook(null); setDuplicateWarning(null); }}
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Change book
                  </Button>
                </div>
              </div>
            )}

            {/* Duplicate warning */}
            {duplicateWarning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{duplicateWarning} You can still send it if you'd like!</p>
              </div>
            )}

            {/* Mood picker */}
            <div className="space-y-2">
              <Label>Pick a mood</Label>
              <div className="flex flex-wrap gap-1.5">
                {MYSTERY_BOOK_MOODS.map((mood) => (
                  <button
                    key={mood.tag}
                    onClick={() => handleSelectMood(mood.tag)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
                      selectedMood === mood.tag
                        ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                        : 'bg-muted/50 border-transparent hover:bg-muted text-muted-foreground'
                    )}
                  >
                    {mood.emoji} {mood.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Teaser */}
            <div className="space-y-2">
              <Label htmlFor="teaser">Teaser <span className="text-muted-foreground font-normal">(max 120 chars)</span></Label>
              <Input
                id="teaser"
                placeholder='e.g. "A girl walks into a bookstore and the world ends..."'
                value={teaser}
                onChange={(e) => setTeaser(e.target.value.slice(0, 120))}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground text-right">{teaser.length}/120</p>
            </div>

            {/* Send */}
            <Button
              className="w-full gap-2"
              onClick={handleSend}
              disabled={!canSend || isSending}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Gift className="w-4 h-4" />
              )}
              Send Mystery Book
            </Button>
          </div>
        ) : (
          <>
            {/* Book search step */}
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
                Step 1: Choose the book you want to wrap
              </p>
            </div>

            <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && results.length === 0 && query.length >= 2 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground text-sm">No books found</p>
                  <p className="text-xs text-muted-foreground/70">Try adding the author name</p>
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

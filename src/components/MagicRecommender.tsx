import { useState } from 'react';
import { Sparkles, Wand2, ExternalLink, Loader2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Book, BookStatus } from '@/types/book';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Recommendation {
  title: string;
  author: string;
  reason: string;
  vibe: string;
}

interface RecommendationResponse {
  insight: string;
  recommendations: Recommendation[];
}

interface MagicRecommenderProps {
  books: Book[];
  onAddBook: (book: Omit<Book, 'id'>) => Promise<void>;
  disabled?: boolean;
}

export function MagicRecommender({ books, onAddBook, disabled }: MagicRecommenderProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingBooks, setAddingBooks] = useState(false);
  const [mood, setMood] = useState('');
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [selectedRecs, setSelectedRecs] = useState<Set<number>>(new Set());
  const [addedRecs, setAddedRecs] = useState<Set<number>>(new Set());

  const handleGetRecommendations = async () => {
    if (books.length === 0) {
      toast({
        title: 'Add some books first!',
        description: 'We need to know your taste to make magical recommendations ✨',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setSelectedRecs(new Set());
    setAddedRecs(new Set());

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-recommender`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            books: books.map((b) => ({
              title: b.title,
              author: b.author,
              status: b.status,
            })),
            mood: mood.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get recommendations');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Recommendation error:', error);
      toast({
        title: 'Magic fizzled!',
        description: error instanceof Error ? error.message : 'Failed to get recommendations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setResult(null);
      setMood('');
      setSelectedRecs(new Set());
      setAddedRecs(new Set());
    }
  };

  const getAmazonSearchUrl = (title: string, author: string) => {
    const query = encodeURIComponent(`${title} ${author}`);
    return `https://www.amazon.com/s?k=${query}&i=stripbooks`;
  };

  const toggleSelection = (index: number) => {
    setSelectedRecs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addSingleBook = async (rec: Recommendation, index: number) => {
    if (addedRecs.has(index)) return;
    
    try {
      await onAddBook({
        title: rec.title,
        author: rec.author,
        coverUrl: '',
        status: 'want-to-read' as BookStatus,
      });
      setAddedRecs((prev) => new Set(prev).add(index));
      toast({
        title: 'Added to shelf!',
        description: `"${rec.title}" is now on your want-to-read list.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to add book',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const addSelectedBooks = async () => {
    if (selectedRecs.size === 0 || !result) return;
    
    setAddingBooks(true);
    const toAdd = [...selectedRecs].filter((i) => !addedRecs.has(i));
    
    try {
      for (const index of toAdd) {
        const rec = result.recommendations[index];
        await onAddBook({
          title: rec.title,
          author: rec.author,
          coverUrl: '',
          status: 'want-to-read' as BookStatus,
        });
        setAddedRecs((prev) => new Set(prev).add(index));
      }
      toast({
        title: 'Books added!',
        description: `Added ${toAdd.length} book${toAdd.length !== 1 ? 's' : ''} to your shelf.`,
      });
      setSelectedRecs(new Set());
    } catch (error) {
      toast({
        title: 'Failed to add some books',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setAddingBooks(false);
    }
  };

  const addAllBooks = async () => {
    if (!result) return;
    
    setAddingBooks(true);
    const toAdd = result.recommendations
      .map((_, i) => i)
      .filter((i) => !addedRecs.has(i));
    
    try {
      for (const index of toAdd) {
        const rec = result.recommendations[index];
        await onAddBook({
          title: rec.title,
          author: rec.author,
          coverUrl: '',
          status: 'want-to-read' as BookStatus,
        });
        setAddedRecs((prev) => new Set(prev).add(index));
      }
      toast({
        title: 'All books added!',
        description: `Added ${toAdd.length} book${toAdd.length !== 1 ? 's' : ''} to your shelf.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to add some books',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setAddingBooks(false);
    }
  };

  const allAdded = result?.recommendations.every((_, i) => addedRecs.has(i));
  const someSelected = selectedRecs.size > 0;
  const selectedNotAdded = [...selectedRecs].filter((i) => !addedRecs.has(i)).length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          'group relative overflow-hidden transition-all duration-300',
          'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10',
          'border-violet-300/50 hover:border-violet-400',
          'hover:from-violet-500/20 hover:to-fuchsia-500/20',
          'hover:shadow-lg hover:shadow-violet-500/20'
        )}
      >
        <Sparkles className="h-4 w-4 mr-1.5 text-violet-500 group-hover:animate-pulse" />
        <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent font-medium">
          Magic Recommender
        </span>
        <span className="absolute top-1 right-2 w-1 h-1 bg-violet-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
        <span className="absolute bottom-2 right-4 w-0.5 h-0.5 bg-fuchsia-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-150" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-sans">
              <Wand2 className="h-5 w-5 text-violet-500" />
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Magic Book Recommender
              </span>
              <Sparkles className="h-4 w-4 text-fuchsia-500" />
            </DialogTitle>
            <DialogDescription className="font-sans">
              Based on your {books.length} book{books.length !== 1 ? 's' : ''}, we'll conjure up
              personalized recommendations just for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 font-sans">
            {!result ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mood" className="text-sm text-muted-foreground">
                    What are you in the mood for? (optional)
                  </Label>
                  <Input
                    id="mood"
                    placeholder="e.g., something cozy, a page-turner, thought-provoking..."
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    disabled={loading}
                    className="font-sans"
                  />
                </div>

                <Button
                  onClick={handleGetRecommendations}
                  disabled={loading || books.length === 0}
                  className={cn(
                    'w-full transition-all duration-300',
                    'bg-gradient-to-r from-violet-600 to-fuchsia-600',
                    'hover:from-violet-500 hover:to-fuchsia-500',
                    'hover:shadow-lg hover:shadow-violet-500/30'
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Conjuring magic...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Get Recommendations
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Insight */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-200/50 dark:border-violet-800/50">
                  <p className="text-sm text-muted-foreground italic">✨ {result.insight}</p>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  {result.recommendations.map((rec, index) => {
                    const isAdded = addedRecs.has(index);
                    const isSelected = selectedRecs.has(index);
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          'p-4 rounded-lg border bg-card transition-all',
                          isSelected && !isAdded && 'ring-2 ring-violet-400 border-violet-400',
                          isAdded && 'bg-muted/50 opacity-75'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox for multi-select */}
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(index)}
                            disabled={isAdded}
                            className="mt-1 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-sans font-semibold text-foreground">{rec.title}</h4>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 whitespace-nowrap">
                                {rec.vibe}
                              </span>
                              {isAdded && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Added
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">by {rec.author}</p>
                            <p className="text-sm mt-1">{rec.reason}</p>
                          </div>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Add single book button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => addSingleBook(rec, index)}
                              disabled={isAdded || addingBooks}
                              className="h-8 w-8"
                              title={isAdded ? 'Already added' : 'Add to shelf'}
                            >
                              {isAdded ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                            
                            {/* Amazon link */}
                            <a
                              href={getAmazonSearchUrl(rec.title, rec.author)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-md hover:bg-muted transition-colors"
                              title="Find on Amazon"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  {/* Add Selected button - only show when items are selected */}
                  {someSelected && selectedNotAdded > 0 && (
                    <Button
                      onClick={addSelectedBooks}
                      disabled={addingBooks}
                      className={cn(
                        'w-full transition-all duration-300',
                        'bg-gradient-to-r from-violet-600 to-fuchsia-600',
                        'hover:from-violet-500 hover:to-fuchsia-500'
                      )}
                    >
                      {addingBooks ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add Selected ({selectedNotAdded})
                    </Button>
                  )}
                  
                  {/* Add All button */}
                  {!allAdded && (
                    <Button
                      variant={someSelected ? 'outline' : 'default'}
                      onClick={addAllBooks}
                      disabled={addingBooks}
                      className={cn(
                        'w-full',
                        !someSelected && 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500'
                      )}
                    >
                      {addingBooks ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add All to Shelf
                    </Button>
                  )}

                  {/* Try again button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResult(null);
                      setSelectedRecs(new Set());
                      setAddedRecs(new Set());
                    }}
                    className="w-full"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

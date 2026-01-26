import { useState } from 'react';
import { Sparkles, Wand2, BookOpen, ExternalLink, Loader2 } from 'lucide-react';
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
import { Book } from '@/types/book';
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
  disabled?: boolean;
}

export function MagicRecommender({ books, disabled }: MagicRecommenderProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState('');
  const [result, setResult] = useState<RecommendationResponse | null>(null);

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
      // Reset state when closing
      setResult(null);
      setMood('');
    }
  };

  const getAmazonSearchUrl = (title: string, author: string) => {
    const query = encodeURIComponent(`${title} ${author}`);
    return `https://www.amazon.com/s?k=${query}&i=stripbooks`;
  };

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
        {/* Sparkle particles */}
        <span className="absolute top-1 right-2 w-1 h-1 bg-violet-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
        <span className="absolute bottom-2 right-4 w-0.5 h-0.5 bg-fuchsia-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-150" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wand2 className="h-5 w-5 text-violet-500" />
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Magic Book Recommender
              </span>
              <Sparkles className="h-4 w-4 text-fuchsia-500" />
            </DialogTitle>
            <DialogDescription>
              Based on your {books.length} book{books.length !== 1 ? 's' : ''}, we'll conjure up
              personalized recommendations just for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                <div className="p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-200/50">
                  <p className="text-sm text-muted-foreground italic">✨ {result.insight}</p>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  {result.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-foreground">{rec.title}</h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 whitespace-nowrap">
                              {rec.vibe}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">by {rec.author}</p>
                          <p className="text-sm mt-1">{rec.reason}</p>
                        </div>
                        <a
                          href={getAmazonSearchUrl(rec.title, rec.author)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-2 rounded-md hover:bg-muted transition-colors"
                          title="Find on Amazon"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Try again button */}
                <Button
                  variant="outline"
                  onClick={() => setResult(null)}
                  className="w-full"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

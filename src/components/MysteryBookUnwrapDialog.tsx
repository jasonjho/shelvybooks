import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REACTION_EMOJIS } from '@/data/mysteryBookMoods';
import type { MysteryBook } from '@/hooks/useMysteryBooks';

interface MysteryBookUnwrapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mysteryBook: MysteryBook | null;
  onUnwrap: (id: string) => Promise<MysteryBook | null>;
  onAccept: (mysteryBook: MysteryBook) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string, note?: string) => Promise<void>;
  onBooksRefetch?: () => Promise<void>;
}

type AnimState = 'idle' | 'shaking' | 'opening' | 'revealed';

export function MysteryBookUnwrapDialog({
  open,
  onOpenChange,
  mysteryBook,
  onUnwrap,
  onAccept,
  onDecline,
  onReact,
  onBooksRefetch,
}: MysteryBookUnwrapDialogProps) {
  const [animState, setAnimState] = useState<AnimState>('idle');
  const [revealedBook, setRevealedBook] = useState<MysteryBook | null>(null);
  const [reactionEmoji, setReactionEmoji] = useState<string | null>(null);
  const [reactionNote, setReactionNote] = useState('');
  const [responded, setResponded] = useState(false);
  const [reacted, setReacted] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setAnimState('idle');
      setRevealedBook(null);
      setReactionEmoji(null);
      setReactionNote('');
      setResponded(false);
      setReacted(false);
    } else if (mysteryBook?.status === 'unwrapped') {
      // Already unwrapped — go straight to revealed
      setAnimState('revealed');
      setRevealedBook(mysteryBook);
    }
  }, [open, mysteryBook]);

  const handleUnwrap = async () => {
    if (!mysteryBook || animState !== 'idle') return;

    setAnimState('shaking');

    setTimeout(() => {
      setAnimState('opening');
    }, 600);

    setTimeout(async () => {
      const result = await onUnwrap(mysteryBook.id);
      setRevealedBook(result || mysteryBook);
      setAnimState('revealed');
    }, 1100);
  };

  const handleAccept = async () => {
    if (!revealedBook) return;
    await onAccept(revealedBook);
    if (onBooksRefetch) await onBooksRefetch();
    setResponded(true);
  };

  const handleDecline = async () => {
    if (!revealedBook) return;
    await onDecline(revealedBook.id);
    setResponded(true);
  };

  const handleSelectEmoji = (emoji: string) => {
    setReactionEmoji(emoji);
  };

  const handleSendReaction = async () => {
    if (!revealedBook || !reactionEmoji) return;
    await onReact(revealedBook.id, reactionEmoji, reactionNote || undefined);
    setReacted(true);
  };

  if (!mysteryBook) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center font-sans text-lg">
            {animState === 'revealed' ? 'It\'s...' : 'A mystery book awaits'}
          </DialogTitle>
        </DialogHeader>

        {animState !== 'revealed' ? (
          <div className="flex flex-col items-center py-6 space-y-4">
            {/* Clues */}
            <div className="text-center space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                {mysteryBook.moodTag}
              </span>
              <p className="text-sm text-muted-foreground italic">"{mysteryBook.teaser}"</p>
              {mysteryBook.fromUsername && (
                <p className="text-xs text-muted-foreground">from {mysteryBook.fromUsername}</p>
              )}
            </div>

            {/* Emoji clue — outside the gift box to avoid overlap */}
            <div className={cn(
              'text-4xl',
              animState === 'shaking' && 'animate-bounce'
            )}>
              {mysteryBook.emojiClue}
            </div>

            {/* Gift box */}
            <button
              onClick={handleUnwrap}
              disabled={animState !== 'idle'}
              className="relative focus:outline-none group"
            >
              {/* Box body */}
              <div
                className={cn(
                  'w-32 h-28 rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 dark:from-amber-600 dark:to-amber-700 relative overflow-hidden shadow-lg',
                  animState === 'shaking' && 'animate-[wiggle_0.15s_ease-in-out_4]'
                )}
              >
                {/* Vertical ribbon */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-4 bg-red-500/80" />
                {/* Horizontal ribbon */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-4 bg-red-500/80" />
                {/* Ribbon bow center */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-600 border-2 border-red-400 z-10" />
              </div>

              {/* Lid */}
              <div
                className={cn(
                  'absolute -top-2 -left-2 -right-2 h-10 rounded-lg bg-gradient-to-b from-amber-300 to-amber-400 dark:from-amber-500 dark:to-amber-600 shadow-md',
                  'transition-transform origin-bottom',
                  animState === 'opening' && 'animate-[lidOpen_0.5s_ease-out_forwards]'
                )}
              >
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-4 bg-red-500/80 rounded-t-lg" />
              </div>

              {/* Tap hint */}
              {animState === 'idle' && (
                <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap group-hover:text-foreground transition-colors">
                  Tap to unwrap
                </p>
              )}
            </button>
          </div>
        ) : revealedBook && (
          <div className={cn(
            'space-y-4',
            'animate-[fadeInScale_0.4s_ease-out]'
          )}>
            {/* Book reveal */}
            <div className="flex flex-col items-center text-center space-y-3">
              {revealedBook.coverUrl ? (
                <img
                  src={revealedBook.coverUrl}
                  alt={revealedBook.title}
                  className="w-24 h-36 object-cover rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-24 h-36 bg-muted rounded-lg flex items-center justify-center shadow-lg">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-semibold text-base">{revealedBook.title}</p>
                <p className="text-sm text-muted-foreground">{revealedBook.author}</p>
              </div>
              {revealedBook.fromUsername && (
                <p className="text-xs text-muted-foreground">
                  Wrapped by {revealedBook.fromUsername}
                </p>
              )}
            </div>

            {responded && reacted ? (
              <div className="py-4 text-center">
                <Check className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">Done! You can close this now.</p>
              </div>
            ) : (
              <>
                {/* Accept / Decline */}
                {!responded ? (
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1.5" onClick={handleAccept}>
                      <Check className="w-4 h-4" />
                      Add to shelf
                    </Button>
                    <Button variant="ghost" className="gap-1.5 text-muted-foreground" onClick={handleDecline}>
                      <X className="w-4 h-4" />
                      Pass
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-1 text-sm text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    Added to your shelf!
                  </div>
                )}

                {/* Reaction */}
                {!reacted && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      {responded ? 'Send a thank-you reaction?' : 'Send a reaction'}
                    </p>
                    <div className="flex justify-center gap-1.5">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleSelectEmoji(emoji)}
                          className={cn(
                            'w-9 h-9 rounded-full text-lg transition-all hover:scale-110',
                            reactionEmoji === emoji
                              ? 'bg-amber-100 dark:bg-amber-900/40 scale-110 ring-2 ring-amber-300'
                              : 'hover:bg-muted'
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {reactionEmoji && (
                      <>
                        <Input
                          placeholder="Add a note... (optional, 140 chars)"
                          value={reactionNote}
                          onChange={(e) => setReactionNote(e.target.value.slice(0, 140))}
                          maxLength={140}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={handleSendReaction}
                        >
                          Send {reactionEmoji}
                        </Button>
                      </>
                    )}
                    {responded && (
                      <button
                        onClick={() => setReacted(true)}
                        className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

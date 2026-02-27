import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { MysteryBook } from '@/hooks/useMysteryBooks';

interface MysteryBookNotificationCardProps {
  mysteryBook: MysteryBook;
  onUnwrap: (mysteryBook: MysteryBook) => void;
}

export function MysteryBookNotificationCard({
  mysteryBook,
  onUnwrap,
}: MysteryBookNotificationCardProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5">
        {mysteryBook.fromUsername ? (
          <Link to={`/u/${mysteryBook.fromUsername}`} className="shrink-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src={mysteryBook.fromAvatarUrl || undefined} alt={mysteryBook.fromUsername} />
              <AvatarFallback className="text-xs font-sans">
                {mysteryBook.fromUsername.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
            <Gift className="h-3.5 w-3.5 text-amber-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug font-sans">
            {mysteryBook.fromUsername ? (
              <Link
                to={`/u/${mysteryBook.fromUsername}`}
                className="font-medium hover:underline"
              >
                {mysteryBook.fromUsername}
              </Link>
            ) : (
              <span className="text-muted-foreground">Someone</span>
            )}
            {' wrapped a mystery book for you'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg">{mysteryBook.emojiClue}</span>
            <span className="text-xs text-muted-foreground italic truncate">
              "{mysteryBook.teaser}"
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-sans">
            {formatDistanceToNow(new Date(mysteryBook.createdAt), { addSuffix: true })}
          </p>
        </div>
        <Gift className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      </div>
      <div className="ml-10">
        <Button
          size="sm"
          className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => onUnwrap(mysteryBook)}
        >
          <Gift className="h-3 w-3" />
          Unwrap
        </Button>
      </div>
    </div>
  );
}

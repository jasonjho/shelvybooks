import { Link } from 'react-router-dom';
import { Star, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ClubReflection } from '@/hooks/useClubReflections';

interface ReflectionCardProps {
  reflection: ClubReflection;
  compact?: boolean;
}

export function ReflectionCard({ reflection, compact = false }: ReflectionCardProps) {
  const displayName = reflection.isAnonymous ? 'Anonymous' : (reflection.displayName || 'A member');
  const initials = reflection.isAnonymous ? '?' : displayName.slice(0, 2).toUpperCase();
  
  // Random slight rotation for mosaic effect
  const rotations = ['-1deg', '0deg', '1deg', '-0.5deg', '0.5deg'];
  const rotation = rotations[reflection.id.charCodeAt(0) % rotations.length];
  
  // Color palette for cards
  const colors = [
    'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
  ];
  const colorClass = colors[reflection.id.charCodeAt(1) % colors.length];

  const content = (
    <div
      className={cn(
        'p-3 rounded-lg border transition-transform hover:scale-[1.02]',
        colorClass,
        compact ? 'text-sm' : ''
      )}
      style={{ transform: `rotate(${rotation})` }}
    >
      {/* Rating */}
      <div className="flex items-center gap-0.5 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'w-3.5 h-3.5',
              star <= reflection.rating
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>

      {/* Content */}
      <p className={cn(
        'text-foreground leading-relaxed mb-3',
        compact ? 'text-sm line-clamp-3' : ''
      )}>
        "{reflection.content}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[10px] bg-background/50">
            {reflection.isAnonymous ? <User className="w-2.5 h-2.5" /> : initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground">
          {displayName}
        </span>
      </div>
    </div>
  );

  // Link to shelf if not anonymous and has public shelf
  if (!reflection.isAnonymous && reflection.shareId) {
    return (
      <Link to={`/shelf/${reflection.shareId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

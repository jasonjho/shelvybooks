import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookLikeBadgeProps {
  count: number;
  className?: string;
}

export function BookLikeBadge({ count, className }: BookLikeBadgeProps) {
  if (count === 0) return null;

  return (
    <div 
      className={cn(
        "absolute -top-1 -right-1 z-30",
        "flex items-center justify-center gap-0.5",
        "min-w-[20px] h-5 px-1 rounded-full",
        "bg-pink-500 text-white text-xs font-medium",
        "shadow-lg animate-scale-in",
        "ring-2 ring-background",
        className
      )}
    >
      <Heart className="h-2.5 w-2.5 fill-current" />
      {count > 1 && <span>{count > 9 ? '9+' : count}</span>}
    </div>
  );
}

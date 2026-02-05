import { Star, MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ClubReflection } from '@/hooks/useClubReflections';
import { ReflectionCard } from './ReflectionCard';

interface ReflectionMosaicProps {
  reflections: ClubReflection[];
  averageRating: number | null;
  bookTitle?: string;
}

export function ReflectionMosaic({ reflections, averageRating, bookTitle }: ReflectionMosaicProps) {
  if (reflections.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <MessageSquareText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No reflections yet. Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {averageRating && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
            <span>avg</span>
          </div>
        )}
        <Badge variant="secondary" className="gap-1">
          <MessageSquareText className="w-3 h-3" />
          {reflections.length} {reflections.length === 1 ? 'reflection' : 'reflections'}
        </Badge>
      </div>

      {/* Mosaic Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reflections.map((reflection) => (
          <ReflectionCard key={reflection.id} reflection={reflection} />
        ))}
      </div>
    </div>
  );
}

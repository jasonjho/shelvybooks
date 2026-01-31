import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ShelfSkeletonProps {
  isMobile?: boolean;
}

export function ShelfSkeleton({ isMobile }: ShelfSkeletonProps) {
  // Generate varying heights for book spines to look natural
  const bookHeights = [140, 155, 135, 160, 145, 150, 140, 165, 138, 152];
  
  if (isMobile) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Mobile: Grid of book cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-md" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Desktop: Shelf rows with book spines */}
      <div className="bookcase p-4 pt-6 pb-8 flex flex-col gap-0 skin-oak">
        {/* Shelf row skeleton */}
        {[0, 1].map((rowIndex) => (
          <div 
            key={rowIndex} 
            className="shelf-row shelf-oak relative flex items-end gap-1 px-4 pb-0 pt-4"
            style={{ minHeight: '180px' }}
          >
            <div className="books-grid flex-1 flex items-end gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="rounded-sm"
                  style={{ 
                    width: '45px', 
                    height: `${bookHeights[(rowIndex * 8 + i) % bookHeights.length]}px`,
                    opacity: 0.4 + (i * 0.05),
                  }} 
                />
              ))}
            </div>
            <div className="shelf-surface" />
            <div className="shelf-front" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ControlsSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in">
      {/* Left side: Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      
      {/* Right side: Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function QuoteSkeleton() {
  return (
    <div className="mb-6 p-4 rounded-lg border border-border/50 bg-card/30 animate-fade-in">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded shrink-0 mt-1" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3 mt-2" />
        </div>
      </div>
    </div>
  );
}

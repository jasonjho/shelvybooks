import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { normalizeCoverUrl } from '@/lib/normalizeCoverUrl';

interface BookCoverImageProps {
  coverUrl?: string | null;
  title: string;
  author?: string;
  className?: string;
  /** Additional class for the fallback text container */
  fallbackClassName?: string;
}

/**
 * Checks if a cover URL is truly empty/missing.
 * We no longer try to detect placeholder URLs by pattern — normalizeCoverUrl
 * handles Google Books edge=curl, and dimension-based detection was too fragile.
 */
function isPlaceholderUrl(url: string | null | undefined): boolean {
  return !url || url === '/placeholder.svg' || url.trim() === '';
}

/**
 * Shared book cover component with intelligent placeholder detection.
 * 
 * Handles:
 * - Missing/empty URLs → shows title fallback
 * - Google Books "image not available" placeholders (detected by dimensions)
 * - Open Library 1x1 pixel placeholders
 * - ISBNdb covers (passes through normally)
 * - Network errors → shows title fallback
 */
export function BookCoverImage({ 
  coverUrl, 
  title, 
  author,
  className,
  fallbackClassName,
}: BookCoverImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  // Reset state when URL changes
  useEffect(() => {
    setImageLoaded(false);
    setShowFallback(isPlaceholderUrl(coverUrl));
  }, [coverUrl]);

  const normalizedUrl = coverUrl ? normalizeCoverUrl(coverUrl) : '';

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;

    // Only reject truly degenerate images (1x1 pixel placeholders)
    if (naturalWidth <= 1 && naturalHeight <= 1) {
      setShowFallback(true);
    }

    setImageLoaded(true);
  };

  const handleImageError = () => {
    setShowFallback(true);
    setImageLoaded(true);
  };

  // Pre-emptive fallback for known bad URLs
  if (showFallback || isPlaceholderUrl(coverUrl)) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-secondary to-muted',
          className,
          fallbackClassName
        )}
      >
        <div className="p-2 text-center">
          <span className="text-[10px] font-medium text-secondary-foreground leading-tight line-clamp-3 block">
            {title}
          </span>
          {author && (
            <span className="text-[8px] text-muted-foreground leading-tight line-clamp-1 block mt-0.5">
              {author}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {/* Loading shimmer */}
      {!imageLoaded && (
        <div className="absolute inset-0 w-full h-full bg-muted animate-pulse" />
      )}
      
      {/* Actual image */}
      <img
        src={normalizedUrl}
        alt={title}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          imageLoaded && !showFallback ? 'opacity-100' : 'opacity-0'
        )}
        referrerPolicy="no-referrer"
      />

      {/* Fallback shown if image loaded but was detected as placeholder */}
      {showFallback && (
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-muted',
            fallbackClassName
          )}
        >
          <div className="p-2 text-center">
            <span className="text-[10px] font-medium text-secondary-foreground leading-tight line-clamp-3 block">
              {title}
            </span>
            {author && (
              <span className="text-[8px] text-muted-foreground leading-tight line-clamp-1 block mt-0.5">
                {author}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

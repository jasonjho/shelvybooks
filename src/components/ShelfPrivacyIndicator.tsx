import { Globe, Lock } from 'lucide-react';
import { useShelfSettings } from '@/hooks/useShelfSettings';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ShelfPrivacyIndicatorProps {
  onClick?: () => void;
  className?: string;
}

export function ShelfPrivacyIndicator({ onClick, className }: ShelfPrivacyIndicatorProps) {
  const { settings, loading } = useShelfSettings();

  if (loading || !settings) return null;

  const isPublic = settings.is_public;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
            isPublic
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground',
            onClick && 'hover:opacity-80 cursor-pointer',
            className
          )}
        >
          {isPublic ? (
            <>
              <Globe className="w-3 h-3" />
              <span>Public</span>
            </>
          ) : (
            <>
              <Lock className="w-3 h-3" />
              <span>Private</span>
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isPublic 
          ? 'Your shelf is visible to anyone with the link'
          : 'Only you can see your shelf. Click to share.'}
      </TooltipContent>
    </Tooltip>
  );
}

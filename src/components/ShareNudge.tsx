import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Share2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShelfSettings } from '@/hooks/useShelfSettings';

const STORAGE_KEY = 'shelvy-share-nudge-dismissed';
const BOOK_THRESHOLD = 5;

interface ShareNudgeProps {
  bookCount: number;
}

export function ShareNudge({ bookCount }: ShareNudgeProps) {
  const { settings, loading, togglePublic } = useShelfSettings();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [visible, setVisible] = useState(false);

  // Show nudge after delay if conditions are met
  useEffect(() => {
    if (loading || dismissed) return;
    
    // Only show if: 5+ books AND shelf is private
    const shouldShow = bookCount >= BOOK_THRESHOLD && settings && !settings.is_public;
    
    if (shouldShow) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 3000); // Show after 3s
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [bookCount, settings, loading, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
    setVisible(false);
  };

  const handleMakePublic = async () => {
    await togglePublic();
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'fixed z-50',
          'bottom-2 sm:bottom-6',
          'left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2',
          'sm:w-full sm:max-w-sm',
          'bg-card border border-border rounded-xl shadow-2xl',
          'overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <Users className="w-4 h-4" />
            <span className="font-sans text-xs font-medium uppercase tracking-wide">Share with friends</span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <h3 className="font-sans font-semibold text-foreground mb-1">
            Your shelf is growing! 📚
          </h3>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            You've added {bookCount} books. Make your shelf public so friends can discover what you're reading and follow your journey.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-muted/30 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
          >
            Maybe later
          </Button>
          <Button
            size="sm"
            onClick={handleMakePublic}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Share2 className="w-4 h-4" />
            Make Public
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

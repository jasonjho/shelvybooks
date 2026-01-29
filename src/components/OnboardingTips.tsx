import { useOnboardingTips } from '@/hooks/useOnboardingTips';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function OnboardingTips() {
  const {
    currentTip,
    currentIndex,
    totalRemaining,
    isVisible,
    dismissCurrentTip,
    nextTip,
    prevTip,
    dismissAll,
  } = useOnboardingTips();

  if (!isVisible || !currentTip) return null;

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
          'sm:w-full sm:max-w-md',
          'bg-card border border-border rounded-xl shadow-2xl',
          'overflow-hidden max-h-[80vh] overflow-y-auto'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-border">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
            <Lightbulb className="w-4 h-4" />
            <span className="font-sans text-xs font-medium uppercase tracking-wide">Quick Tip</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} of {totalRemaining}
            </span>
            <button
              onClick={dismissAll}
              className="p-1 hover:bg-muted rounded-md transition-colors"
              aria-label="Dismiss all tips"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <h3 className="font-sans font-semibold text-foreground mb-1">{currentTip.title}</h3>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {currentTip.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevTip}
              disabled={currentIndex === 0}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextTip}
              disabled={currentIndex >= totalRemaining - 1}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            onClick={dismissCurrentTip}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Got it
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {Array.from({ length: totalRemaining }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                i === currentIndex ? 'bg-amber-600' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

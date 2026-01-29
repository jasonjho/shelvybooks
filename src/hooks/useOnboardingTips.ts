import { useState, useEffect, useCallback } from 'react';

export type TipId = 'context-menu' | 'staff-pick' | 'share-shelf' | 'book-clubs';

interface Tip {
  id: TipId;
  title: string;
  description: string;
  targetSelector?: string;
}

export const ONBOARDING_TIPS: Tip[] = [
  {
    id: 'context-menu',
    title: 'Right-click for options',
    description: 'Right-click any book to move it between shelves, add notes, or remove it.',
  },
  {
    id: 'staff-pick',
    title: 'Add staff pick notes',
    description: 'Right-click a book and select "Add Note" to add a personal recommendation that shows as a post-it.',
  },
  {
    id: 'share-shelf',
    title: 'Share your shelf',
    description: 'Click "Share" to get a public link to your bookshelf that friends can browse.',
  },
  {
    id: 'book-clubs',
    title: 'Join book clubs',
    description: 'Create or join book clubs to read together with friends and vote on what to read next.',
  },
];

const STORAGE_KEY = 'shelvy-onboarding-tips';

interface OnboardingState {
  dismissed: TipId[];
  completed: boolean;
}

export function useOnboardingTips() {
  const [state, setState] = useState<OnboardingState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { dismissed: [], completed: false };
      }
    }
    return { dismissed: [], completed: false };
  });

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Get remaining tips
  const remainingTips = ONBOARDING_TIPS.filter(
    (tip) => !state.dismissed.includes(tip.id)
  );

  const currentTip = remainingTips[currentTipIndex] || null;
  const totalRemaining = remainingTips.length;

  // Show tips after a short delay when component mounts
  useEffect(() => {
    if (state.completed || remainingTips.length === 0) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500); // Show after 1.5s

    return () => clearTimeout(timer);
  }, [state.completed, remainingTips.length]);

  const dismissCurrentTip = useCallback(() => {
    if (!currentTip) return;

    setState((prev) => ({
      ...prev,
      dismissed: [...prev.dismissed, currentTip.id],
    }));

    if (currentTipIndex >= remainingTips.length - 1) {
      // No more tips
      setState((prev) => ({ ...prev, completed: true }));
      setIsVisible(false);
    } else {
      setCurrentTipIndex((prev) => Math.min(prev, remainingTips.length - 2));
    }
  }, [currentTip, currentTipIndex, remainingTips.length]);

  const nextTip = useCallback(() => {
    if (currentTipIndex < remainingTips.length - 1) {
      setCurrentTipIndex((prev) => prev + 1);
    }
  }, [currentTipIndex, remainingTips.length]);

  const prevTip = useCallback(() => {
    if (currentTipIndex > 0) {
      setCurrentTipIndex((prev) => prev - 1);
    }
  }, [currentTipIndex]);

  const dismissAll = useCallback(() => {
    setState({
      dismissed: ONBOARDING_TIPS.map((t) => t.id),
      completed: true,
    });
    setIsVisible(false);
  }, []);

  const resetTips = useCallback(() => {
    setState({ dismissed: [], completed: false });
    setCurrentTipIndex(0);
    setIsVisible(true);
  }, []);

  return {
    currentTip,
    currentIndex: currentTipIndex,
    totalRemaining,
    isVisible,
    isCompleted: state.completed,
    dismissCurrentTip,
    nextTip,
    prevTip,
    dismissAll,
    resetTips,
  };
}

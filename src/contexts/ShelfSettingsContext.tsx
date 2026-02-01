import { createContext, useContext, ReactNode } from 'react';
import { useShelfSettings, ShelfSettings } from '@/hooks/useShelfSettings';

interface ShelfSettingsContextType {
  settings: ShelfSettings | null;
  loading: boolean;
  togglePublic: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  getShareUrl: () => string | null;
  refetch: () => Promise<void>;
}

const ShelfSettingsContext = createContext<ShelfSettingsContextType | null>(null);

export function ShelfSettingsProvider({ children }: { children: ReactNode }) {
  const shelfSettingsState = useShelfSettings();
  
  return (
    <ShelfSettingsContext.Provider value={shelfSettingsState}>
      {children}
    </ShelfSettingsContext.Provider>
  );
}

export function useShelfSettingsContext() {
  const context = useContext(ShelfSettingsContext);
  if (!context) {
    throw new Error('useShelfSettingsContext must be used within a ShelfSettingsProvider');
  }
  return context;
}

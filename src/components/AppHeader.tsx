import { AuthButton } from '@/components/AuthButton';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { Library } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppHeader() {
  const { user } = useAuth();

  return (
    <header className="relative border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="container py-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-md">
            <Library className="w-8 h-8 text-amber-100" />
          </div>
          <h1 className="font-normal tracking-wide bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700 bg-clip-text text-transparent font-display text-4xl leading-[1.2] -mt-1 sm:mt-0">
            Shelvy
          </h1>
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-shrink touch-manipulation">
          {user && <NotificationBell />}
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

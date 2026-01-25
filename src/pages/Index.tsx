import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bookshelf } from '@/components/Bookshelf';
import { SkinPicker } from '@/components/SkinPicker';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AddBookDialog } from '@/components/AddBookDialog';
import { AuthButton } from '@/components/AuthButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useBooks } from '@/hooks/useBooks';
import { useAuth } from '@/contexts/AuthContext';
import { BookStatus } from '@/types/book';
import { demoBooks } from '@/data/demoBooks';
import { BookOpen, BookMarked, CheckCircle, Library, Loader2 } from 'lucide-react';

const tabs: { id: BookStatus; label: string; icon: React.ReactNode }[] = [
  { id: 'reading', label: 'Reading', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'want-to-read', label: 'Want to Read', icon: <BookMarked className="w-4 h-4" /> },
  { id: 'read', label: 'Read', icon: <CheckCircle className="w-4 h-4" /> },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<BookStatus>('reading');
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { 
    loading: booksLoading,
    shelfSkin, 
    setShelfSkin, 
    settings,
    updateSettings,
    addBook, 
    removeBook, 
    moveBook, 
    getBooksByStatus 
  } = useBooks();

  // Use demo books for guests, real books for authenticated users
  const displayBooks = useMemo(() => {
    if (user) return getBooksByStatus;
    return (status: BookStatus) => demoBooks.filter(book => book.status === status);
  }, [user, getBooksByStatus]);

  const getBookCount = (status: BookStatus) => {
    if (user) return getBooksByStatus(status).length;
    return demoBooks.filter(book => book.status === status).length;
  };

  return (
    <div className="min-h-screen office-wall">
      {/* Ambient top light */}
      {settings.showAmbientLight && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none transition-opacity duration-500"
          style={{
            background: 'radial-gradient(ellipse at center top, hsla(45, 70%, 75%, 0.3) 0%, hsla(35, 60%, 60%, 0.1) 40%, transparent 70%)',
          }}
        />
      )}
      
      {/* Header */}
      <header className="relative border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 shadow-md">
              <Library className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight bg-gradient-to-r from-amber-600 to-amber-800 dark:from-amber-400 dark:to-amber-600 bg-clip-text text-transparent">
              Shelfie
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SettingsPanel settings={settings} onSettingsChange={updateSettings} />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 relative z-10">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookStatus)}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-muted/50 backdrop-blur-sm border border-border">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-1.5 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="ml-1 text-xs opacity-70">
                    ({getBookCount(tab.id)})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {user && <AddBookDialog onAddBook={addBook} defaultStatus={activeTab} />}
          </div>

          {/* Loading state */}
          {(authLoading || booksLoading) && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Not signed in message */}
          {!authLoading && !user && (
            <div className="text-center py-4 mb-4">
              <p className="text-foreground text-lg mb-1">Welcome to Shelfie!</p>
              <p className="text-muted-foreground text-sm">
                Here's a preview —{' '}
                <button
                  onClick={signInWithGoogle}
                  className="text-primary hover:underline"
                >
                  sign in
                </button>
                {' '}to build your own shelf.
              </p>
            </div>
          )}

          {/* Shelf customization controls */}
          {!authLoading && !booksLoading && (
            <div className="flex items-center justify-end mb-4">
              <SkinPicker currentSkin={shelfSkin} onSkinChange={setShelfSkin} />
            </div>
          )}

          {/* Show bookshelf for everyone - demo books for guests, real books for users */}
          {!authLoading && !booksLoading && tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <Bookshelf
                books={displayBooks(tab.id)}
                skin={shelfSkin}
                settings={settings}
                onMoveBook={user ? moveBook : undefined}
                onRemoveBook={user ? removeBook : undefined}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Footer hint - only show for logged in users */}
      {user && (
        <footer className="relative z-10 py-6">
          <div className="container text-center text-sm text-muted-foreground">
            <p>Right-click a book to move it or remove it from your shelf</p>
          </div>
        </footer>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bookshelf } from '@/components/Bookshelf';
import { SkinPicker } from '@/components/SkinPicker';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AddBookDialog } from '@/components/AddBookDialog';
import { AuthButton } from '@/components/AuthButton';
import { useBooks } from '@/hooks/useBooks';
import { useAuth } from '@/contexts/AuthContext';
import { BookStatus } from '@/types/book';
import { BookOpen, BookMarked, CheckCircle, Library, Loader2 } from 'lucide-react';

const tabs: { id: BookStatus; label: string; icon: React.ReactNode }[] = [
  { id: 'reading', label: 'Reading', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'want-to-read', label: 'Want to Read', icon: <BookMarked className="w-4 h-4" /> },
  { id: 'read', label: 'Read', icon: <CheckCircle className="w-4 h-4" /> },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<BookStatus>('reading');
  const { user, loading: authLoading } = useAuth();
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
      <header className="relative border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
              <Library className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-white drop-shadow-lg">
              Book Shelfie
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <SkinPicker currentSkin={shelfSkin} onSkinChange={setShelfSkin} />
            <SettingsPanel settings={settings} onSettingsChange={updateSettings} />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 relative z-10">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookStatus)}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-black/30 backdrop-blur-sm border border-white/10">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-1.5 text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="ml-1 text-xs opacity-70">
                    ({getBooksByStatus(tab.id).length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {user && <AddBookDialog onAddBook={addBook} defaultStatus={activeTab} />}
          </div>

          {/* Loading state */}
          {(authLoading || booksLoading) && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
          )}

          {/* Not signed in message */}
          {!authLoading && !user && (
            <div className="text-center py-4 mb-4">
              <p className="text-white/70 text-lg mb-1">Welcome to Book Shelfie!</p>
              <p className="text-white/50 text-sm">Sign in with Google to save your reading list.</p>
            </div>
          )}

          {/* Show bookshelf for everyone - empty preview for guests */}
          {!authLoading && !booksLoading && tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <Bookshelf
                books={user ? getBooksByStatus(tab.id) : []}
                skin={shelfSkin}
                settings={settings}
                onMoveBook={moveBook}
                onRemoveBook={removeBook}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Footer hint */}
      <footer className="relative z-10 py-6">
        <div className="container text-center text-sm text-white/50">
          {user ? (
            <p>Right-click a book to move it or remove it from your shelf</p>
          ) : (
            <p>Sign in to start building your personal bookshelf</p>
          )}
        </div>
      </footer>
    </div>
  );
}

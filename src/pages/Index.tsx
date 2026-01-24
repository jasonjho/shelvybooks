import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bookshelf } from '@/components/Bookshelf';
import { SkinPicker } from '@/components/SkinPicker';
import { AddBookDialog } from '@/components/AddBookDialog';
import { useBooks } from '@/hooks/useBooks';
import { BookStatus } from '@/types/book';
import { BookOpen, BookMarked, CheckCircle, Library } from 'lucide-react';

const tabs: { id: BookStatus; label: string; icon: React.ReactNode }[] = [
  { id: 'reading', label: 'Reading', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'want-to-read', label: 'Want to Read', icon: <BookMarked className="w-4 h-4" /> },
  { id: 'read', label: 'Read', icon: <CheckCircle className="w-4 h-4" /> },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<BookStatus>('reading');
  const { shelfSkin, setShelfSkin, addBook, removeBook, moveBook, getBooksByStatus } = useBooks();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Library className="w-7 h-7 text-primary" />
            <h1 className="font-display text-2xl font-semibold text-foreground">
              My Bookshelf
            </h1>
          </div>
          <SkinPicker currentSkin={shelfSkin} onSkinChange={setShelfSkin} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookStatus)}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-secondary/50">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="ml-1 text-xs opacity-70">
                    ({getBooksByStatus(tab.id).length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <AddBookDialog onAddBook={addBook} defaultStatus={activeTab} />
          </div>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <Bookshelf
                books={getBooksByStatus(tab.id)}
                skin={shelfSkin}
                onMoveBook={moveBook}
                onRemoveBook={removeBook}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Right-click a book to move it between shelves or remove it</p>
        </div>
      </footer>
    </div>
  );
}

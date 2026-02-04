import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { BookAnimationProvider } from "@/contexts/BookAnimationContext";
import { BooksProvider } from "@/contexts/BooksContext";
import { ShelfSettingsProvider } from "@/contexts/ShelfSettingsContext";
import { ProfileSetupWrapper } from "@/components/ProfileSetupWrapper";
import Index from "./pages/Index";
import PublicShelf from "./pages/PublicShelf";
import ClubPage from "./pages/ClubPage";
import JoinClubPage from "./pages/JoinClubPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient(); // HMR cache clear v2

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <ProfileProvider>
          <BookAnimationProvider>
            <BooksProvider>
              <ShelfSettingsProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <ProfileSetupWrapper />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/shelf/:shareId" element={<PublicShelf />} />
                      <Route path="/clubs/:clubId" element={<ClubPage />} />
                      <Route path="/clubs/join/:inviteCode" element={<JoinClubPage />} />
                      <Route path="/u/:username" element={<ProfilePage />} />
                      <Route path="/admin" element={<AdminPage />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </ShelfSettingsProvider>
            </BooksProvider>
          </BookAnimationProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

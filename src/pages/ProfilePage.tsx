import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthButton } from '@/components/AuthButton';
import { FollowTabs } from '@/components/FollowTabs';
import { Library, ArrowLeft, BookOpen, User, ExternalLink } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { Profile } from '@/hooks/useProfile';

interface PublicShelfInfo {
  shareId: string;
  displayName: string | null;
  isPublic: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shelfInfo, setShelfInfo] = useState<PublicShelfInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch profile by username (case-insensitive)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .maybeSingle();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile({
        id: profileData.id,
        userId: profileData.user_id,
        username: profileData.username,
        avatarUrl: profileData.avatar_url,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
      });

      // Check if they have a public shelf
      const { data: shelfData } = await supabase
        .from('shelf_settings')
        .select('share_id, display_name, is_public')
        .eq('user_id', profileData.user_id)
        .eq('is_public', true)
        .maybeSingle();

      if (shelfData) {
        setShelfInfo({
          shareId: shelfData.share_id || '',
          displayName: shelfData.display_name,
          isPublic: shelfData.is_public,
        });
      }

      setLoading(false);
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="container py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-md">
                <Library className="w-7 h-7 text-amber-100" />
              </div>
            <span className="text-4xl font-display leading-[1.2] bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700 bg-clip-text text-transparent">
              Shelvy
            </span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <AuthButton />
            </div>
          </div>
        </header>
        <main className="container py-12 text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-sans font-semibold mb-2">User not found</h1>
          <p className="text-muted-foreground mb-6">
            The profile you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go home
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  const initials = profile.username.slice(0, 2).toUpperCase();
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  // Check if this is the current user's own profile
  const isOwnProfile = user?.id === profile.userId;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-md">
              <Library className="w-7 h-7 text-amber-100" />
            </div>
            <span className="text-4xl font-display leading-[1.2] bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700 bg-clip-text text-transparent">
              Shelvy
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="max-w-md mx-auto text-center">
          {/* Avatar */}
          <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-border">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.username} />
            <AvatarFallback className="text-2xl bg-muted">{initials}</AvatarFallback>
          </Avatar>

          {/* Username */}
          <h1 className="text-2xl font-sans font-semibold mb-1">{profile.username}</h1>
          <p className="text-sm text-muted-foreground mb-4">Member since {memberSince}</p>

          {/* Public shelf link */}
          {shelfInfo && shelfInfo.shareId && (
            <Button asChild variant="outline" className="gap-2 mb-6 max-w-full">
              <Link to={`/shelf/${shelfInfo.shareId}`} className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  View {(shelfInfo.displayName || profile.username).slice(0, 20)}{(shelfInfo.displayName || profile.username).length > 20 ? '…' : ''}'s bookshelf
                </span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </Link>
            </Button>
          )}

          {!shelfInfo && (
            <p className="text-sm text-muted-foreground mb-6">
              This user hasn't made their bookshelf public yet.
            </p>
          )}

          {/* Followers/Following Tabs */}
          <div className="flex justify-center">
            <FollowTabs targetUserId={profile.userId} isOwnProfile={isOwnProfile} />
          </div>
        </div>
      </main>
    </div>
  );
}

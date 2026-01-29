import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookClubs } from '@/hooks/useBookClubs';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function JoinClubPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, setAuthDialogOpen } = useAuth();
  const { joinClub } = useBookClubs();

  useEffect(() => {
    const handleJoin = async () => {
      if (authLoading) return;

      if (!user) {
        // Save invite code and redirect to home to sign in
        sessionStorage.setItem('pendingClubInvite', inviteCode || '');
        setAuthDialogOpen(true);
        navigate('/');
        return;
      }

      if (!inviteCode) {
        navigate('/');
        return;
      }

      const club = await joinClub(inviteCode);
      if (club) {
        navigate(`/clubs/${club.id}`);
      } else {
        navigate('/');
      }
    };

    handleJoin();
  }, [inviteCode, user, authLoading, joinClub, navigate, setAuthDialogOpen]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Joining club...</p>
      </div>
    </div>
  );
}

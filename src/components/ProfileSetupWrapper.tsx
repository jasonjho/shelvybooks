import { useProfile } from '@/hooks/useProfile';
import { ProfileSetupDialog } from '@/components/ProfileSetupDialog';

export function ProfileSetupWrapper() {
  const { needsSetup, loading } = useProfile();

  // Don't show dialog while loading
  if (loading) return null;

  return (
    <ProfileSetupDialog 
      open={needsSetup} 
      onComplete={() => {
        // The dialog will close automatically when profile is created
        // via the useProfile hook state update
      }} 
    />
  );
}

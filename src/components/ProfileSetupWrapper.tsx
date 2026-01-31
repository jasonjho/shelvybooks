import { useContext } from 'react';
import { ProfileContext, type Profile } from '@/contexts/ProfileContext';
import { ProfileSetupDialog } from '@/components/ProfileSetupDialog';

export function ProfileSetupWrapper() {
  const context = useContext(ProfileContext);
  
  // During HMR, context may briefly be undefined - silently return null
  if (!context) return null;
  
  const { needsSetup, loading } = context;

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

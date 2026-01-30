import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

interface ProfileSetupDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function ProfileSetupDialog({ open, onComplete }: ProfileSetupDialogProps) {
  const { createProfile, refreshProfile } = useProfile();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with prop
  useEffect(() => {
    setDialogOpen(open);
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a username');
      return;
    }

    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (trimmedUsername.length > 30) {
      setError('Username must be 30 characters or less');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    setSubmitting(true);
    const result = await createProfile(trimmedUsername, avatarFile || undefined);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Close dialog immediately
    setDialogOpen(false);

    // Refresh profile so AuthButton shows username
    refreshProfile();

    toast({
      title: 'Profile created!',
      description: 'Welcome to your bookshelf.',
    });

    onComplete();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set up your profile</DialogTitle>
          <DialogDescription>
            Choose a username and optional avatar to get started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatarPreview || undefined} alt="Avatar preview" />
                <AvatarFallback className="text-2xl bg-muted">
                  <User className="w-8 h-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">Click to upload (optional, max 2MB)</p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="yourname"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              required
              autoComplete="username"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              3-30 characters, letters, numbers, underscores, hyphens
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <span className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              'Complete setup'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

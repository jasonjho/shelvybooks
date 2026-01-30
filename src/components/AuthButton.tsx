import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { LogIn, LogOut, User, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export function AuthButton() {
  const { user, loading, signIn, signUp, signOut, authDialogOpen, setAuthDialogOpen } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const open = authDialogOpen;
  const setOpen = setAuthDialogOpen;
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    
    const { error } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      toast({
        title: isSignUp ? 'Sign up failed' : 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setOpen(false);
      setEmail('');
      setPassword('');
      toast({
        title: isSignUp ? 'Account created!' : 'Welcome back!',
        description: isSignUp ? 'You are now signed in.' : 'You have signed in successfully.',
      });
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <span className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isSignUp ? 'Create an account' : 'Welcome back'}</DialogTitle>
            <DialogDescription>
              {isSignUp 
                ? 'Sign up to save your books and build your shelf.' 
                : 'Sign in to access your bookshelf.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <span className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isSignUp ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground mt-4">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const displayName = profile?.username || user.email;
  const initials = profile?.username 
    ? profile.username.slice(0, 2).toUpperCase() 
    : user.email?.slice(0, 2).toUpperCase() || 'U';
  const avatarUrl = profile?.avatarUrl || user.user_metadata?.avatar_url;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={avatarUrl} alt={displayName || 'User'} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm truncate max-w-[120px]">
              {displayName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {profile?.username && (
            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
              <Link to={`/u/${profile.username}`}>
                <User className="w-4 h-4" />
                View profile
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setProfileEditOpen(true)} className="gap-2 cursor-pointer">
            <Settings className="w-4 h-4" />
            Edit profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer">
            <LogOut className="w-4 h-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileEditDialog open={profileEditOpen} onOpenChange={setProfileEditOpen} />
    </>
  );
}

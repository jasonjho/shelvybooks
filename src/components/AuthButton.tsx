import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useShelfSettingsContext } from '@/contexts/ShelfSettingsContext';
import { LogIn, LogOut, User, Settings, Shield, Palette } from 'lucide-react';
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
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { SettingsPanelDialog } from '@/components/SettingsPanelDialog';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function AuthButton() {
  const { user, loading, signIn, signUp, signOut, authDialogOpen, setAuthDialogOpen } = useAuth();
  const { profile } = useProfile();
  const { settings: shelfSettings } = useShelfSettingsContext();
  const { toast } = useToast();
  const location = useLocation();
  const open = authDialogOpen;
  const setOpen = setAuthDialogOpen;
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [shelfSettingsOpen, setShelfSettingsOpen] = useState(false);

  // Hide shelf settings when viewing someone else's public shelf
  const isOnPublicShelf = location.pathname.startsWith('/shelf/');
  const currentShelfShareId = isOnPublicShelf ? location.pathname.split('/shelf/')[1] : null;
  const isOwnPublicShelf = currentShelfShareId && shelfSettings?.share_id === currentShelfShareId;
  const showShelfSettings = !isOnPublicShelf || isOwnPublicShelf;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      setSubmitting(false);
      if (error) {
        toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
      } else {
        setOpen(false);
        setEmail('');
        setPassword('');
        toast({ title: 'Account created!', description: 'You are now signed in.' });
      }
    } else {
      const result = await signIn(email, password);
      setSubmitting(false);
      if (result.migrationRequired) {
        setMigrationRequired(true);
        setPassword('');
      } else if (result.error) {
        toast({ title: 'Sign in failed', description: result.error.message, variant: 'destructive' });
      } else {
        setOpen(false);
        setEmail('');
        setPassword('');
        toast({ title: 'Welcome back!', description: 'You have signed in successfully.' });
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) return;
    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('reset-password', {
        body: {
          email: forgotPasswordEmail,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
    } catch (err) {
      // Always show success to prevent email enumeration
      console.error('Reset password error:', err);
    } finally {
      setResetEmailSent(true);
      setSubmitting(false);
    }
  };

  const handleMigrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;

    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords don\'t match', description: 'Please make sure both passwords match.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('set-migration-password', {
        body: { email, password: newPassword },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to set password');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Auto-login with the new password
      const { error } = await signIn(email, newPassword);

      if (error) {
        throw new Error(error.message);
      }

      setOpen(false);
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setMigrationRequired(false);
      toast({ title: 'Welcome back!', description: 'Your password has been set. You\'re all signed in.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
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
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setMigrationRequired(false);
          setIsForgotPassword(false);
          setForgotPasswordEmail('');
          setResetEmailSent(false);
          setNewPassword('');
          setConfirmPassword('');
        }
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          {migrationRequired ? (
            <>
              <DialogHeader>
                <DialogTitle>Welcome back!</DialogTitle>
                <DialogDescription>
                  We've upgraded our system. Please set a new password to continue.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMigrationSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    'Continue'
                  )}
                </Button>
              </form>
              <div className="text-center text-sm text-muted-foreground mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMigrationRequired(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Back to sign in
                </button>
              </div>
            </>
          ) : isForgotPassword ? (
            <>
              <DialogHeader>
                <DialogTitle>{resetEmailSent ? 'Check your email' : 'Forgot your password?'}</DialogTitle>
                <DialogDescription>
                  {resetEmailSent
                    ? `If an account exists for ${forgotPasswordEmail}, we've sent a password reset link. Check your inbox and spam folder.`
                    : "Enter your email and we'll send you a link to reset it."}
                </DialogDescription>
              </DialogHeader>
              {!resetEmailSent && (
                <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <span className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>
              )}
              <div className="text-center text-sm text-muted-foreground mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setForgotPasswordEmail('');
                    setResetEmailSent(false);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Back to sign in
                </button>
              </div>
            </>
          ) : (
            <>
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
                {!isSignUp && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotPasswordEmail(email);
                      }}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
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
            </>
          )}
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
          <Button variant="outline" size="sm" className="gap-2 px-2 h-10 bg-background/80 border-border text-foreground hover:bg-muted hover:text-foreground">
          <Avatar className="w-6 h-6">
              <AvatarImage src={avatarUrl} alt={displayName || 'User'} />
              <AvatarFallback className="text-xs bg-primary/15 text-primary">{initials}</AvatarFallback>
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
            <User className="w-4 h-4" />
            Edit profile
          </DropdownMenuItem>
          {showShelfSettings && (
            <DropdownMenuItem onClick={() => setShelfSettingsOpen(true)} className="gap-2 cursor-pointer">
              <Palette className="w-4 h-4" />
              Shelf settings
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)} className="gap-2 cursor-pointer">
            <Shield className="w-4 h-4" />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer">
            <LogOut className="w-4 h-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileEditDialog open={profileEditOpen} onOpenChange={setProfileEditOpen} />
      <AccountSettingsDialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen} />
      <SettingsPanelDialog open={shelfSettingsOpen} onOpenChange={setShelfSettingsOpen} />
    </>
  );
}

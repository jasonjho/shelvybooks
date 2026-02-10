import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Library } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const recoveryDetected = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          recoveryDetected.current = true;
          setIsRecovery(true);
          setLoading(false);
        }
      }
    );

    // Timeout — if no PASSWORD_RECOVERY event, the token is invalid or expired
    const timeout = setTimeout(() => {
      if (!recoveryDetected.current) {
        setLoading(false);
        setError('This reset link is invalid or has expired.');
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: 'Please make sure both passwords match.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setSubmitting(false);
    } else {
      setSuccess(true);
      toast({ title: 'Password updated', description: 'Your password has been reset successfully.' });
      setTimeout(() => navigate('/'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-sans">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-md">
            <Library className="w-7 h-7 text-amber-100" />
          </div>
          <h1 className="text-4xl font-normal tracking-wide leading-[1.2] bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700 bg-clip-text text-transparent font-display">
            Shelvy
          </h1>
        </div>

        {loading && (
          <div className="text-center space-y-3">
            <span className="inline-block w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to home
            </Button>
          </div>
        )}

        {isRecovery && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground font-display">Set a new password</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your new password below.</p>
            </div>
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
                'Reset password'
              )}
            </Button>
          </form>
        )}

        {success && (
          <div className="text-center space-y-2">
            <p className="text-sm text-foreground font-medium">Password updated!</p>
            <p className="text-sm text-muted-foreground">Redirecting you to your shelf...</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, BookX, AlertTriangle, Loader2 } from 'lucide-react';

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsDialog({ open, onOpenChange }: AccountSettingsDialogProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [clearShelfOpen, setClearShelfOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClearShelf = async () => {
    if (!user) return;
    
    setIsClearing(true);
    try {
      // Delete all books for this user
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Shelf cleared',
        description: 'All books have been removed from your shelf.',
      });
      setClearShelfOpen(false);
      onOpenChange(false);
      
      // Reload to refresh the book list
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error clearing shelf',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || confirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      // Call the delete-account edge function
      const { error } = await supabase.functions.invoke('delete-account');
      
      if (error) throw error;

      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been permanently deleted.',
      });
      
      // Sign out and redirect
      await signOut();
      window.location.href = '/';
    } catch (error) {
      toast({
        title: 'Error deleting account',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Manage your account and data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Clear Shelf Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Clear Shelf</h3>
              <p className="text-sm text-muted-foreground">
                Remove all books from your shelf. This cannot be undone.
              </p>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950/20"
                onClick={() => setClearShelfOpen(true)}
              >
                <BookX className="w-4 h-4" />
                Clear my shelf
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-destructive/20">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <h3 className="text-sm font-semibold">Danger Zone</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your Shelvy account and all associated data. This action is irreversible.
                </p>
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2"
                  onClick={() => setDeleteAccountOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete my account
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Shelf Confirmation */}
      <AlertDialog open={clearShelfOpen} onOpenChange={setClearShelfOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BookX className="w-5 h-5 text-orange-600" />
              Clear your shelf?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>all books</strong> from your shelf. 
              Your notes, likes received, and reading history will also be removed. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearShelf}
              disabled={isClearing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isClearing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Yes, clear my shelf'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteAccountOpen} onOpenChange={(open) => {
        setDeleteAccountOpen(open);
        if (!open) setConfirmText('');
      }}>
        <AlertDialogContent className="border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will <strong>permanently delete</strong> your Shelvy account and all associated data including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>All books on your shelf</li>
                <li>Your profile and username</li>
                <li>All notes and comments</li>
                <li>Likes given and received</li>
                <li>Book club memberships</li>
                <li>Shelf sharing settings</li>
              </ul>
              <p className="font-medium text-destructive">
                This action is irreversible. There is no way to recover your data.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-delete" className="text-sm">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setConfirmText('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Permanently delete account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

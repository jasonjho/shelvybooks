import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Share2, Copy, Check, Globe, Lock } from 'lucide-react';
import { useShelfSettings } from '@/hooks/useShelfSettings';
import { toast } from 'sonner';

interface ShareShelfDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ShareShelfDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: ShareShelfDialogProps = {}) {
  const { settings, loading, togglePublic, updateDisplayName, getShareUrl } = useShelfSettings();
  const [internalOpen, setInternalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const shareUrl = getShareUrl();

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSaveDisplayName = async () => {
    await updateDisplayName(displayNameInput);
    setIsEditing(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && settings?.display_name) {
      setDisplayNameInput(settings.display_name);
    }
    setOpen(newOpen);
  };

  if (loading || !settings) {
    return null;
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Share Your Shelf</DialogTitle>
        <DialogDescription>
          Make your bookshelf public so friends can see what you're reading.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Public toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.is_public ? (
              <Globe className="w-5 h-5 text-primary" />
            ) : (
              <Lock className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="public-toggle" className="text-base font-medium">
                Public Shelf
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.is_public 
                  ? 'Anyone with the link can view' 
                  : 'Only you can see your shelf'}
              </p>
            </div>
          </div>
          <Switch
            id="public-toggle"
            checked={settings.is_public}
            onCheckedChange={togglePublic}
          />
        </div>

        {/* Display name */}
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name (optional)</Label>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Your name or username"
              />
              <Button size="sm" onClick={handleSaveDisplayName}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {settings.display_name || 'Not set'}
              </span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setDisplayNameInput(settings.display_name || '');
                  setIsEditing(true);
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Share link */}
        {settings.is_public && shareUrl && (
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2 items-center">
              <Input
                readOnly
                value={shareUrl}
                className="font-mono text-sm min-w-0 flex-1"
              />
              <Button size="icon" variant="outline" onClick={handleCopy} className="flex-shrink-0">
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with friends so they can browse your shelf and interact with your books.
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  );

  // When controlled (no trigger needed), just render the dialog
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled: include the trigger button
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}

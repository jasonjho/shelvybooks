import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface InlineShelfNameEditorProps {
  displayName: string | null;
  username: string | null;
  bookCount: number;
  isOwner: boolean;
  onSave: (newName: string) => Promise<void>;
}

/**
 * Displays the shelf title with inline editing capability for owners.
 * Shows display_name if set, otherwise "[username]'s Bookshelf" or fallback.
 */
export function InlineShelfNameEditor({
  displayName,
  username,
  bookCount,
  isOwner,
  onSave,
}: InlineShelfNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the display title
  const shelfTitle = displayName 
    || (username ? `${username}'s Bookshelf` : "Someone's Bookshelf");

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    // Start with the current display name (not the computed fallback)
    setEditValue(displayName || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleSave = async () => {
    const trimmed = editValue.trim();
    
    setIsSaving(true);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="My Bookshelf"
          className="text-center text-xl font-semibold max-w-xs h-10"
          disabled={isSaving}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <h2 className="text-2xl font-semibold font-sans inline-flex items-center gap-2 group">
      <span>{shelfTitle}</span>
      <span className="text-base font-normal text-muted-foreground">
        ({bookCount})
      </span>
      {isOwner && (
        <button
          onClick={handleStartEdit}
          className={cn(
            "p-1.5 rounded-md transition-all",
            "text-muted-foreground/50 hover:text-muted-foreground",
            "hover:bg-muted/50",
            "opacity-0 group-hover:opacity-100 focus:opacity-100"
          )}
          aria-label="Edit shelf name"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </h2>
  );
}

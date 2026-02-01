import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { NoteColor, BookNote } from '@/hooks/useBookNotes';
import { Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BookNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookTitle: string;
  existingNote?: BookNote;
  onSave: (content: string, color: NoteColor) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}

const colorOptions: { value: NoteColor; label: string; bgClass: string }[] = [
  { value: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-200 hover:bg-yellow-300' },
  { value: 'pink', label: 'Pink', bgClass: 'bg-pink-200 hover:bg-pink-300' },
  { value: 'blue', label: 'Blue', bgClass: 'bg-sky-200 hover:bg-sky-300' },
  { value: 'green', label: 'Green', bgClass: 'bg-lime-200 hover:bg-lime-300' },
];

export function BookNoteDialog({
  open,
  onOpenChange,
  bookTitle,
  existingNote,
  onSave,
  onDelete,
}: BookNoteDialogProps) {
  const isMobile = useIsMobile();
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('yellow');
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setContent(existingNote?.content || '');
      setColor(existingNote?.color || 'yellow');
    }
  }, [open, existingNote]);

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(content, color);
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    const success = await onDelete();
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const charCount = content.trim().length;
  const isOverLimit = charCount > 200;

  const footerContent = (
    <div className="flex flex-row justify-between gap-2 w-full">
      {existingNote && onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={saving}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Remove
        </Button>
      )}
      <div className="flex gap-2 ml-auto">
        <Button type="button" variant="outline" size={isMobile ? "sm" : "default"} onClick={() => onOpenChange(false)} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size={isMobile ? "sm" : "default"} onClick={handleSave} disabled={saving || isOverLimit || !content.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );

  // Use a single Dialog for both mobile and desktop
  // Drawer doesn't work well with iOS keyboard
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-md",
        // On mobile: position at top to avoid keyboard issues
        isMobile && "top-[10%] translate-y-0 max-w-[calc(100%-2rem)] mx-auto"
      )}>
        <DialogHeader>
          <DialogTitle className="font-sans text-base sm:text-lg">
            {existingNote ? 'Edit Note' : 'Add Note'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Share why you love <span className="font-medium">{bookTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Color picker - always first for visibility */}
          <div className="space-y-1.5">
            <Label>Post-it color</Label>
            <div className="flex gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={cn(
                    'w-8 h-8 rounded-md border-2 transition-all',
                    opt.bgClass,
                    color === opt.value ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  aria-label={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Note content */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="note-content">Your note</Label>
              <span className={cn('text-xs', isOverLimit ? 'text-destructive' : 'text-muted-foreground')}>
                {charCount}/200
              </span>
            </div>
            <Textarea
              id="note-content"
              placeholder="A must-read! The characters are unforgettable..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={cn("resize-none", isMobile ? "min-h-[60px]" : "min-h-[100px]")}
              style={{ fontFamily: "'Caveat', cursive", fontSize: '18px' }}
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 pt-2">
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

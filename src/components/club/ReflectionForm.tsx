import { useState } from 'react';
import { Star, Eye, EyeOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ReflectionFormProps {
  onSubmit: (rating: number, content: string, isAnonymous: boolean) => Promise<boolean>;
  initialRating?: number;
  initialContent?: string;
  initialAnonymous?: boolean;
  isEditing?: boolean;
  onCancel?: () => void;
}

export function ReflectionForm({
  onSubmit,
  initialRating = 0,
  initialContent = '',
  initialAnonymous = false,
  isEditing = false,
  onCancel,
}: ReflectionFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState(initialContent);
  const [isAnonymous, setIsAnonymous] = useState(initialAnonymous);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !content.trim()) return;

    setIsSubmitting(true);
    const success = await onSubmit(rating, content, isAnonymous);
    setIsSubmitting(false);

    if (success && !isEditing) {
      setRating(0);
      setContent('');
      setIsAnonymous(false);
    }
  };

  const placeholders = [
    'This book made me think about...',
    'I loved the part where...',
    'The ending surprised me because...',
    'I\'d recommend this to anyone who...',
    'The main character reminded me of...',
  ];
  const placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Star Rating */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Your Rating</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'w-6 h-6 transition-colors',
                  star <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/30 hover:text-amber-200'
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              {rating === 1 && 'Not for me'}
              {rating === 2 && 'It was okay'}
              {rating === 3 && 'Pretty good'}
              {rating === 4 && 'Really enjoyed it'}
              {rating === 5 && 'Loved it!'}
            </span>
          )}
        </div>
      </div>

      {/* Reflection Content */}
      <div className="space-y-2">
        <Label htmlFor="reflection-content" className="text-sm font-medium">
          Share a thought (280 chars max)
        </Label>
        <Textarea
          id="reflection-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={280}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {content.length}/280
        </p>
      </div>

      {/* Anonymous Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
        <div className="flex items-center gap-2">
          {isAnonymous ? (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Eye className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="anonymous-toggle" className="text-sm font-medium cursor-pointer">
              {isAnonymous ? 'Anonymous' : 'Show my name'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isAnonymous 
                ? 'Your name will be hidden from the club'
                : 'Club members will see who wrote this'
              }
            </p>
          </div>
        </div>
        <Switch
          id="anonymous-toggle"
          checked={isAnonymous}
          onCheckedChange={setIsAnonymous}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-2">
        {isEditing && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={rating === 0 || !content.trim() || isSubmitting}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Share Reflection'}
        </Button>
      </div>
    </form>
  );
}

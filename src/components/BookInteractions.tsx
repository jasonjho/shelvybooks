import { useState } from 'react';
import { Heart, MessageCircle, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useBookInteractions } from '@/hooks/useBookInteractions';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface BookInteractionsProps {
  bookId: string;
  bookTitle: string;
}

export function BookInteractions({ bookId, bookTitle }: BookInteractionsProps) {
  const { user } = useAuth();
  const { likeCount, hasLiked, toggleLike, comments, addComment, deleteComment, loading } =
    useBookInteractions(bookId);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  };

  return (
    <div className="space-y-3">
      {/* Like button and comment toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          className={cn(
            'gap-1.5 transition-colors',
            hasLiked && 'text-red-500 hover:text-red-600'
          )}
        >
          <Heart className={cn('w-4 h-4', hasLiked && 'fill-current')} />
          <span className="text-xs">{likeCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="gap-1.5"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">{comments.length}</span>
        </Button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="space-y-3 pt-2 border-t border-border">
          {/* Existing comments */}
          {comments.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-muted/50 rounded-lg px-3 py-2 text-sm group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-foreground leading-relaxed">{comment.content}</p>
                    {user?.id === comment.userId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => deleteComment(comment.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No comments yet. Be the first!
            </p>
          )}

          {/* Add comment form */}
          {user && (
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[60px] text-sm resize-none"
                maxLength={500}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim()}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

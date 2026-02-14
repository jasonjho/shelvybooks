import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const { likes, likeCount, hasLiked, toggleLike, comments, addComment, deleteComment, loading } =
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
        <div className="flex items-center">
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

          {/* Show who liked - popover with list */}
          {likeCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                  <Users className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium">Liked by</p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {likes.map((like) => (
                    <div key={like.userId} className="px-3 py-2 hover:bg-muted/50 transition-colors">
                      {like.username ? (
                        <Link 
                          to={`/u/${like.username}`} 
                          className="flex items-center gap-2 group"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={like.avatarUrl || undefined} alt={like.username} />
                            <AvatarFallback className="text-xs">
                              {like.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm group-hover:underline">{like.username}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">?</AvatarFallback>
                          </Avatar>
                          <span className="text-sm italic">Anonymous</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

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
                    <div className="flex-1 min-w-0">
                      {/* Username */}
                      {comment.username ? (
                        <Link 
                          to={`/u/${comment.username}`}
                          className="inline-flex items-center gap-1.5 mb-1"
                        >
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={comment.avatarUrl || undefined} alt={comment.username} />
                            <AvatarFallback className="text-[10px]">
                              {comment.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium hover:underline">{comment.username}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground mb-1 block">Anonymous</span>
                      )}
                      <p className="text-foreground leading-relaxed">{comment.content}</p>
                    </div>
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

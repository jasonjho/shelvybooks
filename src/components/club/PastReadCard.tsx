import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronUp, 
  Library, 
  Star, 
  MessageSquareText,
  CheckCircle,
  BookMarked,
  Pencil,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ClubReflection } from '@/hooks/useClubReflections';
import { ReflectionCard } from './ReflectionCard';
import { ReflectionForm } from './ReflectionForm';
import { ReflectionMosaic } from './ReflectionMosaic';

interface PastReadCardProps {
  suggestion: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
  reflections: ClubReflection[];
  averageRating: number | null;
  hasUserReflected: boolean;
  userReflection?: ClubReflection;
  isOnShelf: boolean;
  onAddReflection: (rating: number, content: string, isAnonymous: boolean) => Promise<boolean>;
  onUpdateReflection: (reflectionId: string, rating: number, content: string, isAnonymous: boolean) => Promise<boolean>;
  onDeleteReflection: (reflectionId: string) => Promise<boolean>;
  onAddToShelf: () => void;
}

export function PastReadCard({
  suggestion,
  reflections,
  averageRating,
  hasUserReflected,
  userReflection,
  isOnShelf,
  onAddReflection,
  onUpdateReflection,
  onDeleteReflection,
  onAddToShelf,
}: PastReadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleAddSubmit = async (rating: number, content: string, isAnonymous: boolean) => {
    const success = await onAddReflection(rating, content, isAnonymous);
    if (success) {
      setShowAddDialog(false);
    }
    return success;
  };

  const handleEditSubmit = async (rating: number, content: string, isAnonymous: boolean) => {
    if (!userReflection) return false;
    const success = await onUpdateReflection(userReflection.id, rating, content, isAnonymous);
    if (success) {
      setShowEditDialog(false);
    }
    return success;
  };

  const handleDelete = async () => {
    if (!userReflection) return;
    await onDeleteReflection(userReflection.id);
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Book Header */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {suggestion.coverUrl ? (
          <img
            src={suggestion.coverUrl}
            alt={suggestion.title}
            className="w-12 h-16 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
            <Library className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate font-sans">{suggestion.title}</p>
          <p className="text-sm text-muted-foreground truncate font-sans">{suggestion.author}</p>
          
          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1">
            {averageRating && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{averageRating.toFixed(1)}</span>
              </div>
            )}
            {reflections.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquareText className="w-3 h-3" />
                <span>{reflections.length}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Read
          </Badge>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddToShelf();
              }}
              disabled={isOnShelf}
            >
              <BookMarked className="w-4 h-4 mr-1.5" />
              {isOnShelf ? 'On Shelf' : 'Add to Shelf'}
            </Button>
            
            {hasUserReflected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <MessageSquareText className="w-4 h-4" />
                    Your Reflection
                    <MoreVertical className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Reflection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Reflection
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete your reflection?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove your reflection from this book. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddDialog(true);
                }}
                className="gap-1.5"
              >
                <MessageSquareText className="w-4 h-4" />
                Share Your Thoughts
              </Button>
            )}
          </div>

          {/* Reflections Mosaic */}
          <ReflectionMosaic
            reflections={reflections}
            averageRating={averageRating}
            bookTitle={suggestion.title}
          />
        </div>
      )}

      {/* Add Reflection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans">Share Your Thoughts</DialogTitle>
            <DialogDescription>
              Rate "{suggestion.title}" and share a quick reflection with the club.
            </DialogDescription>
          </DialogHeader>
          <ReflectionForm onSubmit={handleAddSubmit} />
        </DialogContent>
      </Dialog>

      {/* Edit Reflection Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans">Edit Your Reflection</DialogTitle>
            <DialogDescription>
              Update your rating or thoughts on "{suggestion.title}".
            </DialogDescription>
          </DialogHeader>
          {userReflection && (
            <ReflectionForm
              onSubmit={handleEditSubmit}
              initialRating={userReflection.rating}
              initialContent={userReflection.content}
              initialAnonymous={userReflection.isAnonymous}
              isEditing
              onCancel={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

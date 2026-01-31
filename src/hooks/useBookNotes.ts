import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface BookNote {
  id: string;
  bookId: string;
  userId: string;
  content: string;
  color: NoteColor;
  createdAt: string;
  updatedAt: string;
}

async function fetchNotes(bookIds: string[]): Promise<Map<string, BookNote>> {
  if (bookIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('book_notes')
    .select('*')
    .in('book_id', bookIds);

  if (error) {
    console.error('Error fetching book notes:', error);
    return new Map();
  }

  const noteMap = new Map<string, BookNote>();
  data?.forEach((note) => {
    noteMap.set(note.book_id, {
      id: note.id,
      bookId: note.book_id,
      userId: note.user_id,
      content: note.content,
      color: note.color as NoteColor,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    });
  });
  return noteMap;
}

export function useBookNotes(bookIds: string[]) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use a stable query key based on sorted book IDs
  const queryKey = ['book-notes', ...bookIds.slice().sort()];

  const { data: notes = new Map<string, BookNote>(), isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchNotes(bookIds),
    enabled: bookIds.length > 0,
    staleTime: 30000, // 30 seconds
  });

  const saveMutation = useMutation({
    mutationFn: async ({ bookId, content, color }: { bookId: string; content: string; color: NoteColor }) => {
      if (!user) throw new Error('User not authenticated');

      const trimmed = content.trim();
      if (!trimmed) throw new Error('Note is empty');
      if (trimmed.length > 200) throw new Error('Note too long');

      const existingNote = notes.get(bookId);

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from('book_notes')
          .update({ content: trimmed, color })
          .eq('id', existingNote.id);

        if (error) throw error;
        return { action: 'updated' as const, bookId };
      } else {
        // Insert new note
        const { error } = await supabase
          .from('book_notes')
          .insert({ book_id: bookId, user_id: user.id, content: trimmed, color });

        if (error) throw error;
        return { action: 'created' as const, bookId };
      }
    },
    onSuccess: () => {
      // Invalidate ALL book-notes queries to ensure any component using notes gets fresh data
      queryClient.invalidateQueries({ queryKey: ['book-notes'] });
      toast({ title: 'Note saved!', description: 'Your recommendation note has been added.' });
    },
    onError: (error: Error) => {
      const message = error.message;
      if (message === 'Note is empty') {
        toast({ title: 'Note is empty', description: 'Please write something for your note.', variant: 'destructive' });
      } else if (message === 'Note too long') {
        toast({ title: 'Note too long', description: 'Notes must be 200 characters or less.', variant: 'destructive' });
      } else if (message === 'User not authenticated') {
        toast({ title: 'Sign in required', description: 'Please sign in to add notes.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: message, variant: 'destructive' });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (bookId: string) => {
      const existingNote = notes.get(bookId);
      if (!existingNote) throw new Error('Note not found');

      const { error } = await supabase.from('book_notes').delete().eq('id', existingNote.id);
      if (error) throw error;
      return bookId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-notes'] });
      toast({ title: 'Note removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const saveNote = useCallback(
    async (bookId: string, content: string, color: NoteColor = 'yellow') => {
      try {
        await saveMutation.mutateAsync({ bookId, content, color });
        return true;
      } catch {
        return false;
      }
    },
    [saveMutation]
  );

  const deleteNote = useCallback(
    async (bookId: string) => {
      try {
        await deleteMutation.mutateAsync(bookId);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation]
  );

  const getNote = useCallback((bookId: string) => notes.get(bookId), [notes]);

  return {
    notes,
    loading,
    saveNote,
    deleteNote,
    getNote,
  };
}

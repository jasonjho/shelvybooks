import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export function useBookNotes(bookIds: string[]) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Map<string, BookNote>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch notes for the given book IDs
  useEffect(() => {
    const fetchNotes = async () => {
      if (bookIds.length === 0) {
        setNotes(new Map());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('book_notes')
        .select('*')
        .in('book_id', bookIds);

      if (error) {
        console.error('Error fetching book notes:', error);
        setLoading(false);
        return;
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
      setNotes(noteMap);
      setLoading(false);
    };

    fetchNotes();
  }, [bookIds.join(',')]);

  const saveNote = useCallback(
    async (bookId: string, content: string, color: NoteColor = 'yellow') => {
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to add notes.',
          variant: 'destructive',
        });
        return false;
      }

      const trimmed = content.trim();
      if (!trimmed) {
        toast({
          title: 'Note is empty',
          description: 'Please write something for your note.',
          variant: 'destructive',
        });
        return false;
      }

      if (trimmed.length > 200) {
        toast({
          title: 'Note too long',
          description: 'Notes must be 200 characters or less.',
          variant: 'destructive',
        });
        return false;
      }

      const existingNote = notes.get(bookId);

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from('book_notes')
          .update({ content: trimmed, color })
          .eq('id', existingNote.id);

        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          return false;
        }

        setNotes((prev) => {
          const updated = new Map(prev);
          updated.set(bookId, {
            ...existingNote,
            content: trimmed,
            color,
            updatedAt: new Date().toISOString(),
          });
          return updated;
        });
      } else {
        // Insert new note
        const { data, error } = await supabase
          .from('book_notes')
          .insert({ book_id: bookId, user_id: user.id, content: trimmed, color })
          .select()
          .single();

        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          return false;
        }

        setNotes((prev) => {
          const updated = new Map(prev);
          updated.set(bookId, {
            id: data.id,
            bookId: data.book_id,
            userId: data.user_id,
            content: data.content,
            color: data.color as NoteColor,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
          return updated;
        });
      }

      toast({ title: 'Note saved!', description: 'Your recommendation note has been added.' });
      return true;
    },
    [user, notes, toast]
  );

  const deleteNote = useCallback(
    async (bookId: string) => {
      const existingNote = notes.get(bookId);
      if (!existingNote) return false;

      const { error } = await supabase.from('book_notes').delete().eq('id', existingNote.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return false;
      }

      setNotes((prev) => {
        const updated = new Map(prev);
        updated.delete(bookId);
        return updated;
      });

      toast({ title: 'Note removed' });
      return true;
    },
    [notes, toast]
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

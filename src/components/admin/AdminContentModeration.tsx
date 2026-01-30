import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function AdminContentModeration() {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          book_id
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(data?.map((c) => c.user_id) ?? [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      // Get book titles
      const bookIds = [...new Set(data?.map((c) => c.book_id) ?? [])];
      const { data: books } = await supabase
        .from("books")
        .select("id, title")
        .in("id", bookIds);

      const bookMap = new Map(books?.map((b) => [b.id, b.title]));

      return data?.map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id),
        bookTitle: bookMap.get(c.book_id) ?? "Unknown Book",
      }));
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("book_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      toast.success("Comment deleted");
    },
    onError: () => {
      toast.error("Failed to delete comment");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Content Moderation
        </CardTitle>
        <CardDescription>
          Review and moderate user comments ({comments?.length ?? 0} recent)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comments?.map((comment) => (
            <div
              key={comment.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profile?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {comment.profile?.username ?? "Unknown User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      on "{comment.bookTitle}" • {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteComment.mutate(comment.id)}
                  disabled={deleteComment.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm bg-muted/50 rounded p-3">{comment.content}</p>
            </div>
          ))}

          {comments?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No comments to moderate
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

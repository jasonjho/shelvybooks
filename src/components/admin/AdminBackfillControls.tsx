import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Play, RefreshCw, CheckCircle, AlertCircle, User } from "lucide-react";
import { toast } from "sonner";

interface UserWithBooks {
  user_id: string;
  email: string;
  book_count: number;
  pending_count: number;
}

export function AdminBackfillControls() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch users with book counts
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users-with-books"],
    queryFn: async () => {
      // Get all users from admin function first
      const { data: userData, error: userError } = await supabase.functions.invoke("admin-users");
      
      if (userError) throw userError;
      
      const allUsers: { id: string; email: string }[] = userData?.users || [];
      const emailMap = new Map(allUsers.map(u => [u.id, u.email || u.id.slice(0, 8) + "..."]));
      
      // Get all books with a single query (admin RLS allows viewing all)
      // Fetch in batches of 1000 to handle large datasets
      const allBooks: { user_id: string; metadata_attempted_at: string | null; page_count: number | null; description: string | null; categories: string[] | null }[] = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data: books, error } = await supabase
          .from("books")
          .select("user_id, metadata_attempted_at, page_count, description, categories")
          .range(offset, offset + batchSize - 1);
        
        if (error) throw error;
        if (!books || books.length === 0) break;
        
        allBooks.push(...books);
        if (books.length < batchSize) break;
        offset += batchSize;
      }

      // Group by user and calculate stats
      const userMap = new Map<string, { total: number; pending: number }>();
      
      for (const book of allBooks) {
        const userId = book.user_id;
        if (!userMap.has(userId)) {
          userMap.set(userId, { total: 0, pending: 0 });
        }
        const stats = userMap.get(userId)!;
        stats.total++;
        if (!book.metadata_attempted_at && (!book.page_count || !book.description || !book.categories)) {
          stats.pending++;
        }
      }

      // Build result - only include users who have books
      const result: UserWithBooks[] = [];
      for (const [userId, stats] of userMap.entries()) {
        result.push({
          user_id: userId,
          email: emailMap.get(userId) || userId.slice(0, 8) + "...",
          book_count: stats.total,
          pending_count: stats.pending,
        });
      }

      // Sort by pending count descending
      result.sort((a, b) => b.pending_count - a.pending_count);
      return result;
    },
  });

  // Get selected user stats
  const selectedUser = users?.find(u => u.user_id === selectedUserId);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-backfill-stats"],
    queryFn: async () => {
      const [totalResult, withMetadataResult, attemptedResult, pendingResult] = await Promise.all([
        supabase.from("books").select("id", { count: "exact", head: true }),
        supabase
          .from("books")
          .select("id", { count: "exact", head: true })
          .or("description.not.is.null,categories.not.is.null,page_count.not.is.null"),
        supabase
          .from("books")
          .select("id", { count: "exact", head: true })
          .not("metadata_attempted_at", "is", null),
        supabase
          .from("books")
          .select("id", { count: "exact", head: true })
          .is("metadata_attempted_at", null)
          .or("description.is.null,page_count.is.null,categories.is.null"),
      ]);

      if (totalResult.error) throw totalResult.error;
      if (withMetadataResult.error) throw withMetadataResult.error;
      if (attemptedResult.error) throw attemptedResult.error;
      if (pendingResult.error) throw pendingResult.error;

      const total = totalResult.count ?? 0;
      const withMetadata = withMetadataResult.count ?? 0;
      const attempted = attemptedResult.count ?? 0;
      const pending = pendingResult.count ?? 0;

      return {
        total,
        withMetadata,
        attempted,
        pending,
        isComplete: pending === 0,
        percentage: total > 0 ? Math.round((withMetadata / total) * 100) : 0,
      };
    },
    refetchInterval: isRunning ? 5000 : false,
  });

  const triggerBackfill = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) {
        throw new Error("Please select a user first");
      }
      
      setIsRunning(true);
      
      const response = await supabase.functions.invoke("backfill-metadata", {
        body: { targetUserId: selectedUserId, batchSize: 20 },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Backfill complete: ${data?.updated ?? 0} books updated, ${data?.pending ?? 0} remaining`);
      // Keep both overall stats and per-user pending counts in sync.
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-books"] });
      queryClient.invalidateQueries({ queryKey: ["admin-backfill-stats"] });
      refetch();
      refetchUsers();
    },
    onError: (error) => {
      toast.error(`Backfill failed: ${error.message}`);
    },
    onSettled: () => {
      setIsRunning(false);
    },
  });

  if (isLoading || usersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Backfill Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Metadata Backfill Status
          </CardTitle>
          <CardDescription>
            Enrich books with descriptions, categories, and page counts from Google Books API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{stats?.percentage}%</span>
            </div>
            <Progress value={stats?.percentage} className="h-3" />
          </div>

          {stats?.isComplete && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700">Backfill Complete</p>
                <p className="text-sm text-muted-foreground">
                  All books have been checked. {stats.withMetadata} have metadata.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats?.total.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Books</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold text-green-600">
                  {stats?.withMetadata.toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">With Metadata</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-blue-600">
                {stats?.attempted.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Attempted</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10">
              <div className="flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-2xl font-bold text-amber-600">
                  {stats?.pending.toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Backfill by User
          </CardTitle>
          <CardDescription>
            Select a specific user to backfill their books
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={selectedUserId || ""} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span className="truncate">{user.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.pending_count > 0 ? (
                          <span className="text-amber-600">{user.pending_count} pending</span>
                        ) : (
                          <span className="text-green-600">✓ complete</span>
                        )}
                        {" / "}{user.book_count} books
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => triggerBackfill.mutate()}
              disabled={triggerBackfill.isPending || isRunning || !selectedUserId || selectedUser?.pending_count === 0}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Backfill User
                </>
              )}
            </Button>
          </div>

          {selectedUser && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="font-medium">{selectedUser.email}</p>
              <div className="flex gap-4 text-sm">
                <span>{selectedUser.book_count} total books</span>
                {selectedUser.pending_count > 0 ? (
                  <span className="text-amber-600">{selectedUser.pending_count} pending</span>
                ) : (
                  <span className="text-green-600">All books processed</span>
                )}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={async () => {
              await Promise.all([refetch(), refetchUsers()]);
            }}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Stats
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Select a user from the dropdown to backfill their books.
          </p>
          <p>
            • Books are processed in batches of 20 to respect API rate limits.
          </p>
          <p>
            • Each book is marked as "attempted" so it won't be retried.
          </p>
          <p>
            • Users with pending books are shown first in the dropdown.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

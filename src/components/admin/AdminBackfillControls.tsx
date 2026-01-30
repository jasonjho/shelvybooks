import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, Play, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function AdminBackfillControls() {
  const [isRunning, setIsRunning] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-backfill-stats"],
    queryFn: async () => {
      // IMPORTANT: never fetch all rows here (default API cap is 1000).
      // Use count queries so totals are accurate even with large datasets.
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
    refetchInterval: isRunning ? 5000 : false, // Poll when running
  });

  const triggerBackfill = useMutation({
    mutationFn: async () => {
      setIsRunning(true);
      
      const response = await supabase.functions.invoke("backfill-all-metadata", {
        body: { batchSize: 25 },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Backfill started: Processing ${data?.found ?? 0} books`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Backfill failed: ${error.message}`);
      setIsRunning(false);
    },
    onSettled: () => {
      setTimeout(() => setIsRunning(false), 30000); // Auto-stop polling after 30s
    },
  });

  if (isLoading) {
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
              <span>Progress</span>
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
                  All books have been checked. {stats.withMetadata} have metadata, {stats.attempted - stats.withMetadata} had no API data available.
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

          <div className="flex gap-3">
            <Button
              onClick={() => triggerBackfill.mutate()}
              disabled={triggerBackfill.isPending || isRunning || stats?.isComplete}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : stats?.isComplete ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Backfill
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • The backfill fetches metadata from Google Books API for books missing descriptions, categories, or page counts.
          </p>
          <p>
            • Books are processed in batches of 20 to respect API rate limits.
          </p>
          <p>
            • Each book is marked as "attempted" so it won't be retried. The process completes when all books have been checked.
          </p>
          <p>
            • Books without API data can still be enriched manually via the book detail dialog.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

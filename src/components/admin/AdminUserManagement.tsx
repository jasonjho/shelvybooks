import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User } from "lucide-react";
import { format } from "date-fns";

export function AdminUserManagement() {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, username, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get book counts for each user
      const userIds = profiles?.map((p) => p.user_id) ?? [];
      const { data: bookCounts } = await supabase
        .from("books")
        .select("user_id")
        .in("user_id", userIds);

      const countMap = new Map<string, number>();
      bookCounts?.forEach((b) => {
        countMap.set(b.user_id, (countMap.get(b.user_id) ?? 0) + 1);
      });

      // Get shelf visibility
      const { data: shelfSettings } = await supabase
        .from("shelf_settings")
        .select("user_id, is_public")
        .in("user_id", userIds);

      const publicMap = new Map<string, boolean>();
      shelfSettings?.forEach((s) => {
        publicMap.set(s.user_id, s.is_public);
      });

      return profiles?.map((p) => ({
        ...p,
        bookCount: countMap.get(p.user_id) ?? 0,
        isPublic: publicMap.get(p.user_id) ?? false,
      }));
    },
  });

  const filteredUsers = users?.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          View and manage all registered users ({users?.length ?? 0} total)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="border rounded-lg divide-y">
          {filteredUsers?.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-muted-foreground">
                    Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{user.bookCount} books</Badge>
                {user.isPublic && (
                  <Badge variant="outline" className="text-green-600">
                    Public
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {filteredUsers?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

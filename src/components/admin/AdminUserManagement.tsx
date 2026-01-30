import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";

type UserWithProfile = {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  bookCount: number;
  isPublic: boolean;
  hasProfile: true;
};

type UserWithoutProfile = {
  user_id: string;
  bookCount: number;
  isPublic: boolean;
  firstBookDate: string;
  hasProfile: false;
};

type CombinedUser = UserWithProfile | UserWithoutProfile;

export function AdminUserManagement() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-all"],
    queryFn: async () => {
      // Get all users with profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, username, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all unique user_ids from books - paginate to get all
      const allBooks: { user_id: string; created_at: string }[] = [];
      let offset = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: booksPage, error: booksError } = await supabase
          .from("books")
          .select("user_id, created_at")
          .order("created_at", { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (booksError) throw booksError;
        if (!booksPage || booksPage.length === 0) break;
        
        allBooks.push(...booksPage);
        if (booksPage.length < pageSize) break;
        offset += pageSize;
      }

      // Get all shelf settings
      const { data: allShelfSettings } = await supabase
        .from("shelf_settings")
        .select("user_id, is_public");

      const publicMap = new Map<string, boolean>();
      allShelfSettings?.forEach((s) => {
        publicMap.set(s.user_id, s.is_public);
      });

      // Build book counts and first book dates for all users
      const bookCountMap = new Map<string, number>();
      const firstBookMap = new Map<string, string>();
      allBooks.forEach((b) => {
        bookCountMap.set(b.user_id, (bookCountMap.get(b.user_id) ?? 0) + 1);
        if (!firstBookMap.has(b.user_id)) {
          firstBookMap.set(b.user_id, b.created_at);
        }
      });

      // Users with profiles
      const profileUserIds = new Set(profiles?.map((p) => p.user_id) ?? []);
      const usersWithProfiles: UserWithProfile[] = (profiles ?? []).map((p) => ({
        ...p,
        bookCount: bookCountMap.get(p.user_id) ?? 0,
        isPublic: publicMap.get(p.user_id) ?? false,
        hasProfile: true as const,
      }));

      // Users without profiles (have books but no profile)
      const allUserIds = new Set(allBooks.map((b) => b.user_id));
      const usersWithoutProfiles: UserWithoutProfile[] = [];
      allUserIds.forEach((userId) => {
        if (!profileUserIds.has(userId)) {
          usersWithoutProfiles.push({
            user_id: userId,
            bookCount: bookCountMap.get(userId) ?? 0,
            isPublic: publicMap.get(userId) ?? false,
            firstBookDate: firstBookMap.get(userId) ?? new Date().toISOString(),
            hasProfile: false as const,
          });
        }
      });

      // Sort users without profiles by first book date (newest first)
      usersWithoutProfiles.sort((a, b) => 
        new Date(b.firstBookDate).getTime() - new Date(a.firstBookDate).getTime()
      );

      return {
        withProfiles: usersWithProfiles,
        withoutProfiles: usersWithoutProfiles,
        totalUsers: usersWithProfiles.length + usersWithoutProfiles.length,
        totalBooks: allBooks.length,
      };
    },
  });

  const filteredWithProfiles = data?.withProfiles.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWithoutProfiles = data?.withoutProfiles.filter((u) =>
    u.user_id.toLowerCase().includes(search.toLowerCase())
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
          View all users: {data?.withProfiles.length ?? 0} with profiles, {data?.withoutProfiles.length ?? 0} legacy users ({data?.totalUsers ?? 0} total)
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

        <Tabs defaultValue="with-profiles">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="with-profiles" className="gap-2">
              <UserCheck className="h-4 w-4" />
              With Profile ({data?.withProfiles.length})
            </TabsTrigger>
            <TabsTrigger value="without-profiles" className="gap-2">
              <UserX className="h-4 w-4" />
              Legacy Users ({data?.withoutProfiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="with-profiles" className="mt-4">
            <div className="border rounded-lg divide-y">
              {filteredWithProfiles?.map((user) => (
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

              {filteredWithProfiles?.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="without-profiles" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              These users signed up before profiles were introduced. They'll be prompted to create a profile on their next login.
            </p>
            <div className="border rounded-lg divide-y">
              {filteredWithoutProfiles?.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-amber-100 text-amber-700">
                        <UserX className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium font-mono text-sm">
                        {user.user_id.slice(0, 8)}...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        First book {format(new Date(user.firstBookDate), "MMM d, yyyy")}
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
                    <Badge variant="outline" className="text-amber-600">
                      No Profile
                    </Badge>
                  </div>
                </div>
              ))}

              {filteredWithoutProfiles?.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No legacy users found
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FriendList from "../components/FriendList";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import PageTransition from "@/components/PageTransition";

const Friends = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  if (!userId) return <div>Loading...</div>;

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <PageHeader title="Friends" />
        
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">My Friends</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="blocked">Blocked</TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends" className="mt-6">
            <FriendList userId={userId} type="friends" />
          </TabsContent>
          
          <TabsContent value="requests" className="mt-6">
            <FriendList userId={userId} type="requests" />
          </TabsContent>
          
          <TabsContent value="blocked" className="mt-6">
            <FriendList userId={userId} type="blocked" />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Friends;

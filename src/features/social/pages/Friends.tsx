import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FriendList from "../components/FriendList";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import PageTransition from "@/components/PageTransition";
import { useTranslation } from "react-i18next";

const Friends = () => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  if (!userId) return <div>{t('social.loading')}</div>;

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PageHeader title={t('social.friends')} />
        
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">{t('social.myFriends')}</TabsTrigger>
            <TabsTrigger value="requests">{t('social.requests')}</TabsTrigger>
            <TabsTrigger value="blocked">{t('social.blocked')}</TabsTrigger>
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

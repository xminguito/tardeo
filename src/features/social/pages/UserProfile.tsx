import { useParams } from "react-router-dom";
import { useSocialProfile } from "../hooks/useSocialData";
import UserProfileCard from "../components/UserProfileCard";
import { useAdminCheck } from "@/hooks/useAdminCheck"; // Or use auth hook
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PageTransition from "@/components/PageTransition";

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id);
    });
  }, []);

  const { data: profile, isLoading, error } = useSocialProfile(id || "");

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (error || !profile) {
    return <div className="flex justify-center p-8">User not found</div>;
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <PageHeader title={profile.full_name || "Profile"} />
        <UserProfileCard profile={profile} currentUserId={currentUserId} />
      </div>
    </PageTransition>
  );
};

export default UserProfile;

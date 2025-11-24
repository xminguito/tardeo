import { SocialProfile } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import FollowButton from "./FollowButton";
import FriendRequestButton from "./FriendRequestButton";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserProfileCardProps {
  profile: SocialProfile & { isFollowing: boolean; friendStatus: 'pending' | 'accepted' | 'blocked' | null };
  currentUserId?: string;
}

const UserProfileCard = ({ profile, currentUserId }: UserProfileCardProps) => {
  const navigate = useNavigate();
  const isOwnProfile = currentUserId === profile.id;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-col sm:flex-row items-center gap-6">
        <Avatar className="w-24 h-24">
          <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name || "User"} />
          <AvatarFallback>{profile.full_name?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <h2 className="text-2xl font-bold">{profile.full_name}</h2>
          <p className="text-muted-foreground">@{profile.username || "user"}</p>
          {profile.bio && <p className="text-sm">{profile.bio}</p>}
          
          <div className="flex justify-center sm:justify-start gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold">{profile.followers_count}</div>
              <div className="text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{profile.following_count}</div>
              <div className="text-muted-foreground">Following</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{profile.friends_count}</div>
              <div className="text-muted-foreground">Friends</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center sm:justify-end gap-3">
        {!isOwnProfile && (
          <>
            <FollowButton userId={profile.id} isFollowing={profile.isFollowing} />
            <FriendRequestButton userId={profile.id} status={profile.friendStatus} />
            <Button onClick={() => navigate(`/chat?userId=${profile.id}`)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Message
            </Button>
          </>
        )}
        {isOwnProfile && (
            <Button variant="outline" onClick={() => navigate('/perfil')}>
                Edit Profile
            </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;

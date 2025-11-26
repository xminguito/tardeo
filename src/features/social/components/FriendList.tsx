import { useFriends } from "../hooks/useSocialData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import FriendRequestButton from "./FriendRequestButton";
import { useTranslation } from "react-i18next";

interface FriendListProps {
  userId: string;
  type: 'friends' | 'requests' | 'blocked';
}

const FriendList = ({ userId, type }: FriendListProps) => {
  const { t } = useTranslation();
  const statusMap = {
    friends: 'accepted',
    requests: 'pending',
    blocked: 'blocked'
  } as const;

  const emptyMessages = {
    friends: t('social.noFriendsFound'),
    requests: t('social.noRequestsFound'),
    blocked: t('social.noBlockedFound')
  };

  const { data: friends, isLoading } = useFriends(userId, statusMap[type]);
  const navigate = useNavigate();

  if (isLoading) return <div>{t('social.loading')}</div>;

  if (!friends?.length) {
    return <div className="text-muted-foreground p-4">{emptyMessages[type]}</div>;
  }

  return (
    <div className="space-y-4">
      {friends.map((item: any) => (
        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(`/user/${item.profile.id}`)}
          >
            <Avatar>
              <AvatarImage src={item.profile.avatar_url} />
              <AvatarFallback>{item.profile.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{item.profile.full_name}</div>
              <div className="text-sm text-muted-foreground">@{item.profile.username}</div>
            </div>
          </div>
          
          <div>
            {type === 'requests' && (
              <FriendRequestButton 
                userId={item.profile.id} 
                status="pending" 
                isIncomingRequest={true} 
              />
            )}
            {type === 'friends' && (
               <Button variant="outline" size="sm" onClick={() => navigate(`/chat?userId=${item.profile.id}`)}>
                 {t('social.message')}
               </Button>
            )}
            {type === 'blocked' && (
                <FriendRequestButton userId={item.profile.id} status="blocked" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendList;

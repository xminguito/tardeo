import { Button } from "@/components/ui/button";
import { useFriendRequest } from "../hooks/useSocialActions";
import { UserPlus, UserCheck, UserX, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

interface FriendRequestButtonProps {
  userId: string;
  status: 'pending' | 'accepted' | 'blocked' | null;
  isIncomingRequest?: boolean;
}

const FriendRequestButton = ({ userId, status, isIncomingRequest }: FriendRequestButtonProps) => {
  const { t } = useTranslation();
  const { mutate: updateFriend, isPending } = useFriendRequest();

  if (status === 'blocked') {
    return (
      <Button variant="destructive" size="sm" disabled>
        {t('social.blocked')}
      </Button>
    );
  }

  if (status === 'accepted') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <UserCheck className="mr-2 h-4 w-4" />
            {t('social.friends')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem 
            className="text-destructive"
            onClick={() => updateFriend({ target_user_id: userId, action: 'reject' })}
          >
            {t('social.removeFriend')}
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-destructive"
            onClick={() => updateFriend({ target_user_id: userId, action: 'block' })}
          >
            {t('social.block')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (status === 'pending') {
    if (isIncomingRequest) {
      return (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => updateFriend({ target_user_id: userId, action: 'accept' })}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('social.accept')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => updateFriend({ target_user_id: userId, action: 'reject' })}
            disabled={isPending}
          >
            {t('social.reject')}
          </Button>
        </div>
      );
    } else {
      return (
        <Button variant="secondary" size="sm" disabled>
          {t('social.pending')}
        </Button>
      );
    }
  }

  return (
    <Button 
      size="sm"
      onClick={() => updateFriend({ target_user_id: userId, action: 'request' })}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('social.addFriend')}
        </>
      )}
    </Button>
  );
};

export default FriendRequestButton;

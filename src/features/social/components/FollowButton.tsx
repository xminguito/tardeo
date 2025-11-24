import { Button } from "@/components/ui/button";
import { useFollow } from "../hooks/useSocialActions";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  className?: string;
}

const FollowButton = ({ userId, isFollowing, className }: FollowButtonProps) => {
  const { mutate: follow, isPending } = useFollow();

  const handleFollow = () => {
    follow({ target_user_id: userId, action: isFollowing ? 'unfollow' : 'follow' });
  };

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleFollow}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="mr-2 h-4 w-4" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
};

export default FollowButton;

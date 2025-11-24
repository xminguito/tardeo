import { useConversations } from "../hooks/useSocialData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ConversationList = ({ selectedId, onSelect }: ConversationListProps) => {
  const { data: conversations, isLoading } = useConversations();

  if (isLoading) return <div className="p-4">Loading...</div>;

  if (!conversations?.length) {
    return <div className="p-4 text-muted-foreground">No conversations yet.</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
            selectedId === conv.id && "bg-muted"
          )}
          onClick={() => onSelect(conv.id)}
        >
          <Avatar>
            <AvatarImage src={conv.other_user.avatar_url || ""} />
            <AvatarFallback>{conv.other_user.full_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className="font-medium truncate">{conv.other_user.full_name}</span>
              {conv.last_message_at && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                {conv.last_message || "No messages"}
              </p>
              {conv.unread_count > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {conv.unread_count}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationList;

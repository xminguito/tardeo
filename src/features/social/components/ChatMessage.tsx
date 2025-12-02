import { Message } from "../types";
import ChatBubble from "@/components/chat/ChatBubble";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
}

const ChatMessage = ({ message, isOwnMessage }: ChatMessageProps) => {
  return (
    <ChatBubble
      message={{
        id: message.id,
        content: message.content,
        content_type: message.content_type,
        attachment_url: message.attachment_url,
        audio_url: message.audio_url,
        created_at: message.created_at,
        ai_generated: message.ai_generated,
      }}
      isOwnMessage={isOwnMessage}
      showAvatar={false}
      showUsername={false}
      AudioPlayer={VoiceMessagePlayer}
    />
  );
};

export default ChatMessage;

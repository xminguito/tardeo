import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

// Emojis organizados por categoría
const EMOJI_CATEGORIES = {
  frecuentes: ['😊', '😂', '❤️', '👍', '🔥', '✨', '🎉', '💪', '🙌', '👏', '💯', '🤝'],
  caras: [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇',
    '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪',
    '😝', '🤑', '🤗', '🤭', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑',
    '😶', '🫥', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '🫨', '😌', '😔', '😪',
    '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
    '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️',
    '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢',
    '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
  ],
  gestos: [
    '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '🫷', '🫸', '👌',
    '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
    '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶',
    '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
  ],
  amor: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '😍', '🥰',
    '😘', '💋', '💏', '💑', '🫂', '👩‍❤️‍👨', '👩‍❤️‍👩', '👨‍❤️‍👨',
  ],
  naturaleza: [
    '🌸', '💐', '🌷', '🌹', '🥀', '🌺', '🌻', '🌼', '🌱', '🌲', '🌳', '🌴',
    '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍇', '🍈', '🍉', '🍊',
    '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
    '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
    '🌞', '🌝', '🌙', '⭐', '🌟', '✨', '⚡', '🔥', '🌈', '☀️', '🌤️', '⛅',
  ],
  comida: [
    '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳',
    '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍝', '🍜', '🍛',
    '🍣', '🍤', '🍚', '🍙', '🍘', '🍱', '🥟', '🦪', '🍥', '🥮', '🍡', '🧁',
    '🎂', '🍰', '🍨', '🍧', '🍦', '🍩', '🍪', '🍫', '🍬', '🍭', '🧃', '🍼',
    '🫖', '☕', '🍵', '🧉', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹',
  ],
  actividades: [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
    '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
    '🎿', '🛷', '🥌', '🎯', '🪬', '🎮', '🕹️', '🎲', '🧩', '♟️', '🎭', '🎨',
    '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎪',
    '🎰', '🎳', '🎯', '🎲', '🧸', '🪆', '🎁', '🎀', '🎗️', '🏆', '🥇', '🥈',
  ],
  objetos: [
    '📱', '💻', '⌨️', '🖥️', '🖱️', '🖨️', '📷', '📸', '📹', '🎥', '📽️', '🎞️',
    '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️',
    '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯',
    '💰', '💵', '💴', '💶', '💷', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️',
    '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪',
  ],
  simbolos: [
    '💯', '🔥', '✨', '💫', '⭐', '🌟', '💥', '💢', '💬', '👁️‍🗨️', '🗨️', '🗯️',
    '💭', '💤', '✅', '❌', '❓', '❗', '‼️', '⁉️', '💠', '♻️', '✔️', '➕',
    '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿',
    '🔚', '🔙', '🔛', '🔝', '🔜', '✳️', '❇️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️',
    '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '⬆️', '⬇️', '⬅️',
  ],
  banderas: [
    '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇪🇸', '🇲🇽', '🇦🇷',
    '🇨🇴', '🇵🇪', '🇨🇱', '🇻🇪', '🇪🇨', '🇬🇹', '🇨🇺', '🇧🇴', '🇭🇳', '🇵🇾',
    '🇺🇾', '🇵🇦', '🇨🇷', '🇳🇮', '🇸🇻', '🇩🇴', '🇵🇷', '🇺🇸', '🇬🇧', '🇫🇷',
    '🇩🇪', '🇮🇹', '🇵🇹', '🇧🇷', '🇯🇵', '🇨🇳', '🇰🇷', '🇮🇳', '🇦🇺', '🇨🇦',
  ],
};

const CATEGORY_ICONS: Record<string, string> = {
  frecuentes: '🕐',
  caras: '😀',
  gestos: '👋',
  amor: '❤️',
  naturaleza: '🌿',
  comida: '🍕',
  actividades: '⚽',
  objetos: '💡',
  simbolos: '💯',
  banderas: '🏳️',
};

export default function EmojiPickerButton({ onEmojiSelect, disabled }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={disabled}
          title="Emojis"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        <Tabs defaultValue="frecuentes" className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="w-full h-10 flex justify-start gap-0 rounded-none border-b bg-transparent p-0">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="flex-1 min-w-0 h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  title={category.charAt(0).toUpperCase() + category.slice(1)}
                >
                  <span className="text-base">{CATEGORY_ICONS[category]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <ScrollArea className="h-52">
                <div className="grid grid-cols-8 gap-1 p-2">
                  {emojis.map((emoji, index) => (
                    <button
                      key={`${category}-${index}`}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="h-8 w-8 flex items-center justify-center text-xl hover:bg-muted rounded-md transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

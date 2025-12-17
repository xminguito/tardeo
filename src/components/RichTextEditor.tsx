import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2,
  Heading3,
  List, 
  ListOrdered,
  Image as ImageIcon,
  Undo,
  Redo,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Youtube as YoutubeIcon,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const MenuButton = ({ 
  onClick, 
  isActive = false, 
  disabled = false,
  children,
  title
}: { 
  onClick: () => void; 
  isActive?: boolean; 
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "h-8 w-8 p-0",
      isActive && "bg-muted text-primary"
    )}
  >
    {children}
  </Button>
);

const Divider = () => (
  <div className="w-px h-6 bg-border mx-1 self-center" />
);

const MenuBar = ({ editor, onToggleHtml }: { editor: Editor | null; onToggleHtml: () => void }) => {
  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addYoutubeVideo = useCallback(() => {
    const url = window.prompt('Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...):');
    if (url && editor) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
      {/* Text Formatting */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </MenuButton>

      <Divider />

      {/* Headings */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </MenuButton>

      <Divider />

      {/* Text Alignment */}
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </MenuButton>

      <Divider />

      {/* Lists */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </MenuButton>

      <Divider />

      {/* Media */}
      <MenuButton
        onClick={addImage}
        title="Insert Image"
      >
        <ImageIcon className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={addYoutubeVideo}
        title="Insert YouTube Video"
      >
        <YoutubeIcon className="h-4 w-4" />
      </MenuButton>

      <Divider />

      {/* HTML Mode */}
      <MenuButton
        onClick={onToggleHtml}
        title="View/Edit HTML"
      >
        <Code className="h-4 w-4" />
      </MenuButton>

      <Divider />

      {/* Undo/Redo */}
      <MenuButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </MenuButton>
    </div>
  );
};

export default function RichTextEditor({ 
  content, 
  onChange,
  placeholder = 'Start writing...'
}: RichTextEditorProps) {
  const [showHtml, setShowHtml] = useState(false);
  const [htmlContent, setHtmlContent] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: 'w-full aspect-video rounded-lg',
        },
        width: 640,
        height: 360,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setHtmlContent(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  const handleHtmlChange = (newHtml: string) => {
    setHtmlContent(newHtml);
  };

  const applyHtmlChanges = () => {
    if (editor) {
      editor.commands.setContent(htmlContent);
      onChange(htmlContent);
    }
    setShowHtml(false);
  };

  const toggleHtmlMode = () => {
    if (showHtml) {
      applyHtmlChanges();
    } else {
      if (editor) {
        setHtmlContent(editor.getHTML());
      }
      setShowHtml(true);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      <MenuBar editor={editor} onToggleHtml={toggleHtmlMode} />
      
      {showHtml ? (
        <div className="relative">
          <textarea
            value={htmlContent}
            onChange={(e) => handleHtmlChange(e.target.value)}
            className="w-full min-h-[300px] p-4 font-mono text-sm bg-muted/20 focus:outline-none resize-y"
            placeholder="Edit HTML directly..."
          />
          <div className="flex justify-end gap-2 p-2 border-t border-border bg-muted/30">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editor) {
                  setHtmlContent(editor.getHTML());
                }
                setShowHtml(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={applyHtmlChanges}
            >
              Apply Changes
            </Button>
          </div>
        </div>
      ) : (
        <EditorContent 
          editor={editor} 
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

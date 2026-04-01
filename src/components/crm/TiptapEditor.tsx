import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, List, ListOrdered } from "lucide-react";
import { useEffect } from "react";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TiptapEditor = ({ content, onChange, placeholder }: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-[180px] p-3 text-sm focus:outline-none prose prose-sm max-w-none text-foreground",
      },
    },
  });

  // Sync external content changes (e.g. template selection)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("URL:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const btnClass = (active: boolean) =>
    `h-7 w-7 p-0 ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="border border-border rounded-lg bg-secondary overflow-hidden">
      <div className="flex items-center gap-0.5 p-1.5 border-b border-border bg-muted/50">
        <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={14} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive("link"))} onClick={addLink}>
          <LinkIcon size={14} />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;

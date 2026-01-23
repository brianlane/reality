"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function RichTextEditor({
  value,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor: editorInstance }) => {
      onChange(editorInstance.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  // Cleanup: Destroy editor on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-md border border-slate-300 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullet
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[160px] px-3 py-2 text-sm text-navy"
      />
    </div>
  );
}

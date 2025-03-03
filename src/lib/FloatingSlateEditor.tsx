"use client";

import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useEditor, EditorContent, Editor, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Highlighter,
  Quote,
  Undo,
  Redo,
  Save,
} from "lucide-react";

// Define the toolbar button props
interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}

// Define toolbar button component
const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  onClick,
  isActive,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 rounded hover:bg-gray-100 ${
      isActive ? "bg-gray-200 text-indigo-600" : "text-gray-700"
    }`}
  >
    {icon}
  </button>
);

// Define the props for the journal editor
export interface JournalEditorProps {
  initialContent?: JSONContent;
  placeholder?: string;
  className?: string;
  onChange?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => void;
  readOnly?: boolean;
}

// Define the methods accessible via ref
export interface JournalEditorRef {
  getContent: () => JSONContent;
  getEditor: () => Editor | null;
  clearContent: () => void;
  setContent: (content: JSONContent) => void;
  focus: () => void;
}

// The main journal editor component
const JournalEditor = forwardRef<JournalEditorRef, JournalEditorProps>(
  (
    {
      initialContent,
      placeholder = "Write your journal entry...",
      className = "",
      onChange,
      onSave,
      readOnly = false,
    },
    ref
  ) => {
    const [isMounted, setIsMounted] = useState<boolean>(false);

    // Initialize the editor
    const editor = useEditor({
      extensions: [
        StarterKit,
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        Placeholder.configure({
          placeholder,
        }),
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
      ],
      content: initialContent || {
        type: "doc",
        content: [
          {
            type: "paragraph",
          },
        ],
      },
      editable: !readOnly,
      onUpdate: ({ editor }) => {
        if (onChange) {
          onChange(editor.getJSON());
        }
      },
    });

    // Handle client-side rendering
    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getContent: () => {
        if (!editor) return { type: "doc", content: [] };
        return editor.getJSON();
      },
      getEditor: () => editor,
      clearContent: () => {
        editor?.commands.clearContent();
      },
      setContent: (content: JSONContent) => {
        editor?.commands.setContent(content);
      },
      focus: () => {
        editor?.commands.focus();
      },
    }));

    // Function to handle image upload
    const addImage = (): void => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (event: Event) => {
        if (!editor) return;

        const target = event.target as HTMLInputElement;
        if (!target.files?.length) return;

        const file = target.files[0];
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
          const result = e.target?.result as string;
          if (result) {
            editor.chain().focus().setImage({ src: result }).run();
          }
        };

        reader.readAsDataURL(file);
      };

      input.click();
    };

    // Function to save content
    const handleSave = (): void => {
      if (onSave && editor) {
        onSave(editor.getJSON());
      }
    };

    // Don't render until client-side
    if (!isMounted || !editor) {
      return <div className="h-60 bg-gray-50 rounded-md animate-pulse" />;
    }

    return (
      <div
        className={`journal-tiptap-editor border rounded-lg overflow-hidden ${className}`}
      >
        {/* Editor Toolbar */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
            <ToolbarButton
              icon={<Bold size={18} />}
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
            />
            <ToolbarButton
              icon={<Italic size={18} />}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
            />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton
              icon={<Heading1 size={18} />}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
            />
            <ToolbarButton
              icon={<Heading2 size={18} />}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
            />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton
              icon={<List size={18} />}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
            />
            <ToolbarButton
              icon={<ListOrdered size={18} />}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
            />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton
              icon={<Quote size={18} />}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
            />
            <ToolbarButton
              icon={<Highlighter size={18} />}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive("highlight")}
            />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton icon={<ImageIcon size={18} />} onClick={addImage} />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton
              icon={<Undo size={18} />}
              onClick={() => editor.chain().focus().undo().run()}
            />
            <ToolbarButton
              icon={<Redo size={18} />}
              onClick={() => editor.chain().focus().redo().run()}
            />

            {/* Save button on the right side */}
            {onSave && (
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm"
                >
                  <Save size={16} />
                  <span>Save</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tiptap Editor Content */}
        <div className="p-4 min-h-[300px] max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }
);

// Add display name for debugging
JournalEditor.displayName = "JournalEditor";

export default JournalEditor;

"use client";

import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
} from "react";
import { useEditor, EditorContent, Editor, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Highlighter,
  Save,
  Link as LinkIcon,
  Code,
  Undo2,
  Redo2,
} from "lucide-react";

// Import shadcn components
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Define the floating toolbar button props
interface FloatingToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  tooltip: string;
  disabled?: boolean;
}

// Floating toolbar button component with tooltip
const FloatingToolbarButton = React.forwardRef<
  HTMLButtonElement,
  FloatingToolbarButtonProps
>(({ icon, onClick, isActive, tooltip, disabled = false }, ref) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0",
            isActive && "bg-muted text-primary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          ref={ref}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
));

// Add displayName to prevent eslint warning
FloatingToolbarButton.displayName = "FloatingToolbarButton";

// Define the props for the journal editor
export interface FloatingEditorProps {
  initialContent?: JSONContent;
  placeholder?: string;
  className?: string;
  onChange?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => void;
  readOnly?: boolean;
  showMainToolbar?: boolean;
  autofocus?: boolean;
}

// Define the methods accessible via ref
export interface FloatingEditorRef {
  getContent: () => JSONContent;
  getEditor: () => Editor | null;
  clearContent: () => void;
  setContent: (content: JSONContent) => void;
  focus: () => void;
  isEmpty: () => boolean;
}

// The main floating editor component
const FloatingEditor = forwardRef<FloatingEditorRef, FloatingEditorProps>(
  (
    {
      initialContent,
      placeholder = "Write your journal entry...",
      className = "",
      onChange,
      onSave,
      readOnly = false,
      showMainToolbar = true,
      autofocus = false,
    },
    ref
  ) => {
    const [isMounted, setIsMounted] = useState<boolean>(false);
    const [showFloatingToolbar, setShowFloatingToolbar] =
      useState<boolean>(false);
    const [floatingToolbarPosition, setFloatingToolbarPosition] = useState<{
      top: number;
      left: number;
    }>({ top: 0, left: 0 });
    const [showLinkInput, setShowLinkInput] = useState<boolean>(false);
    const [linkUrl, setLinkUrl] = useState<string>("");
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const floatingToolbarRef = useRef<HTMLDivElement>(null);
    const [historyState, setHistoryState] = useState<{
      canUndo: boolean;
      canRedo: boolean;
    }>({ canUndo: false, canRedo: false });

    // Initialize the editor
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          history: {
            depth: 100, // Increase history depth
          },
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2",
          },
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
      autofocus: autofocus,
      onUpdate: ({ editor }) => {
        // Update history state
        setHistoryState({
          canUndo: editor.can().undo(),
          canRedo: editor.can().redo(),
        });

        if (onChange) {
          onChange(editor.getJSON());
        }
      },
      onSelectionUpdate: ({ editor }) => {
        // Skip if the selection is on an image or editor doesn't exist
        if (!editor || editor.isActive("image")) return;

        const { from, to } = editor.state.selection;
        const isEmptySelection = from === to;

        if (isEmptySelection || readOnly) {
          setShowFloatingToolbar(false);
          return;
        }

        const view = editor.view;
        const { ranges } = view.state.selection;
        // Rename from to fromPos to avoid variable shadowing
        const fromPos = ranges[0].$from;
        const domRect = view.coordsAtPos(fromPos.pos);

        if (editorContainerRef.current) {
          const editorRect = editorContainerRef.current.getBoundingClientRect();

          // Calculate position for the toolbar
          let top = domRect.top - editorRect.top - 50; // Position above the selection
          let left = domRect.left - editorRect.left;

          // Ensure the toolbar is visible and not cut off
          setFloatingToolbarPosition({ top, left });
          setShowFloatingToolbar(true);
        }
      },
    });

    // Initial history state update
    useEffect(() => {
      if (editor) {
        setHistoryState({
          canUndo: editor.can().undo(),
          canRedo: editor.can().redo(),
        });
      }
    }, [editor]);

    // Memoized function to adjust toolbar position
    // Using useCallback to prevent recreation on each render
    const adjustToolbarPosition = useCallback(() => {
      if (
        showFloatingToolbar &&
        floatingToolbarRef.current &&
        editorContainerRef.current
      ) {
        const toolbarRect = floatingToolbarRef.current.getBoundingClientRect();
        const editorRect = editorContainerRef.current.getBoundingClientRect();

        // Start with the current position
        let { top, left } = floatingToolbarPosition;

        // Adjust for the transform: translateX(-50%) in the CSS
        // When we're too close to the left edge, we need to remove this transform
        let useTransform = true;

        // Check if toolbar would go off the left edge when centered
        if (left - toolbarRect.width / 2 < 10) {
          // Position from the left edge with padding
          left = 10;
          useTransform = false;
        }
        // Check if toolbar would go off the right edge when centered
        else if (left + toolbarRect.width / 2 > editorRect.width - 10) {
          // Position from the right edge with padding
          left = editorRect.width - toolbarRect.width - 10;
          useTransform = false;
        }

        // Check if toolbar is too close to the top
        if (top < 10) {
          // Place it below the selection instead
          top = 60;
        }

        // Update the transform style directly based on our calculations
        if (floatingToolbarRef.current) {
          floatingToolbarRef.current.style.transform = useTransform
            ? "translateX(-50%)"
            : "none";

          // Update position directly via style
          floatingToolbarRef.current.style.top = `${top}px`;
          floatingToolbarRef.current.style.left = `${left}px`;
        }
      }
    }, [showFloatingToolbar, floatingToolbarPosition]);

    // Adjust toolbar position when it becomes visible or position changes
    // This is the key fix for the infinite loop - we're not setting state inside
    // this effect, instead directly manipulating the DOM
    useEffect(() => {
      adjustToolbarPosition();
    }, [showFloatingToolbar, floatingToolbarPosition, adjustToolbarPosition]);

    // Add this effect after the editor is initialized
    useEffect(() => {
      if (editor) {
        editor.setEditable(!readOnly);
      }
    }, [editor, readOnly]);

    // Add this effect to update content when initialContent changes
    useEffect(() => {
      if (editor && initialContent) {
        editor.commands.setContent(initialContent);
      }
    }, [editor, initialContent]);

    // Handle client-side rendering
    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Click outside handler to hide floating toolbar
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent): void => {
        if (
          editorContainerRef.current &&
          !editorContainerRef.current.contains(event.target as Node)
        ) {
          setShowFloatingToolbar(false);
          setShowLinkInput(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    // Keyboard shortcut handler
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (!editor) return;

        // Save shortcut: Ctrl+S or Cmd+S
        if ((event.ctrlKey || event.metaKey) && event.key === "s" && onSave) {
          event.preventDefault();
          onSave(editor.getJSON());
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [editor, onSave]);

    // Fix for cleanup on unmount
    useEffect(() => {
      return () => {
        editor?.destroy();
      };
    }, [editor]);

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
      isEmpty: () => {
        return editor ? editor.isEmpty : true;
      },
    }));

    // Safe version of editor.chain() calls
    const safeChain = (callback: (chain: any) => void) => {
      if (editor) {
        callback(editor.chain().focus());
      }
    };

    // Safe version of editor.isActive() calls
    const isActive = (
      name: string,
      attrs?: Record<string, unknown>
    ): boolean => {
      return editor ? editor.isActive(name, attrs) : false;
    };

    // Function to handle image upload
    const addImage = (): void => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = (event: Event) => {
        if (!editor) return;

        const target = event.target as HTMLInputElement;
        // Check if files exist and has length
        if (!target.files || !target.files.length) return;

        const file = target.files[0];

        // Add file size check
        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          alert("Image is too large. Please select an image under 5MB.");
          return;
        }

        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
          // Add null check for e.target
          const target = e.target;
          if (!target) return;

          const result = target.result;
          if (typeof result === "string") {
            safeChain((chain) => chain.setImage({ src: result }).run());
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

    // Function to toggle bold formatting
    const toggleBold = (): void => {
      safeChain((chain) => chain.toggleBold().run());
    };

    // Function to toggle italic formatting
    const toggleItalic = (): void => {
      safeChain((chain) => chain.toggleItalic().run());
    };

    // Function to toggle code formatting
    const toggleCode = (): void => {
      safeChain((chain) => chain.toggleCode().run());
    };

    // Function to toggle highlight
    const toggleHighlight = (): void => {
      safeChain((chain) => chain.toggleHighlight().run());
    };

    // Function to toggle heading level 1
    const toggleHeading1 = (): void => {
      safeChain((chain) => chain.toggleHeading({ level: 1 }).run());
    };

    // Function to toggle heading level 2
    const toggleHeading2 = (): void => {
      safeChain((chain) => chain.toggleHeading({ level: 2 }).run());
    };

    // Function to toggle bullet list
    const toggleBulletList = (): void => {
      safeChain((chain) => chain.toggleBulletList().run());
    };

    // Function to toggle ordered list
    const toggleOrderedList = (): void => {
      safeChain((chain) => chain.toggleOrderedList().run());
    };

    // Function to handle undo
    const handleUndo = (): void => {
      safeChain((chain) => chain.undo().run());
    };

    // Function to handle redo
    const handleRedo = (): void => {
      safeChain((chain) => chain.redo().run());
    };

    // Function to add link
    const addLink = (): void => {
      if (editor?.isActive("link")) {
        safeChain((chain) => chain.unsetLink().run());
        return;
      }

      setShowLinkInput(true);
    };

    // Function to save link
    const saveLink = (): void => {
      if (!linkUrl.trim()) {
        setShowLinkInput(false);
        return;
      }

      let finalUrl = linkUrl;
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = "https://" + finalUrl;
      }

      safeChain((chain) => chain.setLink({ href: finalUrl }).run());
      setShowLinkInput(false);
      setLinkUrl("");
    };

    // Don't render until client-side
    if (!isMounted || !editor) {
      return <div className="h-60 bg-gray-50 rounded-md animate-pulse" />;
    }

    return (
      <div
        ref={editorContainerRef}
        className={cn(
          "floating-editor relative border rounded-lg overflow-hidden",
          className
        )}
      >
        {/* Main Editor Toolbar (optional) */}
        {!readOnly && showMainToolbar && (
          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                title="Undo"
                disabled={!historyState.canUndo}
                className={cn(
                  "h-8 w-8 p-0",
                  !historyState.canUndo && "opacity-50"
                )}
              >
                <Undo2 size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                title="Redo"
                disabled={!historyState.canRedo}
                className={cn(
                  "h-8 w-8 p-0",
                  !historyState.canRedo && "opacity-50"
                )}
              >
                <Redo2 size={16} />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleBold}
              className={cn(isActive("bold") && "bg-accent")}
            >
              <Bold size={16} className="mr-1" />
              <span>Bold</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleItalic}
              className={cn(isActive("italic") && "bg-accent")}
            >
              <Italic size={16} className="mr-1" />
              <span>Italic</span>
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleHeading1}
              className={cn(isActive("heading", { level: 1 }) && "bg-accent")}
            >
              <Heading1 size={16} className="mr-1" />
              <span>Heading 1</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleHeading2}
              className={cn(isActive("heading", { level: 2 }) && "bg-accent")}
            >
              <Heading2 size={16} className="mr-1" />
              <span>Heading 2</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleBulletList}
              className={cn(isActive("bulletList") && "bg-accent")}
            >
              <List size={16} className="mr-1" />
              <span>Bullet List</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleOrderedList}
              className={cn(isActive("orderedList") && "bg-accent")}
            >
              <ListOrdered size={16} className="mr-1" />
              <span>Ordered List</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLink}
              className={cn(isActive("link") && "bg-accent")}
            >
              <LinkIcon size={16} className="mr-1" />
              <span>Link</span>
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={addImage}>
              <ImageIcon size={16} className="mr-1" />
              <span>Image</span>
            </Button>

            {/* Save button on the right side */}
            {onSave && (
              <div className="ml-auto">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  className="flex items-center gap-1"
                >
                  <Save size={16} />
                  <span>Save</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Link Input Popover */}
        {showLinkInput && (
          <div className="absolute z-20 top-20 left-1/2 transform -translate-x-1/2 bg-background rounded-md border shadow-md p-3 w-72">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Link URL</label>
              <div className="flex gap-2">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveLink();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setShowLinkInput(false);
                      setLinkUrl("");
                    }
                  }}
                />
                <Button size="sm" onClick={saveLink}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toolbar - position set via direct DOM manipulation */}
        {showFloatingToolbar && !readOnly && (
          <div
            ref={floatingToolbarRef}
            className="absolute z-10 bg-background/90 backdrop-blur-sm rounded-md border shadow-md p-1 flex items-center"
            style={{
              position: "absolute",
              // Initial position, will be updated via DOM in useEffect
              top: `${floatingToolbarPosition.top}px`,
              left: `${floatingToolbarPosition.left}px`,
            }}
          >
            <FloatingToolbarButton
              icon={<Bold size={16} />}
              onClick={toggleBold}
              isActive={isActive("bold")}
              tooltip="Bold"
            />
            <FloatingToolbarButton
              icon={<Italic size={16} />}
              onClick={toggleItalic}
              isActive={isActive("italic")}
              tooltip="Italic"
            />
            <FloatingToolbarButton
              icon={<Code size={16} />}
              onClick={toggleCode}
              isActive={isActive("code")}
              tooltip="Code"
            />
            <FloatingToolbarButton
              icon={<Highlighter size={16} />}
              onClick={toggleHighlight}
              isActive={isActive("highlight")}
              tooltip="Highlight"
            />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <FloatingToolbarButton
              icon={<LinkIcon size={16} />}
              onClick={addLink}
              isActive={isActive("link")}
              tooltip={isActive("link") ? "Remove link" : "Add link"}
            />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                >
                  <Heading1 size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleHeading1}
                    className={cn(
                      isActive("heading", { level: 1 }) && "bg-accent"
                    )}
                  >
                    <Heading1 size={16} className="mr-1" />
                    <span>Heading 1</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleHeading2}
                    className={cn(
                      isActive("heading", { level: 2 }) && "bg-accent"
                    )}
                  >
                    <Heading2 size={16} className="mr-1" />
                    <span>Heading 2</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                >
                  <List size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleBulletList}
                    className={cn(isActive("bulletList") && "bg-accent")}
                  >
                    <List size={16} className="mr-1" />
                    <span>Bullet List</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleOrderedList}
                    className={cn(isActive("orderedList") && "bg-accent")}
                  >
                    <ListOrdered size={16} className="mr-1" />
                    <span>Ordered List</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Tiptap Editor Content */}
        <div className="p-4 min-h-[300px] max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
          <EditorContent
            editor={editor}
            className="focus-visible:outline-none"
          />
        </div>

        {/* Custom CSS */}
        <style jsx global>{`
          .ProseMirror {
            outline: none;
          }

          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
          }

          .ProseMirror mark {
            background-color: #fef08a;
            color: #1f2937;
            border-radius: 0.125rem;
            padding: 0 0.125rem;
          }

          .ProseMirror p {
            margin: 0.75em 0;
          }

          .ProseMirror h1 {
            font-size: 1.75rem;
            font-weight: 600;
            line-height: 1.25;
            margin: 1em 0 0.5em;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.25em;
          }

          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: 600;
            line-height: 1.25;
            margin: 1em 0 0.5em;
          }

          .ProseMirror ul {
            list-style-type: disc;
            padding-left: 1.5em;
            margin: 0.75em 0;
          }

          .ProseMirror ol {
            list-style-type: decimal;
            padding-left: 1.5em;
            margin: 0.75em 0;
          }

          .ProseMirror code {
            background-color: #f1f5f9;
            border-radius: 0.25rem;
            padding: 0.125rem 0.25rem;
            font-family: monospace;
            font-size: 0.875em;
          }

          .ProseMirror a {
            color: #2563eb;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          .ProseMirror img {
            max-width: 100%;
            border-radius: 0.375rem;
            margin: 0.5em 0;
          }

          .ProseMirror *::selection {
            background: #bfdbfe;
          }
        `}</style>
      </div>
    );
  }
);

// Add display name for debugging
FloatingEditor.displayName = "FloatingEditor";

export default FloatingEditor;

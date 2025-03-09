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
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Dropcursor from "@tiptap/extension-dropcursor";
import CharacterCount from "@tiptap/extension-character-count";

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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Underline as UnderlineIcon,
  Table as TableIcon,
  CheckSquare,
  Type,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignJustify,
  PaintBucket,
  Quote,
  Strikethrough,
  MoreHorizontal,
  Minus,
  TextSelect,
  PenLine,
  EyeOff,
  Image2,
  Sparkles,
  Copy,
  Scissors,
  Clipboard,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the floating toolbar button props
interface FloatingToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
>(({ icon, onClick, isActive, tooltip, disabled = false, ...props }, ref) => (
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
          {...props}
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

// Color picker component
const ColorPickerButton = ({
  editor,
  attribute,
  icon,
  tooltip,
}: {
  editor: Editor | null;
  attribute: "textColor" | "highlight";
  icon: React.ReactNode;
  tooltip: string;
}) => {
  const colors = [
    { name: "Default", color: "inherit" },
    { name: "Black", color: "#000000" },
    { name: "White", color: "#ffffff" },
    { name: "Red", color: "#ef4444" },
    { name: "Orange", color: "#f97316" },
    { name: "Yellow", color: "#eab308" },
    { name: "Green", color: "#22c55e" },
    { name: "Blue", color: "#3b82f6" },
    { name: "Indigo", color: "#6366f1" },
    { name: "Purple", color: "#a855f7" },
    { name: "Pink", color: "#ec4899" },
  ];

  if (!editor) return null;

  const isHighlight = attribute === "highlight";

  return (
    <Popover>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
              >
                {icon}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-5 gap-1">
          {colors.map((color) => (
            <button
              key={color.color}
              className={cn(
                "w-7 h-7 rounded-md border border-muted",
                color.color === "inherit" && "bg-transparent"
              )}
              style={{
                backgroundColor:
                  color.color !== "inherit" ? color.color : undefined,
                opacity: color.color === "inherit" ? 0.5 : 1,
              }}
              onClick={() => {
                if (isHighlight) {
                  if (color.color === "inherit") {
                    editor.chain().focus().unsetHighlight().run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .setHighlight({ color: color.color })
                      .run();
                  }
                } else {
                  if (color.color === "inherit") {
                    editor.chain().focus().unsetColor().run();
                  } else {
                    editor.chain().focus().setColor(color.color).run();
                  }
                }
              }}
              title={color.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

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
  maxLength?: number;
}

// Define the methods accessible via ref
export interface FloatingEditorRef {
  getContent: () => JSONContent;
  getEditor: () => Editor | null;
  clearContent: () => void;
  setContent: (content: JSONContent) => void;
  focus: () => void;
  isEmpty: () => boolean;
  getCharacterCount: () => number;
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
      maxLength = 50000,
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
    const bubbleMenuRef = useRef<HTMLDivElement>(null);
    const [historyState, setHistoryState] = useState<{
      canUndo: boolean;
      canRedo: boolean;
    }>({ canUndo: false, canRedo: false });
    const [characterCount, setCharacterCount] = useState<number>(0);
    const [aiGeneratingContent, setAiGeneratingContent] =
      useState<boolean>(false);
    const [clipboardSupported, setClipboardSupported] =
      useState<boolean>(false);

    // Check for clipboard API support
    useEffect(() => {
      setClipboardSupported(
        typeof navigator !== "undefined" &&
          !!navigator.clipboard &&
          typeof navigator.clipboard.write === "function" &&
          typeof navigator.clipboard.read === "function"
      );
    }, []);

    // Initialize the editor with improved configuration
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          history: {
            depth: 100, // Increased history depth
            newGroupDelay: 500, // Reduced delay for new history group
          },
          blockquote: {
            HTMLAttributes: {
              class: "border-l-4 border-primary/40 pl-4 italic",
            },
          },
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
          HTMLAttributes: {
            class: "rounded-md my-2 max-h-[500px] object-contain",
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        TextStyle,
        Color,
        FontFamily,
        Highlight.configure({
          multicolor: true,
        }),
        Underline,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2",
            rel: "noopener noreferrer",
          },
        }),
        Typography,
        TaskList,
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            class: "flex gap-2 items-start my-1",
          },
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: "min-w-full border-collapse border border-border my-4",
          },
        }),
        TableRow,
        TableHeader.configure({
          HTMLAttributes: {
            class: "border border-border bg-muted p-2",
          },
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: "border border-border p-2",
          },
        }),
        Subscript,
        Superscript,
        Dropcursor.configure({
          width: 2,
          color: "rgba(59, 130, 246, 0.5)",
        }),
        CharacterCount.configure({
          limit: maxLength,
        }),
        BubbleMenu.configure({
          element: document.createElement("div"),
          shouldShow: ({ editor, from, to }) => {
            // Skip if editor is read-only
            if (readOnly) return false;

            // Skip empty selections
            if (from === to) return false;

            // Don't show for image selections
            return !editor.isActive("image");
          },
          tippyOptions: {
            duration: [200, 150],
            placement: "top",
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
      editorProps: {
        attributes: {
          class: "outline-none min-h-[200px] text-foreground",
          spellcheck: "true",
        },
        handlePaste: (view, event) => {
          // Handle pasting images
          const items = event.clipboardData?.items;
          if (items) {
            for (const item of Array.from(items)) {
              if (item.type.indexOf("image") === 0) {
                event.preventDefault();

                const blob = item.getAsFile();
                if (!blob) continue;

                const reader = new FileReader();
                reader.onload = (e) => {
                  const result = e.target?.result;
                  if (typeof result === "string" && editor) {
                    editor.chain().focus().setImage({ src: result }).run();
                  }
                };
                reader.readAsDataURL(blob);
                return true;
              }
            }
          }

          // Let other paste events be handled naturally
          return false;
        },
        handleDrop: (view, event, slice, moved) => {
          if (!moved && event.dataTransfer && event.dataTransfer.files) {
            const files = event.dataTransfer.files;
            if (files.length && files[0].type.startsWith("image/")) {
              event.preventDefault();

              const file = files[0];
              const reader = new FileReader();

              reader.onload = (readerEvent) => {
                const result = readerEvent.target?.result;
                if (typeof result === "string" && editor) {
                  const { schema } = view.state;
                  const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                  });

                  if (coordinates) {
                    const image = schema.nodes.image.create({ src: result });
                    const transaction = view.state.tr.insert(
                      coordinates.pos,
                      image
                    );
                    view.dispatch(transaction);
                  }
                }
              };

              reader.readAsDataURL(file);
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        // Update history state
        setHistoryState({
          canUndo: editor.can().undo(),
          canRedo: editor.can().redo(),
        });

        // Update character count
        setCharacterCount(editor.storage.characterCount.characters());

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
          const top = domRect.top - editorRect.top - 50; // Position above the selection
          const left = domRect.left - editorRect.left;

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

        // Set initial character count
        setCharacterCount(editor.storage.characterCount.characters());
      }
    }, [editor]);

    // Setup bubble menu
    useEffect(() => {
      if (editor && bubbleMenuRef.current) {
        // Find the bubble menu extension
        const { bubbleMenu } = editor.extensionManager.extensions.find(
          (extension) => extension.name === "bubbleMenu"
        ) as any;

        // Set the bubble menu element
        if (bubbleMenu && bubbleMenu.options) {
          bubbleMenu.options.element = bubbleMenuRef.current;
        }
      }
    }, [editor, bubbleMenuRef.current]);

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
        // Use a try-catch here to make this more robust
        try {
          editor.commands.setContent(initialContent);

          // Update history state after setting content
          setTimeout(() => {
            if (editor) {
              setHistoryState({
                canUndo: editor.can().undo(),
                canRedo: editor.can().redo(),
              });
              setCharacterCount(editor.storage.characterCount.characters());
            }
          }, 0);
        } catch (error) {
          console.error("Error setting editor content:", error);
        }
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

        // Undo shortcut: Ctrl+Z or Cmd+Z
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key === "z" &&
          !event.shiftKey
        ) {
          event.preventDefault();
          if (editor.can().undo()) {
            editor.commands.undo();
          }
        }

        // Redo shortcut: Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y
        if (
          ((event.ctrlKey || event.metaKey) &&
            event.key === "z" &&
            event.shiftKey) ||
          ((event.ctrlKey || event.metaKey) && event.key === "y")
        ) {
          event.preventDefault();
          if (editor.can().redo()) {
            editor.commands.redo();
          }
        }

        // Cut shortcut: Ctrl+X or Cmd+X
        if ((event.ctrlKey || event.metaKey) && event.key === "x") {
          // We don't need to do anything special since the default browser behavior
          // will handle text cutting. We only need to prevent default if we want
          // to implement custom cut behavior.
        }

        // Copy shortcut: Ctrl+C or Cmd+C
        if ((event.ctrlKey || event.metaKey) && event.key === "c") {
          // Similarly, default browser behavior handles text copying.
        }

        // Paste shortcut: Ctrl+V or Cmd+V
        if ((event.ctrlKey || event.metaKey) && event.key === "v") {
          // The paste handling is taken care of by the handlePaste function in editorProps
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
        if (editor) {
          editor.destroy();
        }
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
        if (editor) {
          editor.commands.clearContent(true); // Force clearing with true
        }
      },
      setContent: (content: JSONContent) => {
        if (editor) {
          editor.commands.setContent(content);
        }
      },
      focus: () => {
        if (editor) {
          editor.commands.focus("end");
        }
      },
      isEmpty: () => {
        return editor ? editor.isEmpty : true;
      },
      getCharacterCount: () => {
        return editor ? editor.storage.characterCount.characters() : 0;
      },
    }));

    // Safe version of editor.chain() calls
    const safeChain = (
      callback: (chain: ReturnType<Editor["chain"]>) => void
    ) => {
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

            // Force history update after adding image
            setTimeout(() => {
              if (editor) {
                setHistoryState({
                  canUndo: editor.can().undo(),
                  canRedo: editor.can().redo(),
                });
              }
            }, 0);
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

    // Function to cut selected text
    const handleCut = async (): Promise<void> => {
      if (!editor) return;

      // Get selected content
      const { from, to } = editor.state.selection;
      if (from === to) return; // No selection

      const selectedText = editor.state.doc.textBetween(from, to, " ");

      try {
        // Copy to clipboard
        await navigator.clipboard.writeText(selectedText);

        // Delete the selection
        editor.chain().deleteSelection().run();
      } catch (err) {
        console.error("Failed to cut to clipboard:", err);
      }
    };

    // Function to copy selected text
    const handleCopy = async (): Promise<void> => {
      if (!editor) return;

      // Get selected content
      const { from, to } = editor.state.selection;
      if (from === to) return; // No selection

      const selectedText = editor.state.doc.textBetween(from, to, " ");

      try {
        // Copy to clipboard
        await navigator.clipboard.writeText(selectedText);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    };

    // Function to paste from clipboard
    const handlePaste = async (): Promise<void> => {
      if (!editor) return;

      try {
        const clipboardContents = await navigator.clipboard.read();

        // Check for images first
        for (const item of clipboardContents) {
          if (
            item.types.includes("image/png") ||
            item.types.includes("image/jpeg") ||
            item.types.includes("image/gif")
          ) {
            const blob = await item.getType(
              item.types.find((t) => t.startsWith("image/")) || "image/png"
            );
            const reader = new FileReader();

            reader.onload = (e) => {
              const result = e.target?.result;
              if (typeof result === "string") {
                editor.chain().focus().setImage({ src: result }).run();
              }
            };

            reader.readAsDataURL(blob);
            return;
          }
        }

        // If no images, try for text
        const text = await navigator.clipboard.readText();
        if (text) {
          editor.chain().focus().insertContent(text).run();
        }
      } catch (err) {
        console.error("Failed to paste from clipboard:", err);

        // Fallback - let the browser handle paste
        try {
          document.execCommand("paste");
        } catch (e) {
          console.error("Fallback paste also failed:", e);
        }
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

    // Function to toggle underline
    const toggleUnderline = (): void => {
      safeChain((chain) => chain.toggleUnderline().run());
    };

    // Function to toggle strikethrough
    const toggleStrikethrough = (): void => {
      safeChain((chain) => chain.toggleStrike().run());
    };

    // Function to toggle heading level 1
    const toggleHeading1 = (): void => {
      safeChain((chain) => {
        if (isActive("heading", { level: 1 })) {
          return chain.setParagraph().run();
        }
        return chain.setHeading({ level: 1 }).run();
      });
    };

    // Function to toggle heading level 2
    const toggleHeading2 = (): void => {
      safeChain((chain) => {
        if (isActive("heading", { level: 2 })) {
          return chain.setParagraph().run();
        }
        return chain.setHeading({ level: 2 }).run();
      });
    };

    // Function to toggle heading level 3
    const toggleHeading3 = (): void => {
      safeChain((chain) => {
        if (isActive("heading", { level: 3 })) {
          return chain.setParagraph().run();
        }
        return chain.setHeading({ level: 3 }).run();
      });
    };

    // Function to toggle bullet list
    const toggleBulletList = (): void => {
      safeChain((chain) => chain.toggleBulletList().run());
    };

    // Function to toggle ordered list
    const toggleOrderedList = (): void => {
      safeChain((chain) => chain.toggleOrderedList().run());
    };

    // Function to toggle task list
    const toggleTaskList = (): void => {
      safeChain((chain) => chain.toggleTaskList().run());
    };

    // Function to toggle blockquote
    const toggleBlockquote = (): void => {
      safeChain((chain) => chain.toggleBlockquote().run());
    };

    // Function to set text alignment
    const setTextAlign = (
      align: "left" | "center" | "right" | "justify"
    ): void => {
      safeChain((chain) => chain.setTextAlign(align).run());
    };

    // Function to toggle text subscript
    const toggleSubscript = (): void => {
      safeChain((chain) => chain.toggleSubscript().run());
    };

    // Function to toggle text superscript
    const toggleSuperscript = (): void => {
      safeChain((chain) => chain.toggleSuperscript().run());
    };

    // Function to insert horizontal rule
    const insertHorizontalRule = (): void => {
      safeChain((chain) => chain.setHorizontalRule().run());
    };

    // Function to insert a table
    const insertTable = (): void => {
      safeChain((chain) =>
        chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      );
    };

    // Function to handle undo
    const handleUndo = (): void => {
      if (editor && editor.can().undo()) {
        safeChain((chain) => chain.undo().run());

        // Update history state after undo
        setTimeout(() => {
          if (editor) {
            setHistoryState({
              canUndo: editor.can().undo(),
              canRedo: editor.can().redo(),
            });
          }
        }, 0);
      }
    };

    // Function to handle redo
    const handleRedo = (): void => {
      if (editor && editor.can().redo()) {
        safeChain((chain) => chain.redo().run());

        // Update history state after redo
        setTimeout(() => {
          if (editor) {
            setHistoryState({
              canUndo: editor.can().undo(),
              canRedo: editor.can().redo(),
            });
          }
        }, 0);
      }
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

    // Function to toggle AI-assisted writing mode
    const toggleAiAssist = async (): Promise<void> => {
      if (!editor || aiGeneratingContent) return;

      // Get current selection or complete content if nothing is selected
      const { from, to } = editor.state.selection;
      const selectedText =
        from !== to
          ? editor.state.doc.textBetween(from, to, " ")
          : editor.getText();

      // Since we don't have access to real AI, we'll simulate a response
      setAiGeneratingContent(true);

      try {
        setTimeout(() => {
          // Simulate AI enhancing text with a simple transformation
          if (from !== to) {
            // If text was selected, replace that text with enhanced version
            const enhancedText = `${selectedText} (enhanced with imaginary AI: this text would be improved with real AI integration)`;
            editor
              .chain()
              .focus()
              .deleteSelection()
              .insertContent(enhancedText)
              .run();
          } else {
            // If no selection, just append suggestion at current position
            editor
              .chain()
              .focus()
              .insertContent(
                " AI would suggest content here based on your journal entry."
              )
              .run();
          }
          setAiGeneratingContent(false);
        }, 1000); // Simulate delay
      } catch (error) {
        console.error("Error with AI assistance:", error);
        setAiGeneratingContent(false);
      }
    };

    // Don't render until client-side
    if (!isMounted || !editor) {
      return <div className="h-60 bg-gray-50 rounded-md animate-pulse" />;
    }

    const currentCharacterCount = editor.storage.characterCount.characters();
    const charactersRemaining = maxLength - currentCharacterCount;
    const isLimitReached = currentCharacterCount >= maxLength;

    return (
      <div
        ref={editorContainerRef}
        className={cn(
          "floating-editor relative border rounded-lg overflow-hidden transition-shadow duration-200 hover:shadow-sm",
          className
        )}
      >
        {/* Main Editor Toolbar (optional) */}
        {!readOnly && showMainToolbar && (
          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50 backdrop-blur-sm sticky top-0 z-10">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="mb-2 bg-transparent p-0 justify-start">
                <TabsTrigger
                  value="text"
                  className="data-[state=active]:bg-background"
                >
                  <Type className="h-4 w-4 mr-1" />
                  Text
                </TabsTrigger>
                <TabsTrigger
                  value="format"
                  className="data-[state=active]:bg-background"
                >
                  <TextSelect className="h-4 w-4 mr-1" />
                  Format
                </TabsTrigger>
                <TabsTrigger
                  value="insert"
                  className="data-[state=active]:bg-background"
                >
                  <PenLine className="h-4 w-4 mr-1" />
                  Insert
                </TabsTrigger>
                <TabsTrigger
                  value="edit"
                  className="data-[state=active]:bg-background"
                >
                  <TextSelect className="h-4 w-4 mr-1" />
                  Edit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-0">
                <div className="flex flex-wrap items-center gap-1">
                  {/* History controls */}
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

                  {/* Basic formatting */}
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

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleUnderline}
                    className={cn(isActive("underline") && "bg-accent")}
                  >
                    <UnderlineIcon size={16} className="mr-1" />
                    <span>Underline</span>
                  </Button>

                  <Separator orientation="vertical" className="h-6 mx-1" />

                  {/* Font family selection */}
                  <Select
                    value={
                      editor.getAttributes("textStyle").fontFamily || "default"
                    }
                    onValueChange={(value) => {
                      if (value === "default") {
                        editor.chain().focus().unsetFontFamily().run();
                      } else {
                        editor.chain().focus().setFontFamily(value).run();
                      }
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                      <SelectItem value="'Georgia', serif">Georgia</SelectItem>
                      <SelectItem value="'Times New Roman', serif">
                        Times New Roman
                      </SelectItem>
                      <SelectItem value="monospace">Monospace</SelectItem>
                      <SelectItem value="cursive">Cursive</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Color picker tools */}
                  <ColorPickerButton
                    editor={editor}
                    attribute="textColor"
                    icon={<PaintBucket size={16} />}
                    tooltip="Text Color"
                  />

                  <ColorPickerButton
                    editor={editor}
                    attribute="highlight"
                    icon={<Highlighter size={16} />}
                    tooltip="Highlight Color"
                  />

                  {/* AI writing assistant button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAiAssist}
                    disabled={aiGeneratingContent}
                    className="ml-auto"
                  >
                    <Sparkles size={16} className="mr-1 text-primary" />
                    <span>
                      {aiGeneratingContent ? "Generating..." : "AI Assist"}
                    </span>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="format" className="mt-0">
                <div className="flex flex-wrap items-center gap-1">
                  {/* Headings */}
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

                  <Separator orientation="vertical" className="h-6 mx-1" />

                  {/* Text alignment */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTextAlign("left")}
                    className={cn(
                      isActive({ textAlign: "left" }) && "bg-accent"
                    )}
                  >
                    <AlignLeft size={16} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTextAlign("center")}
                    className={cn(
                      isActive({ textAlign: "center" }) && "bg-accent"
                    )}
                  >
                    <AlignCenter size={16} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTextAlign("right")}
                    className={cn(
                      isActive({ textAlign: "right" }) && "bg-accent"
                    )}
                  >
                    <AlignRight size={16} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTextAlign("justify")}
                    className={cn(
                      isActive({ textAlign: "justify" }) && "bg-accent"
                    )}
                  >
                    <AlignJustify size={16} />
                  </Button>

                  <Separator orientation="vertical" className="h-6 mx-1" />

                  {/* Lists */}
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
                    onClick={toggleTaskList}
                    className={cn(isActive("taskList") && "bg-accent")}
                  >
                    <CheckSquare size={16} className="mr-1" />
                    <span>Task List</span>
                  </Button>

                  {/* Quote */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleBlockquote}
                    className={cn(isActive("blockquote") && "bg-accent")}
                  >
                    <Quote size={16} className="mr-1" />
                    <span>Quote</span>
                  </Button>

                  {/* More formatting options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal size={16} className="mr-1" />
                        <span>More</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        Additional Formatting
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={toggleCode}>
                        <Code className="mr-2 h-4 w-4" />
                        <span>Code</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleStrikethrough}>
                        <Strikethrough className="mr-2 h-4 w-4" />
                        <span>Strikethrough</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleSubscript}>
                        <SubscriptIcon className="mr-2 h-4 w-4" />
                        <span>Subscript</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleSuperscript}>
                        <SuperscriptIcon className="mr-2 h-4 w-4" />
                        <span>Superscript</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={insertHorizontalRule}>
                        <Minus className="mr-2 h-4 w-4" />
                        <span>Horizontal Rule</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TabsContent>

              <TabsContent value="insert" className="mt-0">
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addImage}
                  >
                    <ImageIcon size={16} className="mr-1" />
                    <span>Insert Image</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLink}
                    className={cn(isActive("link") && "border-primary")}
                  >
                    <LinkIcon size={16} className="mr-1" />
                    <span>
                      {isActive("link") ? "Edit Link" : "Insert Link"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={insertTable}
                  >
                    <TableIcon size={16} className="mr-1" />
                    <span>Insert Table</span>
                  </Button>

                  {/* Character counter */}
                  <div className="ml-auto flex items-center text-xs text-muted-foreground">
                    <EyeOff className="h-3 w-3 mr-1" />
                    {isLimitReached ? (
                      <span className="text-destructive">Limit reached</span>
                    ) : (
                      <span>{charactersRemaining} characters remaining</span>
                    )}
                  </div>

                  {/* Save button if onSave prop is provided */}
                  {onSave && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSave}
                      className="flex items-center gap-1 ml-2"
                    >
                      <Save size={16} />
                      <span>Save</span>
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="edit" className="mt-0">
                <div className="flex flex-wrap items-center gap-1">
                  {/* Cut/Copy/Paste buttons */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCut}
                    disabled={editor.state.selection.empty}
                  >
                    <Scissors size={16} className="mr-1" />
                    <span>Cut</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={editor.state.selection.empty}
                  >
                    <Copy size={16} className="mr-1" />
                    <span>Copy</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePaste}
                    disabled={!clipboardSupported}
                  >
                    <Clipboard size={16} className="mr-1" />
                    <span>Paste</span>
                  </Button>

                  <div className="ml-auto text-xs text-muted-foreground">
                    {!clipboardSupported && (
                      <span>
                        Use keyboard shortcuts for copy/paste operations
                      </span>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
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

        {/* Floating Toolbar */}
        {showFloatingToolbar && !readOnly && (
          <div
            ref={floatingToolbarRef}
            className="absolute z-10 bg-background/95 backdrop-blur-sm rounded-md border shadow-md p-1 flex items-center"
            style={{
              position: "absolute",
              top: `${floatingToolbarPosition.top}px`,
              left: `${floatingToolbarPosition.left}px`,
              transform: "translateX(-50%)",
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
              icon={<UnderlineIcon size={16} />}
              onClick={toggleUnderline}
              isActive={isActive("underline")}
              tooltip="Underline"
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

            <FloatingToolbarButton
              icon={<Copy size={16} />}
              onClick={handleCopy}
              tooltip="Copy"
            />
            <FloatingToolbarButton
              icon={<Scissors size={16} />}
              onClick={handleCut}
              tooltip="Cut"
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="bottom">
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleHeading1}
                    className={cn(
                      isActive("heading", { level: 1 }) && "bg-accent"
                    )}
                  >
                    <Heading1 size={14} className="mr-1" />
                    <span>H1</span>
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
                    <Heading2 size={14} className="mr-1" />
                    <span>H2</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleBulletList}
                    className={cn(isActive("bulletList") && "bg-accent")}
                  >
                    <List size={14} className="mr-1" />
                    <span>List</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleBlockquote}
                    className={cn(isActive("blockquote") && "bg-accent")}
                  >
                    <Quote size={14} className="mr-1" />
                    <span>Quote</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Bubble Menu for selected text */}
        <div
          ref={bubbleMenuRef}
          className="bubble-menu bg-background/95 backdrop-blur-sm rounded-md border shadow-md p-1 flex items-center"
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
            icon={<UnderlineIcon size={16} />}
            onClick={toggleUnderline}
            isActive={isActive("underline")}
            tooltip="Underline"
          />
          <FloatingToolbarButton
            icon={<Copy size={16} />}
            onClick={handleCopy}
            tooltip="Copy"
          />
          <FloatingToolbarButton
            icon={<Scissors size={16} />}
            onClick={handleCut}
            tooltip="Cut"
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
                <MoreHorizontal size={16} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleCode}
                  className={cn(isActive("code") && "bg-accent")}
                >
                  <Code size={14} className="mr-1" />
                  <span>Code</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleStrikethrough}
                  className={cn(isActive("strike") && "bg-accent")}
                >
                  <Strikethrough size={14} className="mr-1" />
                  <span>Strike</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSubscript}
                  className={cn(isActive("subscript") && "bg-accent")}
                >
                  <SubscriptIcon size={14} className="mr-1" />
                  <span>Sub</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSuperscript}
                  className={cn(isActive("superscript") && "bg-accent")}
                >
                  <SuperscriptIcon size={14} className="mr-1" />
                  <span>Super</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tiptap Editor Content */}
        <div className="px-4 py-6 min-h-[300px] max-h-[600px] overflow-y-auto prose prose-sm max-w-none transition-colors duration-200 focus-within:bg-background/50">
          <EditorContent
            editor={editor}
            className="focus-visible:outline-none"
          />
        </div>

        {/* Character count display */}
        {!readOnly && (
          <div className="text-xs text-muted-foreground flex justify-end p-2 border-t">
            <span className={cn(isLimitReached && "text-destructive")}>
              {currentCharacterCount} / {maxLength} characters
            </span>
          </div>
        )}

        {/* Custom CSS */}
        <style jsx global>{`
          .ProseMirror {
            outline: none;
            min-height: 200px;
            color: var(--foreground);
            user-select: text; /* Ensure text is selectable */
          }

          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
          }

          .ProseMirror mark {
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
            border-bottom: 1px solid var(--border);
            padding-bottom: 0.25em;
          }

          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: 600;
            line-height: 1.25;
            margin: 1em 0 0.5em;
          }

          .ProseMirror h3 {
            font-size: 1.25rem;
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

          .ProseMirror ul[data-type="taskList"] {
            list-style: none;
            padding: 0;
          }

          .ProseMirror ul[data-type="taskList"] li {
            display: flex;
            align-items: flex-start;
            margin-bottom: 0.5em;
          }

          .ProseMirror ul[data-type="taskList"] li > label {
            margin-right: 0.5em;
            user-select: none;
          }

          .ProseMirror code {
            background-color: var(--muted);
            border-radius: 0.25rem;
            padding: 0.125rem 0.25rem;
            font-family: monospace;
            font-size: 0.875em;
          }

          .ProseMirror a {
            color: var(--primary);
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          .ProseMirror img {
            max-width: 100%;
            border-radius: 0.375rem;
            margin: 0.5em 0;
            display: block;
            height: auto;
          }

          .ProseMirror blockquote {
            margin-left: 0;
            margin-right: 0;
          }

          .ProseMirror hr {
            border: none;
            border-top: 2px solid var(--border);
            margin: 2em 0;
          }

          .ProseMirror table {
            border-collapse: collapse;
            width: 100%;
            table-layout: fixed;
            margin: 1em 0;
            overflow: hidden;
          }

          .ProseMirror table td,
          .ProseMirror table th {
            min-width: 1em;
            position: relative;
          }

          .ProseMirror table .selectedCell {
            background-color: var(--accent);
          }

          .ProseMirror *::selection {
            background: rgba(
              13,
              110,
              253,
              0.3
            ); /* More visible blue selection color */
            color: inherit; /* Maintain text color */
          }

          /* Add this to ensure the selection is visible even in read-only mode */
          .ProseMirror[contenteditable="false"] *::selection {
            background: rgba(13, 110, 253, 0.3);
            color: inherit;
          }
          .ProseMirror p:first-child {
            margin-top: 0;
          }

          .ProseMirror p:last-child {
            margin-bottom: 0;
          }

          .bubble-menu {
            display: none;
            position: absolute;
            z-index: 20;
          }
        `}</style>
      </div>
    );
  }
);

// Add display name for debugging
FloatingEditor.displayName = "FloatingEditor";

export default FloatingEditor;

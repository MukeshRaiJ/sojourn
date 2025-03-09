// EditorWrapper.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import EditorJS, {
  OutputData,
  LogLevels,
  API,
  EditorConfig,
} from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import Embed from "@editorjs/embed";
import Quote from "@editorjs/quote";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";
import Table from "@editorjs/table";
import LinkTool from "@editorjs/link";
import Checklist from "@editorjs/checklist";
import Warning from "@editorjs/warning";
import Delimiter from "@editorjs/delimiter";
import ImageTool from "@editorjs/image";
import { Input } from "@/components/ui/input";

export interface EditorJSWrapperRef {
  getContent: () => Promise<OutputData>;
  insertImage: (url: string) => void;
}

interface EditorJSWrapperProps {
  initialContent?: OutputData | string | null;
  onChange?: (data: OutputData) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  showMainToolbar?: boolean;
  imageUploadCallback?: (
    file: File
  ) => Promise<{ success: number; file: { url: string } }>;
  editorId?: string; // Add unique ID to each editor instance
  title?: string; // Added title prop
  onTitleChange?: (title: string) => void; // Added title change handler
}

const emptyContent: OutputData = {
  time: new Date().getTime(),
  blocks: [
    {
      type: "paragraph",
      data: {
        text: "",
      },
    },
  ],
  version: "2.27.0",
};

// Styles are scoped, no need for a global style tag
const styles = {
  inlineImage: {
    float: "left",
    marginRight: "15px",
    marginBottom: "10px",
    width: "40%",
    maxWidth: "40%",
  },
  hiddenCaption: {
    display: "none",
  },
  titleInput: {
    fontSize: "1.875rem",
    lineHeight: "2.25rem",
    fontWeight: "600",
    width: "100%",
    border: "none",
    padding: "0",
    marginBottom: "0.5rem",
    background: "transparent",
    transition: "colors",
  },
  titleGradient: {
    height: "2px",
    width: "100%",
    background:
      "linear-gradient(to right, rgba(var(--primary), 0.3), transparent)",
    marginBottom: "1.5rem",
  },
};

// CSS to be updated to remove title placeholder
const titleStyles = `
#EDITOR_ID .ce-block:first-child .ce-header {
  font-size: 1.5em;
  font-weight: 600;
  margin-bottom: 0.8em;
  color: #333;
}
`;

const EditorJSWrapper = forwardRef<EditorJSWrapperRef, EditorJSWrapperProps>(
  (
    {
      initialContent = null,
      onChange,
      placeholder = "Start writing...",
      readOnly = false,
      className = "",
      showMainToolbar = true,
      imageUploadCallback,
      editorId = "editor-" + Math.random().toString(36).substring(2, 9),
      title = "", // Default empty title
      onTitleChange, // Title change handler
    },
    ref
  ) => {
    const editorRef = useRef<EditorJS | null>(null);
    const [isReady, setIsReady] = useState(false);
    const editorInstanceId = useRef(editorId); // Store the ID to use in cleanup
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Flag to prevent re-initialization loops
    const isInitializing = useRef(false);
    // Flag to track if component is mounted
    const isMounted = useRef(true);

    // Stable reference for initialContent to prevent unnecessary reinitializations
    const initialContentString = useMemo(() => {
      if (typeof initialContent === "string") {
        return initialContent;
      } else if (initialContent) {
        return JSON.stringify(initialContent);
      }
      return null;
    }, [initialContent]);

    // Parse initial content to EditorJS format with deep copy to prevent reference issues
    const parseInitialData = (): OutputData => {
      if (!initialContent) {
        console.log("No initial content, using empty content");
        return structuredClone(emptyContent);
      }

      if (typeof initialContent === "string") {
        try {
          console.log(
            "Parsing string content:",
            initialContent.substring(0, 100) + "..."
          );
          const parsed = JSON.parse(initialContent) as OutputData;

          // Log image blocks for debugging
          if (parsed.blocks) {
            const imageBlocks = parsed.blocks.filter(
              (block) => block.type === "image"
            );
            console.log("Image blocks found in parsed content:", imageBlocks);
          }

          return structuredClone(parsed); // Use deep copy
        } catch (e) {
          console.error("Failed to parse editor content:", e);
          return structuredClone(emptyContent);
        }
      }

      // If it's already an object
      if ("blocks" in initialContent) {
        console.log("Using object content directly");

        // Create a deep copy to prevent reference issues
        const contentCopy = structuredClone(initialContent);

        // Log image blocks
        const imageBlocks = contentCopy.blocks.filter(
          (block) => block.type === "image"
        );
        console.log("Image blocks found in object content:", imageBlocks);

        return contentCopy;
      }

      console.log("Invalid content format, using empty content");
      return structuredClone(emptyContent);
    };

    // Method to insert an image at the current block -- Improved
    const insertImage = async (url: string) => {
      if (!editorRef.current) return;

      try {
        // Get current block
        const currentBlockIndex =
          editorRef.current.blocks.getCurrentBlockIndex();

        console.log(`Inserting image at block index ${currentBlockIndex}`);

        // Insert the image block
        await editorRef.current.blocks.insert("image", {
          url: url,
          caption: "",
          withBorder: false,
          withBackground: false,
          stretched: false,
        });

        // Save the current state to ensure the image block is registered
        const savedData = await editorRef.current.save();
        console.log("Editor blocks after insert:", savedData.blocks.length);

        // Get the index of the newly inserted block
        const newBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();

        // Move the block to the desired position if needed
        if (newBlockIndex !== currentBlockIndex + 1) {
          console.log(
            `Moving block from ${newBlockIndex} to ${currentBlockIndex + 1}`
          );
          editorRef.current.blocks.move(newBlockIndex, currentBlockIndex + 1);
        }

        // Save again after repositioning
        const finalData = await editorRef.current.save();
        console.log(
          "Final editor state after image insertion:",
          finalData.blocks.length
        );

        // Focus on the next block
        setTimeout(() => {
          if (!editorRef.current) return;
          const nextIndex = currentBlockIndex + 2; // +2 because we inserted a block
          const nextBlock = editorRef.current.blocks.getBlockByIndex(nextIndex);
          if (nextBlock && nextBlock.holder) {
            nextBlock.holder.focus();
          }
        }, 100);
      } catch (error) {
        console.error("Error inserting image:", error);
      }
    };

    // Expose getContent and insertImage methods to parent via ref
    useImperativeHandle(ref, () => ({
      getContent: async () => {
        if (editorRef.current) {
          try {
            return await editorRef.current.save();
          } catch (error) {
            console.error("Error saving editor content:", error);
            return structuredClone(emptyContent);
          }
        }
        return structuredClone(emptyContent);
      },
      insertImage,
    }));

    // Set up the unmount tracking
    useEffect(() => {
      isMounted.current = true;
      return () => {
        isMounted.current = false;
      };
    }, []);

    // Initialize editor when component mounts - only once
    useEffect(() => {
      // Add custom CSS for title styling
      const styleId = `editor-title-styles-${editorId}`;
      if (!document.getElementById(styleId)) {
        const styleTag = document.createElement("style");
        styleTag.id = styleId;
        styleTag.textContent = titleStyles.replace("EDITOR_ID", editorId);
        document.head.appendChild(styleTag);
      }

      // Create a new editor instance
      const initializeEditor = async () => {
        // Prevent reinitialization if already in progress
        if (isInitializing.current || !isMounted.current) return;
        isInitializing.current = true;

        // Safe cleanup of any existing editor
        if (editorRef.current) {
          try {
            // If the editor exists, try to destroy it safely
            await editorRef.current.isReady;
            editorRef.current.destroy();
          } catch (e) {
            console.warn("Error during editor cleanup:", e);
          } finally {
            editorRef.current = null;
          }
        }

        // Add a small delay to ensure DOM is fully rendered
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Check if component is still mounted after delay
        if (!isMounted.current) {
          isInitializing.current = false;
          return;
        }

        // Retry up to 3 times to find the editor element
        let retryCount = 0;
        let editorElement = null;

        while (retryCount < 3 && !editorElement && isMounted.current) {
          editorElement = document.getElementById(editorId);
          if (!editorElement) {
            console.log(
              `Editor element with ID ${editorId} not found (attempt ${
                retryCount + 1
              }/3), waiting...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 100 * (retryCount + 1))
            );
            retryCount++;
          }
        }

        if (!editorElement) {
          console.error(
            `Failed to find editor element with ID ${editorId} after ${retryCount} attempts`
          );
          isInitializing.current = false;
          return;
        }

        try {
          // Clean the element before creating a new instance
          while (editorElement.firstChild) {
            editorElement.removeChild(editorElement.firstChild);
          }

          console.log(`Creating editor with ID: ${editorId}`);
          const parsedData = parseInitialData();

          // Log the data we're initializing with
          console.log("Initializing editor with data:", {
            blockCount: parsedData.blocks.length,
            firstBlockType: parsedData.blocks[0]?.type,
          });

          const config: EditorConfig = {
            holder: editorId,
            tools: {
              header: {
                class: Header,
                inlineToolbar: true,
                config: {
                  levels: [1, 2, 3, 4, 5, 6],
                  defaultLevel: 2,
                },
              },
              list: {
                class: List,
                inlineToolbar: true,
                config: {
                  defaultStyle: "unordered",
                },
              },
              paragraph: {
                class: Paragraph,
                inlineToolbar: true,
              },
              // Configure image tool to be more inline-friendly
              image: {
                class: ImageTool,
                config: {
                  uploader: imageUploadCallback
                    ? {
                        uploadByFile: imageUploadCallback,
                      }
                    : undefined,
                  inlineToolbar: true,
                  tunes: ["inlineImageTune"],
                  captionPlaceholder: "Caption",
                },
              },
              embed: {
                class: Embed,
                inlineToolbar: true,
                config: {
                  services: {
                    youtube: true,
                    vimeo: true,
                  },
                },
              },
              quote: {
                class: Quote,
                inlineToolbar: true,
              },
              marker: {
                class: Marker,
              },
              inlineCode: {
                class: InlineCode,
              },
              table: {
                class: Table,
                inlineToolbar: true,
              },
              linkTool: {
                class: LinkTool,
              },
              checklist: {
                class: Checklist,
                inlineToolbar: true,
              },
              warning: {
                class: Warning,
                inlineToolbar: true,
              },
              delimiter: {
                class: Delimiter,
              },
            },
            tunes: {
              inlineImageTune: {
                tune: (blockData: any) => {
                  // Add class
                  blockData.block.holder.classList.add("image-tool--inline");

                  // Apply styles to the correct element
                  const imageElement = blockData.block.holder.querySelector(
                    ".image-tool__image-picture"
                  );
                  if (imageElement) {
                    Object.assign(imageElement.style, styles.inlineImage);
                  }
                  // Hide Caption
                  const captionElement = blockData.block.holder.querySelector(
                    ".cdx-input.image-tool__caption"
                  );
                  if (captionElement) {
                    Object.assign(captionElement.style, styles.hiddenCaption);
                  }
                },
              },
            },
            data: parsedData,
            placeholder,
            readOnly,
            logLevel: "ERROR" as LogLevels,
            onChange: async (api?: API) => {
              if (editorRef.current && onChange) {
                try {
                  const outputData = await editorRef.current.save();
                  onChange(outputData);
                } catch (error) {
                  console.error("Error during onChange handler:", error);
                }
              }
            },
            onReady: () => {
              if (!isMounted.current) return;

              setIsReady(true);
              console.log(`Editor ${editorId} is ready`);
              isInitializing.current = false;

              // Add a subtle border to separate blocks
              const firstBlockElement = document.querySelector(
                `#${editorId} .ce-block:first-child`
              );
              if (firstBlockElement) {
                (firstBlockElement as HTMLElement).style.paddingBottom = "10px";
                (firstBlockElement as HTMLElement).style.marginBottom = "15px";
              }

              // Enhance editor appearance
              const editorContainer = document.getElementById(editorId);
              if (editorContainer) {
                // Add soft shadow to editor blocks
                const blocks = editorContainer.querySelectorAll(".ce-block");
                blocks.forEach((block) => {
                  (block as HTMLElement).style.transition =
                    "transform 0.2s ease, box-shadow 0.2s ease";
                });

                // Add transitions to toolbar buttons
                const toolbarButtons = document.querySelectorAll(
                  ".ce-toolbar__actions button, .ce-toolbar__plus, .ce-conversion-toolbar button"
                );
                toolbarButtons.forEach((button) => {
                  (button as HTMLElement).style.transition =
                    "background 0.2s ease, transform 0.1s ease";
                });
              }
            },
          };

          // Only show the toolbar if specified
          if (!showMainToolbar) {
            config.hideToolbar = true; // Use hideToolbar for EditorJS 2.27+
          }

          // Create the editor instance
          const editor = new EditorJS(config);
          editorRef.current = editor;
          editorInstanceId.current = editorId;

          // Handle initialization errors
          editor.isReady.catch((err) => {
            console.error("Editor initialization error:", err);
            isInitializing.current = false;
          });
        } catch (error) {
          console.error("Error initializing EditorJS:", error);
          isInitializing.current = false;
        }
      };

      // Initialize the editor
      initializeEditor();

      // Clean up on unmount
      return () => {
        const cleanup = async () => {
          if (editorRef.current) {
            try {
              console.log(
                `Final cleanup of editor with ID: ${editorInstanceId.current}`
              );
              editorRef.current.destroy();
            } catch (e) {
              console.warn("Error during final editor cleanup:", e);
            }
          }

          // Remove the style tag
          const styleTag = document.getElementById(styleId);
          if (styleTag) {
            styleTag.remove();
          }
        };

        cleanup();
      };
    }, [editorId]); // Only depend on editorId for initialization

    // Handle changes to editor configuration that require reinitialization
    useEffect(() => {
      // Skip the first render
      if (!isReady) return;

      const updateEditorProps = async () => {
        if (!editorRef.current || isInitializing.current || !isMounted.current)
          return;

        try {
          // Update readOnly state without reinitializing
          if (
            editorRef.current.readOnly !== undefined &&
            typeof editorRef.current.readOnly.toggle === "function"
          ) {
            editorRef.current.readOnly.toggle(readOnly);
            console.log(`Updated readOnly state to: ${readOnly}`);
          }

          // For other significant changes that can't be updated dynamically,
          // we log that a restart might be needed but don't automatically reinitialize
          console.log(
            "Editor props updated. Some changes may require reinitialization."
          );
        } catch (error) {
          console.error("Error updating editor properties:", error);
        }
      };

      updateEditorProps();
    }, [readOnly, placeholder, showMainToolbar, imageUploadCallback]);

    // Focus title input on mount if not readonly
    useEffect(() => {
      if (!readOnly && titleInputRef.current) {
        setTimeout(() => {
          titleInputRef.current?.focus();
        }, 200);
      }
    }, [readOnly]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onTitleChange) {
        onTitleChange(e.target.value);
      }
    };

    return (
      <div className={`editorjs-wrapper ${className}`}>
        {/* Title input with elegant styling */}
        <div className="mb-6">
          <input
            ref={titleInputRef}
            value={title}
            onChange={handleTitleChange}
            placeholder="Entry Title"
            style={styles.titleInput as React.CSSProperties}
            className="focus:outline-none placeholder:text-muted-foreground/50"
            aria-label="Entry title"
            readOnly={readOnly}
            disabled={readOnly}
          />
          <div style={styles.titleGradient as React.CSSProperties}></div>
        </div>

        {/* Editor container with enhanced styling */}
        <div
          id={editorId}
          className={`min-h-[250px] focus:outline-none rounded-lg transition-all duration-300 hover:shadow-sm ${
            readOnly ? "editor-readonly" : ""
          }`}
          data-testid="editor-container"
        />
      </div>
    );
  }
);

EditorJSWrapper.displayName = "EditorJSWrapper";

export default EditorJSWrapper;

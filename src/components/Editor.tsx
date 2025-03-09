"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useJournalStore, type JournalEntry } from "@/lib/store/journalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EditorJSWrapper, {
  EditorJSWrapperRef,
} from "@/components/EditorWrapper";
import { OutputData } from "@editorjs/editorjs";
import {
  Edit,
  Save,
  X,
  Tag as TagIcon,
  Star,
  Smile,
  Meh,
  Frown,
  Heart,
  AlertCircle,
  Image as ImageIcon,
  MapPin,
  Cloud,
  Trash,
  RotateCcw,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MoodType = "happy" | "neutral" | "sad" | "excited" | "anxious" | undefined;

export function Editor() {
  // Get store functions and current entry
  const {
    currentEntry,
    isEditing,
    updateEntry,
    setIsEditing,
    toggleFavorite,
    addImageToEntry,
    removeImageFromEntry,
    updateEntryLocation,
    updateEntryWeather,
    restoreEntry,
    permanentlyDeleteEntry,
  } = useJournalStore();

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<OutputData | null>(null);
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState<MoodType>(undefined);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [images, setImages] = useState<string[]>([]); // Store actual images, not IDs
  const [location, setLocation] = useState<JournalEntry["location"]>(undefined);
  const [weather, setWeather] = useState<JournalEntry["weather"]>(undefined);

  const [saving, setSaving] = useState<boolean>(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState<boolean>(false);
  const [showImageUpload, setShowImageUpload] = useState<boolean>(false);
  const [showLocationInput, setShowLocationInput] = useState<boolean>(false);
  const [showWeatherInput, setShowWeatherInput] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorJSWrapperRef>(null);
  const hasUnsavedChanges = useRef<boolean>(false);
  const editorInstanceKey = useRef(Date.now().toString()); // Key to force editor recreation

  const [locationName, setLocationName] = useState<string>("");
  const [weatherCondition, setWeatherCondition] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0);
  const [weatherIcon, setWeatherIcon] = useState<string>("");

  // Create a debounced version of setContent to prevent losing focus
  const debouncedSetContent = useCallback(
    debounce((newContent: OutputData) => {
      setContent(newContent);
    }, 300),
    []
  );

  const getDefaultEditorContent = (): OutputData => {
    return {
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
  };

  // Initialize state when currentEntry changes
  useEffect(() => {
    if (currentEntry) {
      setTitle(currentEntry.title || "");

      // Parse content from string (important - JournalStore.content is a string)
      try {
        const parsedContent = currentEntry.content
          ? JSON.parse(currentEntry.content as string)
          : getDefaultEditorContent();
        setContent(parsedContent);
      } catch (e) {
        console.error("Failed to parse entry content:", e);
        setContent(getDefaultEditorContent());
      }

      setTags(currentEntry.tags || []);
      setMood(currentEntry.mood as MoodType);
      setIsFavorite(currentEntry.isFavorite || false);
      setImages(currentEntry.images || []); // Set actual images array
      setLocation(currentEntry.location);
      setWeather(currentEntry.weather);
      hasUnsavedChanges.current = false;

      // Create a new editor instance when changing entries
      editorInstanceKey.current = Date.now().toString();
    } else {
      resetForm();
    }
  }, [currentEntry?.id]); // Only depend on the ID to prevent unneeded reloads

  // Track changes to determine if save is needed
  useEffect(() => {
    if (currentEntry && isEditing) {
      const tagsChanged =
        JSON.stringify(tags) !== JSON.stringify(currentEntry.tags);
      const imagesChanged =
        JSON.stringify(images) !== JSON.stringify(currentEntry.images);
      const locationChanged =
        JSON.stringify(location) !== JSON.stringify(currentEntry.location);
      const weatherChanged =
        JSON.stringify(weather) !== JSON.stringify(currentEntry.weather);
      const titleChanged = title !== currentEntry.title;

      const somethingChanged =
        titleChanged ||
        tagsChanged ||
        imagesChanged ||
        locationChanged ||
        weatherChanged;

      hasUnsavedChanges.current = somethingChanged;
    }
  }, [
    title,
    tags,
    mood,
    isFavorite,
    images, // Changed from imageIds to images
    location,
    weather,
    currentEntry,
    isEditing,
  ]);

  // Auto-save when exiting edit mode
  useEffect(() => {
    if (!isEditing && currentEntry && hasUnsavedChanges.current) {
      saveChanges();
      hasUnsavedChanges.current = false;
    }
  }, [isEditing, currentEntry?.id]);

  // Warn about unsaved changes before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Cleanup debounced function on component unmount
  useEffect(() => {
    return () => {
      debouncedSetContent.cancel();
    };
  }, [debouncedSetContent]);

  const resetForm = () => {
    setTitle("");
    setContent(getDefaultEditorContent());
    setTagInput("");
    setTags([]);
    setMood(undefined);
    setIsFavorite(false);
    setImages([]);
    setLocation(undefined);
    setWeather(undefined);
    hasUnsavedChanges.current = false;
    editorInstanceKey.current = Date.now().toString();
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput("");
      hasUnsavedChanges.current = true;
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    hasUnsavedChanges.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // Modified to use debounced content updates
  const handleEditorChange = (newContent: OutputData) => {
    // Mark as having unsaved changes immediately
    hasUnsavedChanges.current = true;

    // Use debounced function to update state
    debouncedSetContent(newContent);
  };

  // Handle title changes from EditorWrapper
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    hasUnsavedChanges.current = true;
  };

  const saveChanges = async () => {
    if (!currentEntry) return;
    setSaving(true);

    try {
      let finalContent: OutputData;
      let contentString: string;
      let editorImages: string[] = [];

      if (editorRef.current) {
        // Get content from EditorJS
        finalContent = await editorRef.current.getContent();
        setContent(finalContent);

        // Convert content to string for storage
        contentString = JSON.stringify(finalContent);

        // Extract image URLs from the editor content
        const editorImageUrls = finalContent.blocks
          .filter(
            (block) => block.type === "image" && block.data && block.data.url
          )
          .map((block) => block.data.url);

        // Identify new base64 images not already in our images array
        editorImageUrls.forEach((url) => {
          if (url.startsWith("data:image/") && !images.includes(url)) {
            editorImages.push(url);
          }
        });
      } else if (content) {
        finalContent = content;
        contentString = JSON.stringify(finalContent);
      } else {
        finalContent = getDefaultEditorContent();
        contentString = JSON.stringify(finalContent);
      }

      // Combine current images with new ones from editor
      const allImages = [...images, ...editorImages];

      // Update the entry with all data
      updateEntry(currentEntry.id, {
        title,
        content: contentString, // Store as string
        tags,
        mood,
        isFavorite,
        images: allImages,
        location,
        weather,
      });

      // Update local state with all images
      setImages(allImages);
    } catch (error) {
      console.error("Error saving editor content:", error);
    } finally {
      setTimeout(() => {
        setSaving(false);
        hasUnsavedChanges.current = false;
      }, 500);
    }
  };

  const handleCancelEditing = () => {
    if (hasUnsavedChanges.current) {
      setShowUnsavedWarning(true);
    } else {
      discardChanges();
    }
  };

  const discardChanges = () => {
    if (currentEntry) {
      setTitle(currentEntry.title || "");

      // Parse content from string
      try {
        const parsedContent = currentEntry.content
          ? JSON.parse(currentEntry.content as string)
          : getDefaultEditorContent();
        setContent(parsedContent);
      } catch (e) {
        console.error(
          "Failed to parse entry content when discarding changes:",
          e
        );
        setContent(getDefaultEditorContent());
      }

      setTags(currentEntry.tags || []);
      setMood(currentEntry.mood as MoodType);
      setIsFavorite(currentEntry.isFavorite || false);
      setImages(currentEntry.images || []);
      setLocation(currentEntry.location);
      setWeather(currentEntry.weather);

      hasUnsavedChanges.current = false;
      setIsEditing(false);
      setShowUnsavedWarning(false);

      // Force editor recreation
      editorInstanceKey.current = Date.now().toString();
    }
  };

  const handleMoodChange = (value: string) => {
    setMood(value as MoodType);
    hasUnsavedChanges.current = true;
  };

  const handleFavoriteToggle = () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);

    if (currentEntry && !isEditing) {
      toggleFavorite(currentEntry.id);
    } else {
      hasUnsavedChanges.current = true;
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection for image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !currentEntry) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        const base64String = event.target.result.toString();

        if (!isEditing) {
          // In view mode - save directly to store
          addImageToEntry(currentEntry.id, base64String);
          // Also update local state
          setImages((prev) => [...prev, base64String]);
        } else {
          // In edit mode - add to editor and mark changes
          if (editorRef.current) {
            editorRef.current.insertImage(base64String);
          }

          // Also update local state
          setImages((prev) => [...prev, base64String]);
          hasUnsavedChanges.current = true;
        }
      }
    };

    reader.readAsDataURL(file);

    // Clear the file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove image using index instead of ID
  const handleRemoveImage = (imageIndex: number) => {
    if (!currentEntry) return;

    // Remove from local state
    setImages((prev) => prev.filter((_, idx) => idx !== imageIndex));

    if (!isEditing) {
      // In view mode, update the store
      removeImageFromEntry(currentEntry.id, imageIndex);
    } else {
      // In edit mode, mark as having unsaved changes
      hasUnsavedChanges.current = true;
    }
  };

  const handleSaveLocation = () => {
    if (!currentEntry) return;

    const newLocation = {
      name: locationName,
      coordinates: undefined,
    };

    setLocation(newLocation);
    setShowLocationInput(false);

    if (!isEditing) {
      updateEntryLocation(currentEntry.id, newLocation);
    } else {
      hasUnsavedChanges.current = true;
    }
  };

  const handleSaveWeather = () => {
    if (!currentEntry) return;

    const newWeather = {
      condition: weatherCondition,
      temperature: temperature,
      icon: weatherIcon || "🌤️",
    };

    setWeather(newWeather);
    setShowWeatherInput(false);

    if (!isEditing) {
      updateEntryWeather(currentEntry.id, newWeather);
    } else {
      hasUnsavedChanges.current = true;
    }
  };

  const handleRestoreEntry = () => {
    if (currentEntry) {
      restoreEntry(currentEntry.id);
    }
  };

  const handlePermanentlyDeleteEntry = () => {
    if (currentEntry) {
      permanentlyDeleteEntry(currentEntry.id);
    }
  };

  const getMoodIcon = () => {
    switch (mood) {
      case "happy":
        return <Smile className="h-5 w-5 text-green-500" />;
      case "neutral":
        return <Meh className="h-5 w-5 text-blue-500" />;
      case "sad":
        return <Frown className="h-5 w-5 text-red-500" />;
      case "excited":
        return <Heart className="h-5 w-5 text-pink-500" />;
      case "anxious":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getFormattedDate = (date: Date | string | undefined) => {
    if (!date) return "";
    return typeof window !== "undefined"
      ? format(new Date(date), "MMMM d, yyyy 'at' h:mm a")
      : "";
  };

  const formattedDate = currentEntry
    ? getFormattedDate(currentEntry.updatedAt)
    : "";
  const formattedCreatedDate = currentEntry
    ? getFormattedDate(currentEntry.createdAt)
    : "";

  // Mock image upload callback for EditorJS
  const handleImageUploadForEditor = async (file: File) => {
    return new Promise<{ success: number; file: { url: string } }>(
      (resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64String = event.target.result.toString();

            // We'll handle storing images in the centralized save function
            // This just returns the data for EditorJS to display
            resolve({
              success: 1,
              file: { url: base64String },
            });
          } else {
            resolve({
              success: 0,
              file: { url: "" },
            });
          }
        };
        reader.readAsDataURL(file);
      }
    );
  };

  // Updated image gallery rendering to work with direct image URLs
  const renderImageGallery = () => {
    if (!images || images.length === 0) return null;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-6">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className="relative aspect-square group overflow-hidden rounded-lg border border-border shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <img
              src={imageUrl}
              alt={`Journal image ${index + 1}`}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              onClick={() => {
                setCurrentImageIndex(index);
                setShowImageUpload(true);
              }}
            />
            {isEditing && (
              <button
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage(index);
                }}
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!currentEntry) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
          <h2 className="text-2xl font-medium mb-3">No Entry Selected</h2>
          <p className="text-lg">
            Select an entry from the sidebar or create a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <div className="border-b px-4 py-3 flex justify-between items-center bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/60 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  className="h-9 w-9 rounded-full"
                  aria-label={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                >
                  <Star
                    className={cn(
                      "h-5 w-5",
                      isFavorite
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFavorite ? "Remove from favorites" : "Add to favorites"}
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger className="flex items-center">
                  <Clock className="h-4 w-4 mr-1.5" />
                  <span>Last edited on {formattedDate}</span>
                </TooltipTrigger>
                <TooltipContent>
                  Created on {formattedCreatedDate}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentEntry.isDeleted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4 mr-1.5" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRestoreEntry}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handlePermanentlyDeleteEntry}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditing}
                  disabled={saving}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  <span>Cancel</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={saveChanges}
                  disabled={saving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? (
                    <span className="flex items-center">
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1.5" />
                      <span>Save</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={currentEntry.isDeleted}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto w-full pt-8 pb-16 px-6">
            {isEditing ? (
              <div className="space-y-8">
                {/* Title input moved to EditorWrapper */}
                {/* Metadata controls */}
                <div className="flex flex-wrap gap-2 bg-muted/30 p-3 rounded-lg shadow-sm border border-border">
                  {/* Mood Selection */}
                  <Select value={mood} onValueChange={handleMoodChange}>
                    <SelectTrigger className="w-36 h-9 bg-background">
                      <SelectValue placeholder="Select mood" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="happy">
                        <div className="flex items-center">
                          <Smile className="h-4 w-4 text-green-500 mr-2" />
                          Happy
                        </div>
                      </SelectItem>
                      <SelectItem value="neutral">
                        <div className="flex items-center">
                          <Meh className="h-4 w-4 text-blue-500 mr-2" />
                          Neutral
                        </div>
                      </SelectItem>
                      <SelectItem value="sad">
                        <div className="flex items-center">
                          <Frown className="h-4 w-4 text-red-500 mr-2" />
                          Sad
                        </div>
                      </SelectItem>
                      <SelectItem value="excited">
                        <div className="flex items-center">
                          <Heart className="h-4 w-4 text-pink-500 mr-2" />
                          Excited
                        </div>
                      </SelectItem>
                      <SelectItem value="anxious">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                          Anxious
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Tag Management */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 bg-background"
                      >
                        <TagIcon className="h-4 w-4 mr-1.5" />
                        Tags {tags.length > 0 && `(${tags.length})`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Manage Tags</h4>
                        <div className="flex items-center gap-2">
                          <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter tag name"
                            className="flex-1"
                          />
                          <Button size="sm" onClick={addTag}>
                            Add
                          </Button>
                        </div>

                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {tags.map((tag) => (
                              <Badge
                                key={tag}
                                className="flex items-center gap-1 px-3 py-1.5"
                                variant="secondary"
                              >
                                {tag}
                                <X
                                  className="h-3 w-3 ml-1 cursor-pointer"
                                  onClick={() => removeTag(tag)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Location Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 bg-background"
                    onClick={() => {
                      setLocationName(location?.name || "");
                      setShowLocationInput(true);
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-1.5" />
                    {location ? location.name : "Add Location"}
                  </Button>

                  {/* Weather Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 bg-background"
                    onClick={() => {
                      if (weather) {
                        setWeatherCondition(weather.condition);
                        setTemperature(weather.temperature);
                        setWeatherIcon(weather.icon);
                      } else {
                        setWeatherCondition("");
                        setTemperature(0);
                        setWeatherIcon("🌤️");
                      }
                      setShowWeatherInput(true);
                    }}
                  >
                    <Cloud className="h-4 w-4 mr-1.5" />
                    {weather
                      ? `${weather.condition}, ${weather.temperature}°`
                      : "Add Weather"}
                  </Button>

                  {/* Image Upload Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 bg-background"
                    onClick={handleImageUpload}
                  >
                    <ImageIcon className="h-4 w-4 mr-1.5" />
                    Add Image
                  </Button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Editor Content Area - Now using the title from EditorWrapper */}
                <div className="border border-border rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="p-6">
                    <EditorJSWrapper
                      key={editorInstanceKey.current}
                      ref={editorRef}
                      initialContent={content}
                      title={title}
                      onTitleChange={handleTitleChange}
                      placeholder="Write your thoughts here..."
                      onChange={handleEditorChange}
                      className="min-h-[400px]"
                      showMainToolbar={true}
                      imageUploadCallback={handleImageUploadForEditor}
                      editorId={`editor-${
                        currentEntry ? currentEntry.id : "new"
                      }-${editorInstanceKey.current}`}
                    />
                  </div>
                </div>

                {/* Image gallery section */}
                {renderImageGallery()}
              </div>
            ) : (
              <div className="space-y-6 pb-16">
                {/* View mode - Elegant design */}
                <div>
                  {/* Title is now handled by EditorWrapper */}
                  {/* Metadata badges in view mode */}
                  {(mood || location || weather || tags.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                      {mood && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 px-3 py-1.5 bg-background/80"
                        >
                          {getMoodIcon()}
                          <span className="ml-1 font-medium">
                            {mood.charAt(0).toUpperCase() + mood.slice(1)}
                          </span>
                        </Badge>
                      )}

                      {location && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 px-3 py-1.5 bg-background/80"
                        >
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          <span>{location.name}</span>
                        </Badge>
                      )}

                      {weather && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 px-3 py-1.5 bg-background/80"
                        >
                          <Cloud className="h-3.5 w-3.5 mr-1" />
                          <span>
                            {weather.icon} {weather.condition},{" "}
                            {weather.temperature}°
                          </span>
                        </Badge>
                      )}

                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="px-3 py-1.5"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Editor Content */}
                  <div className="prose prose-sm md:prose-base max-w-none">
                    <EditorJSWrapper
                      key={`view-${editorInstanceKey.current}`}
                      initialContent={content}
                      title={title}
                      readOnly={true}
                      className="min-h-[200px] border-none shadow-none"
                      showMainToolbar={false}
                      editorId={`view-editor-${currentEntry.id}-${editorInstanceKey.current}`}
                    />
                  </div>

                  {/* Image gallery in view mode */}
                  {renderImageGallery()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        {/* Unsaved Changes Warning */}
        <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes in your entry. What would you like to
                do?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowUnsavedWarning(false)}
              >
                Continue Editing
              </Button>
              <Button variant="destructive" onClick={discardChanges}>
                Discard Changes
              </Button>
              <Button
                onClick={() => {
                  saveChanges();
                  setShowUnsavedWarning(false);
                  setIsEditing(false);
                }}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Location Dialog */}
        <Dialog open={showLocationInput} onOpenChange={setShowLocationInput}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {location ? "Update Location" : "Add Location"}
              </DialogTitle>
              <DialogDescription>
                Enter a location name for your journal entry
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Coffee Shop, Home, Park"
                className="bg-background"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowLocationInput(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveLocation}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Weather Dialog */}
        <Dialog open={showWeatherInput} onOpenChange={setShowWeatherInput}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {weather ? "Update Weather" : "Add Weather"}
              </DialogTitle>
              <DialogDescription>
                Record the weather for your journal entry
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Condition</label>
                <Input
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  placeholder="e.g. Sunny, Rainy, Cloudy"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Temperature (°C)</label>
                <Input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  placeholder="Enter temperature"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Weather Icon (emoji or code)
                </label>
                <Input
                  value={weatherIcon}
                  onChange={(e) => setWeatherIcon(e.target.value)}
                  placeholder="e.g. ☀️, 🌧️, 🌤️"
                  className="bg-background"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowWeatherInput(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveWeather}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Viewer */}
        <Dialog
          open={showImageUpload && currentImageIndex !== null}
          onOpenChange={(open) => {
            if (!open) setShowImageUpload(false);
          }}
        >
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            {currentImageIndex !== null &&
              images.length > 0 &&
              currentImageIndex < images.length && (
                <div className="flex flex-col">
                  <div className="relative w-full bg-black/90">
                    <div className="absolute top-4 right-4 z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-black/50 text-white hover:bg-black/70"
                        onClick={() => setShowImageUpload(false)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="h-[70vh] w-full flex items-center justify-center p-4">
                      <img
                        src={images[currentImageIndex]}
                        alt={`Journal image ${currentImageIndex + 1}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-background">
                    <div className="text-sm text-muted-foreground">
                      Image {currentImageIndex + 1} of {images.length}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === 0}
                        onClick={() => {
                          if (currentImageIndex > 0) {
                            setCurrentImageIndex(currentImageIndex - 1);
                          }
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === images.length - 1}
                        onClick={() => {
                          if (currentImageIndex < images.length - 1) {
                            setCurrentImageIndex(currentImageIndex + 1);
                          }
                        }}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useJournalStore, type JournalEntry } from "@/lib/store/journalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JSONContent } from "@tiptap/react";
import FloatingEditor, { FloatingEditorRef } from "@/lib/FloatingSlateEditor";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MoodType = "happy" | "neutral" | "sad" | "excited" | "anxious" | undefined;

export function Editor() {
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
  const [content, setContent] = useState<JSONContent | null>(null);
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState<MoodType>(undefined);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [images, setImages] = useState<string[]>([]);
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
  const editorRef = useRef<FloatingEditorRef>(null);
  const hasUnsavedChanges = useRef<boolean>(false);

  const [locationName, setLocationName] = useState<string>("");
  const [weatherCondition, setWeatherCondition] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0);
  const [weatherIcon, setWeatherIcon] = useState<string>("");

  const parseContentToJSON = (contentStr: string): JSONContent => {
    if (!contentStr) {
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
          },
        ],
      };
    }

    try {
      return JSON.parse(contentStr);
    } catch (e) {
      console.log("Content parsing error:", e);

      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: contentStr }],
          },
        ],
      };
    }
  };

  useEffect(() => {
    if (currentEntry) {
      setTitle(currentEntry.title);

      try {
        const parsedContent = parseContentToJSON(currentEntry.content);
        setContent(parsedContent);
      } catch (error) {
        console.error("Failed to parse entry content:", error);
        setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        });
      }

      setTags(currentEntry.tags || []);
      setMood(currentEntry.mood as MoodType);
      setIsFavorite(currentEntry.isFavorite);
      setImages(currentEntry.images || []);
      setLocation(currentEntry.location);
      setWeather(currentEntry.weather);
      hasUnsavedChanges.current = false;
    } else {
      resetForm();
    }
  }, [currentEntry]);

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
    images,
    location,
    weather,
    currentEntry,
    isEditing,
  ]);

  // Save changes when editing is toggled off
  useEffect(() => {
    if (!isEditing && currentEntry && hasUnsavedChanges.current) {
      saveChanges();
      hasUnsavedChanges.current = false; // Reset after saving
    }
  }, [isEditing, currentEntry]); // Removed saveChanges from dependency array to prevent redundant calls

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

  const resetForm = () => {
    setTitle("");
    setContent(null);
    setTagInput("");
    setTags([]);
    setMood(undefined);
    setIsFavorite(false);
    setImages([]);
    setLocation(undefined);
    setWeather(undefined);
    hasUnsavedChanges.current = false;
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

  const handleEditorChange = (newContent: JSONContent) => {
    setContent(newContent);
    hasUnsavedChanges.current = true;
  };

  const saveChanges = () => {
    if (!currentEntry) return;

    setSaving(true);

    let finalContent: string;

    try {
      if (editorRef.current) {
        const editorContent = editorRef.current.getContent();
        finalContent = JSON.stringify(editorContent);
      } else if (content) {
        finalContent = JSON.stringify(content);
      } else {
        finalContent = currentEntry.content;
      }
    } catch (error) {
      console.error("Error serializing editor content:", error);
      finalContent = currentEntry.content;
    }

    updateEntry(currentEntry.id, {
      title,
      content: finalContent,
      tags,
      mood,
      isFavorite,
      images,
      location,
      weather,
    });

    setTimeout(() => {
      setSaving(false);
      hasUnsavedChanges.current = false;
    }, 500);
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
      setTitle(currentEntry.title);
      setContent(parseContentToJSON(currentEntry.content));
      setTags(currentEntry.tags || []);
      setMood(currentEntry.mood as MoodType);
      setIsFavorite(currentEntry.isFavorite);
      setImages(currentEntry.images || []);
      setLocation(currentEntry.location);
      setWeather(currentEntry.weather);

      hasUnsavedChanges.current = false;
      setIsEditing(false);
      setShowUnsavedWarning(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !currentEntry) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        const base64String = event.target.result.toString();

        setImages((prev) => [...prev, base64String]);

        if (!isEditing) {
          addImageToEntry(currentEntry.id, base64String);
        } else {
          hasUnsavedChanges.current = true;
        }
      }
    };

    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index: number) => {
    if (!currentEntry) return;

    setImages((prev) => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });

    if (!isEditing) {
      removeImageFromEntry(currentEntry.id, index);
    } else {
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    hasUnsavedChanges.current = true;
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

  if (!currentEntry) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-medium mb-2">No Entry Selected</h2>
          <p>Select an entry from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <div className="border-b p-4 flex justify-between items-center bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  className="h-8 w-8"
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
                  <Clock className="h-4 w-4 mr-1" />
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
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreEntry}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  <span>Restore</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handlePermanentlyDeleteEntry}
                >
                  <Trash className="h-4 w-4 mr-1" />
                  <span>Delete Permanently</span>
                </Button>
              </>
            ) : isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveChanges}
                  disabled={saving}
                >
                  {saving ? (
                    <span className="flex items-center">
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      <span>Save</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditing}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  <span>Cancel</span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={currentEntry.isDeleted}
              >
                <Edit className="h-4 w-4 mr-1" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto w-full p-6">
            {isEditing ? (
              <div className="space-y-6">
                {/* New Integrated Editor UI */}
                <div className="border border-border rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md focus-within:shadow-md focus-within:border-primary/50">
                  {/* Editor Header with Title and Metadata */}
                  <div className="p-6 border-b">
                    <input
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="Entry Title"
                      className="text-3xl font-semibold w-full border-none p-0 mb-4 focus:outline-none bg-transparent"
                    />

                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      {/* Mood Selection */}
                      <Select value={mood} onValueChange={handleMoodChange}>
                        <SelectTrigger className="w-36">
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
                          <Button variant="outline" size="sm">
                            <TagIcon className="h-4 w-4 mr-1" />
                            Add Tags
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-2">
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
                              <div className="flex flex-wrap gap-1 mt-2">
                                {tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    className="flex items-center gap-1"
                                  >
                                    {tag}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
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
                        onClick={() => {
                          setLocationName(location?.name || "");
                          setShowLocationInput(true);
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        {location ? location.name : "Add Location"}
                      </Button>

                      {/* Weather Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (weather) {
                            setWeatherCondition(weather.condition);
                            setTemperature(weather.temperature);
                            setWeatherIcon(weather.icon);
                          } else {
                            setWeatherCondition("");
                            setTemperature(0);
                            setWeatherIcon("");
                          }
                          setShowWeatherInput(true);
                        }}
                      >
                        <Cloud className="h-4 w-4 mr-1" />
                        {weather
                          ? `${weather.condition}, ${weather.temperature}°`
                          : "Add Weather"}
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </div>

                    {/* Display tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Editor Content */}
                  <FloatingEditor
                    ref={editorRef}
                    initialContent={content}
                    placeholder="Write your thoughts..."
                    onChange={handleEditorChange}
                    className="min-h-[400px] p-4"
                    showMainToolbar={true}
                  />
                </div>

                {/* Images Section */}
                {images.length > 0 && (
                  <Card className="mt-8 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="text-lg font-medium">Images</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleImageUpload}
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Add More
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2">
                        {images.map((img, index) => (
                          <div
                            key={index}
                            className="relative group rounded-lg overflow-hidden aspect-square"
                          >
                            <img
                              src={img}
                              alt={`Journal image ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                className="p-2 bg-red-500 text-white rounded-full transform scale-75 hover:scale-100 transition-all duration-200"
                                onClick={() => handleRemoveImage(index)}
                                aria-label="Remove image"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-6 pb-16">
                {/* View mode - Integrated design */}
                <div className="border border-border rounded-lg shadow-sm overflow-hidden">
                  {/* Header with title and metadata */}
                  <div className="p-6 border-b bg-muted/30">
                    <h1 className="text-3xl font-semibold mb-4">{title}</h1>

                    <div className="flex flex-wrap items-center gap-3">
                      {mood && (
                        <div className="flex items-center">
                          {getMoodIcon()}
                          <span className="ml-1 text-sm">
                            {mood.charAt(0).toUpperCase() + mood.slice(1)}
                          </span>
                        </div>
                      )}

                      {location && (
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{location.name}</span>
                        </div>
                      )}

                      {weather && (
                        <div className="flex items-center text-sm">
                          <Cloud className="h-4 w-4 mr-1" />
                          <span>
                            {weather.condition}, {weather.temperature}°
                          </span>
                        </div>
                      )}
                    </div>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content area */}
                  <div className="p-6">
                    <div className="prose prose-sm md:prose-base max-w-none">
                      <FloatingEditor
                        initialContent={content}
                        readOnly={true}
                        className="min-h-[200px] border-none shadow-none"
                        showMainToolbar={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Images Section */}
                {images.length > 0 && (
                  <div className="mt-8 pt-4 border-t">
                    <h3 className="text-lg font-medium mb-4">Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.map((img, index) => (
                        <div
                          key={index}
                          className="cursor-pointer rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all transform hover:scale-[1.02] duration-200"
                          onClick={() => {
                            setCurrentImageIndex(index);
                            setShowImageUpload(true);
                          }}
                        >
                          <div className="aspect-square">
                            <img
                              src={img}
                              alt={`Journal image ${index + 1}`}
                              className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dialogs - Keep all dialogs as they were */}
        {/* Unsaved Changes Warning */}
        <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
          <DialogContent>
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
          <DialogContent>
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
          <DialogContent>
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
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Temperature (°C)</label>
                <Input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  placeholder="Enter temperature"
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
        <Dialog open={showImageUpload} onOpenChange={setShowImageUpload}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            {currentImageIndex !== null &&
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

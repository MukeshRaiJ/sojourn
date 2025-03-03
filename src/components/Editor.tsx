// components/Editor.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useJournalStore } from "@/lib/store/journalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  Save,
  X,
  Tag as TagIcon,
  Star,
  Calendar,
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

// Define types for the entry and mood
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

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState<MoodType>(undefined);
  const [isFavorite, setIsFavorite] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState<
    | {
        name: string;
        coordinates?: { latitude: number; longitude: number };
      }
    | undefined
  >(undefined);
  const [weather, setWeather] = useState<
    | {
        condition: string;
        temperature: number;
        icon: string;
      }
    | undefined
  >(undefined);

  // For image upload
  const [showImageUpload, setShowImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null
  );

  // For location input
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationName, setLocationName] = useState("");

  // For weather input
  const [showWeatherInput, setShowWeatherInput] = useState(false);
  const [weatherCondition, setWeatherCondition] = useState("");
  const [temperature, setTemperature] = useState<number>(0);
  const [weatherIcon, setWeatherIcon] = useState("");

  // Track if there are unsaved changes
  const hasUnsavedChanges = useRef(false);

  // Load entry data when current entry changes
  useEffect(() => {
    if (currentEntry) {
      setTitle(currentEntry.title);
      setContent(currentEntry.content);
      setTags(currentEntry.tags || []);
      setMood(currentEntry.mood);
      setIsFavorite(currentEntry.isFavorite);
      setImages(currentEntry.images || []);
      setLocation(currentEntry.location);
      setWeather(currentEntry.weather);
      hasUnsavedChanges.current = false;
    } else {
      resetForm();
    }
  }, [currentEntry]);

  // Track changes in form fields to detect modifications
  useEffect(() => {
    if (currentEntry) {
      // Deep compare tags arrays and objects since they're complex structures
      const tagsChanged =
        JSON.stringify(tags) !== JSON.stringify(currentEntry.tags);
      const imagesChanged =
        JSON.stringify(images) !== JSON.stringify(currentEntry.images);
      const locationChanged =
        JSON.stringify(location) !== JSON.stringify(currentEntry.location);
      const weatherChanged =
        JSON.stringify(weather) !== JSON.stringify(currentEntry.weather);

      const isModified =
        title !== currentEntry.title ||
        content !== currentEntry.content ||
        tagsChanged ||
        mood !== currentEntry.mood ||
        isFavorite !== currentEntry.isFavorite ||
        imagesChanged ||
        locationChanged ||
        weatherChanged;

      hasUnsavedChanges.current = isModified;
    }
  }, [
    title,
    content,
    tags,
    mood,
    isFavorite,
    images,
    location,
    weather,
    currentEntry,
  ]);

  // Save changes when editing is toggled off and there are unsaved changes
  useEffect(() => {
    if (!isEditing && currentEntry && hasUnsavedChanges.current) {
      saveChanges();
      hasUnsavedChanges.current = false;
    }
  }, [isEditing]); // Only depend on isEditing, not currentEntry

  const resetForm = () => {
    setTitle("");
    setContent("");
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
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const saveChanges = () => {
    if (currentEntry) {
      updateEntry(currentEntry.id, {
        title,
        content,
        tags,
        mood,
        isFavorite,
        images,
        location,
        weather,
      });
    }
  };

  const handleMoodChange = (value: string) => {
    setMood(value as MoodType);
  };

  const handleFavoriteToggle = () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);

    if (currentEntry && !isEditing) {
      // Only toggle in store if not in editing mode
      toggleFavorite(currentEntry.id);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target && event.target.result && currentEntry) {
          const base64String = event.target.result.toString();
          setImages([...images, base64String]);

          if (!isEditing) {
            // If not in edit mode, update directly
            addImageToEntry(currentEntry.id, base64String);
          }
        }
      };

      reader.readAsDataURL(file);
    }
    // Reset the input value to allow uploading the same file again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);

    if (currentEntry && !isEditing) {
      removeImageFromEntry(currentEntry.id, index);
    }
  };

  const handleSaveLocation = () => {
    const newLocation = {
      name: locationName,
      coordinates: navigator.geolocation ? undefined : undefined, // Would normally set coordinates here after getting them
    };

    setLocation(newLocation);
    setShowLocationInput(false);

    if (currentEntry && !isEditing) {
      updateEntryLocation(currentEntry.id, newLocation);
    }
  };

  const handleSaveWeather = () => {
    const newWeather = {
      condition: weatherCondition,
      temperature: temperature,
      icon: weatherIcon,
    };

    setWeather(newWeather);
    setShowWeatherInput(false);

    if (currentEntry && !isEditing) {
      updateEntryWeather(currentEntry.id, newWeather);
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

  // Client-side only rendering for date formatting
  const formattedDate = currentEntry
    ? typeof window !== "undefined"
      ? format(new Date(currentEntry.updatedAt), "MMMM d, yyyy")
      : ""
    : "";

  if (!currentEntry) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-2">No Entry Selected</h2>
          <p>Select an entry from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header Bar */}
      <div className="border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavoriteToggle}
            className="h-8 w-8"
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

          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            Last edited on {formattedDate}
          </div>

          {mood && <div className="ml-2">{getMoodIcon()}</div>}

          {location && (
            <div className="ml-2 flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1" />
              {location.name}
            </div>
          )}

          {weather && (
            <div className="ml-2 flex items-center text-sm text-muted-foreground">
              <Cloud className="h-4 w-4 mr-1" />
              {weather.condition}, {weather.temperature}°
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentEntry.isDeleted ? (
            <>
              <Button variant="outline" size="sm" onClick={handleRestoreEntry}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handlePermanentlyDeleteEntry}
              >
                <Trash className="h-4 w-4 mr-1" />
                Delete Permanently
              </Button>
            </>
          ) : isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  saveChanges();
                  hasUnsavedChanges.current = false;
                  setIsEditing(false);
                }}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentEntry) {
                    setTitle(currentEntry.title);
                    setContent(currentEntry.content);
                    setTags(currentEntry.tags || []);
                    setMood(currentEntry.mood);
                    setIsFavorite(currentEntry.isFavorite);
                    setImages(currentEntry.images || []);
                    setLocation(currentEntry.location);
                    setWeather(currentEntry.weather);
                    hasUnsavedChanges.current = false;
                    setIsEditing(false);
                  }
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
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
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {isEditing ? (
          <div className="space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry Title"
              className="text-2xl font-semibold border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
            />

            <div className="flex flex-wrap items-center gap-2 py-2">
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
                          <Badge key={tag} className="flex items-center gap-1">
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

              {/* Image Button */}
              <Button variant="outline" size="sm" onClick={handleImageUpload}>
                <ImageIcon className="h-4 w-4 mr-1" />
                Add Image
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />

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
                {location ? "Update Location" : "Add Location"}
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
                {weather ? "Update Weather" : "Add Weather"}
              </Button>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts..."
              className="min-h-[300px] border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0 text-lg"
            />

            {/* Images Section */}
            {images.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Journal image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{title}</h1>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 py-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="whitespace-pre-wrap text-lg">{content}</div>

            {/* Images Section */}
            {images.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className="cursor-pointer"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setShowImageUpload(true);
                      }}
                    >
                      <img
                        src={img}
                        alt={`Journal image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
        <DialogContent className="max-w-3xl">
          {currentImageIndex !== null && currentImageIndex < images.length && (
            <div className="flex flex-col items-center">
              <div className="w-full h-auto max-h-[500px] overflow-hidden">
                <img
                  src={images[currentImageIndex]}
                  alt={`Journal image ${currentImageIndex + 1}`}
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowImageUpload(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

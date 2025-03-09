"use client";

import { useEffect, useState, useCallback, useMemo, JSX } from "react";
import { useJournalStore, JournalEntry } from "@/lib/store/journalStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitch } from "@/theme/ThemeSwitch";
import {
  Search,
  Plus,
  Calendar,
  Star,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  BookOpen,
  AlertTriangle,
  CalendarIcon,
  X,
  Filter,
  PenLine,
  Menu,
  CloudUpload,
  Settings,
  BarChart2,
  Zap,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isEqual, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function Sidebar(): JSX.Element {
  const {
    entries,
    currentEntry,
    searchQuery,
    selectedTag,
    selectedMood,
    selectedDate,
    streakData,
    settings,
    createEntry,
    createEntryWithTemplate,
    setCurrentEntry,
    setSearchQuery,
    setSelectedTag,
    setSelectedMood,
    setSelectedDate,
    deleteEntry,
    toggleFavorite,
    getAllTags,
    getAllMoods,
    updateTagCache,
    exportEntries,
    importEntries,
    viewMode,
    setViewMode,
    emptyBin,
    permanentlyDeleteEntry,
    restoreEntry,
    calculateStreak,
    updateSettings,
  } = useJournalStore();

  // Consolidated UI state
  const [uiState, setUiState] = useState({
    filteredEntries: [] as JournalEntry[],
    showImportDialog: false,
    importData: "",
    showEmptyBinDialog: false,
    showExportData: false,
    exportData: "",
    isCalendarOpen: false,
    isFilterOpen: false,
    showSettingsDialog: false,
    showStatsDialog: false,
    showMoodFilter: false,
  });

  // Memoize the available moods for filtering
  const moodOptions = useMemo(() => {
    const allMoods = getAllMoods();
    const defaultMoods = [
      "😊 Happy",
      "😔 Sad",
      "😐 Neutral",
      "😡 Angry",
      "😌 Calm",
      "🤔 Thoughtful",
    ];

    // Combine custom moods with default ones, removing duplicates
    return Array.from(new Set([...allMoods, ...defaultMoods]));
  }, [getAllMoods]);

  // Get all tags directly without causing state updates during render
  const allTags = useMemo(() => {
    return getAllTags();
  }, [getAllTags]);

  // Memoize the filter function to prevent unnecessary recalculations
  const getFilteredEntries = useCallback(() => {
    let result = [...entries];

    // Filter based on view mode
    if (viewMode === "favorites") {
      result = result.filter((entry) => entry.isFavorite && !entry.isDeleted);
    } else if (viewMode === "deleted") {
      result = result.filter((entry) => entry.isDeleted);
    } else {
      // "all" view - show only non-deleted entries
      result = result.filter((entry) => !entry.isDeleted);
    }

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (entry) =>
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Apply tag filter - only if not in deleted view
    if (selectedTag && viewMode !== "deleted") {
      result = result.filter((entry) => entry.tags.includes(selectedTag));
    }

    // Apply date filter if selected
    if (selectedDate && viewMode !== "deleted") {
      result = result.filter((entry) => {
        const entryDate = new Date(entry.createdAt);
        return isEqual(
          new Date(
            entryDate.getFullYear(),
            entryDate.getMonth(),
            entryDate.getDate()
          ),
          new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate()
          )
        );
      });
    }

    // Apply mood filter if selected
    if (selectedMood && viewMode !== "deleted") {
      result = result.filter((entry) => entry.mood === selectedMood);
    }

    // Apply sorting
    result = sortEntries(result, settings.defaultSortOrder);

    return result;
  }, [
    entries,
    searchQuery,
    selectedTag,
    viewMode,
    selectedDate,
    selectedMood,
    settings.defaultSortOrder,
  ]);

  // Sort entries based on selected sort option
  const sortEntries = (entriesToSort: JournalEntry[], sortOption: string) => {
    switch (sortOption) {
      case "oldest":
        return [...entriesToSort].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "alphabetical":
        return [...entriesToSort].sort((a, b) =>
          a.title.localeCompare(b.title)
        );
      case "newest":
      default:
        return [...entriesToSort].sort((a, b) => {
          if (a.isDeleted && b.isDeleted) {
            // Both deleted - sort by deletedAt
            const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
            const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
            return dateB - dateA;
          } else if (!a.isDeleted && !b.isDeleted) {
            // Both not deleted - sort by updatedAt
            return (
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          } else {
            // One deleted, one not - deleted entries go to the bottom
            return a.isDeleted ? 1 : -1;
          }
        });
    }
  };

  useEffect(() => {
    // Only update filtered entries when dependencies actually change
    setUiState((prev) => ({ ...prev, filteredEntries: getFilteredEntries() }));
  }, [getFilteredEntries]);

  // Update tag cache when entries change
  useEffect(() => {
    updateTagCache();
  }, [entries.length, updateTagCache]);

  // Calculate streak on initial load and when entries change
  useEffect(() => {
    calculateStreak();
  }, [entries, calculateStreak]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date || null);
    setUiState((prev) => ({ ...prev, isCalendarOpen: false }));
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  const clearMoodFilter = () => {
    setSelectedMood(null);
  };

  // Dates with entries for highlighting in calendar
  const datesWithEntries = useMemo(() => {
    const dates = new Set<string>();
    entries
      .filter((entry) => !entry.isDeleted) // Only consider non-deleted entries
      .forEach((entry) => {
        const date = new Date(entry.createdAt);
        dates.add(format(date, "yyyy-MM-dd"));
      });
    return Array.from(dates).map((dateStr) => parseISO(dateStr));
  }, [entries]);

  // Memoize the tag selection handler to prevent recreation on each render
  const handleTagSelection = useCallback(
    (tag: string) => {
      // If we're in deleted view, switch to all view when selecting a tag
      if (viewMode === "deleted") {
        setViewMode("all");
      }
      setSelectedTag(selectedTag === tag ? null : tag);
      setUiState((prev) => ({ ...prev, isFilterOpen: false }));
    },
    [selectedTag, setSelectedTag, viewMode, setViewMode]
  );

  // Memoize the mood selection handler
  const handleMoodSelection = useCallback(
    (mood: string) => {
      // If we're in deleted view, switch to all view when selecting a mood
      if (viewMode === "deleted") {
        setViewMode("all");
      }
      setSelectedMood(selectedMood === mood ? null : mood);
      setUiState((prev) => ({ ...prev, showMoodFilter: false }));
    },
    [selectedMood, setSelectedMood, viewMode, setViewMode]
  );

  // Memoize the delete handler to prevent recreation on each render
  const handleDeleteEntry = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteEntry(id);
    },
    [deleteEntry]
  );

  // Memoize the favorite handler to prevent recreation on each render
  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      toggleFavorite(id);
    },
    [toggleFavorite]
  );

  // Handle permanent delete
  const handlePermanentDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      permanentlyDeleteEntry(id);
    },
    [permanentlyDeleteEntry]
  );

  // Handle restore entry
  const handleRestoreEntry = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      restoreEntry(id);
    },
    [restoreEntry]
  );

  // Handle empty bin
  const handleEmptyBin = useCallback(() => {
    emptyBin();
    setUiState((prev) => ({ ...prev, showEmptyBinDialog: false }));
  }, [emptyBin]);

  // Handle export
  const handleExport = useCallback(() => {
    const data = exportEntries();
    setUiState((prev) => ({ ...prev, exportData: data, showExportData: true }));
  }, [exportEntries]);

  // Handle import
  const handleImport = useCallback(() => {
    if (!uiState.importData.trim()) {
      alert("No data to import");
      return;
    }

    try {
      const success = importEntries(uiState.importData);
      if (success) {
        alert("Entries imported successfully");
        setUiState((prev) => ({
          ...prev,
          importData: "",
          showImportDialog: false,
        }));
      } else {
        alert("Failed to import entries. Invalid format.");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Error importing entries. Please check the format.");
    }
  }, [uiState.importData, importEntries]);

  // Create entry with template if enabled
  const handleCreateEntry = useCallback(() => {
    if (settings.useTemplates) {
      createEntryWithTemplate();
    } else {
      createEntry();
    }
  }, [createEntry, createEntryWithTemplate, settings.useTemplates]);

  // Calculate journal statistics
  const getJournalStats = useMemo(() => {
    const activeEntries = entries.filter((entry) => !entry.isDeleted);

    // Count entries by month
    const entriesByMonth: Record<string, number> = {};
    activeEntries.forEach((entry) => {
      const month = format(new Date(entry.createdAt), "MMM yyyy");
      entriesByMonth[month] = (entriesByMonth[month] || 0) + 1;
    });

    // Get top 5 tags
    const tagCounts: Record<string, number> = {};
    activeEntries.forEach((entry) => {
      entry.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Count words in all entries
    const totalWords = activeEntries.reduce((sum, entry) => {
      const words =
        typeof entry.content === "string"
          ? (entry.content || "").split(/\s+/).filter(Boolean).length
          : (JSON.stringify(entry.content) || "").split(/\s+/).filter(Boolean)
              .length;
      return sum + words;
    }, 0);

    return {
      totalEntries: activeEntries.length,
      favoriteEntries: activeEntries.filter((entry) => entry.isFavorite).length,
      totalTags: Object.keys(tagCounts).length,
      totalWords,
      entriesByMonth,
      topTags,
      averageWordsPerEntry: activeEntries.length
        ? Math.round(totalWords / activeEntries.length)
        : 0,
      maxStreak: streakData.longestStreak,
      currentStreak: streakData.currentStreak,
      deletedEntries: entries.filter((entry) => entry.isDeleted).length,
      lastEntryDate: activeEntries.length
        ? new Date(
            activeEntries.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )[0].createdAt
          )
        : null,
    };
  }, [entries, streakData.currentStreak, streakData.longestStreak]);

  // Get counts for view modes
  const entryCounts = useMemo(() => {
    const all = entries.filter((entry) => !entry.isDeleted).length;
    const favorites = entries.filter(
      (entry) => entry.isFavorite && !entry.isDeleted
    ).length;
    const deleted = entries.filter((entry) => entry.isDeleted).length;

    return { all, favorites, deleted };
  }, [entries]);

  // Calculate entry progress for today
  const entryProgress = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEntries = entries.filter((entry) => {
      if (entry.isDeleted) return false;
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);
      return isEqual(entryDate, today);
    });

    const progress = Math.min(
      Math.round((todayEntries.length / settings.entryGoal) * 100),
      100
    );
    return {
      count: todayEntries.length,
      progress,
    };
  }, [entries, settings.entryGoal]);

  // Update settings handlers
  const handleToggleAnimations = useCallback(
    (value: boolean) => {
      updateSettings({ enableAnimations: value });
    },
    [updateSettings]
  );

  const handleToggleTemplates = useCallback(
    (value: boolean) => {
      updateSettings({ useTemplates: value });
    },
    [updateSettings]
  );

  const handleChangeEntryGoal = useCallback(
    (value: string) => {
      updateSettings({ entryGoal: parseInt(value) });
    },
    [updateSettings]
  );

  const handleChangeSortOrder = useCallback(
    (value: string) => {
      updateSettings({
        defaultSortOrder: value as "newest" | "oldest" | "alphabetical",
      });
    },
    [updateSettings]
  );

  return (
    <div
      className="h-screen border-r bg-background flex flex-col transition-all duration-300"
      style={{ width: "340px", minWidth: "340px", flexShrink: 0 }}
    >
      {/* Modern Header Section */}
      <div className="bg-background text-foreground">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full p-1.5 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
              <PenLine className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSwitch />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover
                    open={uiState.isCalendarOpen}
                    onOpenChange={(open) =>
                      setUiState((prev) => ({ ...prev, isCalendarOpen: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-muted/20 hover:bg-muted/30"
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 shadow-lg border-none"
                      align="end"
                    >
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate || undefined}
                        onSelect={handleDateSelect}
                        modifiers={{
                          highlighted: datesWithEntries,
                        }}
                        modifiersClassNames={{
                          highlighted:
                            "bg-primary/10 text-foreground font-medium dark:bg-primary/20 dark:text-primary-foreground",
                        }}
                        className="rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter by date</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-muted/20 hover:bg-muted/30"
                    onClick={() =>
                      setUiState((prev) => ({ ...prev, showStatsDialog: true }))
                    }
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Journal Stats</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-muted/20 hover:bg-muted/30"
                    onClick={() =>
                      setUiState((prev) => ({
                        ...prev,
                        showSettingsDialog: true,
                      }))
                    }
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-muted/20 hover:bg-muted/30"
                      >
                        <Menu className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="shadow-lg min-w-[180px]"
                    >
                      <DropdownMenuLabel>Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleExport}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Journal
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUiState((prev) => ({
                            ...prev,
                            showImportDialog: true,
                          }))
                        }
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import Journal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Menu</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Streak and Progress Bar */}
        <div className="px-3 pb-2">
          <div className="bg-muted/30 rounded-lg p-2 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <Zap
                  className="h-3.5 w-3.5 text-yellow-500"
                  fill="currentColor"
                />
                <span className="text-xs font-medium">
                  Streak: {streakData.currentStreak} day
                  {streakData.currentStreak !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Goal: {entryProgress.count}/{settings.entryGoal}
              </div>
            </div>
            <Progress value={entryProgress.progress} className="h-1.5" />
          </div>
        </div>

        {/* Search and New Entry Section */}
        <div className="px-3 pb-3 pt-1">
          <div className="flex gap-1 mb-2">
            <div className="relative flex-1">
              <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </div>
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 bg-muted/20 border-0 placeholder:text-muted-foreground focus-visible:ring-muted/30 rounded-lg text-sm"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover
                    open={uiState.isFilterOpen}
                    onOpenChange={(open) =>
                      setUiState((prev) => ({ ...prev, isFilterOpen: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-lg bg-muted/20 hover:bg-muted/30",
                          (selectedTag || selectedDate || selectedMood) &&
                            "bg-muted/30"
                        )}
                      >
                        <Filter className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 p-3 shadow-lg rounded-lg border-none"
                      align="end"
                    >
                      <div className="space-y-3">
                        {selectedDate && (
                          <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 rounded-md">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-2" />
                              <span className="text-xs font-medium">
                                {format(selectedDate, "MMM d, yyyy")}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 rounded-full hover:bg-background"
                              onClick={clearDateFilter}
                            >
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        )}

                        {selectedMood && (
                          <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 rounded-md">
                            <div className="flex items-center">
                              <Heart className="h-3 w-3 mr-2" />
                              <span className="text-xs font-medium">
                                {selectedMood}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 rounded-full hover:bg-background"
                              onClick={clearMoodFilter}
                            >
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        )}

                        <div>
                          <h3 className="text-xs font-medium mb-1.5">Tags</h3>
                          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                            {allTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant={
                                  selectedTag === tag ? "default" : "outline"
                                }
                                className={cn(
                                  "cursor-pointer transition-colors px-2 py-0.5 text-xs",
                                  selectedTag === tag
                                    ? "bg-primary hover:bg-primary/90"
                                    : "hover:bg-muted/70"
                                )}
                                onClick={() => handleTagSelection(tag)}
                              >
                                {tag}
                              </Badge>
                            ))}
                            {selectedTag && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs mt-1 rounded-md"
                                onClick={() => setSelectedTag(null)}
                              >
                                Clear Tags
                              </Button>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-medium mb-1.5">Mood</h3>
                          <div className="flex flex-wrap gap-1">
                            {moodOptions.slice(0, 6).map((mood) => (
                              <Badge
                                key={mood}
                                variant={
                                  selectedMood === mood ? "default" : "outline"
                                }
                                className={cn(
                                  "cursor-pointer transition-colors px-2 py-0.5 text-xs",
                                  selectedMood === mood
                                    ? "bg-primary hover:bg-primary/90"
                                    : "hover:bg-muted/70"
                                )}
                                onClick={() => handleMoodSelection(mood)}
                              >
                                {mood.split(" ")[0]}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-medium mb-1.5">
                            Sort By
                          </h3>
                          <Select
                            value={settings.defaultSortOrder}
                            onValueChange={handleChangeSortOrder}
                          >
                            <SelectTrigger className="w-full h-7 text-xs bg-muted/20">
                              <SelectValue placeholder="Sort order" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="newest">
                                Newest First
                              </SelectItem>
                              <SelectItem value="oldest">
                                Oldest First
                              </SelectItem>
                              <SelectItem value="alphabetical">
                                Alphabetical
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(selectedTag ||
                          selectedDate ||
                          selectedMood ||
                          settings.defaultSortOrder !== "newest") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-1 text-xs h-7"
                            onClick={() => {
                              setSelectedTag(null);
                              setSelectedDate(null);
                              setSelectedMood(null);
                              updateSettings({ defaultSortOrder: "newest" });
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reset All Filters
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            onClick={handleCreateEntry}
            className="w-full h-8 gap-1.5 font-medium bg-gradient-to-r from-primary/90 to-primary hover:opacity-90 text-primary-foreground border-0 backdrop-blur-sm rounded-lg shadow-sm text-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Entry
          </Button>

          {/* Indicator for active filters */}
          {(selectedTag || selectedDate || selectedMood) && (
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span>Filters:</span>
              {selectedDate && (
                <Badge
                  variant="outline"
                  className="px-1.5 h-4 bg-muted/10 border-muted/20 text-xs"
                >
                  <Calendar className="h-2.5 w-2.5 mr-1" />
                  {format(selectedDate, "MMM d")}
                </Badge>
              )}
              {selectedTag && (
                <Badge
                  variant="outline"
                  className="px-1.5 h-4 bg-muted/10 border-muted/20 text-xs"
                >
                  {selectedTag}
                </Badge>
              )}
              {selectedMood && (
                <Badge
                  variant="outline"
                  className="px-1.5 h-4 bg-muted/10 border-muted/20 text-xs"
                >
                  {selectedMood.split(" ")[0]}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Selector Tabs */}
      <div className="border-b border-border/30">
        <Tabs
          value={viewMode}
          onValueChange={(value) =>
            setViewMode(value as "all" | "favorites" | "deleted")
          }
          className="w-full"
        >
          <TabsList className="w-full bg-background grid grid-cols-3 p-0 h-10">
            <TabsTrigger
              value="all"
              className="flex flex-col justify-center items-center py-0.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary hover:bg-muted/10"
            >
              <BookOpen className="h-5 w-5 mb-0.5" />
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="flex flex-col justify-center items-center py-0.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary hover:bg-muted/10"
            >
              <Star className="h-5 w-5 mb-0.5" />
            </TabsTrigger>
            <TabsTrigger
              value="deleted"
              className="flex flex-col justify-center items-center py-0.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary hover:bg-muted/10"
            >
              <Trash2 className="h-5 w-5 mb-0.5" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Empty Bin Button - Only show in deleted view with entries */}
      {viewMode === "deleted" && entryCounts.deleted > 0 && (
        <div className="p-2 border-b border-border/30">
          <Button
            variant="destructive"
            size="sm"
            className="w-full rounded-md shadow-sm h-7 text-xs"
            onClick={() =>
              setUiState((prev) => ({ ...prev, showEmptyBinDialog: true }))
            }
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Empty Bin ({entryCounts.deleted})
          </Button>
        </div>
      )}

      {/* Entries List with ShadCN ScrollArea */}
      <ScrollArea className="flex-1 h-0">
        {uiState.filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <div className="rounded-full bg-gradient-to-br from-muted/40 to-muted/20 w-16 h-16 flex items-center justify-center mb-3 shadow-inner">
              {viewMode === "deleted" ? (
                <Trash2 className="h-6 w-6 text-muted-foreground/60" />
              ) : searchQuery || selectedTag || selectedDate || selectedMood ? (
                <Search className="h-6 w-6 text-muted-foreground/60" />
              ) : (
                <BookOpen className="h-6 w-6 text-muted-foreground/60" />
              )}
            </div>
            <p className="font-medium text-base">No entries found</p>
            {viewMode === "deleted" ? (
              <p className="text-xs mt-1 text-center max-w-xs text-muted-foreground">
                The bin is empty
              </p>
            ) : searchQuery || selectedTag || selectedDate || selectedMood ? (
              <p className="text-xs mt-1 text-center max-w-xs text-muted-foreground">
                Try adjusting your filters
              </p>
            ) : (
              <p className="text-xs mt-1 text-center max-w-xs text-muted-foreground">
                Create your first entry to get started
              </p>
            )}

            {(searchQuery || selectedTag || selectedDate || selectedMood) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-xs"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag(null);
                  setSelectedDate(null);
                  setSelectedMood(null);
                }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-px">
            {uiState.filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "p-2 cursor-pointer hover:bg-muted/50 flex flex-col gap-1",
                  "transition-all duration-200 border-l-2",
                  currentEntry?.id === entry.id
                    ? "bg-gradient-to-r from-primary/5 to-muted/50 border-l-primary"
                    : "border-l-transparent",
                  entry.isDeleted && "opacity-75",
                  settings.enableAnimations && "hover:translate-x-0.5"
                )}
                onClick={() => setCurrentEntry(entry.id)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium truncate flex-1 text-foreground/90 text-sm">
                    {entry.title}
                  </h3>
                  {entry.isFavorite && !entry.isDeleted && (
                    <Star
                      className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                    />
                  )}
                </div>
                <div className="text-xs text-muted-foreground/90 truncate leading-relaxed"></div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center text-xs text-muted-foreground bg-muted/40 rounded-md px-1.5 py-0.5">
                    <Calendar className="h-2.5 w-2.5 mr-1" />
                    {entry.isDeleted && entry.deletedAt
                      ? `${format(new Date(entry.deletedAt), "MMM d")}`
                      : format(new Date(entry.updatedAt), "MMM d")}

                    {/* Display mood if available */}
                    {entry.mood && !entry.isDeleted && (
                      <span className="ml-1 flex items-center">
                        <span className="mx-0.5 text-xs">•</span>
                        <span>{entry.mood.split(" ")[0]}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    {entry.isDeleted ? (
                      // Deleted entry actions
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                          onClick={(e) => handleRestoreEntry(e, entry.id)}
                          title="Restore"
                        >
                          <RefreshCw className="h-3 w-3 text-green-600 dark:text-green-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full text-destructive hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                          onClick={(e) => handlePermanentDelete(e, entry.id)}
                          title="Delete Permanently"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      // Normal entry actions
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
                          onClick={(e) => handleToggleFavorite(e, entry.id)}
                          title={
                            entry.isFavorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                        >
                          <Star
                            className={cn(
                              "h-3 w-3",
                              entry.isFavorite
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground"
                            )}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full text-destructive hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                          onClick={(e) => handleDeleteEntry(e, entry.id)}
                          title="Move to bin"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {entry.tags.length > 0 && !entry.isDeleted && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {entry.tags.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs px-1 py-0 h-4 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:hover:bg-gray-800/60"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {entry.tags.length > 2 && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-1 py-0 h-4 bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        +{entry.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Import Dialog */}
      <Dialog
        open={uiState.showImportDialog}
        onOpenChange={(open) =>
          setUiState((prev) => ({ ...prev, showImportDialog: open }))
        }
      >
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Import Journal Entries</DialogTitle>
            <DialogDescription>
              Paste your exported JSON data below to import journal entries.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-primary/5 rounded-lg p-3 mb-3 flex items-center text-xs">
            <CloudUpload className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
            <p>
              Your existing entries will not be replaced unless they have the
              same ID.
            </p>
          </div>
          <Textarea
            value={uiState.importData}
            onChange={(e) =>
              setUiState((prev) => ({ ...prev, importData: e.target.value }))
            }
            className="min-h-[180px] font-mono text-xs"
            placeholder='{"entries": [...]}'
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setUiState((prev) => ({ ...prev, showImportDialog: false }))
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Data Dialog */}
      <Dialog
        open={uiState.showExportData}
        onOpenChange={(open) =>
          setUiState((prev) => ({ ...prev, showExportData: open }))
        }
      >
        <DialogContent className="max-w-xl rounded-lg">
          <DialogHeader>
            <DialogTitle>Export Journal Entries</DialogTitle>
            <DialogDescription>
              Copy this data to save or transfer your journal entries.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-primary/5 rounded-lg p-3 mb-3 flex items-center text-xs">
            <Download className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
            <p>
              This data contains all your journal entries including deleted
              ones. Keep it safe!
            </p>
          </div>
          <Textarea
            value={uiState.exportData}
            readOnly
            className="min-h-[250px] font-mono text-xs bg-muted/30"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => {
                try {
                  navigator.clipboard.writeText(uiState.exportData);
                  alert("Copied to clipboard!");
                } catch (err) {
                  console.error("Failed to copy:", err);
                  alert("Failed to copy. Please select and copy manually.");
                }
              }}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Copy to Clipboard
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setUiState((prev) => ({ ...prev, showExportData: false }))
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty Bin Confirmation Dialog */}
      <Dialog
        open={uiState.showEmptyBinDialog}
        onOpenChange={(open) =>
          setUiState((prev) => ({ ...prev, showEmptyBinDialog: open }))
        }
      >
        <DialogContent className="rounded-lg">
          <DialogHeader>
            <DialogTitle>Empty Bin</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete all entries in the
              bin? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center my-3 text-destructive dark:text-red-400">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setUiState((prev) => ({ ...prev, showEmptyBinDialog: false }))
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEmptyBin}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Empty Bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={uiState.showSettingsDialog}
        onOpenChange={(open) =>
          setUiState((prev) => ({ ...prev, showSettingsDialog: open }))
        }
      >
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Journal Settings</DialogTitle>
            <DialogDescription>
              Customize your journal experience.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="animations">Interface Animations</Label>
                <p className="text-xs text-muted-foreground">
                  Enable smooth transitions and animations
                </p>
              </div>
              <Switch
                id="animations"
                checked={settings.enableAnimations}
                onCheckedChange={handleToggleAnimations}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="daily-goal">Daily Entry Goal</Label>
              <p className="text-xs text-muted-foreground mb-1.5">
                Set your daily journaling target
              </p>
              <Select
                value={settings.entryGoal.toString()}
                onValueChange={handleChangeEntryGoal}
              >
                <SelectTrigger className="w-full" id="daily-goal">
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 entry per day</SelectItem>
                  <SelectItem value="2">2 entries per day</SelectItem>
                  <SelectItem value="3">3 entries per day</SelectItem>
                  <SelectItem value="5">5 entries per day</SelectItem>
                  <SelectItem value="10">10 entries per day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="templates">Use Entry Templates</Label>
                <p className="text-xs text-muted-foreground">
                  Start new entries with template structure
                </p>
              </div>
              <Switch
                id="templates"
                checked={settings.useTemplates}
                onCheckedChange={handleToggleTemplates}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() =>
                setUiState((prev) => ({ ...prev, showSettingsDialog: false }))
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog
        open={uiState.showStatsDialog}
        onOpenChange={(open) =>
          setUiState((prev) => ({ ...prev, showStatsDialog: open }))
        }
      >
        <DialogContent className="sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle>Journal Statistics</DialogTitle>
            <DialogDescription>
              Insights into your journaling habit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="bg-muted/30 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold">
                {getJournalStats.totalEntries}
              </div>
              <div className="text-xs text-muted-foreground">Total Entries</div>
            </div>

            <div className="bg-muted/30 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold">
                {getJournalStats.currentStreak}
              </div>
              <div className="text-xs text-muted-foreground">
                Current Streak
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold">
                {getJournalStats.maxStreak}
              </div>
              <div className="text-xs text-muted-foreground">Best Streak</div>
            </div>

            <div className="bg-muted/30 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold">
                {getJournalStats.totalWords}
              </div>
              <div className="text-xs text-muted-foreground">Total Words</div>
            </div>

            <div className="bg-muted/30 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold">
                {getJournalStats.averageWordsPerEntry}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg. Words/Entry
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold">
                {getJournalStats.totalTags}
              </div>
              <div className="text-xs text-muted-foreground">Unique Tags</div>
            </div>
          </div>

          <div className="mt-3">
            <h3 className="text-xs font-medium mb-1.5">Most Used Tags</h3>
            <div className="flex flex-wrap gap-1">
              {getJournalStats.topTags.map(([tag, count]) => (
                <Badge key={tag} variant="secondary" className="py-0.5 text-xs">
                  {tag} <span className="opacity-70 ml-1">({count})</span>
                </Badge>
              ))}
            </div>
          </div>

          {getJournalStats.lastEntryDate && (
            <div className="mt-3 text-xs text-muted-foreground">
              <p>
                Last journal entry:{" "}
                {format(
                  getJournalStats.lastEntryDate,
                  "MMMM d, yyyy 'at' h:mm a"
                )}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setUiState((prev) => ({ ...prev, showStatsDialog: false }))
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type JournalEntry = {
  id: string;
  title: string;
  content: string; // Store content as a string (serialized JSON for rich text)
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  mood?: string; // Updated to string type to support emoji moods
  isFavorite: boolean;
  images: string[]; // Base64 encoded images
  location?: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  weather?: {
    condition: string;
    temperature: number;
    icon: string;
  };
  isDeleted: boolean; // For recycle bin functionality
  deletedAt?: Date;
};

// New settings interface for UI preferences
export interface JournalSettings {
  enableAnimations: boolean;
  compactMode: boolean;
  entryGoal: number;
  useTemplates: boolean;
  defaultSortOrder: "newest" | "oldest" | "alphabetical";
  editorTheme: "light" | "dark" | "system"; // New setting for editor theme
  fontFamily: string; // New setting for font preference
}

// Default settings
const DEFAULT_SETTINGS: JournalSettings = {
  enableAnimations: true,
  compactMode: false,
  entryGoal: 5,
  useTemplates: false,
  defaultSortOrder: "newest",
  editorTheme: "system",
  fontFamily: "default",
};

// Type for validating imported entries
type ImportedEntry = Partial<JournalEntry>;

interface JournalState {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  searchQuery: string;
  selectedTag: string | null;
  selectedMood: string | null; // New state for mood filtering
  selectedDate: Date | null; // New state for date filtering
  isEditing: boolean;
  cachedTags: string[] | null;
  entriesLength: number;
  viewMode: "all" | "favorites" | "deleted";
  settings: JournalSettings; // New settings state
  streakData: {
    currentStreak: number;
    longestStreak: number;
    lastEntryDate: Date | null;
  };

  // Actions
  createEntry: () => void;
  createEntryWithTemplate: () => void; // New action for template-based entries
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  permanentlyDeleteEntry: (id: string) => void;
  restoreEntry: (id: string) => void;
  emptyBin: () => void;
  setCurrentEntry: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setSelectedMood: (mood: string | null) => void; // New action for mood filtering
  setSelectedDate: (date: Date | null) => void; // New action for date filtering
  toggleFavorite: (id: string) => void;
  setIsEditing: (state: boolean) => void;
  getAllTags: () => string[];
  getAllMoods: () => string[]; // New action to get all moods
  updateTagCache: () => void;
  addImageToEntry: (id: string, imageBase64: string) => void;
  removeImageFromEntry: (id: string, imageIndex: number) => void;
  updateEntryLocation: (id: string, location: JournalEntry["location"]) => void;
  updateEntryWeather: (id: string, weather: JournalEntry["weather"]) => void;
  setViewMode: (mode: "all" | "favorites" | "deleted") => void;
  updateSettings: (settings: Partial<JournalSettings>) => void; // New action for updating settings
  calculateStreak: () => void; // New action for calculating streaks
  exportEntries: () => string;
  importEntries: (jsonData: string) => boolean;
}

const DEFAULT_ENTRY: Omit<JournalEntry, "id"> = {
  title: "New Entry",
  content: "",
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  isFavorite: false,
  images: [],
  isDeleted: false,
};

// Template for new entries when templates are enabled
const TEMPLATE_ENTRY: Omit<JournalEntry, "id"> = {
  title: "New Entry",
  content: JSON.stringify({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Today's Journal" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "How am I feeling today?" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "What went well today?" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "What could have gone better?" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "What am I grateful for?" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "What are my goals for tomorrow?" }],
      },
    ],
  }),
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: ["daily"],
  isFavorite: false,
  images: [],
  isDeleted: false,
};

// Helper function to check if an object is a valid journal entry
function isValidJournalEntry(entry: unknown): entry is JournalEntry {
  const e = entry as ImportedEntry;
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.id === "string" &&
    typeof e.title === "string" &&
    typeof e.content === "string"
  );
}

// Helper function to ensure content is stored as a string
function ensureContentString(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  try {
    return JSON.stringify(content);
  } catch (e) {
    console.error("Error stringifying content:", e);
    return "";
  }
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      currentEntry: null,
      searchQuery: "",
      selectedTag: null,
      selectedMood: null,
      selectedDate: null,
      isEditing: false,
      cachedTags: null,
      entriesLength: 0,
      viewMode: "all",
      settings: DEFAULT_SETTINGS,
      streakData: {
        currentStreak: 0,
        longestStreak: 0,
        lastEntryDate: null,
      },

      createEntry: () => {
        const newEntry: JournalEntry = {
          ...DEFAULT_ENTRY,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          title: `Journal Entry - ${new Date().toLocaleDateString()}`,
        };

        set((state) => ({
          entries: [newEntry, ...state.entries],
          currentEntry: newEntry,
          isEditing: true,
          entriesLength: state.entries.length + 1,
          cachedTags: null, // Invalidate cache when entries change
        }));

        // Recalculate streak after adding new entry
        setTimeout(() => get().calculateStreak(), 0);
      },

      createEntryWithTemplate: () => {
        const newEntry: JournalEntry = {
          ...TEMPLATE_ENTRY,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          title: `Journal Entry - ${new Date().toLocaleDateString()}`,
        };

        set((state) => ({
          entries: [newEntry, ...state.entries],
          currentEntry: newEntry,
          isEditing: true,
          entriesLength: state.entries.length + 1,
          cachedTags: null,
        }));

        // Recalculate streak after adding new entry
        setTimeout(() => get().calculateStreak(), 0);
      },

      updateEntry: (id, updates) => {
        // Ensure content is stored as a string
        const processedUpdates = { ...updates };
        if (updates.content !== undefined) {
          processedUpdates.content = ensureContentString(updates.content);
        }

        set((state) => {
          const updatedEntries = state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, ...processedUpdates, updatedAt: new Date() }
              : entry
          );

          const updatedCurrentEntry =
            state.currentEntry && state.currentEntry.id === id
              ? {
                  ...state.currentEntry,
                  ...processedUpdates,
                  updatedAt: new Date(),
                }
              : state.currentEntry;

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
            entriesLength: updatedEntries.length,
            cachedTags: null, // Invalidate cache when entries change
          };
        });

        // If mood is updated, recalculate moods list
        if (updates.mood) {
          get().getAllMoods();
        }
      },

      deleteEntry: (id) => {
        set((state) => {
          const updatedEntries = state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, isDeleted: true, deletedAt: new Date() }
              : entry
          );

          // If the current entry is being deleted, set current to the first non-deleted entry
          let updatedCurrentEntry = state.currentEntry;
          if (state.currentEntry && state.currentEntry.id === id) {
            const firstNonDeletedEntry = updatedEntries.find(
              (entry) => !entry.isDeleted
            );
            updatedCurrentEntry = firstNonDeletedEntry || null;
          }

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
            entriesLength: updatedEntries.length,
            cachedTags: null, // Invalidate cache when entries change
          };
        });

        // Recalculate streak after deleting an entry
        setTimeout(() => get().calculateStreak(), 0);
      },

      permanentlyDeleteEntry: (id) => {
        set((state) => {
          const updatedEntries = state.entries.filter(
            (entry) => entry.id !== id
          );

          // If the current entry is being deleted, set current to the first entry in the bin
          let updatedCurrentEntry = state.currentEntry;
          if (state.currentEntry && state.currentEntry.id === id) {
            const firstDeletedEntry = state.entries.find(
              (entry) => entry.isDeleted && entry.id !== id
            );
            updatedCurrentEntry = firstDeletedEntry || null;
          }

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
            entriesLength: updatedEntries.length,
            cachedTags: null,
          };
        });
      },

      restoreEntry: (id) => {
        set((state) => {
          const updatedEntries = state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, isDeleted: false, deletedAt: undefined }
              : entry
          );

          return {
            entries: updatedEntries,
            entriesLength: updatedEntries.length,
            cachedTags: null,
          };
        });

        // Recalculate streak after restoring an entry
        setTimeout(() => get().calculateStreak(), 0);
      },

      emptyBin: () => {
        set((state) => {
          const updatedEntries = state.entries.filter(
            (entry) => !entry.isDeleted
          );

          // If the current entry was in the bin, reset current entry
          const updatedCurrentEntry =
            state.currentEntry && state.currentEntry.isDeleted
              ? updatedEntries.length > 0
                ? updatedEntries[0]
                : null
              : state.currentEntry;

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
            entriesLength: updatedEntries.length,
            cachedTags: null,
          };
        });
      },

      setCurrentEntry: (id) => {
        if (id === null) {
          set({ currentEntry: null });
          return;
        }

        const entry = get().entries.find((entry) => entry.id === id);
        if (entry) {
          set({ currentEntry: entry, isEditing: false });
        }
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setSelectedTag: (tag) => {
        set({ selectedTag: tag });
      },

      setSelectedMood: (mood) => {
        set({ selectedMood: mood });
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date });
      },

      toggleFavorite: (id) => {
        set((state) => {
          const updatedEntries = state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, isFavorite: !entry.isFavorite }
              : entry
          );

          const updatedCurrentEntry =
            state.currentEntry && state.currentEntry.id === id
              ? {
                  ...state.currentEntry,
                  isFavorite: !state.currentEntry.isFavorite,
                }
              : state.currentEntry;

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
            // Don't update tags cache here as favorites don't affect tags
          };
        });
      },

      setIsEditing: (state) => {
        set({ isEditing: state });
      },

      getAllTags: () => {
        // Extract all tags without updating state during render
        const allTags = new Set<string>();
        get().entries.forEach((entry) => {
          if (!entry.isDeleted) {
            entry.tags.forEach((tag) => allTags.add(tag));
          }
        });

        return Array.from(allTags);
      },

      getAllMoods: () => {
        // Extract all moods used in entries
        const allMoods = new Set<string>();
        get().entries.forEach((entry) => {
          if (!entry.isDeleted && entry.mood) {
            allMoods.add(entry.mood);
          }
        });

        return Array.from(allMoods);
      },

      // Use this separately to cache tags (don't call during render)
      updateTagCache: () => {
        const allTags = new Set<string>();
        const entriesLength = get().entries.length;

        get().entries.forEach((entry) => {
          if (!entry.isDeleted) {
            entry.tags.forEach((tag) => allTags.add(tag));
          }
        });

        set({
          cachedTags: Array.from(allTags),
          entriesLength: entriesLength,
        });
      },

      addImageToEntry: (id, imageBase64) => {
        set((state) => {
          const updatedEntries = state.entries.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  images: [...entry.images, imageBase64],
                  updatedAt: new Date(),
                }
              : entry
          );

          const updatedCurrentEntry =
            state.currentEntry && state.currentEntry.id === id
              ? {
                  ...state.currentEntry,
                  images: [...state.currentEntry.images, imageBase64],
                  updatedAt: new Date(),
                }
              : state.currentEntry;

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
          };
        });
      },

      removeImageFromEntry: (id, imageIndex) => {
        set((state) => {
          const entry = state.entries.find((e) => e.id === id);
          if (!entry) return state;

          const updatedImages = [...entry.images];
          updatedImages.splice(imageIndex, 1);

          const updatedEntries = state.entries.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  images: updatedImages,
                  updatedAt: new Date(),
                }
              : entry
          );

          const updatedCurrentEntry =
            state.currentEntry && state.currentEntry.id === id
              ? {
                  ...state.currentEntry,
                  images: updatedImages,
                  updatedAt: new Date(),
                }
              : state.currentEntry;

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
          };
        });
      },

      updateEntryLocation: (id, location) => {
        set((state) => {
          const updatedEntries = state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, location, updatedAt: new Date() }
              : entry
          );

          const updatedCurrentEntry =
            state.currentEntry && state.currentEntry.id === id
              ? { ...state.currentEntry, location, updatedAt: new Date() }
              : state.currentEntry;

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
          };
        });
      },

      updateEntryWeather: (id, weather) => {
        set((state) => {
          const updatedEntries = state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, weather, updatedAt: new Date() }
              : entry
          );

          const updatedCurrentEntry =
            state.currentEntry && state.currentEntry.id === id
              ? { ...state.currentEntry, weather, updatedAt: new Date() }
              : state.currentEntry;

          return {
            entries: updatedEntries,
            currentEntry: updatedCurrentEntry,
          };
        });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      calculateStreak: () => {
        const activeEntries = get().entries.filter((entry) => !entry.isDeleted);

        if (activeEntries.length === 0) {
          set({
            streakData: {
              currentStreak: 0,
              longestStreak: 0,
              lastEntryDate: null,
            },
          });
          return;
        }

        // Sort entries by creation date (newest first)
        const sortedEntries = [...activeEntries].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Get the most recent entry date
        const lastEntryDate = new Date(sortedEntries[0].createdAt);
        const today = new Date();

        // Reset hours to compare just the dates
        lastEntryDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        // Create a map of dates that have entries
        const entriesByDate = new Map();
        activeEntries.forEach((entry) => {
          const date = new Date(entry.createdAt);
          date.setHours(0, 0, 0, 0);
          const dateString = date.toISOString().slice(0, 10);
          entriesByDate.set(dateString, true);
        });

        // Calculate current streak
        let currentStreak = 0;
        const msPerDay = 24 * 60 * 60 * 1000;

        // If the most recent entry is more than a day old, streak is 0
        const daysSinceLastEntry = Math.floor(
          (today.getTime() - lastEntryDate.getTime()) / msPerDay
        );

        if (daysSinceLastEntry > 1) {
          currentStreak = 0;
        } else {
          // Count consecutive days backward from the last entry date
          const checkDate = new Date(lastEntryDate);

          // Start counting from the last entry date
          while (true) {
            const dateString = checkDate.toISOString().slice(0, 10);

            if (entriesByDate.has(dateString)) {
              currentStreak++;
              // Move to the previous day
              checkDate.setTime(checkDate.getTime() - msPerDay);
            } else {
              break;
            }
          }
        }

        // Calculate longest streak
        let longestStreak = 0;
        const dateStrings = Array.from(entriesByDate.keys()).sort();

        if (dateStrings.length > 0) {
          let streak = 1;

          for (let i = 1; i < dateStrings.length; i++) {
            const prevDate = new Date(dateStrings[i - 1]);
            const currDate = new Date(dateStrings[i]);
            const dayDiff = Math.floor(
              (currDate.getTime() - prevDate.getTime()) / msPerDay
            );

            if (dayDiff === 1) {
              streak++;
            } else {
              longestStreak = Math.max(longestStreak, streak);
              streak = 1;
            }
          }

          longestStreak = Math.max(longestStreak, streak);
        }

        set({
          streakData: {
            currentStreak,
            longestStreak,
            lastEntryDate,
          },
        });
      },

      exportEntries: () => {
        const entries = get().entries;
        return JSON.stringify({ entries }, null, 2);
      },

      importEntries: (jsonData) => {
        try {
          const parsed = JSON.parse(jsonData);

          if (!parsed.entries || !Array.isArray(parsed.entries)) {
            return false;
          }

          // Validate entries structure using the helper function
          const validEntries = parsed.entries.filter(isValidJournalEntry);

          if (validEntries.length === 0) {
            return false;
          }

          // Ensure dates are properly instantiated as Date objects
          const processedEntries = validEntries.map(
            (entry: {
              createdAt: string | number | Date;
              updatedAt: string | number | Date;
              deletedAt: string | number | Date;
            }) => ({
              ...entry,
              createdAt:
                entry.createdAt instanceof Date
                  ? entry.createdAt
                  : new Date(entry.createdAt),
              updatedAt:
                entry.updatedAt instanceof Date
                  ? entry.updatedAt
                  : new Date(entry.updatedAt),
              deletedAt: entry.deletedAt
                ? new Date(entry.deletedAt)
                : undefined,
            })
          );

          set((state) => ({
            entries: [...processedEntries, ...state.entries],
            entriesLength: state.entries.length + processedEntries.length,
            cachedTags: null,
          }));

          // Recalculate streak after importing entries
          setTimeout(() => get().calculateStreak(), 0);

          return true;
        } catch (error) {
          console.error("Error importing entries:", error);
          return false;
        }
      },
    }),
    {
      name: "journal-storage",
      partialize: (state) => ({
        entries: state.entries,
        settings: state.settings,
        streakData: state.streakData,
        // Don't persist these states
        // currentEntry: null,
        // searchQuery: "",
        // selectedTag: null,
        // selectedMood: null,
        // selectedDate: null,
        // isEditing: false,
        // cachedTags: null,
        // entriesLength: 0,
        // viewMode: "all",
      }),
    }
  )
);

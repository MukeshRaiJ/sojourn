// types/journal.ts
export type MoodType = "happy" | "neutral" | "sad" | "excited" | "anxious";

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  mood?: MoodType;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryUpdatePayload {
  title?: string;
  content?: string;
  tags?: string[];
  mood?: MoodType;
  isFavorite?: boolean;
}

export interface JournalStoreState {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  isEditing: boolean;
  updateEntry: (id: string, payload: JournalEntryUpdatePayload) => void;
  setIsEditing: (isEditing: boolean) => void;
  toggleFavorite: (id: string) => void;
}

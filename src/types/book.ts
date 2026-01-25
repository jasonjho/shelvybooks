export type BookStatus = 'reading' | 'want-to-read' | 'read';

export type ShelfSkin = 'oak' | 'walnut' | 'white' | 'dark';

export type DecorDensity = 'minimal' | 'balanced' | 'cozy';

export type SortOption = 'random' | 'recent' | 'status-author' | 'author-title';

export interface ShelfSettings {
  showPlant: boolean;
  showBookends: boolean;
  showAmbientLight: boolean;
  showWoodGrain: boolean;
  decorDensity: DecorDensity;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  status: BookStatus;
  openLibraryKey?: string;
  createdAt?: string;
}

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

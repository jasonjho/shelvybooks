export type BookStatus = 'reading' | 'want-to-read' | 'read';

export type ShelfSkin = 'oak' | 'walnut' | 'white' | 'dark';

export type DecorDensity = 'minimal' | 'balanced' | 'cozy';

export type SortOption = 'random' | 'recent' | 'status-author' | 'author-title';

export type BackgroundTheme = 'office' | 'library' | 'cozy' | 'space' | 'forest' | 'ocean' | 'sunset' | 'lavender';

export interface ShelfSettings {
  showPlant: boolean;
  showBookends: boolean;
  showAmbientLight: boolean;
  showWoodGrain: boolean;
  showNameplate: boolean;
  showStackedBooks: boolean;
  decorDensity: DecorDensity;
  backgroundTheme: BackgroundTheme;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  status: BookStatus;
  openLibraryKey?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    publishedDate?: string;
    infoLink?: string;
  };
}

// Keep for backwards compatibility with existing code
export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

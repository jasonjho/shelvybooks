export type BookStatus = 'reading' | 'want-to-read' | 'read';

export type ShelfSkin = 'oak' | 'walnut' | 'white' | 'dark';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  status: BookStatus;
  openLibraryKey?: string;
}

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

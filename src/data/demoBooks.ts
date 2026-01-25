import { Book } from '@/types/book';

export const demoBooks: Book[] = [
  // Currently Reading
  {
    id: 'demo-1',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    coverUrl: 'https://covers.openlibrary.org/b/id/10441104-M.jpg',
    status: 'reading',
  },
  {
    id: 'demo-2',
    title: 'Atomic Habits',
    author: 'James Clear',
    coverUrl: 'https://covers.openlibrary.org/b/id/8523341-M.jpg',
    status: 'reading',
  },
  // Want to Read
  {
    id: 'demo-3',
    title: 'Dune',
    author: 'Frank Herbert',
    coverUrl: 'https://covers.openlibrary.org/b/id/8091016-M.jpg',
    status: 'want-to-read',
  },
  {
    id: 'demo-4',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    coverUrl: 'https://covers.openlibrary.org/b/id/10373449-M.jpg',
    status: 'want-to-read',
  },
  {
    id: 'demo-5',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    coverUrl: 'https://covers.openlibrary.org/b/id/7327913-M.jpg',
    status: 'want-to-read',
  },
  // Read
  {
    id: 'demo-6',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    coverUrl: 'https://covers.openlibrary.org/b/id/8406786-M.jpg',
    status: 'read',
  },
  {
    id: 'demo-7',
    title: '1984',
    author: 'George Orwell',
    coverUrl: 'https://covers.openlibrary.org/b/id/9269962-M.jpg',
    status: 'read',
  },
  {
    id: 'demo-8',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    coverUrl: 'https://covers.openlibrary.org/b/id/8228691-M.jpg',
    status: 'read',
  },
  {
    id: 'demo-9',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    coverUrl: 'https://covers.openlibrary.org/b/id/7222246-M.jpg',
    status: 'read',
  },
];

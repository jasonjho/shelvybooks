/**
 * Categories sorted by global frequency across all books.
 * Higher index = more common = should appear first.
 */
const CATEGORY_PRIORITY: string[] = [
  // Most common genres (based on database frequency)
  'Fiction',
  'Science Fiction',
  'Fantasy',
  'Comics & Graphic Novels',
  'Action & Adventure',
  'Religion',
  'Business & Economics',
  'History',
  'Literature & Fiction',
  'Science Fiction & Fantasy',
  'Biography & Autobiography',
  'Horror',
  'Computers',
  'Epic',
  'Self-Help',
  'Thrillers',
  'Crime & Mystery',
  'Military',
  'Science',
  'Juvenile Fiction',
  'Mystery',
  'Romance',
  'Psychology',
  'Philosophy',
  'Poetry',
  'Drama',
  'Art',
  'Music',
  'Cooking',
  'Health & Fitness',
  'Sports & Recreation',
  'Travel',
  'Education',
  'Politics',
  'Social Science',
  'Technology',
  'Nature',
  'Humor',
  'Memoir',
  'Nonfiction',
];

/**
 * Sort categories by relevance (common genres first).
 * Categories in the priority list appear first, sorted by their priority.
 * Unknown categories appear after, sorted alphabetically.
 */
export function sortCategoriesByRelevance(categories: string[]): string[] {
  if (!categories || categories.length === 0) return [];
  
  return [...categories].sort((a, b) => {
    const aIndex = CATEGORY_PRIORITY.indexOf(a);
    const bIndex = CATEGORY_PRIORITY.indexOf(b);
    
    // Both in priority list: sort by priority (lower index = higher priority)
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // Only a is in priority list: a comes first
    if (aIndex !== -1) return -1;
    
    // Only b is in priority list: b comes first
    if (bIndex !== -1) return 1;
    
    // Neither in priority list: sort alphabetically
    return a.localeCompare(b);
  });
}
